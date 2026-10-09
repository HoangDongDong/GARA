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
  const override = req.body.TILEGIAMGIA != null || req.body.TIENGIAMGIA != null || req.body.TIENGIAMGIAPHIEU != null
    || req.body.items?.some(line => line.TILETHUE != null || line.TILEGIAMGIA != null);
  if (override && req.accessUser && Number(req.accessUser.ISADMIN) !== 1
    && !require('../permissionPolicy').has(req.accessUser, 'PRICING', 4)) {
    throw Object.assign(new Error('Bạn cần quyền Điều chỉnh giá / Thuế / Giảm giá.'), { status: 403 });
  }
}
function assertRates(req, defaults) {
  if (!req.accessUser || require('../permissionPolicy').has(req.accessUser, 'PRICING', 4)) return;
  for (const [key, field] of [['TILETHUE','taxRate'],['TILEPHIDICHVU','serviceRate']]) {
    if (req.body[key] != null && Number(req.body[key]) !== Number(defaults[field])) {
      throw Object.assign(new Error('Bạn chưa có quyền thay đổi thuế hoặc phí dịch vụ mặc định.'), { status: 403 });
    }
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
  const [row] = await query(`SELECT M.ID, M.${service ? 'GIA' : 'GIABAN'} AS UNITPRICE, M.THUESUATRIENG, G.THUESUATRIENG AS THUENHOM, G.NAME AS NHOM
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
  const lineRates = lines.map(line => rate(line.discountRate) ?? 0);
  const lineDiscounts = lines.map((line, index) => round(Number(line.amount) * lineRates[index] / 100));
  const lineDiscount = round(lineDiscounts.reduce((sum, value) => sum + value, 0));
  const afterLineDiscount = round(subtotal - lineDiscount);
  const billDiscount = fixedDiscount == null ? round(afterLineDiscount * discountRate / 100) : round(Number(fixedDiscount));
  const discount = round(lineDiscount + billDiscount);
  if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(discount) || discount < 0 || discount > subtotal) throw Object.assign(new Error('Tiền hàng hoặc giảm giá không hợp lệ.'), { status: 400 });
  let allocated = 0, cumulative = 0;
  const groups = new Map();
  const addTax = (taxRate, base, tax) => {
    const group = groups.get(taxRate) || { rate: taxRate, base: 0, amount: 0 };
    group.base = round(group.base + base); group.amount = round(group.amount + tax); groups.set(taxRate, group);
  };
  const details = lines.map((line, index) => {
    const amount = round(Number(line.amount));
    const lineNet = round(amount - lineDiscounts[index]);
    cumulative = round(cumulative + lineNet);
    const target = index === lines.length - 1 ? billDiscount : round(afterLineDiscount ? cumulative * billDiscount / afterLineDiscount : 0);
    const billReduction = round(target - allocated);
    const reduction = round(lineDiscounts[index] + billReduction);
    allocated = target;
    const base = round(amount - reduction);
    const taxRate = rate(line.taxRate) ?? rates.taxRate;
    const tax = Math.round(base * taxRate / 100);
    addTax(taxRate, base, tax);
    return { ...line, amount, lineDiscountRate: lineRates[index], lineDiscount: lineDiscounts[index], lineNet, billDiscount: billReduction,
      discount: reduction, discountRate: line.discountRate == null ? discountRate : lineRates[index],
      taxRate, tax, net: base, total: round(base + tax) };
  });
  const serviceFee = Math.round((subtotal - discount) * rates.serviceRate / 100);
  const serviceTax = Math.round(serviceFee * rates.taxRate / 100);
  if (serviceFee) addTax(rates.taxRate, serviceFee, serviceTax);
  const tax = round(details.reduce((sum, line) => sum + line.tax, 0) + serviceTax);
  const unrounded = round(subtotal - discount + serviceFee + tax);
  const total = rates.roundingStep ? Math.round(unrounded / rates.roundingStep) * rates.roundingStep : unrounded;
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) throw Object.assign(new Error('Tổng tiền không hợp lệ.'), { status: 400 });
  return { subtotal, lineDiscount, afterLineDiscount, billDiscount, discount, discountRate, tax, serviceFee, serviceTax, total, details, taxGroups: [...groups.values()].sort((a, b) => a.rate - b.rate) };
}
function summary(value) {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}
function billDiscount(lines, percent, fixed) {
  const base = round(lines.reduce((sum, line) => sum + round(Number(line.amount)) - round(Number(line.amount) * Number(line.discountRate || 0) / 100), 0));
  if (fixed == null) return { base, fixed: null, percent };
  const amount = Number(fixed);
  if (!['number', 'string'].includes(typeof fixed) || String(fixed).trim() === '' || !Number.isFinite(amount)
    || amount < 0 || amount > base || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
    throw Object.assign(new Error('Tiền giảm phải từ 0 đến tiền hàng sau giảm giá từng dòng, tối đa 2 chữ số thập phân.'), { status: 400 });
  }
  return { base, fixed: amount, percent: base ? round(amount / base * 100) : 0 };
}
module.exports = { round, rate, validateMaster, assertOverride, assertRates, taxPolicy, discountPolicy, customer, item, calculate, summary, billDiscount };
