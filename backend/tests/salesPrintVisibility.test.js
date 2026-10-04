const test = require('node:test');
const assert = require('node:assert/strict');
const { flags, validate } = require('../src/services/salesPrintVisibility');
const { annotate } = require('../migrate_sales_print_visibility');
test('display configuration preserves defaults and independently hides selected rows', () => {
  const values = flags([{ NAME: 'SalesPrintShow_tax', INTVALUE: 0 }, { NAME: 'SalesPrintShow_discount', INTVALUE: 30 }]);
  assert.equal(values.PrintShow_tax, false);
  assert.equal(values.PrintShow_discount, true);
  assert.equal(values.PrintShow_shipping, true);
  assert.throws(() => validate('SalesPrintShow_tax', 99));
  assert.doesNotThrow(() => validate('SalesPrintShow_tax', 0));
});
test('FRX connects table rows and paired summary objects without hiding the grand total', () => {
  const xml = '<Report><Dictionary></Dictionary><ReportPage><TableObject><TableRow Name="Discount" VisibleExpression="[TIENGIAMGIA]"><TableCell Text="Giảm"/><TableCell Text="[TIENGIAMGIA]"/></TableRow><TableRow Name="Total"><TableCell Text="[TONGCONG]"/></TableRow></TableObject><ReportSummaryBand><TextObject Name="Label" Top="25" Text="Chiết khấu:"/><TextObject Name="Value" Top="25" Text="[DiscountText]"/><TextObject Name="Grand" Top="50" Text="[TotalNumberText]"/></ReportSummaryBand></ReportPage></Report>';
  const result = annotate(xml);
  assert.equal((result.match(/VisibleExpression="\[PrintShow_discount\]"/g) || []).length, 3);
  assert.ok(result.includes('<TableRow Name="Total">'));
  assert.ok(result.includes('<TextObject Name="Grand" Top="50" Text="[TotalNumberText]"/>'));
  assert.equal(annotate(result), result);
  const returns = annotate('<Dictionary></Dictionary><TableRow Name="Returns"><TableCell Text="Đổi trả"/><TableCell VisibleExpression="[TIENGIAMGIA]!=0 || [DOITRA]!=0" Text="[DOITRA]"/></TableRow>');
  assert.ok(returns.includes('<TableRow Name="Returns" VisibleExpression="[PrintShow_returns]">'));
});
