const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/repairSupplements');

test('rejects malformed amounts, missing catalog items and empty proposals', () => {
  const valid = { LOAI: 0, DMATHANGID: 'part', SOLUONG: 1.25, DONGIA: 100.5 };
  assert.equal(service.validateItems([valid])[0].total, 125.63);
  for (const items of [[], null, [{}], [{ ...valid, SOLUONG: -1 }], [{ ...valid, SOLUONG: 0 }],
    [{ ...valid, SOLUONG: 1.001 }], [{ ...valid, DONGIA: Infinity }], [{ ...valid, DONGIA: -1 }],
    [{ ...valid, DONGIA: 1.001 }], [{ ...valid, LOAI: 3 }], [{ ...valid, DMATHANGID: null }]]) {
    assert.throws(() => service.validateItems(items), e => e.statusCode === 400);
  }
});

function fixture(state = 'pending', rates = { taxRate: 0, serviceRate: 0 }) {
  const writes = [];
  const items = [
    { ID: 'part-line', LOAI: 0, DMATHANGID: 'part', SOLUONG: 2, DONGIA: 125, THANHTIEN: 250 },
    { ID: 'service-line', LOAI: 1, DDICHVUID: 'service', SOLUONG: 1, DONGIA: 300, THANHTIEN: 300 },
  ];
  const query = async sql => {
    if (sql.includes('FROM TLENHSUACHUA WHERE')) return [{ ID: 'repair', TILETHUE: rates.taxRate, TILEPHIDICHVU: rates.serviceRate }];
    if (sql.includes('FROM SCONFIG')) return [];
    if (sql.includes('FROM TTRANGTHAIXE')) return [{ ID: 'flow', TRANGTHAI: 2 }];
    if (sql.includes('FROM THOADONSUACHUA')) return [];
    if (sql.includes('FROM TPHATSINHSUACHUA WHERE')) return [{ ID: 'proposal', TRANGTHAI: state, LYDO: 'Hỏng thêm' }];
    if (sql.includes('FROM TPHATSINHSUACHUACT')) return items;
    if (sql.includes('FROM TLENHSUACHUACHITIET')) return [{ PT: 250, CONG: 0 }];
    throw new Error(sql);
  };
  return { query, writes, execute: async (sql, params) => writes.push({ sql, params }), uuid: () => 'new-id' };
}
const decision = ids => ({ action: 'decide', NGUOIXACNHAN: 'Khách A', BANGCHUNG: 'Xác nhận qua điện thoại', approvedItemIds: ids });

test('partial approval inserts only approved snapshot and links its source', async () => {
  const f = fixture();
  const result = await service.decide(f.query, f.execute, f.uuid, 'repair', 'proposal', decision(['part-line']), 'user');
  assert.equal(result.state, 'partially_approved');
  assert.match(f.writes[0].sql, /UPDATE TLENHSUACHUA SET ID=ID/);
  const inserts = f.writes.filter(w => w.sql.includes('INSERT INTO TLENHSUACHUACHITIET'));
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].params[5], 2);
  assert.equal(inserts[0].params[6], 125);
  assert.equal(inserts[0].params.at(-1), 'part-line');
  assert.ok(f.writes.some(w => w.sql.includes('TONGCONG=') && w.params[2] === 250));
});
test('full refusal adds no repair lines', async () => {
  const f = fixture();
  assert.equal((await service.decide(f.query, f.execute, f.uuid, 'repair', 'proposal', decision([]), 'user')).state, 'rejected');
  assert.equal(f.writes.filter(w => w.sql.includes('INSERT INTO TLENHSUACHUACHITIET')).length, 0);
});

test('approved supplement recomputes VAT and service fee using saved order rates', async () => {
  const f = fixture('pending', { taxRate: 20, serviceRate: 10 });
  await service.decide(f.query, f.execute, f.uuid, 'repair', 'proposal', decision(['part-line']), 'user');
  const update = f.writes.find(write => write.sql.includes('TONGCONG='));
  assert.deepEqual(update.params.slice(0, 7), [250, 0, 330, 20, 55, 10, 25]);
});
test('already processed proposals, incomplete evidence and foreign line IDs cannot be approved', async () => {
  for (const [state, body] of [['approved', decision(['part-line'])], ['pending', { ...decision([]), BANGCHUNG: '' }],
    ['pending', decision(['foreign-line'])], ['pending', decision(['part-line', 'part-line'])], ['draft', decision(['part-line'])]]) {
    const f = fixture(state);
    await assert.rejects(() => service.decide(f.query, f.execute, f.uuid, 'repair', 'proposal', body, 'user'));
    assert.equal(f.writes.filter(w => w.sql.includes('INSERT INTO TLENHSUACHUACHITIET')).length, 0);
  }
});
test('delivery is blocked while drafts or pending proposals exist', async () => {
  await assert.rejects(() => service.assertResolved(async () => [{ ID: 'pending' }], 'repair'), e => e.statusCode === 409);
  await service.assertResolved(async () => [], 'repair');
});
test('supplements cannot change delivered repairs or repairs with invoices', async () => {
  for (const closed of ['flow', 'invoice']) {
    const query = async sql => sql.includes('FROM TLENHSUACHUA WHERE') ? [{ ID: 'repair' }] :
      sql.includes('FROM TTRANGTHAIXE') ? [{ ID: 'flow', TRANGTHAI: closed === 'flow' ? 3 : 2 }] : [{ ID: 'invoice' }];
    await assert.rejects(() => service.lockRepair(query, async () => {}, 'repair'), e => e.statusCode === 409);
  }
});

test('Firebird integration: snapshots, partial approval, retry, cancellation and rollback', { skip: process.env.TEST_FIREBIRD !== '1' }, async () => {
  const db = require('../src/db');
  const repairId = db.uuidv4();
  let createdId;
  const rollback = new Error('ROLLBACK_TEST');
  await assert.rejects(db.transaction(async (q, e, uuid) => {
    const vehicle = (await q('SELECT FIRST 1 ID, DKHACHHANGID FROM DXE WHERE STATUS=1 AND DKHACHHANGID IS NOT NULL'))[0];
    const part = (await q('SELECT FIRST 1 ID FROM DMATHANG WHERE STATUS=1'))[0];
    const work = (await q('SELECT FIRST 1 ID FROM DDICHVU WHERE STATUS=1'))[0];
    assert.ok(vehicle && part && work, 'Existing catalogs required for integration test');
    await e(`INSERT INTO TLENHSUACHUA (ID, NAME, DXEID, DKHACHHANGID, TRANGTHAI, STATUS, USERCREATEDID,
      TONGTIENCONG, TONGTIENPHUTUNG, TONGCONG, TILETHUE, TILEPHIDICHVU) VALUES (?, ?, ?, ?, 1, 1, 'TEST', 0, 0, 0, 0, 0)`, [repairId, 'TEST-ROLLBACK', vehicle.ID, vehicle.DKHACHHANGID]);
    await e(`INSERT INTO TTRANGTHAIXE (ID, NAME, DXEID, DKHACHHANGID, TLENHSUACHUAID, TRANGTHAI, STATUS, USERCREATEDID)
      VALUES (?, 'TEST-ROLLBACK', ?, ?, ?, 2, 1, 'TEST')`, [uuid(), vehicle.ID, vehicle.DKHACHHANGID, repairId]);
    const body = { LYDO: 'Kiểm tra phát sinh – dữ liệu sẽ rollback', items: [
      { LOAI: 0, DMATHANGID: part.ID, SOLUONG: 1.25, DONGIA: 12345.5 },
      { LOAI: 1, DDICHVUID: work.ID, SOLUONG: 2, DONGIA: 80000 },
    ] };
    createdId = (await service.create(q, e, uuid, repairId, body, 'TEST')).id;
    const queued = (await service.listQueue(q)).find(row => row.ID === createdId);
    assert.ok(queued);
    assert.equal(queued.TLENHSUACHUAID, repairId);
    assert.equal(queued.DKHACHHANGID, vehicle.DKHACHHANGID);
    assert.equal(queued.TRANGTHAI, 'pending');
    assert.equal(Number(queued.WORKFLOW_STATE), 2);
    assert.equal(Number(queued.SO_HANGMUC), 2);
    assert.equal(Number(queued.TONGPHATSINH), 175431.88);
    assert.equal((await q('SELECT * FROM TLENHSUACHUACHITIET WHERE TLENHSUACHUAID=?', [repairId])).length, 0);
    await assert.rejects(() => service.assertResolved(q, repairId));
    const lines = await q('SELECT * FROM TPHATSINHSUACHUACT WHERE TPHATSINHSUACHUAID=?', [createdId]);
    const approvedLine = lines.find(it => it.LOAI === 0);
    await service.decide(q, e, uuid, repairId, createdId, decision([approvedLine.ID]), 'TEST');
    assert.equal((await service.listQueue(q)).find(row => row.ID === createdId).TRANGTHAI, 'partially_approved');
    const saved = await q('SELECT * FROM TLENHSUACHUACHITIET WHERE TLENHSUACHUAID=?', [repairId]);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].PHATSINHCTID, approvedLine.ID);
    assert.equal(Number(saved[0].SOLUONG), 1.25);
    assert.equal(Number(saved[0].DONGIA), 12345.5);
    const total = (await q('SELECT TONGCONG FROM TLENHSUACHUA WHERE ID=?', [repairId]))[0];
    assert.equal(Number(total.TONGCONG), 15431.88);
    await assert.rejects(() => service.decide(q, e, uuid, repairId, createdId, decision([approvedLine.ID]), 'TEST'), er => er.statusCode === 409);
    await service.assertResolved(q, repairId);
    const draft = await service.create(q, e, uuid, repairId, { ...body, TRANGTHAI: 'draft' }, 'TEST');
    await service.decide(q, e, uuid, repairId, draft.id, { action: 'submit' }, 'TEST');
    await service.decide(q, e, uuid, repairId, draft.id, { action: 'decide', ...decision([]) }, 'TEST');
    const cancelled = await service.create(q, e, uuid, repairId, body, 'TEST');
    await service.decide(q, e, uuid, repairId, cancelled.id, { action: 'cancel' }, 'TEST');
    await service.assertResolved(q, repairId);
    throw rollback;
  }), err => err === rollback);
  assert.equal((await db.query('SELECT ID FROM TLENHSUACHUA WHERE ID=?', [repairId])).length, 0);
  assert.equal((await db.query('SELECT ID FROM TPHATSINHSUACHUA WHERE ID=?', [createdId])).length, 0);
});
