const MODE = { VIEW: 1, ADD: 2, EDIT: 4, DELETE: 8, PRINT: 16 };
const functions = [
  ['CATALOG', 'Quản lý danh mục / Phụ tùng / Dịch vụ', 'Danh mục', 15],
  ['APPROVE_QUOTE', 'Duyệt báo giá', 'Quy trình sửa chữa', 4],
  ['APPROVE_SUPPLEMENT', 'Duyệt phát sinh', 'Quy trình sửa chữa', 4],
  ['ASSIGN_REPAIR', 'Phân công kỹ thuật', 'Quy trình sửa chữa', 4],
  ['HANDOVER', 'Xác nhận giao xe / Hoàn thành', 'Quy trình sửa chữa', 4],
  ['PAYMENTS', 'Thu tiền / Thanh toán / Ghi công nợ', 'Tài chính', 5],
  ['PAYROLL', 'Xem / Sửa / In lương', 'Nhân sự', 21],
  ['COMMISSIONS', 'Xem / Cấu hình hoa hồng', 'Nhân sự', 5],
  ['COST', 'Xem giá nhập / Giá vốn', 'Kho hàng', 1],
  ['PRICING', 'Điều chỉnh giá / Thuế / Giảm giá', 'Nghiệp vụ', 4],
  ['EXPORT', 'Xuất dữ liệu CSV / Excel', 'Báo cáo', 1],
];
const masks = { DASHBOARD:1, SALES:19, WARRANTY:23, FINANCE:19, EMPLOYEES:15, REPORTS:17,
  ...Object.fromEntries(functions.map(([code, , , mask]) => [code, mask])) };
const has = (user, code, bit = MODE.VIEW) => Number(user?.ISADMIN) === 1
  || (Number(user?.permissions?.[code] || 0) & bit) === bit;
function assert(user, code, bit = MODE.VIEW) {
  if (!has(user, code, bit)) throw Object.assign(new Error('Bạn chưa được cấp quyền thực hiện thao tác này.'), { status: 403, statusCode: 403 });
}
function workflowCode(target) {
  return { 1: 'APPROVE_QUOTE', 2: 'ASSIGN_REPAIR', 3: 'HANDOVER', 4: 'HANDOVER' }[Number(target)];
}
const masterReaders = {
  brands: ['VEHICLES', 'REPAIR', 'WARRANTY'], models: ['VEHICLES', 'REPAIR', 'WARRANTY'],
  customer_groups: ['CUSTOMERS', 'SALES', 'REPAIR'], suppliers: ['SUPPLIERS', 'INVENTORY'],
  supplier_groups: ['SUPPLIERS', 'INVENTORY'], services: ['REPAIR'], service_categories: ['REPAIR'],
  warehouses: ['INVENTORY', 'SALES', 'REPAIR'], locations: ['INVENTORY', 'SALES', 'REPAIR'],
  categories: ['INVENTORY', 'SALES', 'REPAIR'], units: ['INVENTORY', 'SALES', 'REPAIR'],
  brands_parts: ['INVENTORY', 'SALES', 'REPAIR'], shifts: ['EMPLOYEES'],
  bank_accounts: ['FINANCE', 'PAYMENTS'], cash_categories: ['FINANCE', 'PAYMENTS'],
};
const quickCreate = { brands: ['VEHICLES', 'REPAIR'], models: ['VEHICLES', 'REPAIR'],
  customer_groups: ['CUSTOMERS', 'SALES', 'REPAIR'], supplier_groups: ['SUPPLIERS', 'INVENTORY'] };
const hasField = (body, keys) => Object.keys(body || {}).some(key => keys.includes(key.toUpperCase()));
const quickFields = ['NAME', 'CODE', 'SORTORDER', 'DHANGXEID'];
function assertQuickFields(body) {
  if (Object.keys(body || {}).some(key => !quickFields.includes(key))) {
    throw Object.assign(new Error('Thêm nhanh chỉ được nhập tên, mã, thứ tự và hãng xe.'), { status: 403, statusCode: 403 });
  }
}
const sensitive = {
  COST: ['GIANHAP', 'GIAVON', 'GIATRIKHO', 'GIA_TRI', 'SODUDAU'],
  PAYROLL: ['LUONGCA', 'LUONGTHANG', 'CACHTINHLUONG', 'NGHITHU7', 'NGHICHUNHAT'],
  COMMISSIONS: ['HOAHONG', 'HHKIEU', 'HHGIATRI'],
};
function redact(user, value) {
  const hidden = new Set(Object.entries(sensitive).flatMap(([code, keys]) => has(user, code) ? [] : keys));
  const visit = item => {
    if (Array.isArray(item)) return item.map(visit);
    if (!item || typeof item !== 'object' || item instanceof Date || Buffer.isBuffer(item)) return item;
    return Object.fromEntries(Object.entries(item).filter(([key]) => !hidden.has(key.toUpperCase())).map(([key, child]) => [key, visit(child)]));
  };
  return visit(value);
}
// Seed only when a new function/role is first introduced. Subsequent runs must
// never restore a permission that an administrator has revoked.
function initialMode(code, old) {
  const any = (codes, bit) => codes.some(key => (Number(old[key] || 0) & bit) === bit);
  if (['APPROVE_QUOTE', 'APPROVE_SUPPLEMENT', 'ASSIGN_REPAIR', 'HANDOVER'].includes(code)) return any(['REPAIR'], 4) ? 4 : 0;
  if (code === 'PAYMENTS') return any(['FINANCE', 'SALES', 'INVENTORY'], 2) || any(['FINANCE', 'SALES', 'INVENTORY'], 4) ? 5 : 0;
  if (code === 'PAYROLL') return Number(old.EMPLOYEES || 0) & 21;
  if (code === 'COMMISSIONS') return (Number(old.EMPLOYEES || 0) & 5) | (any(['REPAIR'], 4) ? 5 : any(['REPAIR'], 1) ? 1 : 0);
  if (code === 'COST') return any(['INVENTORY', 'FINANCE'], 1) ? 1 : 0;
  if (code === 'PRICING') return any(['SALES', 'REPAIR'], 4) ? 4 : 0;
  if (code === 'EXPORT') return any(['REPORTS'], 16) || any(['EMPLOYEES'], 1) ? 1 : 0;
  return 0;
}
module.exports = { MODE, functions, masks, has, assert, workflowCode, masterReaders, quickCreate, hasField, assertQuickFields, redact, initialMode };
