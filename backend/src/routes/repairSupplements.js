const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const service = require('../services/repairSupplements');
const actor = req => req.accessUser.ID;
router.get('/', async (req, res) => {
  try {
    const heads = await db.query('SELECT * FROM TPHATSINHSUACHUA WHERE TLENHSUACHUAID=? ORDER BY TIMECREATED DESC, ID', [req.params.id]);
    const items = await db.query(`SELECT CT.* FROM TPHATSINHSUACHUACT CT JOIN TPHATSINHSUACHUA H ON H.ID=CT.TPHATSINHSUACHUAID
      WHERE H.TLENHSUACHUAID=? ORDER BY CT.ID`, [req.params.id]);
    res.json({ data: heads.map(head => ({ ...head, items: items.filter(it => it.TPHATSINHSUACHUAID === head.ID) })) });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try {
    const result = await db.transaction((q, e, uuid) => service.create(q, e, uuid, req.params.id, req.body, actor(req)));
    res.json({ ok: true, ...result });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.patch('/:supplementId', async (req, res) => {
  try {
    const result = await db.transaction((q, e, uuid) => service.decide(q, e, uuid, req.params.id, req.params.supplementId, req.body, actor(req)));
    res.json({ ok: true, ...result });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
module.exports = router;
