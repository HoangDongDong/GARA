const router = require('express').Router();
const catalog = require('../services/catalogData');
router.use((req, res, next) => {
  try {
    const policy = require('../permissionPolicy');
    const read = ['GET', 'HEAD'].includes(req.method);
    if (/^\/(?:resources\/)?(banks|funds|stores|cashReasons)(\/|$)/i.test(req.path)) {
      if (Number(req.accessUser?.ISADMIN) !== 1) return res.status(403).json({ error: 'Chỉ Admin được quản lý cấu hình tài chính và cửa hàng.' });
    }
    if (!read && require('../permissionPolicy').hasField(req.body,['HHKIEU','HHGIATRI'])) policy.assert(req.accessUser, 'COMMISSIONS', 4);
    if (!read && require('../permissionPolicy').hasField(req.body,['GIANHAP','GIAVON'])) policy.assert(req.accessUser, 'COST');
    next();
  } catch (error) { res.status(403).json({ error: error.message }); }
});
const run = (operation) => async (req, res) => {
  try { res.set('Cache-Control', 'no-store').json(await operation(req)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message, code: error.code }); }
};
router.get('/resources/:resource', run((req) => catalog.read(req.params.resource)));
router.post('/resources/:resource', run((req) => catalog.save(req.params.resource, null, req.body, req.accessUser.ID)));
router.put('/resources/:resource/:id', run((req) => catalog.save(req.params.resource, req.params.id, req.body, req.accessUser.ID)));
router.patch('/resources/:resource/:id/status', run((req) => catalog.setStatus(req.params.resource, req.params.id, req.body.status, req.accessUser.ID)));
router.get('/:type', run((req) => catalog.load(req.params.type)));
module.exports = router;
