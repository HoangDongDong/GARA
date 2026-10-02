const os = require('os');
try {
  os.userInfo();
} catch {
  os.userInfo = () => ({ username: process.env.USERNAME || 'SYSTEM' });
}
const firebird = require('node-firebird');

const database = process.argv[2] || 'D:/Garage/GARAGE.FDB';
const tables = ['DNHANVIEN', 'SUSER', 'SGROUPUSER', 'SFUNCTION', 'SGROUPROLE'];
const config = {
  host: process.env.FB_HOST || '127.0.0.1',
  port: Number(process.env.FB_PORT || 3050),
  database,
  user: process.env.FB_USER || 'SYSDBA',
  password: process.env.FB_PASSWORD || 'masterkey',
  page_size: 65536,
};

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows || []));
});

firebird.attach(config, async (error, db) => {
  if (error) throw error;
  try {
    console.log(`DATABASE: ${database}`);
    for (const table of tables) {
      const columns = await run(db, `
        SELECT TRIM(rf.RDB$FIELD_NAME) AS COLNAME,
               f.RDB$FIELD_TYPE AS FIELDTYPE,
               f.RDB$FIELD_LENGTH AS FIELDLENGTH,
               rf.RDB$NULL_FLAG AS NOTNULL
          FROM RDB$RELATION_FIELDS rf
          JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
         WHERE rf.RDB$RELATION_NAME = ?
         ORDER BY rf.RDB$FIELD_POSITION`, [table]);
      if (!columns.length) {
        console.log(`\n${table}: MISSING`);
        continue;
      }
      console.log(`\n${table}: ${columns.map((column) => column.COLNAME.trim()).join(', ')}`);
      const rows = await run(db, `SELECT FIRST 10 * FROM ${table}`);
      console.log(JSON.stringify(rows, (key, value) => {
        if (Buffer.isBuffer(value)) return `<BLOB ${value.length}>`;
        if (typeof value === 'function') return '<BLOB>';
        return value;
      }, 2));
    }
  } catch (queryError) {
    console.error(queryError);
    process.exitCode = 1;
  } finally {
    db.detach();
  }
});
