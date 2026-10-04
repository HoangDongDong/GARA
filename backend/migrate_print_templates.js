/**
 * Import the FastReport template catalogue from DATA.fdb into GARAGE.FDB.
 *
 * Copies STEMPLATE plus the SFORM, STABLEDESC and SIMAGE rows referenced by
 * those templates. Existing rows are updated by ID, so the migration is safe
 * to run again after the source catalogue changes.
 */
const os = require('os');
try { os.userInfo(); } catch { os.userInfo = () => ({ username: process.env.USERNAME || 'SYSTEM' }); }

const firebird = require('node-firebird');
const config = require('./src/config');

const sourceDatabase = process.argv[2] || 'D:/Garage/DATA.fdb';
const sourceConfig = { ...config.firebird, database: sourceDatabase, blobAsText: false };
const targetConfig = { ...config.firebird, blobAsText: false };

const connect = (options) => new Promise((resolve, reject) => {
  firebird.attach(options, (error, connection) => error ? reject(error) : resolve(connection));
});

const query = (connection, sql, params = []) => new Promise((resolve, reject) => {
  connection.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows || []));
});

const transaction = (connection) => new Promise((resolve, reject) => {
  connection.transaction(firebird.ISOLATION_READ_COMMITTED, (error, value) => error ? reject(error) : resolve(value));
});

const transactionQuery = (tr, sql, params = []) => new Promise((resolve, reject) => {
  tr.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows || []));
});

const commit = (tr) => new Promise((resolve, reject) => tr.commit((error) => error ? reject(error) : resolve()));
const rollback = (tr) => new Promise((resolve) => tr.rollback(() => resolve()));

const readBlob = (value) => new Promise((resolve, reject) => {
  if (value == null || Buffer.isBuffer(value)) return resolve(value);
  if (typeof value !== 'function') return resolve(Buffer.from(String(value), 'utf8'));
  value((error, name, stream) => {
    if (error) return reject(error);
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
});

async function columns(connection, table) {
  const rows = await query(connection, `
    SELECT TRIM(rf.RDB$FIELD_NAME) AS NAME,
           f.RDB$FIELD_TYPE AS FIELD_TYPE,
           f.RDB$FIELD_SUB_TYPE AS FIELD_SUB_TYPE,
           f.RDB$FIELD_LENGTH AS FIELD_LENGTH,
           f.RDB$FIELD_PRECISION AS FIELD_PRECISION,
           f.RDB$FIELD_SCALE AS FIELD_SCALE
      FROM RDB$RELATION_FIELDS rf
      JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
     WHERE rf.RDB$RELATION_NAME = ?
     ORDER BY rf.RDB$FIELD_POSITION`, [table]);
  return rows.map((row) => ({
    name: row.NAME.trim(),
    fieldType: Number(row.FIELD_TYPE),
    fieldSubType: Number(row.FIELD_SUB_TYPE || 0),
    fieldLength: Number(row.FIELD_LENGTH || 0),
    precision: Number(row.FIELD_PRECISION || 0),
    scale: Number(row.FIELD_SCALE || 0),
    characterLength: Math.max(1, Math.ceil(Number(row.FIELD_LENGTH || 0) / 4)),
    blob: Number(row.FIELD_TYPE) === 261,
  }));
}

function sqlType(column) {
  if (column.fieldType === 7) return column.fieldSubType ? `NUMERIC(${column.precision || 4},${Math.abs(column.scale)})` : 'SMALLINT';
  if (column.fieldType === 8) return column.fieldSubType ? `NUMERIC(${column.precision || 9},${Math.abs(column.scale)})` : 'INTEGER';
  if (column.fieldType === 10) return 'FLOAT';
  if (column.fieldType === 12) return 'DATE';
  if (column.fieldType === 13) return 'TIME';
  if (column.fieldType === 14) return `CHAR(${column.characterLength || column.fieldLength})`;
  if (column.fieldType === 16) return column.fieldSubType ? `NUMERIC(${column.precision || 18},${Math.abs(column.scale)})` : 'BIGINT';
  if (column.fieldType === 27) return 'DOUBLE PRECISION';
  if (column.fieldType === 35) return 'TIMESTAMP';
  if (column.fieldType === 37) return `VARCHAR(${column.characterLength || column.fieldLength})`;
  if (column.fieldType === 261) return `BLOB SUB_TYPE ${column.fieldSubType}`;
  throw new Error(`Không xác định được kiểu Firebird cho cột ${column.name} (type ${column.fieldType}).`);
}

async function ensureTableSchema(source, target, table) {
  const sourceColumns = await columns(source, table);
  const current = new Set((await columns(target, table)).map((item) => item.name));
  for (const column of sourceColumns) {
    if (!current.has(column.name)) {
      await query(target, `ALTER TABLE ${table} ADD ${column.name} ${sqlType(column)}`);
    }
  }
}

async function loadRows(source, table, ids = null) {
  if (ids && !ids.length) return [];
  const sourceColumns = await columns(source, table);
  const sql = ids
    ? `SELECT * FROM ${table} WHERE ID IN (${ids.map(() => '?').join(',')})`
    : `SELECT * FROM ${table}`;
  const rows = await query(source, sql, ids || []);
  for (const row of rows) {
    for (const column of sourceColumns) {
      if (column.blob && row[column.name] != null) row[column.name] = await readBlob(row[column.name]);
    }
  }
  return rows;
}

const compactIds = (values) => [...new Set(values.filter((value) => value != null && String(value).trim() !== ''))];

async function upsertRows(tr, table, rows, sourceColumns, targetColumns) {
  const sourceNames = new Set(sourceColumns.map((column) => column.name));
  const targetNames = new Set(targetColumns.map((column) => column.name));
  const shared = targetColumns.map((column) => column.name).filter((name) => sourceNames.has(name));
  if (!shared.includes('ID')) throw new Error(`${table} không có cột ID dùng để đồng bộ.`);

  const duplicateTemplateData = table === 'STEMPLATE'
    && sourceNames.has('TEMPLATE') && targetNames.has('TEMPLATEDATA') && !shared.includes('TEMPLATEDATA');
  const insertColumns = duplicateTemplateData ? [...shared, 'TEMPLATEDATA'] : shared;
  const sql = `UPDATE OR INSERT INTO ${table} (${insertColumns.join(',')}) VALUES (${insertColumns.map(() => '?').join(',')}) MATCHING (ID)`;

  for (const row of rows) {
    const params = shared.map((name) => row[name]);
    if (duplicateTemplateData) params.push(row.TEMPLATE);
    await transactionQuery(tr, sql, params);
  }
}

(async () => {
  if (sourceDatabase.replace(/\\/g, '/').toLowerCase() === targetConfig.database.replace(/\\/g, '/').toLowerCase()) {
    throw new Error('Database nguồn và database đích không được trùng nhau.');
  }

  const source = await connect(sourceConfig);
  const target = await connect(targetConfig);
  try {
    for (const table of ['SIMAGE', 'STABLEDESC', 'SFORM', 'STEMPLATE']) {
      await ensureTableSchema(source, target, table);
    }

    const templates = (await loadRows(source, 'STEMPLATE')).filter((row) => [0, 30].includes(Number(row.STATUS)));
    const formIds = compactIds(templates.map((row) => row.SFORMID));
    const forms = await loadRows(source, 'SFORM', formIds);
    const tableDescIds = compactIds([
      ...templates.map((row) => row.STABLEDESCID),
      ...forms.map((row) => row.STABLEDESCID),
    ]);
    const tableDescs = await loadRows(source, 'STABLEDESC', tableDescIds);
    const imageIds = compactIds([
      ...templates.map((row) => row.SIMAGEID),
      ...forms.map((row) => row.SIMAGEID),
      ...tableDescs.map((row) => row.SIMAGEID),
    ]);
    const images = await loadRows(source, 'SIMAGE', imageIds);

    const payload = { SIMAGE: images, STABLEDESC: tableDescs, SFORM: forms, STEMPLATE: templates };
    const metadata = {};
    for (const table of Object.keys(payload)) {
      metadata[table] = {
        source: await columns(source, table),
        target: await columns(target, table),
      };
    }

    const tr = await transaction(target);
    try {
      for (const table of ['SIMAGE', 'STABLEDESC', 'SFORM', 'STEMPLATE']) {
        await upsertRows(tr, table, payload[table], metadata[table].source, metadata[table].target);
      }
      await commit(tr);
    } catch (error) {
      await rollback(tr);
      throw error;
    }

    const counts = {};
    for (const table of Object.keys(payload)) {
      const result = await query(target, `SELECT COUNT(*) AS TOTAL FROM ${table}`);
      counts[table] = { imported: payload[table].length, targetTotal: Number(result[0].TOTAL) };
    }
    const [withBlob] = await query(target, 'SELECT COUNT(*) AS TOTAL FROM STEMPLATE WHERE TEMPLATE IS NOT NULL');
    counts.STEMPLATE.withTemplateBlob = Number(withBlob.TOTAL);
    const verification = {};
    const checks = {
      missingForm: `SELECT COUNT(*) AS TOTAL FROM STEMPLATE t LEFT JOIN SFORM f ON f.ID=t.SFORMID WHERE COALESCE(t.SFORMID,'')<>'' AND f.ID IS NULL`,
      missingTableDescription: `SELECT COUNT(*) AS TOTAL FROM STEMPLATE t LEFT JOIN STABLEDESC d ON d.ID=t.STABLEDESCID WHERE COALESCE(t.STABLEDESCID,'')<>'' AND d.ID IS NULL`,
      missingImage: `SELECT COUNT(*) AS TOTAL FROM STEMPLATE t LEFT JOIN SIMAGE i ON i.ID=t.SIMAGEID WHERE COALESCE(t.SIMAGEID,'')<>'' AND i.ID IS NULL`,
      missingDefaultTemplate: `SELECT COUNT(*) AS TOTAL FROM SFORM f LEFT JOIN STEMPLATE t ON t.ID=f.LASTTEMPLATEID WHERE COALESCE(f.LASTTEMPLATEID,'')<>'' AND t.ID IS NULL`,
    };
    for (const [name, sql] of Object.entries(checks)) {
      const [result] = await query(target, sql);
      verification[name] = Number(result.TOTAL);
    }
    console.log(JSON.stringify({ ok: true, source: sourceDatabase, target: targetConfig.database, counts, verification }, null, 2));
  } finally {
    try { source.detach(); } catch { /* ignore */ }
    try { target.detach(); } catch { /* ignore */ }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
