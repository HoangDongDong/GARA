const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GARAGE.FDB - DMATHANG:
 *   NAME, CODE, BARCODE, MAOEM, GIANHAP, GIABAN, GIABAN2, GIABAN3, GIABAN4,
 *   DHANGSANXUATID, DVITRIKHOID, DNHOMMATHANGID, DDONVITINHID, BAOHANH
 *   TONTOITHIEU, TONTOIDA, MASANCO
 *
 *   TAMKHOA=1 ngung ban. STATUS=1 con su dung.
 */

// Lay ton kho tu DNHAPKHOCHITIET (nhap) - DXUATPHUTUNG + TDONHANGCHITIET (xuat)
const TONKHO_SQL = `
  SELECT T.DMATHANGID,
         COALESCE(SUM(CASE WHEN T.LOAI IN (0,1) THEN T.SOLUONG ELSE 0 END), 0) AS SL_NHAP,
         COALESCE(SUM(CASE WHEN T.LOAI IN (2,3) THEN T.SOLUONG ELSE 0 END), 0) AS SL_XUAT
    FROM (
      SELECT NCT.DMATHANGID, NCT.SOLUONG, 1 AS LOAI
        FROM TNHAPKHOCHITIET NCT
       WHERE NCT.STATUS = 1
      UNION ALL
      SELECT XP.DMATHANGID, XP.SOLUONG, 3 AS LOAI
        FROM TXUATPHUTUNG XP
      UNION ALL
      SELECT DHCT.DMATHANGID, DHCT.SLXUAT AS SOLUONG, 3 AS LOAI
        FROM TDONHANGCHITIET DHCT
    ) T
   GROUP BY T.DMATHANGID`;

// GET /api/parts
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT M.ID, M.NAME, M.CODE, M.BARCODE, M.MAOEM, M.GIANHAP, M.GIABAN,
              M.GIABAN2, M.GIABAN3, M.TONTOITHIEU, M.TONTOIDA,
              M.DHANGSANXUATID, HSX.NAME  AS HANG,
              M.DVITRIKHOID,    VT.NAME  AS VITRI,
              M.DNHOMMATHANGID, NH.NAME  AS NHOM,
              M.DDONVITINHID, DVT.NAME AS DONVI,
              M.BAOHANH, M.STATUS, M.TAMKHOA, M.MASANCO
         FROM DMATHANG M
         LEFT JOIN DHANGSANXUAT  HSX ON HSX.ID = M.DHANGSANXUATID
         LEFT JOIN DVITRIKHO      VT  ON VT.ID  = M.DVITRIKHOID
         LEFT JOIN DNHOMMATHANG   NH  ON NH.ID  = M.DNHOMMATHANGID
         LEFT JOIN DDONVITINH     DVT ON DVT.ID = M.DDONVITINHID
        WHERE M.STATUS = 1
     ORDER BY M.TIMECREATED DESC`
    );

    // tinh ton kho
    const ton = await db.query(TONKHO_SQL);
    const tonMap = {};
    ton.forEach((t) => { tonMap[t.DMATHANGID] = (t.SL_NHAP || 0) - (t.SL_XUAT || 0); });

    res.json({
      data: rows.map((r) => ({
        ...r,
        TON_KHO: tonMap[r.ID] || 0,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/parts/meta - dropdown
router.get('/meta/options', async (req, res) => {
  try {
    const hangsx = await db.query(`SELECT ID, NAME FROM DHANGSANXUAT WHERE STATUS=1`);
    const vitri  = await db.query(`SELECT ID, NAME FROM DVITRIKHO WHERE STATUS=1`);
    const nhom   = await db.query(`SELECT ID, NAME FROM DNHOMMATHANG WHERE STATUS=1`);
    const dvt    = await db.query(`SELECT ID, NAME FROM DDONVITINH WHERE STATUS=1`);
    res.json({ data: { hangsx, vitri, nhom, dvt } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const {
      NAME, CODE, BARCODE, MAOEM, GIANHAP, GIABAN, GIABAN2, GIABAN3,
      DHANGSANXUATID, DVITRIKHOID, DNHOMMATHANGID, DDONVITINHID,
      BAOHANH, TONTOITHIEU, TONTOIDA, MASANCO,
    } = req.body;
    const name = String(NAME || '').trim();
    const code = String(CODE || '').trim();
    if (!name) return res.status(400).json({ error: 'Ten mat hang khong duoc trong' });
    if (!code) return res.status(400).json({ error: 'Ma mat hang khong duoc trong' });
    const duplicates = await db.query(
      `SELECT FIRST 1 ID FROM DMATHANG WHERE UPPER(TRIM(CODE)) = ?`,
      [code.toUpperCase()]
    );
    if (duplicates.length) return res.status(409).json({ error: 'Ma mat hang da ton tai' });
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const id = db.uuidv4();
    await db.execute(
      `INSERT INTO DMATHANG
         (ID, NAME, CODE, BARCODE, MAOEM, GIANHAP, GIABAN, GIABAN2, GIABAN3,
          DHANGSANXUATID, DVITRIKHOID, DNHOMMATHANGID, DDONVITINHID,
          BAOHANH, TONTOITHIEU, TONTOIDA, MASANCO,
          STATUS, TAMKHOA, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)`,
      [
        id, name, code, BARCODE, MAOEM,
        GIANHAP || 0, GIABAN || 0, GIABAN2 || 0, GIABAN3 || 0,
        DHANGSANXUATID || null, DVITRIKHOID || null,
        DNHOMMATHANGID || null, DDONVITINHID || null,
        BAOHANH, TONTOITHIEU || 0, TONTOIDA || 0, MASANCO, actor,
      ]
    );
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      NAME, CODE, BARCODE, MAOEM, GIANHAP, GIABAN, GIABAN2, GIABAN3,
      DHANGSANXUATID, DVITRIKHOID, DNHOMMATHANGID, DDONVITINHID,
      BAOHANH, TONTOITHIEU, TONTOIDA, MASANCO,
    } = req.body;
    await db.execute(
      `UPDATE DMATHANG
          SET NAME=?, CODE=?, BARCODE=?, MAOEM=?, GIANHAP=?, GIABAN=?,
              GIABAN2=?, GIABAN3=?, DHANGSANXUATID=?, DVITRIKHOID=?,
              DNHOMMATHANGID=?, DDONVITINHID=?, BAOHANH=?,
              TONTOITHIEU=?, TONTOIDA=?, MASANCO=?,
              USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=?`,
      [
        NAME, CODE, BARCODE, MAOEM,
        GIANHAP || 0, GIABAN || 0, GIABAN2 || 0, GIABAN3 || 0,
        DHANGSANXUATID || null, DVITRIKHOID || null,
        DNHOMMATHANGID || null, DDONVITINHID || null,
        BAOHANH, TONTOITHIEU || 0, TONTOIDA || 0, MASANCO,
        'SYSTEM', req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(
      `UPDATE DMATHANG SET STATUS=0, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
