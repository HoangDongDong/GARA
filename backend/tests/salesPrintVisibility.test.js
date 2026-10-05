const test = require('node:test');
const assert = require('node:assert/strict');
const { flags, validate, hideZeroValues } = require('../src/services/salesPrintVisibility');
const { formatSalesTotal } = require('../src/services/chargePrint');
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

test('zero invoice amounts are hidden while nonzero values respect configured visibility', () => {
  const parameters = hideZeroValues({ ...flags([]), TIENHANG: 2200000, TIENGIAMGIA: 0, TIENTHUE: '0',
    PHIDICHVU: 0, PHIVANCHUYEN: 0, TRALAI: 0, CHUYENKHOAN: 2200000, TONGCONG: 2200000 });
  assert.equal(parameters.PrintShow_discount, false);
  assert.equal(parameters.PrintShow_tax, false);
  assert.equal(parameters.PrintShow_serviceFee, false);
  assert.equal(parameters.PrintShow_shipping, false);
  assert.equal(parameters.PrintShow_change, false);
  assert.equal(parameters.PrintShow_subtotal, true);
  assert.equal(parameters.PrintShow_transfer, true);
  assert.equal(parameters.TONGCONG, 2200000);
  const hidden = hideZeroValues({ ...flags([{ NAME: 'SalesPrintShow_tax', INTVALUE: 0 }]), TIENTHUE: 200000 });
  assert.equal(hidden.PrintShow_tax, false);
  assert.equal(hideZeroValues({ ...flags([]), TIENTHUE: 200000 }).PrintShow_tax, true);
});

test('total formatting uses comma text and preserves row layout and monetary numeric data', () => {
  const xml = '<TableCell Name="Grand" Text="[TONGCONG]" Font="Tahoma, 12pt, style=Bold" Format="Custom" Format.Format="n0"/><TextObject Name="Total" Text="[TotalNumberText]"/><TableCell Text="[TIENHANG]"/>';
  const result = formatSalesTotal(xml);
  assert.equal((result.match(/\[TotalCommaText\]/g) || []).length, 2);
  assert.match(result, /Font="Tahoma, 12pt, style=Bold"/);
  assert.match(result, /\[TIENHANG\]/);
  assert.doesNotMatch(result, /Format=/);
  assert.equal(formatSalesTotal(result), result);
});
