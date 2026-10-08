const test = require('node:test');
const assert = require('node:assert/strict');
const { accountOptions, validateAccount } = require('../src/services/paymentAccountConfig');

test('payment account options use active database accounts and readable bank details', async () => {
  const options = await accountOptions(async sql => {
    assert.match(sql, /WHERE STATUS=1/);
    return [{ ID: 'account-1', NAME: 'Gara', SOTAIKHOAN: '123456', TENNGANHANG: 'Vietcombank' }];
  });
  assert.deepEqual(options, [{ value: 'account-1', label: 'Vietcombank — 123456 — Gara' }]);
});

test('inactive or missing payment accounts cannot be saved', async () => {
  await assert.rejects(validateAccount(async (sql, params) => {
    assert.match(sql, /STATUS=1/);
    assert.deepEqual(params, ['missing']);
    return [];
  }, 'missing'), error => error.status === 400);
  await validateAccount(async () => [{ ID: 'active' }], 'active');
});

test('payment account choice can be cleared', async () => {
  await validateAccount(() => { throw new Error('Unnecessary query'); }, '');
});
