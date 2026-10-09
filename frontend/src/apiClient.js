/**
 * apiClient.js - Wrapper cho cac API calls trong KAZUKO Auto
 * Dam bao frontend luon co baseURL dung, xu ly loi nhat quan.
 */
import apiClient from './api';



apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('[apiClient]', err?.response?.data?.error || err.message);
    return Promise.reject(err);
  }
);

/* Generic helpers */
export const apiList = async (resource, params = {}) => {
  const r = await apiClient.get(`/${resource}`, { params });
  return r.data?.data || [];
};

export const apiGet = async (resource, id) => {
  const r = await apiClient.get(`/${resource}/${id}`);
  return r.data?.data || null;
};

export const apiCreate = async (resource, payload) => {
  const r = await apiClient.post(`/${resource}`, payload);
  return r.data;
};

export const apiUpdate = async (resource, id, payload) => {
  const r = await apiClient.put(`/${resource}/${id}`, payload);
  return r.data;
};

export const apiDelete = async (resource, id) => {
  const r = await apiClient.delete(`/${resource}/${id}`);
  return r.data;
};

/* Workflow helpers */
export const workflow = {
  states: () => apiList('workflow/states'),
  dashboard: () => apiList('workflow/dashboard'),
  list: (trangthai) => apiList('workflow', trangthai != null ? { trangthai } : {}),
  byVehicle: (dxid) => apiGet('workflow/by-vehicle', dxid),
  byPlate: async (plate) => {
    const r = await apiClient.get(`/workflow/by-plate/${encodeURIComponent(plate)}`);
    return r.data?.data || null;
  },
  transition: async (dxid, trangthai, lydo, ghichu) => {
    const r = await apiClient.post('/workflow/transition', {
      DXEID: dxid,
      TRANGTHAI: trangthai,
      DNHANVIENID: JSON.parse(localStorage.getItem('garage_user') || '{}').USERNAME || 'SYSTEM',
      LYDO: lydo || '',
      GHICHU: ghichu || '',
    });
    return r.data;
  },
};

/* Master data helper (chung cho cac bang master) */
export const masterData = {
  brands:        () => apiList('master-data/brands'),
  models:        (brand) => apiList('master-data/models', brand ? { brand } : {}),
  categories:    () => apiList('master-data/categories'),
  serviceCategories: () => apiList('master-data/service_categories'),
  services:      (category) => apiList('master-data/services', category ? { category } : {}),
  warehouses:    () => apiList('master-data/warehouses'),
  locations:     (warehouse) => apiList('master-data/locations', warehouse ? { warehouse } : {}),
  units:         () => apiList('master-data/units'),
  brandsParts:   () => apiList('master-data/brands_parts'),
  suppliers:     () => apiList('master-data/suppliers'),
  supplierGroups: () => apiList('master-data/supplier_groups'),
  customerGroups: () => apiList('master-data/customer_groups'),
  shifts:        () => apiList('master-data/shifts'),
  bankAccounts:  () => apiList('master-data/bank_accounts'),
  cashCategories: () => apiList('master-data/cash_categories'),
};

/* Domain-specific helpers */
export const api = {
  customers:     () => apiList('customers'),
  vehicles:      () => apiList('vehicles'),
  repairOrders:  () => apiList('repair-orders'),
  employees:     () => apiList('employees'),
  parts:         () => apiList('parts'),
  invoices:      () => apiList('invoices'),
  reports:       () => apiList('reports'),
};

export default apiClient;
