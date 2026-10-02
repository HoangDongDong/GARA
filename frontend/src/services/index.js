/**
 * Centralized API service layer
 * Tat ca cac trang frontend deu goi qua day.
 *
 * Backend Express dang chay o http://localhost:4000
 * Vite proxy /api -> :4000, nen chi can goi /api/...
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

/* Auto attach user info (neu co) de backend log */
api.interceptors.request.use((config) => {
  try {
    const u = JSON.parse(localStorage.getItem('garage_user') || '{}');
    if (u?.USERNAME) {
      config.headers['X-User'] = u.USERNAME;
    }
  } catch {}
  return config;
});

/* Wrapper: GET list */
const list = async (resource, params = {}) => {
  const r = await api.get(`/${resource}`, { params });
  return r.data?.data ?? [];
};

/* Wrapper: GET single */
const get = async (resource, id) => {
  const r = await api.get(`/${resource}/${id}`);
  return r.data?.data ?? null;
};

/* Wrapper: POST create */
const create = async (resource, payload) => {
  const r = await api.post(`/${resource}`, payload);
  return r.data;
};

/* Wrapper: PUT update */
const update = async (resource, id, payload) => {
  const r = await api.put(`/${resource}/${id}`, payload);
  return r.data;
};

/* Wrapper: DELETE (soft) */
const remove = async (resource, id) => {
  const r = await api.delete(`/${resource}/${id}`);
  return r.data;
};

/* ===== MASTER DATA =====
 * Bang chua data tham chieu (hang xe, dong xe, dich vu, NCC...)
 */
export const masterData = {
  /* List */
  list: (resource, params) => list('master-data/' + resource, params),

  /* Get single */
  get: (resource, id) => get('master-data/' + resource, id),

  /* Create */
  create: (resource, payload) => create('master-data/' + resource, payload),

  /* Update */
  update: (resource, id, payload) => update('master-data/' + resource, id, payload),

  /* Delete */
  remove: (resource, id) => remove('master-data/' + resource, id),

  /* Common shortcuts */
  brands:        () => list('master-data/brands'),
  models:        (brandId) => list('master-data/models', brandId ? { brand: brandId } : {}),
  categories:    () => list('master-data/categories'),
  serviceCategories: () => list('master-data/service_categories'),
  services:      (catId) => list('master-data/services', catId ? { category: catId } : {}),
  warehouses:    () => list('master-data/warehouses'),
  locations:     () => list('master-data/locations'),
  units:         () => list('master-data/units'),
  partsBrands:   () => list('master-data/brands_parts'),
  suppliers:     () => list('master-data/suppliers'),
  supplierGroups: () => list('master-data/supplier_groups'),
  customerGroups: () => list('master-data/customer_groups'),
  shifts:        () => list('master-data/shifts'),
  bankAccounts:  () => list('master-data/bank_accounts'),
  cashCategories: () => list('master-data/cash_categories'),
};

/* ===== CUSTOMERS (DKHACHHANG) ===== */
export const customers = {
  list:    (params) => list('customers', params),
  get:     (id) => get('customers', id),
  create:  (payload) => create('customers', payload),
  update:  (id, payload) => update('customers', id, payload),
  remove:  (id) => remove('customers', id),
};

/* ===== VEHICLES (DXE) ===== */
export const vehicles = {
  list:   (params) => list('vehicles', params),
  get:    (id) => get('vehicles', id),
  create: (payload) => create('vehicles', payload),
  update: (id, payload) => update('vehicles', id, payload),
  remove: (id) => remove('vehicles', id),
  meta:   () => list('vehicles/meta/brands'),
  profile: (id) => list(`vehicles/${id}/profile`),
};

/* ===== EMPLOYEES (DNHANVIEN) ===== */
export const employees = {
  list:   (params) => list('employees', params),
  create: (payload) => create('employees', payload),
  update: (id, payload) => update('employees', id, payload),
  remove: (id) => remove('employees', id),
};

/* ===== PARTS (DMATHANG) ===== */
export const parts = {
  list:   (params) => list('parts', params),
  meta:   () => list('parts/meta/options'),
  create: (payload) => create('parts', payload),
  update: (id, payload) => update('parts', id, payload),
  remove: (id) => remove('parts', id),
};

/* ===== POINT OF SALE (TDONHANG + TDONHANGCHITIET) ===== */
export const sales = {
  list: async () => {
    try {
      return await list('sales');
    } catch {
      return [];
    }
  },
  get: (id) => get('sales', id),
  create: (payload) => create('sales', payload),
};

/* ===== INVENTORY RECEIPTS (TNHAPKHO + TNHAPKHOCHITIET) ===== */
export const inventoryReceipts = {
  list: async () => {
    try {
      return await list('inventory-receipts');
    } catch {
      return [];
    }
  },
  get: (id) => get('inventory-receipts', id),
  create: (payload) => create('inventory-receipts', payload),
  pay: (id) => api.patch(`/inventory-receipts/${id}/pay`).then((response) => response.data),
  remove: (id) => remove('inventory-receipts', id),
};

/* ===== SUPPLIERS (DNHACUNGCAP + TNHAPKHO) ===== */
export const suppliers = {
  /* The fallback keeps the screen usable until a currently running backend
     process has been restarted and has registered the richer route. */
  list: async () => {
    try {
      return await list('suppliers');
    } catch {
      return list('master-data/suppliers');
    }
  },
  groups: () => list('master-data/supplier_groups', { status: 1 }),
  createGroup: (payload) => create('master-data/supplier_groups', payload),
  updateGroup: (id, payload) => update('master-data/supplier_groups', id, payload),
  removeGroup: (id) => remove('master-data/supplier_groups', id),
  transactions: (id) => list(`suppliers/${id}/transactions`),
  create: (payload) => create('suppliers', payload),
  update: (id, payload) => update('suppliers', id, payload),
  remove: (id) => remove('suppliers', id),
};

/* ===== REPAIR ORDERS ===== */
export const repairOrders = {
  /* TTIEPNHANXE */
  listReceptions:   () => list('repair-orders/tiep-nhan'),
  createReception:  (payload) => create('repair-orders/tiep-nhan', payload),
  setReceptionStatus: (id, status) => api.patch(`/repair-orders/tiep-nhan/${id}/status`, { TRANGTHAI: status }).then(r => r.data),

  /* TLENHSUACHUA */
  list:        (params) => list('repair-orders', params),
  get:         (id) => get('repair-orders', id),
  create:      (payload) => create('repair-orders', payload),
  setStatus:   (id, status) => api.patch(`/repair-orders/${id}/status`, { TRANGTHAI: status }).then(r => r.data),
  remove:      (id) => remove('repair-orders', id),
};

/* ===== INVOICES (THOADONSUACHUA) ===== */
export const invoices = {
  list:   () => list('invoices'),
  create: (payload) => create('invoices', payload),
  pay:    (id, payload) => api.patch(`/invoices/${id}/pay`, payload).then(r => r.data),
};

/* ===== REPORTS ===== */
export const reports = {
  list: () => list('reports'),
  dashboard: () => list('reports/dashboard'),
  revenue: (from, to) => list('reports/revenue', { from, to }),
  maintenance: async () => {
    try {
      return await list('reports/maintenance');
    } catch {
      return [];
    }
  },
};

/* ===== WORKFLOW ===== */
export const workflow = {
  list:           (params) => list('workflow', params),
  states:         () => list('workflow/states'),
  dashboard:      () => list('workflow/dashboard'),
  byPlate:        (plate) => list('workflow/by-plate/' + encodeURIComponent(plate)),
  byVehicle:      (dxid) => list('workflow/by-vehicle/' + dxid),
  byVehicleAll:   (dxid) => list('workflow/by-vehicle/' + dxid + '/all'),
  transition:     (payload) => create('workflow/transition', payload),
  images:         (workflowId, state) => list(`workflow/${workflowId}/images`, state == null ? {} : { state }),
  uploadImages:   (payload) => create('workflow/images', payload),
  deleteImage:    (id) => remove('workflow/images', id),
  imageUrl:       (id) => `/api/workflow/images/${id}/content`,
};

/* ===== AUTH ===== */
export const auth = {
  login: (username, password) => api.post('/auth/login', { USERNAME: username, PASSWORD: password }).then(r => r.data),
  logout: () => Promise.resolve(),
};

/* ===== Direct passthrough (escape hatch) ===== */
export const raw = api;
export default api;
