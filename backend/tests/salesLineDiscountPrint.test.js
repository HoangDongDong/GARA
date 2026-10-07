const test = require('node:test');
const assert = require('node:assert/strict');
const { prepare, template, hideUnusedDiscountColumns, fitMoneyColumns } = require('../src/services/salesLineDiscountPrint');

test('price and amount columns fit the invoice values and give remaining width to the item name', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '../templates/receipt80/sales-simple.frx'), 'utf8');
  const widths = xml => [...xml.match(/<TableObject Name="detail"[\s\S]*?<\/TableObject>/)[0].matchAll(/<TableColumn[^>]*Width="([^"]+)"/g)].map(match => Number(match[1]));
  const rows = [{ DONGIA: 2200000, LineNetAmount: 2200000, LineDiscountRate: 0 }];
  const withoutCk = hideUnusedDiscountColumns(source, rows);
  const before = widths(withoutCk);
  const after = widths(fitMoneyColumns(withoutCk, rows));
  assert.ok(after[0] > before[0]);
  assert.equal(after[2], after[3]);
  assert.ok(Math.abs(after.reduce((a,b)=>a+b,0) - before.reduce((a,b)=>a+b,0)) < 0.01);
  const larger = widths(fitMoneyColumns(withoutCk, [{ DONGIA: 22000000, LineNetAmount: 22000000 }]));
  assert.ok(larger[2] > after[2]);
  assert.ok(larger[0] < after[0]);
});
test('bill shows line discount and discounted price before the additional bill reduction', () => {
  const result = prepare({ TIENHANG: 100000, TILEGIAMGIA: 10, TIENGIAMGIA: 91000 },
    [{ THANHTIEN: 100000, DONGIA: 100000, SLXUAT: 1, TILECHIETKHAU: 90, TIENCHIETKHAU: 90000 }]);
  assert.equal(result.rows[0].LineDiscountRate, 90);
  assert.equal(result.rows[0].LineNetPrice, 10000);
  assert.equal(result.rows[0].LineNetAmount, 10000);
  assert.equal(result.afterLineDiscount, 10000);
  assert.equal(result.billDiscount, 1000);
});

test('all receipt variants hide CK only when the entire invoice has no line discount', () => {
  const fs = require('fs');
  const path = require('path');
  for (const file of ['MauHoaDonBanHang.frx', '80mm2.frx', 'sales-stt.frx', 'sales-simple.frx', 'sales-two-lines.frx']) {
    const xml = fs.readFileSync(path.join(__dirname, '../templates/receipt80', file), 'utf8');
    const hidden = hideUnusedDiscountColumns(xml, [{ LineDiscountRate: 0, LineDiscountAmount: 0 }]);
    assert.doesNotMatch(hidden, /Text="CK\s*%"/, file);
    assert.doesNotMatch(hidden, /Text="\[Table0.LineDiscountRate\]%"/, file);
    assert.match(hidden, /SalesBillDiscount/, 'Keep bill discounts independent');
    if (file === 'sales-two-lines.frx') assert.match(hidden, /Name="VariantItemTitle"[^>]*ColSpan="3"/);
    const mixed = hideUnusedDiscountColumns(xml, [{ LineDiscountRate: 0 }, { LineDiscountRate: 10 }]);
    assert.match(mixed, /Text="CK\s*%"/);
    assert.match(mixed, /Text="\[Table0.LineDiscountText\]"/);
    assert.doesNotMatch(mixed, /Text="\[Table0.LineDiscountRate\]%"/);
  }
});
test('older saved combined discounts are recovered without treating the bill rate as a line discount', () => {
  const header = { TIENHANG: 150000, TILEGIAMGIA: 10, TIENGIAMGIA: 28500 };
  const result = prepare(header, [{ THANHTIEN: 150000, SLXUAT: 3, TIENGIAMGIA: 28500 }]);
  assert.equal(result.rows[0].LineDiscountRate, 10);
  assert.equal(result.rows[0].LineNetPrice, 45000);
  assert.equal(result.billDiscount, 13500);
  const plain = prepare({ TIENHANG: 150000, TILEGIAMGIA: 10, TIENGIAMGIA: 15000 }, [{ THANHTIEN: 150000, SLXUAT: 1, TIENGIAMGIA: 15000 }]);
  assert.equal(plain.rows[0].LineDiscountRate, 0);
  assert.equal(plain.rows[0].LineDiscountText, '');
  assert.equal(result.rows[0].LineDiscountText, '10%');
});
test('receipt adapter adds CK column, discounted prices and distinct bill totals', () => {
  const xml = '<Report><Dictionary><TableDataSource Name="Table0"></TableDataSource></Dictionary><TableObject Name="colHeader" Left="5"><TableColumn/></TableObject><TableObject Name="detail" Left="5"><TableColumn/></TableObject><TextObject Text="[TIENGIAMGIA] [TIENHANG]"/></Report>';
  const adapted = template(xml);
  assert.match(adapted, /Text="CK %"/);
  assert.match(adapted, /Text="Giá"/);
  assert.match(adapted, /Text="\[Table0.DONGIA\]"/);
  assert.match(adapted, /Text="\[Table0.LineNetAmount\]"/);
  assert.match(adapted, /SalesBillDiscount/);
  assert.equal((adapted.match(/<TableColumn /g) || []).length, 12);
  assert.equal(template(adapted), adapted);
});
