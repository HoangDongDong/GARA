export function billDiscount(lines, rate, fixed) {
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const base = round(lines.reduce((sum, line) => sum + round(Number(line.amount)) - round(Number(line.amount) * Number(line.discountRate || 0) / 100), 0));
  const amount = fixed == null ? null : Math.min(Math.max(0, Number(fixed)), base);
  return { base, fixed: amount, percent: amount == null ? Number(rate || 0) : base ? Math.round(amount / base * 10000) / 100 : 0 };
}
