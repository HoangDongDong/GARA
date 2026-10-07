const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const commissions = require('../src/services/repairCommissions');
const catalog = require('../src/services/catalogData');
const repairs = require('../src/routes/repairOrders');
const workflow = require('../src/routes/workflow');
const partsRouter = require('../src/routes/parts');
const handler = (router, method, path) => router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
async function call(router, method, path, body = {}, params = {}) {
  let status = 200, result;
  await handler(router, method, path)({ body, params, get: () => 'SYSTEM', accessUser: { ID: 'SYSTEM', ISADMIN: 1 } }, {
    status(value) { status = value; return this; }, json(value) { result = value; },
  });
  return { status, result };
}
test('Firebird confirmation saves staff shares and commission snapshots atomically; all test changes roll back', { skip: process.env.TEST_FIREBIRD !== '1' }, async () => {
  const original = { query: db.query, execute: db.execute, transaction: db.transaction };
  const rollback = new Error('COMMISSION_TEST_ROLLBACK');
  let repairId;
  await assert.rejects(original.transaction(async (query, execute, uuid) => {
    db.query = query; db.execute = execute; db.transaction = callback => callback(query, execute, uuid);
    try {
      const [customer] = await query('SELECT FIRST 1 ID FROM DKHACHHANG WHERE STATUS=1');
      const service = { ID: uuid() }, part = { ID: uuid() };
      await execute("INSERT INTO DDICHVU (ID,NAME,CODE,STATUS,USERCREATEDID) VALUES (?, ?, ?, 1, 'SYSTEM')", [service.ID, service.ID, service.ID]);
      await execute("INSERT INTO DMATHANG (ID,NAME,CODE,STATUS,USERCREATEDID) VALUES (?, ?, ?, 1, 'SYSTEM')", [part.ID, part.ID, part.ID]);
      assert.ok(customer && service && part);
      const createdPart = await call(partsRouter, 'post', '/', { NAME: 'Commission API test', CODE: uuid(), HHKIEU: 2, HHGIATRI: 12000 });
      assert.equal(createdPart.status, 200, createdPart.result.error);
      assert.equal(Number((await query('SELECT HHGIATRI FROM DMATHANG WHERE ID=?', [createdPart.result.id]))[0].HHGIATRI), 12000);
      const updatedPart = await call(partsRouter, 'put', '/:id', { NAME: 'Commission API test', CODE: uuid(), HHKIEU: 1, HHGIATRI: 5 }, { id: createdPart.result.id });
      assert.equal(updatedPart.status, 200, updatedPart.result.error);
      assert.equal(Number((await query('SELECT HHGIATRI FROM DMATHANG WHERE ID=?', [createdPart.result.id]))[0].HHGIATRI), 5);
      await catalog.save('services', service.ID, { HHKIEU: 1, HHGIATRI: 20 }, 'SYSTEM');
      await catalog.save('parts', part.ID, { HHKIEU: 2, HHGIATRI: 25000 }, 'SYSTEM');
      const vehicleId = uuid();
      await execute("INSERT INTO DXE (ID,NAME,BIENSO,DKHACHHANGID,STATUS,USERCREATEDID) VALUES (?, 'HH-TEST', 'HH-ROLLBACK', ?, 1, 'SYSTEM')", [vehicleId, customer.ID]);
      const employees = [uuid(), uuid()];
      for (const id of employees) await execute("INSERT INTO DNHANVIEN (ID,NAME,STATUS,USERCREATEDID) VALUES (?, 'HH test', 1, 'SYSTEM')", [id]);
      const created = await call(repairs, 'post', '/', { DXEID: vehicleId, DKHACHHANGID: customer.ID, TILEGIAMGIA: 10,
        items: [{ LOAI: 1, DDICHVUID: service.ID, SOLUONG: 1, DONGIA: 1000000 }, { LOAI: 0, DMATHANGID: part.ID, SOLUONG: 2, DONGIA: 100000 }] });
      assert.equal(created.status, 200, created.result.error);
      repairId = created.result.id;
      const base = { DXEID: vehicleId, TLENHSUACHUAID: repairId, TRANGTHAI: 1 };
      assert.equal((await call(workflow, 'post', '/transition', base)).status, 200);
      const missing = await call(workflow, 'post', '/transition', { ...base, TRANGTHAI: 2 });
      assert.equal(missing.status, 400);
      assert.equal(Number((await query('SELECT TRANGTHAI FROM TTRANGTHAIXE WHERE TLENHSUACHUAID=? AND STATUS=1', [repairId]))[0].TRANGTHAI), 1);
      assert.equal((await query('SELECT ID FROM THOAHONGSUACHUA WHERE TLENHSUACHUAID=?', [repairId])).length, 0);
      const preview = await commissions.preview(query, repairId);
      assert.equal(preview.total, 230000);
      const assignments = [{ employeeId: employees[0], share: 60, primary: true }, { employeeId: employees[1], share: 40, primary: false }];
      const confirmed = await call(workflow, 'post', '/transition', { ...base, TRANGTHAI: 2, assignments });
      assert.equal(confirmed.status, 200, confirmed.result.error);
      const saved = await commissions.preview(query, repairId);
      assert.equal(saved.captured, true);
      assert.equal(saved.total, 230000);
      assert.deepEqual(saved.assignments.map(row => Number(row.HOAHONG)), [138000, 92000]);
      assert.equal((await query('SELECT DNHANVIENKTVID FROM TTRANGTHAIXE WHERE TLENHSUACHUAID=? AND STATUS=1', [repairId]))[0].DNHANVIENKTVID, employees[0]);
      await catalog.save('services', service.ID, { HHKIEU: 2, HHGIATRI: 30000 }, 'SYSTEM');
      await catalog.save('parts', part.ID, { HHKIEU: 0, HHGIATRI: 0 }, 'SYSTEM');
      assert.equal((await commissions.preview(query, repairId)).total, 230000, 'Changing catalogs must not change captured rates');
      const detailId = uuid();
      await execute("INSERT INTO TLENHSUACHUACHITIET (ID,TLENHSUACHUAID,DDICHVUID,SOLUONG,DONGIA,THANHTIEN,LOAI,STATUS,USERCREATEDID) VALUES (?,?,?,1,100000,100000,1,1,'SYSTEM')", [detailId, repairId, service.ID]);
      await commissions.captureAdditional(query, execute, uuid, repairId, 'SYSTEM');
      const additional = await commissions.preview(query, repairId);
      assert.equal(additional.total, 260000);
      assert.deepEqual(additional.assignments.map(row => Number(row.HOAHONG)), [156000, 104000]);
      await commissions.captureAdditional(query, execute, uuid, repairId, 'SYSTEM');
      assert.equal((await commissions.preview(query, repairId)).total, 260000, 'Additional capture must not duplicate commissions');
      assert.equal((await call(workflow, 'post', '/transition', { ...base, TRANGTHAI: 2, assignments })).status, 400);
      throw rollback;
    } finally { Object.assign(db, original); }
  }), error => error === rollback);
  assert.equal((await db.query('SELECT ID FROM TLENHSUACHUA WHERE ID=?', [repairId])).length, 0);
});
