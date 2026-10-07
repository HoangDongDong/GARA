const db = require('../db');
const definitions = [
  { name: 'PaymentAllowDebt', caption: 'Cho phép khách nợ', detail: 'Áp dụng chung cho bán hàng và thanh toán giao xe. Phải chọn khách hàng để ghi nhận công nợ.' },
  { name: 'PaymentRequireBill', caption: 'Bắt buộc in bill', detail: 'Áp dụng chung cho bán hàng và thanh toán giao xe. Tự mở bill để in sau khi lưu, kể cả khi khách còn nợ.' },
];
async function load(scope, query = db.query) {
  const rows = await query('SELECT NAME, INTVALUE FROM SCONFIG WHERE NAME IN (?,?) AND STATUS=30', ['PaymentAllowDebt', 'PaymentRequireBill']);
  const values = new Map(rows.map(row => [row.NAME, Number(row.INTVALUE)]));
  return { allowDebt: !values.has('PaymentAllowDebt') || values.get('PaymentAllowDebt') === 30,
    requireBill: !values.has('PaymentRequireBill') || values.get('PaymentRequireBill') === 30 };
}
function assertDebt(settings, remaining) {
  if (remaining > 0 && !settings.allowDebt) throw Object.assign(new Error('Cấu hình không cho phép khách nợ. Vui lòng thanh toán đủ.'), { status: 400 });
}
module.exports = { definitions, load, assertDebt };
