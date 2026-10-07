const test = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../src/services/salesSettings');
test('reads disabled POS controls and numeric settings', async () => {
  const result = await settings.load(async () => [
    ...['ChoPhepNhapGiamGia','ChoPhepInTamTinh','HienThiAnhSanPham','BanHangDungDauDocMaVach'].map(NAME => ({ NAME, INTVALUE: 0 })),
    { NAME: 'BatBuocNhapKhachHang', INTVALUE: 30 },
    { NAME: 'LamTronTien', INTVALUE: 500 }, { NAME: 'MacDinhGiamGia', DECIMALVALUE: 10 },
  ]);
  assert.deepEqual(result, { allowDiscount:false, allowDraftPrint:false, showProductImages:false, barcodeEnabled:false, requireCustomer:true, roundingStep:500, defaultDiscount:10 });
  assert.throws(() => settings.discount(null, 5, result), /không cho phép/);
  assert.equal(settings.discount(null, null, result).discountRate, 10);
  assert.equal(settings.discount({GIAMGIARIENG:0}, null, result).discountRate, 0);
  assert.equal(settings.discount({GIAMGIANHOM:15}, null, result).discountRate, 15);
});
test('validates rounding increments and default discounts', () => {
  for (const value of [0,500,1000,null]) assert.doesNotThrow(() => settings.validate('LamTronTien',value));
  for (const value of [-1,100,501,'bad']) assert.throws(() => settings.validate('LamTronTien',value));
  for (const value of [-1,101,'bad',1.001]) assert.throws(() => settings.validate('MacDinhGiamGia',value));
});
test('frontend and backend agree on rounded totals without altering VAT or discounts', async () => {
  const backend = require('../src/services/pricingPolicy');
  const frontend = await import('../../frontend/src/utils/pricingPolicy.js');
  for (const roundingStep of [0,500,1000]) for (const amount of [1249,1250,1499,1500,19751]) {
    const rates = { taxRate:10, serviceRate:5, roundingStep };
    const lines = [{amount,taxRate:10}];
    const actual = backend.calculate(lines,rates,10);
    assert.deepEqual(actual,frontend.calculate(lines,rates,10));
    const raw = backend.calculate(lines,{...rates,roundingStep:0},10);
    assert.equal(actual.tax,raw.tax); assert.equal(actual.discount,raw.discount);
    assert.equal(actual.total,roundingStep?Math.round(raw.total/roundingStep)*roundingStep:raw.total);
  }
});
