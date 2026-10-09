const path = require('path');
const crypto = require('crypto');
const firebird = require('node-firebird');
const config = require('../config');
const tenancy = require('../tenancy');
const root = () => path.resolve(process.env.SAAS_DATA_ROOT || path.join(path.dirname(config.firebird.database), 'saas'));
const database = () => path.resolve(process.env.SAAS_PLATFORM_DATABASE || path.join(root(), 'platform-v1.fdb'));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const options = () => ({ ...config.firebird, database: database() });
const attach = () => new Promise((resolve, reject) => firebird.attach(options(), (error, connection) => error ? reject(error) : resolve(connection)));
const sql = (connection, text, params = []) => new Promise((resolve, reject) => connection.query(text, params, (error, rows) => error ? reject(error) : resolve(rows || [])));
async function query(text, params) { const connection = await attach(); try { return await sql(connection, text, params); } finally { connection.detach(); } }
async function transaction(task) {
  const connection = await attach();
  try {
    const tx = await new Promise((resolve, reject) => connection.transaction(firebird.ISOLATION_READ_COMMITTED, (error, tx) => error ? reject(error) : resolve(tx)));
    try {
      const value = await task((text, params) => sql(tx, text, params));
      await new Promise((resolve, reject) => tx.commit(error => error ? reject(error) : resolve()));
      return value;
    } catch (error) { await new Promise(resolve => tx.rollback(resolve)); throw error; }
  } finally { connection.detach(); }
}
function map(row) {
  if (!row) return null;
  if (row.ID !== 'legacy' && !/^[a-f0-9-]{36}$/.test(row.ID)) throw fail('Mã tenant nội bộ không hợp lệ.',503);
  const legacy = row.ID === 'legacy';
  const expected = legacy ? path.resolve(config.firebird.database) : path.join(root(), 'tenants', row.ID + '.fdb');
  if (path.resolve(row.DBPATH).toLowerCase() !== expected.toLowerCase()) throw fail('Ánh xạ database không hợp lệ.', 503);
  return { id: row.ID, code: row.SLUG, name: row.NAME, database: row.DBPATH, state: row.STATE, endsAt: row.ENDSAT ? new Date(row.ENDSAT).toISOString() : null };
}
async function find(id, byCode = false) {
  const [row] = await query(`SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS WHERE ${byCode ? 'SLUG' : 'ID'}=?`, [String(id || '').toLowerCase()]);
  const tenant = map(row);
  if (!tenant || tenant.state !== 'active') throw fail('Cửa hàng chưa sẵn sàng hoặc đã bị khóa.', 403);
  return tenant;
}
function publicTenant(tenant) { return { id: tenant.id, code: tenant.code, name: tenant.name, endsAt: tenant.endsAt, readOnly: !tenancy.writable(tenant) }; }
async function audit(q, actor, tenantId, action, detail) {
  await q('INSERT INTO SAAS_AUDIT (ID,ACTOR,TENANTID,ACTION,DETAIL,CREATED) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)', [crypto.randomUUID(), actor, tenantId, action, String(detail || '').slice(0, 500)]);
}
module.exports = { root, database, options, query, transaction, find, publicTenant, map, audit, fail };
