const express = require('express');
const router = express.Router();
const db = require('../db');

/*
 * Supplier data used by the supplier screen. Keep financial totals in the
 * backend so the UI never has to guess from partially loaded receipts.
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT NCC.*,
             G.NAME AS GROUP_NAME,
             COALESCE((
               SELECT SUM(COALESCE(NK.CONGNO, 0))
                 FROM TNHAPKHO NK
                WHERE NK.DNHACUNGCAPID = NCC.ID
                  AND NK.STATUS = 1
             ), 0) AS TOTAL_DEBT,
             COALESCE((
               SELECT SUM(COALESCE(NK.TONGCONG, 0) - COALESCE(NK.CONGNO, 0))
                 FROM TNHAPKHO NK
                WHERE NK.DNHACUNGCAPID = NCC.ID
                  AND NK.STATUS = 1
             ), 0) AS TOTAL_PAID
        FROM DNHACUNGCAP NCC
        LEFT JOIN DNHOMNHACUNGCAP G ON G.ID = NCC.DNHOMNHACUNGCAPID
       WHERE NCC.STATUS = 1
       ORDER BY NCC.MANHACUNGCAP, NCC.NAME
    `);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/transactions', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT FIRST 20 NK.ID, NK.NAME, NK.NGAY, NK.TONGCONG,
             NK.CONGNO, NK.DATHANHTOAN, NK.LOAI
        FROM TNHAPKHO NK
       WHERE NK.DNHACUNGCAPID = ?
         AND NK.STATUS = 1
       ORDER BY NK.NGAY DESC, NK.TIMECREATED DESC
    `, [req.params.id]);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      NAME, MANHACUNGCAP, DNHOMNHACUNGCAPID,
      DIENTHOAI, EMAIL, DIACHI, WEBSITE, NOTE,
    } = req.body;
    const name = String(NAME || '').trim();
    let supplierCode = String(MANHACUNGCAP || '').trim();
    if (!name) return res.status(400).json({ error: 'Ten nha cung cap khong duoc trong' });
    if (!supplierCode) {
      const pad = (n) => String(n).padStart(2, '0');
      const now = new Date();
      supplierCode = `NCC${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    }

    const duplicates = await db.query(
      `SELECT FIRST 1 ID FROM DNHACUNGCAP
        WHERE UPPER(TRIM(MANHACUNGCAP)) = ?`,
      [supplierCode.toUpperCase()]
    );
    if (duplicates.length) {
      return res.status(409).json({ error: 'Ma nha cung cap da ton tai' });
    }

    const id = db.uuidv4();
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `INSERT INTO DNHACUNGCAP
         (ID, NAME, MANHACUNGCAP, DNHOMNHACUNGCAPID,
          DIENTHOAI, EMAIL, DIACHI, WEBSITE, NOTE,
          STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      [id, name, supplierCode, DNHOMNHACUNGCAPID || null,
        DIENTHOAI || null, EMAIL || null, DIACHI || null, WEBSITE || null, NOTE || null,
        actor]
    );
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      NAME, MANHACUNGCAP, DNHOMNHACUNGCAPID,
      DIENTHOAI, EMAIL, DIACHI, WEBSITE, NOTE,
    } = req.body;
    const name = String(NAME || '').trim();
    const supplierCode = String(MANHACUNGCAP || '').trim();
    if (!name) return res.status(400).json({ error: 'Ten nha cung cap khong duoc trong' });
    if (!supplierCode) return res.status(400).json({ error: 'Ma nha cung cap khong duoc trong' });

    const duplicates = await db.query(
      `SELECT FIRST 1 ID FROM DNHACUNGCAP
        WHERE UPPER(TRIM(MANHACUNGCAP)) = ? AND ID <> ?`,
      [supplierCode.toUpperCase(), req.params.id]
    );
    if (duplicates.length) {
      return res.status(409).json({ error: 'Ma nha cung cap da ton tai' });
    }

    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `UPDATE DNHACUNGCAP
          SET NAME=?, MANHACUNGCAP=?, DNHOMNHACUNGCAPID=?,
              DIENTHOAI=?, EMAIL=?, DIACHI=?, WEBSITE=?, NOTE=?,
              USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=? AND STATUS=1`,
      [name, supplierCode, DNHOMNHACUNGCAPID || null,
        DIENTHOAI || null, EMAIL || null, DIACHI || null, WEBSITE || null, NOTE || null,
        actor, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `UPDATE DNHACUNGCAP
          SET STATUS=0, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=?`,
      [actor, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
