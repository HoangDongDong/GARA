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

export const protectedMediaUrl = (path) => {
  if (!path || !String(path).startsWith('/api/')) return path;
  const token = localStorage.getItem('garage_token');
  if (!token) return path;
  const separator = String(path).includes('?') ? '&' : '?';
  return `${path}${separator}access_token=${encodeURIComponent(token)}`;
};

const protectedApiUrl = (path) => {
  const token = localStorage.getItem('garage_token');
  const separator = String(path).includes('?') ? '&' : '?';
  return token ? `${path}${separator}access_token=${encodeURIComponent(token)}` : path;
};

/* Auto attach user info (neu co) de backend log */
api.interceptors.request.use((config) => {
  try {
    const u = JSON.parse(localStorage.getItem('garage_user') || '{}');
    if (u?.USERNAME) {
      config.headers['X-User'] = u.USERNAME;
    }
    const token = localStorage.getItem('garage_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

/* Auto redirect to login neu token bi het han (401) */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('garage_token');
      localStorage.removeItem('garage_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

/* ===== CATALOG: real data, explicit availability for tables not created yet ===== */
export const catalog = {
  load: (type) => api.get(`/catalog/${encodeURIComponent(type)}`).then((response) => response.data),
  resource: (resource) => api.get(`/catalog/resources/${encodeURIComponent(resource)}`).then((response) => response.data),
  create: (resource, payload) => create(`catalog/resources/${resource}`, payload),
  update: (resource, id, payload) => update(`catalog/resources/${resource}`, id, payload),
  setStatus: (resource, id, status) => api.patch(`/catalog/resources/${resource}/${encodeURIComponent(id)}/status`, { status }).then((response) => response.data),
};

/* ===== PRINT TEMPLATES (STEMPLATE in the main GARAGE.FDB database) ===== */
export const printTemplates = {
  create: (name, content, configName) => api.post('/print-templates', { name, content, configName }).then(response => response.data),
  list: () => api.get('/print-templates').then((response) => response.data),
  openDesigner: (id) => api.post(`/print-templates/${encodeURIComponent(id)}/designer`).then((response) => response.data?.data),
  designerStatus: (sessionId) => api.get(`/print-templates/designer-sessions/${encodeURIComponent(sessionId)}`).then((response) => response.data?.data),
  content: (id) => api.get(`/print-templates/${encodeURIComponent(id)}/content`, {
    responseType: 'text',
    transformResponse: [(value) => value],
  }).then((response) => response.data),
  contentUrl: (id) => protectedApiUrl(`/api/print-templates/${encodeURIComponent(id)}/content`),
  saveContent: (id, content) => api.put(`/print-templates/${encodeURIComponent(id)}/content`, { content }).then((response) => response.data),
  setDefault: (id, configName) => api.put(`/print-templates/${encodeURIComponent(id)}/default`, { configName }).then((response) => response.data),
  assign: (id, configName) => api.put(`/print-templates/${encodeURIComponent(id)}/assignment`, { configName }).then((response) => response.data),
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
  imageUrl: (id) => protectedMediaUrl(`/api/vehicles/${id}/image`),
  analyzeImage: (image) => api.post('/ocr/analyze-vehicle', { image }, { timeout: 60000 }).then((response) => response.data?.data),
};

/* ===== EMPLOYEES (DNHANVIEN) ===== */
export const employees = {
  imageUrl: (row) => protectedMediaUrl(`/api/employees/${encodeURIComponent(row.ID)}/image?v=${encodeURIComponent(row.SIMAGEID || '')}`),
  meta: () => api.get('/employees/meta').then(response => response.data.data),
  commissions: (params) => api.get('/employees/commissions', { params }).then(response => response.data),
  setStatus: (id, status) => api.patch(`/employees/${encodeURIComponent(id)}/status`, { status }).then(response => response.data),
  list:   (params) => list('employees', params),
  create: (payload) => create('employees', payload),
  update: (id, payload) => update('employees', id, payload),
  remove: (id) => remove('employees', id),
};

/* ===== PARTS (DMATHANG) ===== */
export const parts = {
  list:   (params) => list('parts', params),
  imageUrl: (id) => protectedMediaUrl(`/api/parts/${encodeURIComponent(id)}/image?v=${Date.now()}`),
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
  printPdf: (id, templateId) => api.get(`/sales/${encodeURIComponent(id)}/print`, {
    params: templateId ? { templateId } : undefined,
    responseType: 'blob',
    timeout: 90000,
  }).then((response) => response.data),
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
  pay: (id, payment) => api.patch(`/inventory-receipts/${id}/pay`, {TIENTHANHTOAN:payment}).then((response) => response.data),
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
  supplements: (id) => list(`repair-orders/${id}/supplements`),
  createSupplement: (id, payload) => create(`repair-orders/${id}/supplements`, payload),
  decideSupplement: (id, supplementId, payload) => api.patch(`/repair-orders/${id}/supplements/${supplementId}`, payload).then(r => r.data),
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
  supplements:    () => list('workflow/supplements'),
  list:           (params) => list('workflow', params),
  board:          () => list('workflow/board'),
  states:         () => list('workflow/states'),
  dashboard:      () => list('workflow/dashboard'),
  byPlate:        (plate) => list('workflow/by-plate/' + encodeURIComponent(plate)),
  byVehicle:      (dxid) => list('workflow/by-vehicle/' + dxid),
  byVehicleAll:   (dxid) => list('workflow/by-vehicle/' + dxid + '/all'),
  transition:     (payload) => create('workflow/transition', payload),
  images:         async (workflowId, state) => (await list(`workflow/${workflowId}/images`, state == null ? {} : { state })).map((item) => ({ ...item, URL: protectedMediaUrl(item.URL || `/api/workflow/images/${item.ID}/content`) })),
  uploadImages:   (payload) => create('workflow/images', payload),
  deleteImage:    (id) => remove('workflow/images', id),
  imageUrl:       (id) => protectedMediaUrl(`/api/workflow/images/${id}/content`),
};

/* ===== AUTH ===== */
export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data?.data),
  logout: () => Promise.resolve(),
};

/* ===== USER ACCOUNTS & ROLE-BASED ACCESS ===== */
export const accessControl = {
  overview: () => api.get('/admin-access/overview').then(r => r.data?.data),
  createGroup: (payload) => api.post('/admin-access/groups', payload).then(r => r.data),
  updateGroup: (id, payload) => api.put(`/admin-access/groups/${id}`, payload).then(r => r.data),
  removeGroup: (id) => api.delete(`/admin-access/groups/${id}`).then(r => r.data),
  permissions: (id) => list(`admin-access/groups/${id}/permissions`),
  savePermissions: (id, items) => api.put(`/admin-access/groups/${id}/permissions`, { items }).then(r => r.data),
  createUser: (payload) => api.post('/admin-access/users', payload).then(r => r.data),
  updateUser: (id, payload) => api.put(`/admin-access/users/${id}`, payload).then(r => r.data),
  removeUser: (id) => api.delete(`/admin-access/users/${id}`).then(r => r.data),
};

/* ===== Direct passthrough (escape hatch) ===== */
export const raw = api;
export default api;
