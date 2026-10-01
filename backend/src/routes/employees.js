const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GARAGE.FDB - DNHANVIEN:
 *   NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON, LOAINHANVIEN,
 *   CACHTINHLUONG, LUONGCA, LUONGTHANG, LUONGTHEOCA, HOAHONG
 */

const LOAI_NV = ['NV thường','KTV','Cố vấn DV','Thủ kho','Thu ngân'];

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '') === '1';
    const rows = await db.query(
      `SELECT ID, NAME, CODE, NOTE, DIENTHOAI, DIACHI,
              CHUYENMON, SIMAGEID, TIMECREATED,
              NGHITHU7, NGHICHUNHAT,
              LOAINHANVIEN, CACHTINHLUONG, LUONGCA, LUONGTHANG, STATUS
         FROM DNHANVIEN
        WHERE ${includeInactive ? 'STATUS IN (0, 1)' : 'STATUS = 1'}
     ORDER BY TIMECREATED DESC`
    );
    res.json({
      data: rows.map((r) => ({ ...r, LOAI_NV_LABEL: LOAI_NV[r.LOAINHANVIEN] || '-' })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const {
      NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON, LOAINHANVIEN,
      LUONGCA, LUONGTHANG, CACHTINHLUONG, NOTE,
    } = req.body;
    if (!NAME) return res.status(400).json({ error: 'Ten NV khong duoc trong' });
    const id = db.uuidv4();
    await db.execute(
      `INSERT INTO DNHANVIEN
         (ID, NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON, LOAINHANVIEN, NOTE,
          LUONGCA, LUONGTHANG, CACHTINHLUONG, USERCREATEDID, TIMECREATED, STATUS)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
      [
        id, NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON,
        LOAINHANVIEN || 0, NOTE || null, LUONGCA || 0, LUONGTHANG || 0,
        CACHTINHLUONG || 0, 'SYSTEM',
      ]
    );
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON, LOAINHANVIEN,
      LUONGCA, LUONGTHANG, CACHTINHLUONG,
    } = req.body;
    await db.execute(
      `UPDATE DNHANVIEN
          SET NAME=?, CODE=?, DIENTHOAI=?, DIACHI=?, CHUYENMON=?, LOAINHANVIEN=?,
              LUONGCA=?, LUONGTHANG=?, CACHTINHLUONG=?,
              USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=?`,
      [
        NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON,
        LOAINHANVIEN || 0, LUONGCA || 0, LUONGTHANG || 0,
        CACHTINHLUONG || 0, 'SYSTEM', req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(
      `UPDATE DNHANVIEN SET STATUS=0, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
