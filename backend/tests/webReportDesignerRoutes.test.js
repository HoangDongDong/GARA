const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const designer = require('../src/services/webReportDesigner');

test('web save holds BLOB lock, backs up original, detects stale version and rejects invalid XML', async () => {
  const originals = { transaction: db.transaction, queryBlob: db.queryBlob, backup: designer.backup, listBackups: designer.listBackups };
  let content = Buffer.from('<Report><ReportPage Name="Original"/></Report>');
  let backups = [], updates = 0, locked = false;
  db.queryBlob = async () => content;
  db.transaction = async fn => {
    locked = true;
    try { return await fn(async sql => { assert.match(sql, /WITH LOCK/); return [{ ID: 'test', TEMPLATE: content }]; }, async (sql, params) => { assert.equal(locked, true); assert.match(sql, /UPDATE STEMPLATE/); content = params[0]; updates++; }); }
    finally { locked = false; }
  };
  designer.backup = (id, original) => { assert.equal(locked, true); backups.push(Buffer.from(original)); };
  designer.listBackups = () => [];
  const router = require('../src/routes/printTemplates');
  async function request(method, body) {
    const layer = router.stack.find(layer => layer.route?.path === '/:id/web-content' && layer.route.methods[method]);
    const response = { status: 200, data: null };
    const res = { set() { return this; }, status(code) { response.status = code; return this; }, json(data) { response.data = data; return this; } };
    await layer.route.stack[0].handle({ params: { id: 'test' }, body }, res);
    return response;
  }
  const put = body => request('put', body);
  try {
    const loaded = (await request('get')).data, original = content.toString();
    assert.equal(loaded.version, designer.revision(content));
    const response = await put({ content: '<Report><ReportPage Name="Updated"/></Report>', version: loaded.version });
    assert.equal(response.status, 200);
    assert.equal(updates, 1); assert.equal(backups[0].toString(), original);
    const saved = response.data; assert.equal(saved.version, designer.revision(content));
    assert.equal((await put({ content: '<Report><ReportPage/></Report>', version: loaded.version })).status, 409);
    assert.equal((await put({ content: '<Report><ReportPage></Report>', version: saved.version })).status, 400);
    assert.equal((await put({ content: content.toString(), version: saved.version })).status, 200);
    assert.equal(updates, 1); assert.equal(backups.length, 1);
    assert.equal((await put({ content: content.toString() })).status, 400);
  } finally {
    db.transaction = originals.transaction; db.queryBlob = originals.queryBlob;
    designer.backup = originals.backup; designer.listBackups = originals.listBackups;
  }
});
