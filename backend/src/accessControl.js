const db = require('./db');
const { verifyToken } = require('./authSecurity');

const MODE = { VIEW: 1, ADD: 2, EDIT: 4, DELETE: 8, PRINT: 16 };

function permissionForMethod(method) {
  if (method === 'GET' || method === 'HEAD') return MODE.VIEW;
  if (method === 'POST') return MODE.ADD;
  if (method === 'PUT' || method === 'PATCH') return MODE.EDIT;
  if (method === 'DELETE') return MODE.DELETE;
  return MODE.VIEW;
}

function requiredCodes(path) {
  if (path.startsWith('/api/print-templates') || path.startsWith('/api/system-config')) return ['SETTINGS'];
  if (path.startsWith('/api/admin-access')) return ['ADMIN'];
  if (path.startsWith('/api/employees')) return ['EMPLOYEES'];
  if (path.startsWith('/api/customers')) return ['CUSTOMERS', 'REPAIR'];
  if (path.startsWith('/api/vehicles/warranties') || path.includes('/warranties')) return ['WARRANTY'];
  if (path.startsWith('/api/vehicles')) return ['VEHICLES', 'REPAIR', 'WARRANTY'];
  if (path.startsWith('/api/repair-orders') || path.startsWith('/api/workflow') || path.startsWith('/api/ocr')) return ['REPAIR'];
  if (path.startsWith('/api/sales')) return ['SALES'];
  if (path.startsWith('/api/inventory-receipts')) return ['INVENTORY'];
  if (path.startsWith('/api/suppliers')) return ['SUPPLIERS'];
  if (path.startsWith('/api/invoices')) return ['SALES', 'FINANCE'];
  if (path.startsWith('/api/parts')) return ['SALES', 'INVENTORY', 'REPAIR'];
  if (path.startsWith('/api/reports/dashboard')) return ['DASHBOARD'];
  if (path.startsWith('/api/reports')) return ['REPORTS'];
  return [];
}

async function loadAccessUser(userId) {
  const users = await db.query(
    `SELECT u.ID, u.USERNAME, u.NAME, u.ISADMIN, u.SGROUPUSERID,
            u.DNHANVIENID, n.NAME AS EMPLOYEENAME, g.NAME AS GROUPNAME
       FROM SUSER u
       LEFT JOIN DNHANVIEN n ON n.ID=u.DNHANVIENID
       LEFT JOIN SGROUPUSER g ON g.ID=u.SGROUPUSERID
      WHERE u.ID=? AND u.STATUS=1`, [userId]
  );
  if (!users.length) return null;
  const user = users[0];
  const permissions = {};
  if (Number(user.ISADMIN) === 1) {
    const functions = await db.query(`SELECT CODE FROM SFUNCTION WHERE STATUS=1 AND CODE IS NOT NULL`);
    functions.forEach((item) => { permissions[item.CODE] = 31; });
  } else if (user.SGROUPUSERID) {
    const rows = await db.query(
      `SELECT f.CODE, r.MODE FROM SGROUPROLE r JOIN SFUNCTION f ON f.ID=r.SFUNCTIONID
        WHERE r.SGROUPUSERID=? AND r.STATUS=1 AND f.STATUS=1`, [user.SGROUPUSERID]
    );
    rows.forEach((item) => { permissions[item.CODE] = Number(item.MODE || 0); });
  }
  return { ...user, permissions };
}

async function authenticate(req, res, next) {
  try {
    const headerToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    // <img>/<video> không thể tự gắn Authorization header. Chỉ cho phép token
    // trên query string đối với request đọc media; mọi mutation vẫn bắt buộc Bearer.
    const mediaToken = ['GET', 'HEAD'].includes(req.method) ? String(req.query.access_token || '') : '';
    const token = headerToken || mediaToken;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    const user = await loadAccessUser(payload.sub);
    if (!user) return res.status(401).json({ error: 'Tài khoản đã bị khóa hoặc không còn tồn tại.' });
    req.accessUser = user;
    next();
  } catch (error) { next(error); }
}

function authorize(req, res, next) {
  if (Number(req.accessUser?.ISADMIN) === 1) return next();
  const path = req.originalUrl.split('?')[0];
  if (path.startsWith('/api/master-data') && !['GET', 'HEAD'].includes(req.method)) {
    return res.status(403).json({ error: 'Chỉ tài khoản Admin được thay đổi cấu hình hệ thống.' });
  }
  const codes = requiredCodes(path);
  if (codes.some((code) => code === 'ADMIN' || code === 'SETTINGS')) {
    return res.status(403).json({ error: 'Chỉ tài khoản Admin được truy cập khu vực này.' });
  }
  if (!codes.length) return next();
  // Chuyển trạng thái là cập nhật nghiệp vụ hiện có, dù endpoint dùng POST.
  const bit = path === '/api/workflow/transition' ? MODE.EDIT : permissionForMethod(req.method);
  const allowed = codes.some((code) => (Number(req.accessUser.permissions[code] || 0) & bit) === bit);
  if (!allowed) return res.status(403).json({ error: 'Bạn không có quyền thực hiện chức năng này.' });
  next();
}

module.exports = { MODE, authenticate, authorize, loadAccessUser };
