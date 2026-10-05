const test = require('node:test');
const assert = require('node:assert/strict');
const { definitions, salesToggles, validate, loadForSales, resolveForSales, calculate } = require('../src/services/defaultChargeRates');
const { migrate } = require('../migrate_default_charge_rates');

test('default percentages accept zero, decimal and upper boundary; reject invalid input', () => {
  for (const { name } of definitions) {
    for (const value of [0, 10, 20, 100, 7.5, '8.25']) assert.doesNotThrow(() => validate(name, value));
    for (const value of [-1, 100.01, 7.123, null, '', ' ', 'bad', NaN, Infinity, true, []]) {
      assert.throws(() => validate(name, value), error => error.status === 400);
    }
  }
});

test('migration adds both defaults once and preserves previously saved values', async () => {
  const groups = [];
  const rows = [];
  const database = { transaction: callback => callback(
    async (sql, params) => sql.includes('FROM SCONFIGGROUP') ? groups : rows.filter(row => row.NAME === params[0]),
    async (sql, params) => {
      if (sql.includes('INSERT INTO SCONFIGGROUP')) groups.push({ ID: params[0] });
      else rows.push({ ID: params[0], NAME: params[1], value: params[3] });
    },
    () => String(groups.length + rows.length + 1),
  ) };
  assert.deepEqual(await migrate(database), { added: 4 });
  assert.deepEqual(rows.map(row => row.value), [20, 10, 30, 30]);
  rows[0].value = 8.25;
  assert.deepEqual(await migrate(database), { added: 0 });
  assert.equal(groups.length, 1);
  assert.equal(rows[0].value, 8.25);
});

test('POS switches independently suppress charges and retain configured percentages', async () => {
  for (const taxEnabled of [false, true]) for (const serviceEnabled of [false, true]) {
    const rows = [
      { NAME: 'MacDinhThueSuat', DECIMALVALUE: 20 }, { NAME: 'MacDinhPhiDichVu', DECIMALVALUE: 10 },
      { NAME: 'BanHangTinhThue', INTVALUE: taxEnabled ? 30 : 0 },
      { NAME: 'BanHangTinhPhiDichVu', INTVALUE: serviceEnabled ? 30 : 0 },
    ];
    const defaults = await loadForSales(async () => rows);
    assert.equal(defaults.taxEnabled, taxEnabled);
    assert.equal(defaults.serviceEnabled, serviceEnabled);
    const applied = resolveForSales({ TILETHUE: 20, TILEPHIDICHVU: 10 }, defaults);
    const total = calculate(1000000, applied);
    assert.equal(total.serviceFee, serviceEnabled ? 100000 : 0);
    assert.equal(total.tax, taxEnabled ? (serviceEnabled ? 220000 : 200000) : 0);
    assert.equal(rows[0].DECIMALVALUE, 20);
    assert.equal(rows[1].DECIMALVALUE, 10);
  }
  for (const toggle of salesToggles) {
    for (const value of [0, 30, '0', '30']) assert.doesNotThrow(() => validate(toggle.name, value));
    for (const value of [1, null, '', true, [], 31]) assert.throws(() => validate(toggle.name, value));
  }
});
