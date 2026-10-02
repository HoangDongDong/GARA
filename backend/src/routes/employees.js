const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '') === '1';
    const rows = await db.query(
      `SELECT n.ID, n.NAME, n.CODE, n.NOTE, n.DIENTHOAI, n.DIACHI,
              n.EMAIL, n.CHUNGCHI, n.CHUYENMON, n.SIMAGEID, n.TIMECREATED,
              n.NGHITHU7, n.NGHICHUNHAT, n.LOAINHANVIEN, n.CACHTINHLUONG,
              n.LUONGCA, n.LUONGTHANG, n.STATUS,
              u.ID AS SUSERID, u.USERNAME, g.ID AS SGROUPUSERID, g.NAME AS CHUCVU
         FROM DNHANVIEN n
         LEFT JOIN SUSER u ON u.DNHANVIENID=n.ID AND u.STATUS=1
         LEFT JOIN SGROUPUSER g ON g.ID=u.SGROUPUSERID AND g.STATUS=1
        WHERE ${includeInactive ? 'n.STATUS IN (0, 1)' : 'n.STATUS = 1'}
     ORDER BY n.TIMECREATED DESC`
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { NAME, DIENTHOAI, EMAIL, CHUNGCHI, CHUYENMON } = req.body;
    if (!String(NAME || '').trim()) return res.status(400).json({ error: 'Họ và tên không được để trống.' });
    const id = db.uuidv4();
    await db.execute(
      `INSERT INTO DNHANVIEN
         (ID,NAME,DIENTHOAI,EMAIL,CHUNGCHI,CHUYENMON,LOAINHANVIEN,
          CACHTINHLUONG,LUONGCA,LUONGTHANG,USERCREATEDID,TIMECREATED,STATUS)
       VALUES (?,?,?,?,?,?,0,0,0,0,?,CURRENT_TIMESTAMP,1)`,
      [id, String(NAME).trim(), String(DIENTHOAI || '').trim() || null,
        String(EMAIL || '').trim() || null, String(CHUNGCHI || '').trim() || null,
        String(CHUYENMON || '').trim() || null, req.accessUser?.ID || 'SYSTEM']
    );
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { NAME, DIENTHOAI, EMAIL, CHUNGCHI, CHUYENMON } = req.body;
    await db.execute(
      `UPDATE DNHANVIEN
          SET NAME=?, DIENTHOAI=?, EMAIL=?, CHUNGCHI=?, CHUYENMON=?,
              USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=?`,
      [String(NAME || '').trim(), String(DIENTHOAI || '').trim() || null,
        String(EMAIL || '').trim() || null, String(CHUNGCHI || '').trim() || null,
        String(CHUYENMON || '').trim() || null, req.accessUser?.ID || 'SYSTEM', req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.transaction(async (query, execute) => {
      await execute(`UPDATE DNHANVIEN SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [req.accessUser?.ID || 'SYSTEM', req.params.id]);
      await execute(`UPDATE SUSER SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE DNHANVIENID=?`, [req.accessUser?.ID || 'SYSTEM', req.params.id]);
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
