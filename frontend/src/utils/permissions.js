export function currentUser() {
  try { return JSON.parse(localStorage.getItem('garage_user') || '{}'); } catch { return {}; }
}
export function can(code, bit = 1) {
  const user = currentUser();
  return Number(user.ISADMIN) === 1 || (!['ADMIN', 'SETTINGS'].includes(code) && (Number(user.PERMISSIONS?.[code] || 0) & bit) === bit);
}
export function workflowPermission(target) {
  return { 1: 'APPROVE_QUOTE', 2: 'ASSIGN_REPAIR', 3: 'HANDOVER', 4: 'HANDOVER' }[Number(target)];
}
export const functionMasks = { DASHBOARD:1, SALES:19, WARRANTY:23, FINANCE:19, EMPLOYEES:15, REPORTS:17,
  CATALOG: 15, APPROVE_QUOTE: 4, APPROVE_SUPPLEMENT: 4,
  ASSIGN_REPAIR: 4, HANDOVER: 4, PAYMENTS: 5, PAYROLL: 21, COMMISSIONS: 5,
  COST: 1, PRICING: 4, EXPORT: 1 };
export function canQuickCreate(resource) {
  const codes = { brands: ['VEHICLES', 'REPAIR'], models: ['VEHICLES', 'REPAIR'],
    customer_groups: ['CUSTOMERS', 'REPAIR', 'SALES'], supplier_groups: ['SUPPLIERS', 'INVENTORY'] };
  return can('CATALOG', 2) || (codes[resource] || []).some(code => can(code, 2));
}
