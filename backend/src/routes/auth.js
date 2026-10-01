const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GARAGE.FDB - bang SUSER:
 *   NAME = username, NOTE = password
 *   IMAGE = anh (BLOB), MAUHOADON = so mau hoa don
 */

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const rows = await db.query(
      `SELECT ID, NAME AS USERNAME, NOTE AS PASSWORD,
              IMAGE, MAUHOADON, STATUS, AUTOID
       FROM SUSER
       WHERE NAME = ? AND NOTE = ? AND STATUS = 1`,
      [username, password]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Sai tai khoan hoac mat khau' });
    }
    const u = rows[0];
    res.json({
      ok: true,
      data: {
        ID: u.ID,
        USERNAME: u.USERNAME,
        TEN_HIEN_THI: u.USERNAME,
        ROLE: 'ADMIN',
        MAUHOADON: u.MAUHOADON,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { id, oldPass, newPass } = req.body;
    const rows = await db.query(
      `SELECT ID FROM SUSER WHERE ID=? AND NOTE=?`,
      [id, oldPass]
    );
    if (!rows.length) return res.status(401).json({ error: 'Mat khau cu khong dung' });
    await db.execute(`UPDATE SUSER SET NOTE=? WHERE ID=?`, [newPass, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;