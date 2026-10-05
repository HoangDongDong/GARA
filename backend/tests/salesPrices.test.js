const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const numbers = require('../src/services/documentNumbers');
const router = require('../src/routes/sales');
const createSale = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;

async function save(items, discount = 0, rates = { taxRate: 0, serviceRate: 0 }, input = {}) {
  const originalTransaction = db.transaction;
  const originalNumber = numbers.nextInTransaction;
  const inserts = [];
  let status = 200;
  let body;
  db.transaction = async callback => callback(
    async (sql, params = []) => sql.includes('FROM SCONFIG') ? [
      { NAME: 'MacDinhThueSuat', DECIMALVALUE: rates.taxRate },
      { NAME: 'MacDinhPhiDichVu', DECIMALVALUE: rates.serviceRate },
      ...(rates.taxEnabled === undefined ? [] : [{ NAME: 'BanHangTinhThue', INTVALUE: rates.taxEnabled ? 30 : 0 }]),
      ...(rates.serviceEnabled === undefined ? [] : [{ NAME: 'BanHangTinhPhiDichVu', INTVALUE: rates.serviceEnabled ? 30 : 0 }]),
    ] : [{ ID: params[0], NAME: params[0], GIABAN: 2200000, GIANHAP: 1000000, TON_KHO: 20 }],
    async (sql, params) => { inserts.push({ sql, params }); },
    () => 'test-id',
  );
  numbers.nextInTransaction = async () => 'BH-TEST';
  try {
    await createSale({ body: { items, TILEGIAMGIA: discount, ...input }, get: () => 'test-user' }, {
      status(code) { status = code; return this; },
      json(value) { body = value; },
    });
    return { status, body, inserts };
  } finally {
    db.transaction = originalTransaction;
    numbers.nextInTransaction = originalNumber;
  }
}

test('saves individual edited prices and calculates discount from those prices', async () => {
  const result = await save([
    { DMATHANGID: 'battery', SOLUONG: 2, DONGIA: 2000000 },
    { DMATHANGID: 'filter', SOLUONG: 3, DONGIA: 100000 },
  ], 10);
  assert.equal(result.status, 200);
  assert.equal(result.body.total, 3870000);
  const header = result.inserts[0].params;
  assert.equal(header[6], 4300000);
  assert.equal(header[9], 430000);
  const details = result.inserts.filter(entry => entry.sql.includes('INSERT INTO TDONHANGCHITIET')).map(entry => entry.params);
  assert.deepEqual(details.map(row => [row[3], row[5], row[6], row[7]]), [
    ['battery', 4000000, 2000000, 2], ['filter', 300000, 100000, 3],
  ]);
});

test('accepts a zero price and keeps catalog prices for clients omitting DONGIA', async () => {
  const free = await save([{ DMATHANGID: 'part', SOLUONG: 1, DONGIA: 0 }]);
  assert.equal(free.status, 200);
  assert.equal(free.body.total, 0);
  assert.equal(free.inserts.find(entry => entry.sql.includes('INSERT INTO TDONHANGCHITIET')).params[6], 0);
  const fallback = await save([{ DMATHANGID: 'part', SOLUONG: 2 }]);
  assert.equal(fallback.body.total, 4400000);
  assert.equal(fallback.inserts.find(entry => entry.sql.includes('INSERT INTO TDONHANGCHITIET')).params[6], 2200000);
});

test('rejects invalid edited prices before saving any records', async () => {
  for (const price of [-1, null, '', ' ', 'bad', Infinity, NaN, true, [], {}, Number.MAX_SAFE_INTEGER + 1]) {
    const result = await save([{ DMATHANGID: 'part', SOLUONG: 1, DONGIA: price }]);
    assert.equal(result.status, 400, `price ${String(price)}`);
    assert.match(result.body.error, /Đơn giá/);
    assert.equal(result.inserts.length, 0);
  }
});

test('edited POS price includes default service fee and VAT after discount', async () => {
  const result = await save([{ DMATHANGID: 'battery', SOLUONG: 2, DONGIA: 2000000 }], 10, { taxRate: 20, serviceRate: 10 });
  assert.equal(result.status, 200, result.body.error);
  assert.equal(result.body.discount, 400000);
  assert.equal(result.body.serviceFee, 360000);
  assert.equal(result.body.tax, 792000);
  assert.equal(result.body.total, 4752000);
  assert.deepEqual(result.inserts[0].params.slice(-4), [20, 792000, 10, 360000]);
});

test('disabled POS charges override stale client rates and persist zero tax and fee', async () => {
  const result = await save([{ DMATHANGID: 'part', SOLUONG: 1, DONGIA: 1000000 }], 0,
    { taxRate: 20, serviceRate: 10, taxEnabled: false, serviceEnabled: false },
    { TILETHUE: 20, TILEPHIDICHVU: 10 });
  assert.equal(result.status, 200, result.body.error);
  assert.equal(result.body.total, 1000000);
  assert.equal(result.body.taxEnabled, false);
  assert.equal(result.body.serviceEnabled, false);
  assert.deepEqual(result.inserts[0].params.slice(-4), [0, 0, 0, 0]);
});
