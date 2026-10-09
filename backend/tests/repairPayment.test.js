const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../src/services/repairPayment');
const db = require('../src/db');
const router = require('../src/routes/invoices');
const pay = router.stack.find(layer => layer.route?.path === '/:id/pay').route.stack[0].handle;

test('repair debt requires explicit consent and an identified customer, including zero collection', () => {
  for (const consent of [undefined, false, 'true']) assert.throws(() => calculate(100, [40, 0, 0], consent, 'customer'), /Cho phép khách nợ/);
  assert.throws(() => calculate(100, [40, 0, 0], true, null), /chọn khách hàng/);
  assert.deepEqual(calculate(100, [0, 0, 0], true, 'customer'), { remaining: 100, paid: false });
  assert.deepEqual(calculate(100, [40, 0, 0], true, 'customer'), { remaining: 60, paid: false });
  assert.deepEqual(calculate(100, [40, 60, 0], false, 'customer'), { remaining: 0, paid: true });
  for (const amount of [-1, NaN, Infinity, 1.001, 101]) assert.throws(() => calculate(100, [amount, 0, 0], true, 'customer'));
});

async function payment(body, { state = 3, cash = 20 } = {}) {
  const original = db.transaction;
  const writes = [], queries = [];
  let status = 200, result;
  db.transaction = callback => callback(async (sql) => {
    queries.push(sql);
    if (sql.includes('FROM THOADONSUACHUA')) return [{ ID: 'invoice', TONGCONG: 100, TIENMAT: cash, CHUYENKHOAN: 0, THE: 0, DKHACHHANGID: 'customer', DXEID: 'vehicle', TLENHSUACHUAID: 'repair' }];
    if (sql.includes('FROM TTRANGTHAIXE')) return [{ TRANGTHAI: state }];
    if (sql.includes('EXECUTE PROCEDURE')) return [];
    if (sql.includes('FROM SCONFIG')) return [];
    throw new Error(sql);
  }, async (sql, params) => writes.push({ sql, params }), () => 'test-id');
  try {
    await pay({ accessUser:{ISADMIN:1}, params: { id: 'invoice' }, body, get: () => 'TEST' }, { status(code) { status = code; return this; }, json(value) { result = value; } });
    return { status, result, writes, queries };
  } finally { db.transaction = original; }
}
test('partial repair payment records unpaid debt and completes handover atomically', async () => {
  const { status, result, writes, queries } = await payment({ TIENMAT: 40, ALLOW_DEBT: true });
  assert.equal(status, 200);
  assert.deepEqual(result, { ok: true, paid: false, remaining: 60, completed: true, requireBill: true });
  assert.match(queries[0], /WITH LOCK/);
  assert.match(writes[0].sql, /CONLAI=\?, CONGNO=\?/);
  assert.deepEqual(writes[0].params.slice(0, 6), [40, 0, 0, 60, 60, 0]);
  assert.equal(queries.some(sql => sql.includes('SP_CHUYEN_TRANGTHAI')), true);
  assert.match(writes[1].sql, /UPDATE TLENHSUACHUA SET TRANGTHAI=3/);
});

test('zero collection with debt consent completes handover without marking the invoice paid', async () => {
  const { result, writes, queries } = await payment({ TIENMAT: 0, ALLOW_DEBT: true }, { cash: 0 });
  assert.equal(result.completed, true);
  assert.equal(result.paid, false);
  assert.equal(result.remaining, 100);
  assert.deepEqual(writes[0].params.slice(0, 6), [0, 0, 0, 100, 100, 0]);
  assert.equal(queries.some(sql => sql.includes('SP_CHUYEN_TRANGTHAI')), true);
});

test('collecting debt after completion does not repeat the workflow transition', async () => {
  for (const body of [{ TIENMAT: 40, ALLOW_DEBT: true }, { CHUYENKHOAN: 80 }]) {
    const { result, queries } = await payment(body, { state: 4 });
    assert.equal(result.completed, true);
    assert.equal(result.paid, body.CHUYENKHOAN === 80);
    assert.equal(queries.some(sql => sql.includes('SP_CHUYEN_TRANGTHAI')), false);
  }
});
test('final repair payment preserves earlier cash, clears debt and completes handover', async () => {
  const { result, writes, queries } = await payment({ CHUYENKHOAN: 80 });
  assert.equal(result.paid, true);
  assert.deepEqual(writes[0].params.slice(0, 6), [20, 80, 0, 0, 0, 1]);
  assert.equal(queries.some(sql => sql.includes('SP_CHUYEN_TRANGTHAI')), true);
});
test('repair payment rejects missing consent and stale amounts before writing', async () => {
  for (const body of [{ TIENMAT: 40 }, { TIENMAT: 10, ALLOW_DEBT: true }]) {
    const { status, writes } = await payment(body);
    assert.ok(status >= 400);
    assert.equal(writes.length, 0);
  }
});

test('creating a repair invoice completes handover for full, partial and zero payment', async () => {
  const create = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;
  const numbers = require('../src/services/documentNumbers');
  const originalTransaction = db.transaction;
  const originalNumber = numbers.nextInTransaction;
  try {
    numbers.nextInTransaction = async () => 'HDSC-TEST';
    for (const cash of [0, 40, 100]) {
      const writes = [], transitions = [];
      db.transaction = callback => callback(async (sql, params) => {
        if (sql.includes('FROM TLENHSUACHUA')) return [{ DXEID: 'vehicle', DKHACHHANGID: 'customer',
          TONGTIENCONG: 100, TONGTIENPHUTUNG: 0, CHARGEVERSION: 1,
          TONGCONG: 100, TILETHUE: 0, TILEPHIDICHVU: 0, TILEGIAMGIA: 0 }];
        if (sql.includes('FROM THOADONSUACHUA')) return [];
        if (sql.includes('FROM TTRANGTHAIXE')) return [{ TRANGTHAI: 3 }];
        if (sql.includes('FROM SCONFIG')) return [];
        if (sql.includes('SP_CHUYEN_TRANGTHAI')) { transitions.push({ sql, params }); return []; }
        throw new Error(sql);
      }, async (sql, params) => writes.push({ sql, params }), () => 'test-id');
      let status = 200, result;
      await create({ accessUser:{ISADMIN:1}, body: { TLENHSUACHUAID: 'repair', TIENMAT: cash, ALLOW_DEBT: cash < 100 }, get: () => 'TEST' },
        { status(code) { status = code; return this; }, json(value) { result = value; } });
      assert.equal(status, 200, result?.error);
      assert.equal(result.completed, true);
      assert.equal(result.paid, cash === 100);
      assert.equal(result.remaining, 100 - cash);
      const invoice = writes.find(write => write.sql.includes('INSERT INTO THOADONSUACHUA'));
      assert.deepEqual(invoice.params.slice(12, 18), [100 - cash, cash, 0, 0, 100 - cash, cash === 100 ? 1 : 0]);
      const order = writes.find(write => write.sql.includes('UPDATE TLENHSUACHUA'));
      assert.deepEqual(order.params, [3, 'TEST', 'repair']);
      assert.equal(transitions.length, 1);
    }
  } finally {
    db.transaction = originalTransaction;
    numbers.nextInTransaction = originalNumber;
  }
});
