const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GARAGE.FDB - DKHACHHANG:
 *   ID, NAME = ten khach, MAKHACH, DIENTHOAI, EMAIL, DIACHI,
 *   MASOTHUE, NGAYSINH, STATUS, USERCREATEDID, TIMECREATED
 */

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT KH.ID, KH.NAME, KH.MAKHACH, KH.DIENTHOAI, KH.EMAIL, KH.DIACHI,
              KH.MASOTHUE, KH.NGAYSINH, KH.DNHOMKHACHHANGID, KH.GIAMGIARIENG, NHOM.GIAMGIARIENG AS GIAMGIANHOM,
              NHOM.NAME AS NHOMKH, KH.STATUS, KH.TIMECREATED
       FROM DKHACHHANG KH
       LEFT JOIN DNHOMKHACHHANG NHOM ON NHOM.ID = KH.DNHOMKHACHHANGID AND NHOM.STATUS=1
      WHERE KH.STATUS = 1
      ORDER BY KH.TIMECREATED DESC`
    );
    res.json({ data: rows });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT KH.ID, KH.NAME, KH.MAKHACH, KH.DIENTHOAI, KH.EMAIL, KH.DIACHI,
              KH.MASOTHUE, KH.NGAYSINH, KH.DNHOMKHACHHANGID, KH.GIAMGIARIENG, NHOM.GIAMGIARIENG AS GIAMGIANHOM,
              NHOM.NAME AS NHOMKH, KH.STATUS, KH.TIMECREATED
       FROM DKHACHHANG KH
       LEFT JOIN DNHOMKHACHHANG NHOM ON NHOM.ID = KH.DNHOMKHACHHANGID AND NHOM.STATUS=1
       WHERE KH.ID = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    require("../services/pricingPolicy").validateMaster(req.body);
    const { NAME, MAKHACH, DIENTHOAI, EMAIL, DIACHI, MASOTHUE, DNHOMKHACHHANGID } = req.body;
    if (!NAME) return res.status(400).json({ error: 'Ten khach hang khong duoc trong' });
    const customerCode = String(MAKHACH || '').trim();
    if (customerCode) {
      const duplicates = await db.query(
        `SELECT FIRST 1 ID FROM DKHACHHANG
          WHERE STATUS = 1 AND UPPER(TRIM(MAKHACH)) = ?`,
        [customerCode.toUpperCase()]
      );
      if (duplicates.length) {
        return res.status(409).json({ error: 'Ma khach hang da ton tai' });
      }
    }
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const id = db.uuidv4();
    await db.execute(
      `INSERT INTO DKHACHHANG
         (ID, NAME, MAKHACH, DIENTHOAI, EMAIL, DIACHI, MASOTHUE, DNHOMKHACHHANGID, GIAMGIARIENG,
          STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      [id, String(NAME).trim(), customerCode || null, DIENTHOAI, EMAIL, DIACHI, MASOTHUE, DNHOMKHACHHANGID || null, req.body.GIAMGIARIENG ?? null, actor]
    );
    res.json({ ok: true, id });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    require("../services/pricingPolicy").validateMaster(req.body);
    const { NAME, MAKHACH, DIENTHOAI, EMAIL, DIACHI, MASOTHUE, DNHOMKHACHHANGID } = req.body;
    if (!NAME || !String(NAME).trim()) {
      return res.status(400).json({ error: 'Ten khach hang khong duoc trong' });
    }
    const customerCode = String(MAKHACH || '').trim();
    if (customerCode) {
      const duplicates = await db.query(
        `SELECT FIRST 1 ID FROM DKHACHHANG
          WHERE STATUS = 1 AND UPPER(TRIM(MAKHACH)) = ? AND ID <> ?`,
        [customerCode.toUpperCase(), req.params.id]
      );
      if (duplicates.length) {
        return res.status(409).json({ error: 'Ma khach hang da ton tai' });
      }
    }
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const discountUpdate = 'GIAMGIARIENG' in req.body ? ', GIAMGIARIENG=?' : '';
    await db.execute(
      `UPDATE DKHACHHANG
          SET NAME=?, MAKHACH=?, DIENTHOAI=?, EMAIL=?, DIACHI=?, MASOTHUE=?, DNHOMKHACHHANGID=?${discountUpdate},
              USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID = ? AND STATUS = 1`,
      [String(NAME).trim(), customerCode || null, DIENTHOAI, EMAIL, DIACHI, MASOTHUE, DNHOMKHACHHANGID || null,
        ...('GIAMGIARIENG' in req.body ? [req.body.GIAMGIARIENG] : []), actor, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    // soft delete theo STATUS
    await db.execute(
      `UPDATE DKHACHHANG SET STATUS=0, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [actor, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
