const router = require('express').Router();
const catalog = require('../services/catalogData');
router.use((req, res, next) => Number(req.accessUser?.ISADMIN) === 1 ? next() : res.status(403).json({ error: 'Chỉ Admin được quản lý danh mục hệ thống.' }));
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
