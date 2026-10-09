const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const charges = require('../src/services/defaultChargeRates');
const { applyServiceFeeRow } = require('../src/services/chargePrint');
const numbers = require('../src/services/documentNumbers');
const router = require('../src/routes/invoices');
const createInvoice = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;

test('frontend and server totals agree for zero rates, decimals and discounts', async () => {
  const { calculateCharges } = await import('../../frontend/src/utils/chargeTotals.js');
  for (const base of [0, 250, 12345.5, 2200000]) for (const rates of [
    { taxRate: 0, serviceRate: 0 }, { taxRate: 20, serviceRate: 10 }, { taxRate: 8.25, serviceRate: 2.5 },
  ]) for (const discount of [0, base / 10, base]) {
    assert.deepEqual(calculateCharges(base, rates, discount), charges.calculate(base, rates, discount));
  }
  assert.deepEqual(charges.calculate(2200000, { taxRate: 20, serviceRate: 10 }), {
    subtotal: 2200000, discount: 0, serviceFee: 220000, tax: 484000, total: 2904000,
  });
});

async function invoice(body = {}, orderRates = { TILETHUE: 20, TILEPHIDICHVU: 10 }, duplicate = false) {
  const original = db.transaction, originalNumber = numbers.nextInTransaction;
  const writes = [];
  let status = 200, result;
  db.transaction = callback => callback(async sql => {
    if (sql.includes('FROM TLENHSUACHUA')) return [{ DXEID: 'vehicle', DKHACHHANGID: 'customer', TONGTIENCONG: '300000', TONGTIENPHUTUNG: '700000', ...orderRates }];
    if (sql.includes('FROM THOADONSUACHUA')) return duplicate ? [{ ID: 'old' }] : [];
    if (sql.includes('FROM TTRANGTHAIXE')) return [{ TRANGTHAI: 3 }];
    if (sql.includes('FROM SCONFIG')) return [{ NAME: 'MacDinhThueSuat', DECIMALVALUE: 8 }, { NAME: 'MacDinhPhiDichVu', DECIMALVALUE: 5 }];
    if (sql.includes('EXECUTE PROCEDURE')) return [];
    throw new Error(sql);
  }, async (sql, params) => writes.push({ sql, params }), () => 'test-id');
  numbers.nextInTransaction = async () => 'HDSC-TEST';
  try {
    await createInvoice({ accessUser:{ISADMIN:1}, body: { TLENHSUACHUAID: 'repair', TIENMAT: 1320000, ...body }, get: () => 'TEST' }, {
      status(code) { status = code; return this; }, json(value) { result = value; },
    });
    return { status, result, writes };
  } finally { db.transaction = original; numbers.nextInTransaction = originalNumber; }
}

test('repair invoice preserves saved quote rates after defaults change and stores paid total', async () => {
  const { status, result, writes } = await invoice();
  assert.equal(status, 200, result.error);
  assert.equal(result.serviceFee, 100000);
  assert.equal(result.tax, 220000);
  assert.equal(result.total, 1320000);
  assert.equal(result.paid, true);
  assert.equal(result.remaining, 0);
  assert.equal(writes[0].params[11], result.total);
  assert.deepEqual(writes[0].params.slice(-3), [20, 10, 100000]);
});

test('legacy unpaid repair uses defaults; saved zero rates stay zero', async () => {
  const legacy = await invoice({ TIENMAT: 1134000 }, { TILETHUE: null, TILEPHIDICHVU: null });
  assert.equal(legacy.result.total, 1134000);
  const zero = await invoice({ TIENMAT: 1000000 }, { TILETHUE: 0, TILEPHIDICHVU: 0 });
  assert.equal(zero.result.total, 1000000);
});

test('repair discount affects both charges; partial payment retains outstanding balance', async () => {
  const { result } = await invoice({ TIENGIAMGIA: 100000, TIENMAT: 500000, ALLOW_DEBT: true });
  assert.equal(result.serviceFee, 90000);
  assert.equal(result.tax, 198000);
  assert.equal(result.total, 1188000);
  assert.equal(result.paid, false);
  assert.equal(result.remaining, 688000);
});

test('duplicate invoice and invalid payment cannot write an invoice', async () => {
  const duplicate = await invoice({}, undefined, true);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.writes.length, 0);
  const negative = await invoice({ TIENMAT: -1 });
  assert.equal(negative.status, 400);
  assert.equal(negative.writes.length, 0);
});

test('receipt fee row appears once beside VAT and keeps unique names and visibility', () => {
  const xml = '<TableRow Name="TaxRow" VisibleExpression="[PrintShow_tax]"><TableCell Name="Label" Text="VAT ([TILETHUE]%):"/><TableCell Name="Amount" Text="[TIENTHUE]"/></TableRow>';
  const changed = applyServiceFeeRow(xml, { PHIDICHVU: 100000 });
  assert.match(changed, /Phí dịch vụ \(\[TILEPHIDICHVU\]%\)/);
  assert.match(changed, /\[PHIDICHVU\]/);
  assert.match(changed, /Name="ChargeFee_TaxRow"/);
  assert.match(changed, /PrintShow_serviceFee/);
  assert.equal(applyServiceFeeRow(changed, { PHIDICHVU: 100000 }), changed);
  assert.equal(applyServiceFeeRow(xml, { PHIDICHVU: 0 }), xml);
});
