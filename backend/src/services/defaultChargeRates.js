const definitions = [
  { name: 'MacDinhThueSuat', caption: 'Mặc định thuế suất (%)', value: 20 },
  { name: 'MacDinhPhiDichVu', caption: 'Mặc định phí dịch vụ (%)', value: 10 },
];
const salesToggles = [
  { name: 'BanHangTinhThue', caption: 'Áp dụng thuế khi bán hàng', value: 30 },
  { name: 'BanHangTinhPhiDichVu', caption: 'Áp dụng phí dịch vụ khi bán hàng', value: 30 },
];

function validate(name, value) {
  if (salesToggles.some(item => item.name === name)) {
    if (!['number', 'string'].includes(typeof value) || ![0, 30].includes(Number(value)) || String(value).trim() === '') {
      throw Object.assign(new Error('Bật/tắt thuế và phí dịch vụ chỉ nhận 0 hoặc 30.'), { status: 400 });
    }
    return;
  }
  const definition = definitions.find(item => item.name === name);
  if (!definition) return;
  const number = Number(value);
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === ''
    || !Number.isFinite(number) || number < 0 || number > 100
    || Math.abs(number * 100 - Math.round(number * 100)) > 1e-8) {
    throw Object.assign(new Error(`${definition.caption}: nhập số từ 0 đến 100, tối đa 2 chữ số thập phân.`), { status: 400 });
  }
}

async function load(query = require('../db').query) {
  const rows = await query("SELECT NAME, DECIMALVALUE FROM SCONFIG WHERE NAME IN ('MacDinhThueSuat','MacDinhPhiDichVu') AND STATUS=30");
  const values = new Map(rows.map(row => [row.NAME, row.DECIMALVALUE]));
  const taxRate = values.get('MacDinhThueSuat') ?? 0;
  const serviceRate = values.get('MacDinhPhiDichVu') ?? 0;
  validate('MacDinhThueSuat', taxRate);
  validate('MacDinhPhiDichVu', serviceRate);
  return { taxRate: Number(taxRate), serviceRate: Number(serviceRate) };
}

function resolve(input, defaults) {
  const taxRate = input.TILETHUE ?? defaults.taxRate;
  const serviceRate = input.TILEPHIDICHVU ?? defaults.serviceRate;
  validate('MacDinhThueSuat', taxRate);
  validate('MacDinhPhiDichVu', serviceRate);
  return { taxRate: Number(taxRate), serviceRate: Number(serviceRate) };
}

async function loadForSales(query = require('../db').query) {
  const rates = await load(query);
  const rows = await query("SELECT NAME, INTVALUE FROM SCONFIG WHERE NAME IN ('BanHangTinhThue','BanHangTinhPhiDichVu') AND STATUS=30");
  const values = new Map(rows.map(row => [row.NAME, row.INTVALUE]));
  const taxEnabled = !values.has('BanHangTinhThue') || Number(values.get('BanHangTinhThue')) === 30;
  const serviceEnabled = !values.has('BanHangTinhPhiDichVu') || Number(values.get('BanHangTinhPhiDichVu')) === 30;
  return { taxRate: taxEnabled ? rates.taxRate : 0, serviceRate: serviceEnabled ? rates.serviceRate : 0, taxEnabled, serviceEnabled };
}

function resolveForSales(input, defaults) {
  const rates = resolve({
    TILETHUE: defaults.taxEnabled === false ? 0 : input.TILETHUE,
    TILEPHIDICHVU: defaults.serviceEnabled === false ? 0 : input.TILEPHIDICHVU,
  }, defaults);
  return { ...rates, taxEnabled: defaults.taxEnabled !== false, serviceEnabled: defaults.serviceEnabled !== false };
}

function calculate(subtotal, rates, discount = 0) {
  const base = Number(subtotal);
  const reduction = Number(discount);
  if (!Number.isFinite(base) || base < 0 || !Number.isFinite(reduction) || reduction < 0 || reduction > base) {
    throw Object.assign(new Error('Tiền hàng hoặc giảm giá không hợp lệ.'), { status: 400 });
  }
  const afterDiscount = Math.round((base - reduction) * 100) / 100;
  const serviceFee = Math.round(afterDiscount * rates.serviceRate / 100);
  const tax = Math.round((afterDiscount + serviceFee) * rates.taxRate / 100);
  const total = Math.round((afterDiscount + serviceFee + tax) * 100) / 100;
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) throw Object.assign(new Error('Tổng tiền không hợp lệ.'), { status: 400 });
  return { subtotal: base, discount: reduction, serviceFee, tax, total };
}

module.exports = { definitions, salesToggles, validate, load, loadForSales, resolve, resolveForSales,
  loadForRepairs: loadForSales, resolveForRepairs: resolveForSales, calculate };
