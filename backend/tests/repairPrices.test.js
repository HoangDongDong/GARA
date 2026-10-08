const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const numbers = require('../src/services/documentNumbers');
const router = require('../src/routes/repairOrders');
const createRepair = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;

async function save(items, discount = 0, input = {}) {
  const transaction = db.transaction, nextNumber = numbers.nextInTransaction;
  const writes = [];
  let status = 200, body;
  db.transaction = async callback => callback(async (sql, params) => {
    if (sql.includes('FROM TTRANGTHAIXE')) return [];
    if (sql.includes('FROM SCONFIG')) return [{ NAME: 'MacDinhThueSuat', DECIMALVALUE: 10 }, { NAME: 'MacDinhPhiDichVu', DECIMALVALUE: 0 }];
    return [{ ID: params[0] }];
  }, async (sql, params) => writes.push({ sql, params }), () => 'test-id');
  numbers.nextInTransaction = async () => 'LSC-TEST';
  try {
    await createRepair({ body: { DXEID: 'xe', DKHACHHANGID: 'kh', items, TILEGIAMGIA: discount, ...input }, get: () => 'tester' }, {
      status(code) { status = code; return this; }, json(value) { body = value; },
    });
    return { status, body, writes };
  } finally { db.transaction = transaction; numbers.nextInTransaction = nextNumber; }
}

test('repair saves edited prices, separate line discounts, bill discount and VAT consistently', async () => {
  const result = await save([
    { LOAI: 1, DDICHVUID: 'service', SOLUONG: 1, DONGIA: 200000, TILEGIAMGIA: 10 },
    { LOAI: 0, DMATHANGID: 'part', SOLUONG: 2, DONGIA: 50000 },
  ], 5);
  assert.equal(result.status, 200, result.body?.error);
  const lines = result.writes.filter(write => write.sql.includes('INSERT INTO TLENHSUACHUACHITIET'));
  assert.deepEqual(lines.map(line => line.params.slice(5, 8)), [[1, 200000, 200000], [2, 50000, 100000]]);
  assert.deepEqual(lines.map(line => line.params.slice(-2)), [[10, 20000], [0, 0]]);
  assert.deepEqual(lines.map(line => line.params.slice(11, 15)), [[10, 17100, 5, 29000], [10, 9500, 5, 5000]]);
  const header = result.writes.find(write => write.sql.includes('INSERT INTO TLENHSUACHUA\n'));
  assert.equal(header.params[9], 292600);
  const summary = result.writes.find(write => write.sql.includes('SET CHARGEVERSION=1'));
  assert.equal(summary.params[1], 34000);
});

test('repair preserves an exact money discount instead of recalculating from rounded percent', async () => {
  const result = await save([{ LOAI: 1, DDICHVUID: 'service', SOLUONG: 1, DONGIA: 300000 }], 3.33, { TIENGIAMGIAPHIEU: 10001 });
  assert.equal(result.status, 200, result.body?.error);
  const summary = result.writes.find(write => write.sql.includes('SET CHARGEVERSION=1'));
  assert.equal(summary.params[0], 3.33);
  assert.equal(summary.params[1], 10001);
  assert.equal(result.writes.find(write => write.sql.includes('SET TIENGIAMGIAPHIEU=')).params[0], 10001);
});

test('invalid line discounts and prices fail before writes', async () => {
  for (const discount of [-1, 101, 'bad', 1.001]) {
    const result = await save([{ LOAI: 1, DDICHVUID: 'service', SOLUONG: 1, DONGIA: 100, TILEGIAMGIA: discount }]);
    assert.equal(result.status, 400);
    assert.equal(result.writes.length, 0);
  }
  const result = await save([{ LOAI: 1, DDICHVUID: 'service', SOLUONG: 1, DONGIA: -1 }]);
  assert.equal(result.status, 400);
  assert.equal(result.writes.length, 0);
});
