const test = require('node:test');
const assert = require('node:assert/strict');
const commissions = require('../src/services/repairCommissions');

test('commissions use discounted pre-tax amount or fixed amount per quantity', () => {
  const base = { ID: 'detail', SOLUONG: 2, THANHTIEN: 1000000, TIENGIAMGIA: 100000, TIENTHUE: 90000 };
  assert.equal(commissions.calculateLine({ ...base, HHKIEU: 1, HHGIATRI: 10 }).HOAHONG, 90000);
  assert.equal(commissions.calculateLine({ ...base, HHKIEU: 2, HHGIATRI: 15000 }).HOAHONG, 30000);
  assert.equal(commissions.calculateLine({ ...base, HHKIEU: 0, HHGIATRI: 100 }).HOAHONG, 0);
  for (const config of [{ HHKIEU: 1, HHGIATRI: 101 }, { HHKIEU: 4, HHGIATRI: 1 }, { HHKIEU: 2, HHGIATRI: -1 }, { HHKIEU: 1, HHGIATRI: 1.111 }, { HHKIEU: 1 }]) assert.throws(() => commissions.validateConfig(config));
});
test('assignments require unique employees, exact 100 percent and one primary', () => {
  const rows = [{ employeeId: 'a', share: 60, primary: true }, { employeeId: 'b', share: 40 }];
  assert.equal(commissions.validateAssignments(rows).length, 2);
  for (const invalid of [[], [rows[0]], [rows[0], { ...rows[1], employeeId: 'a' }], [{ ...rows[0], primary: false }, rows[1]], [rows[0], { ...rows[1], primary: true }], [rows[0], { ...rows[1], share: 39.99 }]]) assert.throws(() => commissions.validateAssignments(invalid));
  assert.deepEqual(commissions.distribute(150000, commissions.validateAssignments(rows)).map(row => row.amount), [90000, 60000]);
});
test('rounding preserves the pool, including fractions of one cent', () => {
  const rows = commissions.validateAssignments([{ employeeId: 'a', share: 33.34, primary: true }, { employeeId: 'b', share: 33.33 }, { employeeId: 'c', share: 33.33 }]);
  for (const total of [0, 0.01, 1, 123.45, 999999.99]) assert.equal(commissions.distribute(total, rows).reduce((sum, row) => sum + Math.round(row.amount * 100), 0), Math.round(total * 100));
});
