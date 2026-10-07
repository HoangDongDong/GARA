const db = require('../db');
const names = ['ChoPhepNhapGiamGia','ChoPhepInTamTinh','HienThiAnhSanPham','BanHangDungDauDocMaVach','BatBuocNhapKhachHang','LamTronTien','MacDinhGiamGia'];
function validate(name, value) {
  const number = Number(value || 0);
  if (name === 'LamTronTien' && ![0,500,1000].includes(number)) throw Object.assign(new Error('Làm tròn tiền chỉ nhận 0, 500 hoặc 1000.'), { status: 400 });
  if (name === 'MacDinhGiamGia' && (!Number.isFinite(number) || number < 0 || number > 100 || Math.abs(number*100-Math.round(number*100))>0.00001)) throw Object.assign(new Error('Giảm giá mặc định phải từ 0 đến 100%, tối đa 2 chữ số thập phân.'), { status: 400 });
}
async function load(query = db.query) {
  const rows = await query(`SELECT NAME,INTVALUE,DECIMALVALUE FROM SCONFIG WHERE NAME IN (${names.map(()=>'?').join(',')}) AND STATUS=30`, names);
  const map = new Map(rows.map(row => [row.NAME,row]));
  const toggle = (name, fallback) => map.has(name) ? Number(map.get(name).INTVALUE)===30 : fallback;
  const roundingStep = Number(map.get('LamTronTien')?.INTVALUE || 0), defaultDiscount = Number(map.get('MacDinhGiamGia')?.DECIMALVALUE || 0);
  validate('LamTronTien', roundingStep); validate('MacDinhGiamGia', defaultDiscount);
  return { allowDiscount:toggle('ChoPhepNhapGiamGia',true), allowDraftPrint:toggle('ChoPhepInTamTinh',true), showProductImages:toggle('HienThiAnhSanPham',true), barcodeEnabled:toggle('BanHangDungDauDocMaVach',true), requireCustomer:toggle('BatBuocNhapKhachHang',false), roundingStep, defaultDiscount };
}
function discount(customer, override, settings) {
  if (!settings.allowDiscount && override != null) throw Object.assign(new Error('Cấu hình không cho phép nhập giảm giá.'), { status: 400 });
  const result = require('./pricingPolicy').discountPolicy(customer, override);
  return result.discountSource === 'Không có giảm giá mặc định' ? { discountRate:settings.defaultDiscount, discountSource:'Giảm giá mặc định trong cấu hình' } : result;
}
module.exports = { load, validate, discount };
