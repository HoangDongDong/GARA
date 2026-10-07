const test = require('node:test');
const assert = require('node:assert/strict');
const { load, assertDebt } = require('../src/services/paymentSettings');
test('payment settings apply the same switches to sales and repair', async () => {
  const query = async (sql, names) => [
    { NAME: 'PaymentAllowDebt', INTVALUE: 0 }, { NAME: 'PaymentRequireBill', INTVALUE: 0 },
  ].filter(row => names.includes(row.NAME));
  const sales = await load('sales', query), repair = await load('repair', query);
  assert.deepEqual(sales, { allowDebt: false, requireBill: false });
  assert.deepEqual(repair, sales);
  assert.throws(() => assertDebt(sales, 100), /không cho phép khách nợ/);
  assert.doesNotThrow(() => assertDebt(sales, 0));
  assert.throws(() => assertDebt(repair, 100), /không cho phép khách nợ/);
});
test('both payment flows allow debt and require bill when enabled', async () => {
  const query = async () => [{ NAME: 'PaymentAllowDebt', INTVALUE: 30 }, { NAME: 'PaymentRequireBill', INTVALUE: 30 }];
  for (const scope of ['sales', 'repair']) {
    const settings = await load(scope, query);
    assert.deepEqual(settings, { allowDebt: true, requireBill: true });
    assert.doesNotThrow(() => assertDebt(settings, 100));
  }
});
test('missing configuration preserves the enabled payment behavior', async () => {
  assert.deepEqual(await load('sales', async () => []), { allowDebt: true, requireBill: true });
});
