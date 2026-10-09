const express = require('express');
const router = express.Router();
const printing = require('../services/documentPrint');

router.get('/types', async (req, res) => {
  try {
    const types = printing.types.filter(type => printing.permitted(req.accessUser, type));
    res.json({ data: await Promise.all(types.map(printing.info)) });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.use('/:type', (req, res, next) => {
  try {
    req.printType = printing.typeByKey(req.params.type);
    if (!printing.permitted(req.accessUser, req.printType)) return res.status(403).json({ error: 'Bạn cần quyền Xem và In của nghiệp vụ này.' });
    next();
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.get('/:type/records', async (req, res) => {
  try { res.json({ data: await printing.records(req.printType, String(req.query.search || '').slice(0,120)) }); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

// Compatibility for old clients: the same selected FRX now produces a native PDF.
router.get('/:type/:id/html', async (req,res) => {
  res.redirect(307, req.originalUrl.replace(/\/html(?=\?|$)/, '/pdf'));
});

router.get('/:type/:id/pdf', async (req, res) => {
  try {
    const result = await printing.render(req.printType, req.params.id, req.query, req.accessUser.USERNAME,req.accessUser);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${encodeURIComponent(result.name)}.pdf"`, 'Cache-Control': 'no-store', 'X-Template-Name': encodeURIComponent(result.template.NAME) });
    if(result.notice)res.set({ 'X-Print-Notice':encodeURIComponent(result.notice),'Access-Control-Expose-Headers':'X-Print-Notice' });
    res.send(result.pdf);
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

module.exports = router;
