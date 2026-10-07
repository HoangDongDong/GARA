function calculate(total, payments, allowDebt, customerId) {
  if (payments.some(value => !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER || Math.abs(value * 100 - Math.round(value * 100)) > 0.001)) {
    throw Object.assign(new Error('Số tiền thanh toán không hợp lệ.'), { status: 400 });
  }
  const received = payments.reduce((sum, value) => sum + value, 0);
  if (received > total) throw Object.assign(new Error('Số tiền thu vượt quá tổng hóa đơn.'), { status: 400 });
  const remaining = Math.max(0, total - received);
  if (remaining > 0 && allowDebt !== true) throw Object.assign(new Error('Vui lòng tích Cho phép khách nợ hoặc thanh toán đủ.'), { status: 400 });
  if (remaining > 0 && !customerId) throw Object.assign(new Error('Vui lòng chọn khách hàng để ghi nhận công nợ.'), { status: 400 });
  return { remaining, paid: remaining === 0 };
}
module.exports = { calculate };
