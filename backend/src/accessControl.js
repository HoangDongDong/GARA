const db = require('./db');
const { verifyToken } = require('./authSecurity');

const { MODE, has, workflowCode, masterReaders, quickCreate, assertQuickFields, redact } = require('./permissionPolicy');

function permissionForMethod(method) {
  if (method === 'GET' || method === 'HEAD') return MODE.VIEW;
  if (method === 'POST') return MODE.ADD;
  if (method === 'PUT' || method === 'PATCH') return MODE.EDIT;
  if (method === 'DELETE') return MODE.DELETE;
  return MODE.VIEW;
}

function requiredCodes(path, method = 'GET') {
  const read = ['GET', 'HEAD'].includes(method);
  const at = prefix => path === prefix || path.startsWith(prefix + '/');
  if (at('/api/catalog')) return ['CATALOG'];
  if (at('/api/master-data')) {
    const resource = path.split('/')[3];
    if (!read && ['bank_accounts', 'cash_categories', 'shifts'].includes(resource)) return ['SETTINGS'];
    return read ? ['CATALOG', ...(masterReaders[resource] || [])]
      : method === 'POST' ? ['CATALOG', ...(quickCreate[resource] || [])] : ['CATALOG'];
  }
  if (path === '/api/employees/lookup') return ['EMPLOYEES', 'REPAIR', 'INVENTORY'];
  if (at('/api/print-templates') || at('/api/system-config')) return ['SETTINGS'];
  if (at('/api/admin-access')) return ['ADMIN'];
  if (at('/api/employees')) return ['EMPLOYEES'];
  if (at('/api/customers')) return read ? ['CUSTOMERS', 'CATALOG', 'REPAIR', 'SALES', 'WARRANTY'] : method === 'POST' ? ['CUSTOMERS', 'CATALOG', 'REPAIR', 'SALES'] : ['CUSTOMERS', 'CATALOG'];
  if (at('/api/vehicles') && /\/warranties(?:\/|$)/.test(path)) return ['WARRANTY'];
  if (at('/api/vehicles')) return read ? ['VEHICLES', 'CATALOG', 'REPAIR', 'WARRANTY'] : method === 'POST' ? ['VEHICLES', 'CATALOG', 'REPAIR'] : ['VEHICLES', 'CATALOG'];
  if (at('/api/repair-orders') || at('/api/workflow') || at('/api/ocr')) return ['REPAIR'];
  if (at('/api/sales')) return ['SALES'];
  if (at('/api/secondary-payment')) return read ? ['SALES', 'FINANCE', 'REPAIR'] : ['SALES'];
  if (at('/api/inventory-receipts')) return ['INVENTORY'];
  if (at('/api/suppliers')) return read ? ['SUPPLIERS', 'CATALOG', 'INVENTORY'] : ['SUPPLIERS', 'CATALOG'];
  if (at('/api/invoices')) return read ? ['REPAIR', 'FINANCE'] : ['PAYMENTS'];
  if (at('/api/finance')) return ['FINANCE'];
  if (at('/api/parts')) return read ? ['CATALOG', 'SALES', 'INVENTORY', 'REPAIR'] : ['CATALOG'];
  if (at('/api/reports/dashboard')) return ['DASHBOARD'];
  if (at('/api/reports')) return ['REPORTS'];
  return [];
}

async function loadAccessUser(userId) {
  const users = await db.query(
    `SELECT u.ID, u.USERNAME, u.NAME, u.ISADMIN, u.SGROUPUSERID,
            u.PASSWORD, u.NOTE, u.DNHANVIENID, n.NAME AS EMPLOYEENAME, g.NAME AS GROUPNAME
       FROM SUSER u
       LEFT JOIN DNHANVIEN n ON n.ID=u.DNHANVIENID
       LEFT JOIN SGROUPUSER g ON g.ID=u.SGROUPUSERID AND g.STATUS=1
      WHERE u.ID=? AND u.STATUS=1`, [userId]
  );
  if (!users.length) return null;
  const user = users[0];
  const permissions = {};
  if (Number(user.ISADMIN) === 1) {
    const functions = await db.query(`SELECT CODE FROM SFUNCTION WHERE STATUS=1 AND CODE IS NOT NULL`);
    functions.forEach((item) => { permissions[item.CODE] = 31; });
  } else if (user.SGROUPUSERID && user.GROUPNAME) {
    const rows = await db.query(
      `SELECT f.CODE, r.MODE FROM SGROUPROLE r JOIN SFUNCTION f ON f.ID=r.SFUNCTIONID
        WHERE r.SGROUPUSERID=? AND r.STATUS=1 AND f.STATUS=1`, [user.SGROUPUSERID]
    );
    rows.forEach((item) => { permissions[item.CODE] = Number(item.MODE || 0); });
  }
  const credentialVersion=require('./authSecurity').credentialVersion(user.PASSWORD || user.NOTE);
  delete user.PASSWORD;delete user.NOTE;
  return { ...user, permissions, credentialVersion };
}

async function authenticate(req, res, next) {
  try {
    const headerToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    // <img>/<video> không thể tự gắn Authorization header. Chỉ cho phép token
    // trên query string đối với request đọc media; mọi mutation vẫn bắt buộc Bearer.
    const mediaPath=String(req.originalUrl||'').split('?')[0];
    const mediaRoute=/^\/api\/(?:vehicles|employees|parts)\/[^/]+\/image$|^\/api\/workflow\/images\/[^/]+\/content$|^\/api\/print-templates\/[^/]+\/content$/i.test(mediaPath);
    const mediaToken = ['GET', 'HEAD'].includes(req.method) && mediaRoute ? String(req.query.access_token || '') : '';
    const token = headerToken || mediaToken;
    const payload = verifyToken(token);
    if (!payload || (payload.aud && payload.aud !== 'garage')) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    const tenancy = require('./tenancy');
    if (tenancy.enabled()) {
      if (!payload.tid) return res.status(401).json({ error: 'Vui lòng đăng nhập lại và chọn mã cửa hàng.' });
      const tenant = await require('./services/platform').find(payload.tid);
      req.tenant = tenant;
      return await tenancy.run(tenant, () => completeAuthentication());
    }
    if (payload.tid) return res.status(401).json({ error: 'Phiên này thuộc chế độ nhiều cửa hàng.' });
    return await completeAuthentication();
    async function completeAuthentication() {
    const user = await loadAccessUser(payload.sub);
    if (!user || user.credentialVersion!==payload.pv) return res.status(401).json({ error: 'Tài khoản đã bị khóa hoặc không còn tồn tại.' });
    req.accessUser = user;
    req.headers['x-user']=user.ID;
    next();
    }
  } catch (error) { next(error); }
}

function authorize(req, res, next) {
  const json = res.json.bind(res);
  res.json = value => {
    let data=redact(req.accessUser,value);
    if (/^\/api\/inventory-receipts(?:\/|\?|$)/i.test(req.originalUrl) && !has(req.accessUser,'COST')) {
      const hidden=new Set(['DONGIA','THANHTIEN','TIENHANG','TIENGIAMGIA','TONGCONG','CONGNO','TIENTHANHTOAN']);
      const visit=item=>Array.isArray(item)?item.map(visit):item && typeof item==='object' && !(item instanceof Date)?Object.fromEntries(Object.entries(item).filter(([key])=>!hidden.has(key.toUpperCase())).map(([key,value])=>[key,visit(value)])):item;
      data=visit(data);
    }
    return json(data);
  };
  if (Number(req.accessUser?.ISADMIN) === 1) return next();
  let path;
  try { path = decodeURIComponent(req.originalUrl.split('?')[0]).replace(/\/+$/, '').toLowerCase(); }
  catch { return res.status(400).json({ error: 'Đường dẫn không hợp lệ.' }); }
  const at = prefix => path === prefix || path.startsWith(prefix + '/');
  // These routers enforce record/type-specific permissions themselves.
  if (['/api/printing', '/api/print-control', '/api/document-numbers'].some(prefix => path === prefix || path.startsWith(prefix + '/'))) return next();
  const codes = requiredCodes(path, req.method);
  if (codes.some((code) => code === 'ADMIN' || code === 'SETTINGS')) {
    return res.status(403).json({ error: 'Chỉ tài khoản Admin được truy cập khu vực này.' });
  }
  if (!codes.length) return res.status(403).json({ error: 'Chức năng này chưa được khai báo phân quyền.' });
  // Chuyển trạng thái là cập nhật nghiệp vụ hiện có, dù endpoint dùng POST.
  const bit = path === '/api/secondary-payment' && req.method === 'PUT' ? MODE.ADD
    : path === '/api/workflow/transition' || (at('/api/invoices') && req.method === 'POST') ? MODE.EDIT : permissionForMethod(req.method);
  const allowed = codes.some(code => has(req.accessUser, code, bit));
  if (!allowed) return res.status(403).json({ error: 'Bạn không có quyền thực hiện chức năng này.' });
  if (at('/api/invoices') && !['GET', 'HEAD'].includes(req.method) && !['REPAIR', 'FINANCE'].some(code => has(req.accessUser, code))) {
    return res.status(403).json({ error: 'Cần quyền xem hóa đơn sửa chữa hoặc tài chính để thanh toán.' });
  }
  if (at('/api/parts') && !['GET','HEAD'].includes(req.method)) {
    if (require('./permissionPolicy').hasField(req.body,['HHKIEU','HHGIATRI']) && !has(req.accessUser,'COMMISSIONS',MODE.EDIT)) return res.status(403).json({ error: 'Bạn chưa có quyền cấu hình hoa hồng.' });
    if (require('./permissionPolicy').hasField(req.body,['GIANHAP','GIAVON']) && !has(req.accessUser,'COST')) return res.status(403).json({ error: 'Bạn chưa có quyền giá nhập / giá vốn.' });
  }
  if (at('/api/master-data') && req.method === 'POST' && !has(req.accessUser, 'CATALOG', MODE.ADD)) {
    try { assertQuickFields(req.body); } catch (error) { return res.status(403).json({ error: error.message }); }
  }
  if (path === '/api/workflow/transition' && !has(req.accessUser, workflowCode(req.body?.TRANGTHAI), MODE.EDIT)) {
    return res.status(403).json({ error: 'Bạn chưa có quyền duyệt, phân công hoặc giao xe ở bước này.' });
  }
  if (/^\/api\/repair-orders\/[^/]+\/supplements\/[^/]+$/.test(path) && req.method === 'PATCH' && !has(req.accessUser, 'APPROVE_SUPPLEMENT', MODE.EDIT)) {
    return res.status(403).json({ error: 'Bạn chưa có quyền duyệt phát sinh.' });
  }
  if (path === '/api/employees/commissions' && !has(req.accessUser, 'COMMISSIONS') && !has(req.accessUser, 'PAYROLL')) {
    return res.status(403).json({ error: 'Cần quyền xem Lương hoặc Hoa hồng.' });
  }
  if (/^\/api\/repair-orders\/(?:tiep-nhan\/)?[^/]+\/status$/.test(path) && req.method === 'PATCH') return res.status(403).json({ error: 'Hãy chuyển trạng thái qua quy trình duyệt, phân công và giao xe.' });
  if ((/^\/api\/inventory-receipts\/[^/]+\/pay$/.test(path) || path === '/api/finance/debts/payments' || path === '/api/finance/vouchers') && !has(req.accessUser, 'PAYMENTS', MODE.EDIT)) {
    return res.status(403).json({ error: 'Bạn chưa có quyền thanh toán hoặc ghi nhận thu chi.' });
  }
  next();
}

module.exports = { MODE, authenticate, authorize, loadAccessUser, requiredCodes };
