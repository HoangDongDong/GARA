const charges = require('./defaultChargeRates');
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
function rate(value, label = 'Tỷ lệ') {
  if (value == null || value === '') return null;
  charges.validate('MacDinhThueSuat', value);
  return Number(value);
}
function validateMaster(body) {
  for (const key of ['THUESUATRIENG', 'GIAMGIARIENG']) if (key in body) body[key] = rate(body[key]);
  return body;
}
function assertOverride(req, code) {
  const override = req.body.TILEGIAMGIA != null || req.body.TIENGIAMGIA != null
    || req.body.items?.some(line => line.TILETHUE != null);
  if (override && req.accessUser && Number(req.accessUser.ISADMIN) !== 1
    && (Number(req.accessUser.permissions?.[code] || 0) & 4) !== 4) {
    throw Object.assign(new Error('Bạn cần quyền Sửa để đặt thuế hoặc giảm giá riêng trên phiếu.'), { status: 403 });
  }
}
function taxPolicy(item, defaults, override) {
  if (defaults.taxEnabled === false) return { taxRate: 0, taxSource: 'Đã tắt tính thuế' };
  if (override != null && override !== '') return { taxRate: rate(override), taxSource: 'Đặt riêng trên phiếu' };
  if (item.THUESUATRIENG != null) return { taxRate: rate(item.THUESUATRIENG), taxSource: 'Đặt riêng mặt hàng / dịch vụ' };
  if (item.THUENHOM != null) return { taxRate: rate(item.THUENHOM), taxSource: `Nhóm ${item.NHOM || item.GROUP_NAME || ''}`.trim() };
  return { taxRate: defaults.taxRate, taxSource: 'Theo cấu hình' };
}
function discountPolicy(customer, override) {
  if (override != null && override !== '') return { discountRate: rate(override), discountSource: 'Giảm giá riêng cho phiếu này' };
  if (customer?.GIAMGIARIENG != null) return { discountRate: rate(customer.GIAMGIARIENG), discountSource: 'Đặt riêng khách hàng' };
  if (customer?.GIAMGIANHOM != null) return { discountRate: rate(customer.GIAMGIANHOM), discountSource: `Nhóm ${customer.NHOMKH || ''}`.trim() };
  return { discountRate: 0, discountSource: 'Không có giảm giá mặc định' };
}
async function customer(query, id) {
  if (!id) return null;
  const [row] = await query(`SELECT K.ID, K.GIAMGIARIENG, G.GIAMGIARIENG AS GIAMGIANHOM, G.NAME AS NHOMKH
    FROM DKHACHHANG K LEFT JOIN DNHOMKHACHHANG G ON G.ID=K.DNHOMKHACHHANGID AND G.STATUS=1
    WHERE K.ID=? AND K.STATUS=1`, [id]);
  if (!row) throw Object.assign(new Error('Khách hàng không tồn tại hoặc đã ngừng sử dụng.'), { status: 400 });
  return row;
}
async function item(query, type, id) {
  const service = Number(type) === 1;
  const [row] = await query(`SELECT M.ID, M.THUESUATRIENG, G.THUESUATRIENG AS THUENHOM, G.NAME AS NHOM
    FROM ${service ? 'DDICHVU' : 'DMATHANG'} M LEFT JOIN ${service ? 'DLOAIDICHVU' : 'DNHOMMATHANG'} G
    ON G.ID=M.${service ? 'DLOAIDICHVUID' : 'DNHOMMATHANGID'} AND G.STATUS=1 WHERE M.ID=? AND M.STATUS=1`, [id]);
  if (!row) throw Object.assign(new Error('Mặt hàng / dịch vụ không tồn tại hoặc đã ngừng sử dụng.'), { status: 400 });
  return row;
}
// Distribute a fixed discount proportionally. Assign the rounding remainder to
// the final line so the document and line totals always agree to the cent.
function calculate(lines, rates, discountRate = 0, fixedDiscount) {
  rate(discountRate);
  const subtotal = round(lines.reduce((sum, line) => sum + Number(line.amount), 0));
  const discount = fixedDiscount == null ? round(subtotal * discountRate / 100) : round(Number(fixedDiscount));
  if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(discount) || discount < 0 || discount > subtotal) throw Object.assign(new Error('Tiền hàng hoặc giảm giá không hợp lệ.'), { status: 400 });
  let allocated = 0, cumulative = 0;
  const groups = new Map();
  const addTax = (taxRate, base, tax) => {
    const group = groups.get(taxRate) || { rate: taxRate, base: 0, amount: 0 };
    group.base = round(group.base + base); group.amount = round(group.amount + tax); groups.set(taxRate, group);
  };
  const details = lines.map((line, index) => {
    const amount = round(Number(line.amount));
    cumulative = round(cumulative + amount);
    const target = index === lines.length - 1 ? discount : round(subtotal ? cumulative * discount / subtotal : 0);
    const reduction = round(target - allocated);
    allocated = target;
    const base = round(amount - reduction);
    const taxRate = rate(line.taxRate) ?? rates.taxRate;
    const tax = Math.round(base * taxRate / 100);
    addTax(taxRate, base, tax);
    return { ...line, amount, discount: reduction, discountRate, taxRate, tax, net: base, total: round(base + tax) };
  });
  const serviceFee = Math.round((subtotal - discount) * rates.serviceRate / 100);
  const serviceTax = Math.round(serviceFee * rates.taxRate / 100);
  if (serviceFee) addTax(rates.taxRate, serviceFee, serviceTax);
  const tax = round(details.reduce((sum, line) => sum + line.tax, 0) + serviceTax);
  const total = round(subtotal - discount + serviceFee + tax);
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) throw Object.assign(new Error('Tổng tiền không hợp lệ.'), { status: 400 });
  return { subtotal, discount, discountRate, tax, serviceFee, serviceTax, total, details, taxGroups: [...groups.values()].sort((a, b) => a.rate - b.rate) };
}
function summary(value) {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}
module.exports = { round, rate, validateMaster, assertOverride, taxPolicy, discountPolicy, customer, item, calculate, summary };
