export function calculateCharges(subtotal, rates, discount = 0) {
  const afterDiscount = Math.round((Number(subtotal) - Number(discount)) * 100) / 100;
  const serviceFee = Math.round(afterDiscount * rates.serviceRate / 100);
  const tax = Math.round((afterDiscount + serviceFee) * rates.taxRate / 100);
  const total = Math.round((afterDiscount + serviceFee + tax) * 100) / 100;
  return { subtotal: Number(subtotal), discount: Number(discount), serviceFee, tax, total };
}
