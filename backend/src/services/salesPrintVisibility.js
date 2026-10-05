const db = require('../db');
const prefix = 'SalesPrintShow_';
const groupName = 'Nội dung hóa đơn bán hàng';
const definitions = [
  ['subtotal', 'Tổng tiền hàng'], ['quantity', 'Tổng số lượng'], ['discount', 'Giảm giá'],
  ['tax', 'VAT / thuế'], ['shipping', 'Phí vận chuyển'], ['returns', 'Đổi trả'],
  ['oldDebt', 'Nợ cũ'], ['deposit', 'Đặt trước'], ['voucher', 'Voucher'],
  ['prepaid', 'Thẻ trả trước'], ['pointsDeduction', 'Trừ tích lũy'],
  ['transfer', 'Chuyển khoản'], ['card', 'Thanh toán bằng thẻ'], ['cashGiven', 'Khách đưa'],
  ['change', 'Trả lại'], ['newDebt', 'Nợ mới'], ['points', 'Điểm trên hóa đơn'],
  ['loyalty', 'Tổng điểm tích lũy'], ['thanks', 'Lời cảm ơn'], ['moneyWords', 'Số tiền bằng chữ'],
].map(([key, label]) => ({ key, name: prefix + key, label }));
function flags(rows) {
  const values = new Map(rows.map(row => [row.NAME, row.INTVALUE]));
  return Object.fromEntries(definitions.map(item => [`PrintShow_${item.key}`, !values.has(item.name) || Number(values.get(item.name)) === 30]));
}
async function load() {
  return flags(await db.query('SELECT NAME,INTVALUE FROM SCONFIG WHERE NAME STARTING WITH ? AND STATUS=30', [prefix]));
}
function hideZeroValues(parameters) {
  const amounts = {
    subtotal: parameters.TIENHANG, discount: parameters.TIENGIAMGIA, tax: parameters.TIENTHUE,
    serviceFee: parameters.PHIDICHVU, shipping: parameters.PHIVANCHUYEN, returns: parameters.DOITRA,
    oldDebt: parameters.NOCU, deposit: parameters['Đặt trước'], voucher: parameters.VOUCHER,
    prepaid: parameters.THETRATRUOC, pointsDeduction: parameters.TRUTICHLUY, transfer: parameters.CHUYENKHOAN,
    card: parameters.THE, cashGiven: parameters.KHACHDUA, change: parameters.TRALAI,
    newDebt: parameters['Nợ mới'], points: parameters.DIEM, loyalty: parameters['Điểm tích lũy'],
  };
  for (const [key, value] of Object.entries(amounts)) {
    const amount = Number(value || 0);
    parameters[`PrintShow_${key}`] = parameters[`PrintShow_${key}`] !== false && Number.isFinite(amount) && amount !== 0;
  }
  return parameters;
}
function validate(name, value) {
  if (definitions.some(item => item.name === name) && ![0, 30].includes(Number(value))) throw Object.assign(new Error('Tùy chọn in hóa đơn chỉ nhận Hiện (30) hoặc Ẩn (0).'), { status: 400 });
}
module.exports = { prefix, groupName, definitions, flags, load, validate, hideZeroValues };
