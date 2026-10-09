const { AsyncLocalStorage } = require('async_hooks');
const path = require('path');
const context = new AsyncLocalStorage();
const enabled = () => process.env.SAAS_ENABLED === 'true';
const current = () => context.getStore();
const key = () => current()?.id || (enabled() ? failMissing() : 'legacy');
function failMissing() { throw Object.assign(new Error('Thiếu ngữ cảnh cửa hàng.'), { status: 401 }); }
function run(tenant, task) {
  if (!tenant?.id || !tenant.database) throw new Error('Tenant chưa có database.');
  return context.run(Object.freeze({ ...tenant }), task);
}
function database() {
  const tenant = current();
  if (tenant) return tenant.database;
  if (enabled()) failMissing();
  return require('./config').firebird.database;
}
function storageDirectory(root) { return enabled() || current() ? path.join(root, key()) : root; }
function writable(tenant, now = Date.now()) {
  return tenant?.state === 'active' && (!tenant.endsAt || new Date(tenant.endsAt).getTime() > now);
}
function guard(req, res, next) {
  const tenant = current();
  if (!tenant || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!writable(tenant)) return res.status(402).json({ error: 'Gói sử dụng đã hết hạn. Cửa hàng hiện ở chế độ chỉ đọc.', code: 'SUBSCRIPTION_EXPIRED' });
  next();
}
module.exports = { enabled, current, key, run, database, storageDirectory, writable, guard };
