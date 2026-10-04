const test = require('node:test');
const assert = require('node:assert/strict');
const { templateFilter, templateOptions } = require('../src/services/systemConfigOptions');
const { buildCatalog } = require('../src/services/garagePrintCatalog');
const first = '190263eb-bc79-4ad2-9cee-ecd5d0470426';
const second = '8123b101-10ca-4aed-837f-894103258815';

test('reference lists accept only direct template IDs and preserve empty lists', () => {
  assert.deepEqual(templateFilter(JSON.stringify([first, first, second])), { ids: [first, second] });
  assert.deepEqual(templateFilter(first), { ids: [first] });
  assert.deepEqual(templateFilter('[]'), { ids: [] });
  assert.equal(templateFilter('80mm\r\n54mm'), null);
  assert.throws(() => templateFilter("SFORMID = '5f029a5b-8ec2-4229-bd1d-03fed9569db2'"));
  assert.throws(() => templateFilter('["x\' OR 1=1"]'));
  assert.throws(() => templateFilter('[null]'));
});

test('options query STEMPLATE by parameterized IDs and never by form', async () => {
  let calls = 0;
  const query = async (sql, params) => {
    calls++;
    assert.ok(sql.includes('WHERE ID IN (?,?)'));
    assert.ok(!sql.includes('SFORMID'));
    assert.deepEqual(params, [first, second]);
    return [{ ID: first, NAME: 'Mẫu A4' }];
  };
  assert.deepEqual(await templateOptions(query, { ids: [first, second] }), [{ value: first, label: 'Mẫu A4' }]);
  assert.deepEqual(await templateOptions(query, { ids: [] }), []);
  assert.equal(calls, 1);
});

test('GARA categorization is driven by direct assignments, including templates without SFORM', () => {
  const catalog = buildCatalog([
    { ID: first, NAME: 'Mẫu hóa đơn', STATUS: 30, SFORMID: null },
    { ID: second, NAME: 'Gia hạn thẻ', STATUS: 30, FORM_NAME: 'Gia hạn thẻ' },
  ], [{ NAME: 'MauHoaDonBanHang', OTHERCONFIG: JSON.stringify([first]), TEXTVALUE: first }]);
  assert.equal(catalog.data[0].CATEGORY_NAME, 'Hóa đơn bán phụ tùng');
  assert.equal(catalog.data[0].IS_DEFAULT, 1);
  assert.equal(catalog.data[1].CATEGORY_NAME, 'Mẫu chưa phân loại');
  assert.ok(!catalog.categories.some(item => item.name === 'Gia hạn thẻ'));
  assert.equal(catalog.categories.find(item => item.name === 'Lệnh sửa chữa').count, 0);
});

test('invoice printing uses the configured template and rejects unassigned legacy IDs', async () => {
  const db = require('../src/db');
  const { resolveTemplate } = require('../src/services/salesPrint');
  const originalQuery = db.query;
  const originalBlob = db.queryBlob;
  db.query = async (sql, params) => {
    assert.ok(!sql.includes('SFORM'));
    if (sql.includes('FROM SCONFIG')) return [{ TEXTVALUE: first, OTHERCONFIG: JSON.stringify([first]) }];
    assert.deepEqual(params, [first]);
    return [{ ID: first, NAME: 'Hóa đơn phụ tùng' }];
  };
  db.queryBlob = async () => Buffer.from('<Report/>');
  try {
    assert.equal((await resolveTemplate()).id, first);
    await assert.rejects(resolveTemplate(second), /chưa được gắn/);
  } finally { db.query = originalQuery; db.queryBlob = originalBlob; }
});
