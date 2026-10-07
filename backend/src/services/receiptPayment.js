function calculate(totalValue, paymentValue = 0) {
  const total = Number(totalValue);
  const payment = Number(paymentValue);
  if (![total, payment].every(value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER)
    || [total,payment].some(value => Math.abs(value*100-Math.round(value*100))>1e-6)) {
    throw Object.assign(new Error('Tổng tiền và tiền thanh toán phải là số không âm, tối đa 2 chữ số thập phân.'), {statusCode:400});
  }
  const debt = Math.round((total-payment)*100)/100;
  return {payment,debt,paid:debt<=0};
}
module.exports = {calculate};
