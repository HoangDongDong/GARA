const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GARAGE.FDB - THOADONSUACHUA:
 *   NAME=so hoa don, NGAY, DXEID, DKHACHHANGID, TLENHSUACHUAID, TTIEPNHANXEID,
 *   TIENPHUTUNG, TIENCONG, TIENDICHVU, TILEGIAMGIA, TIENGIAMGIA,
 *   TIENTHUE, TONGCONG, DATCOC, CONLAI, TIENMAT, CHUYENKHOAN, THE, CONGNO,
 *   DATHANHTOAN
 */

router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT HD.ID, HD.NAME, HD.NGAY,
              HD.TIENPHUTUNG, HD.TIENCONG, HD.TIENDICHVU,
              HD.TIENGIAMGIA, HD.TIENTHUE, HD.TONGCONG,
              HD.DATCOC, HD.CONLAI, HD.TIENMAT, HD.CHUYENKHOAN, HD.THE, HD.CONGNO,
              HD.DATHANHTOAN,
              HD.DXEID, V.BIENSO,
              HD.DKHACHHANGID, KH.NAME AS TEN_KH, KH.DIENTHOAI,
              HD.TLENHSUACHUAID, LSC.NAME AS SOPHIEULSC
         FROM THOADONSUACHUA HD
         LEFT JOIN DXE          V   ON V.ID  = HD.DXEID
         LEFT JOIN DKHACHHANG   KH  ON KH.ID = HD.DKHACHHANGID
         LEFT JOIN TLENHSUACHUA LSC ON LSC.ID = HD.TLENHSUACHUAID
        WHERE HD.STATUS = 1
     ORDER BY HD.NGAY DESC`
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const {
      TLENHSUACHUAID, NGAY, TILETHUE, TILEGIAMGIA, TIENGIAMGIA,
      TIENMAT, CHUYENKHOAN, THE,
    } = req.body;
    if (!TLENHSUACHUAID) return res.status(400).json({ error: 'Phai chon lenh sua chua' });

    // lay lenh sua chua
    const ls = await db.query(
      `SELECT DXEID, DKHACHHANGID, TONGTIENCONG, TONGTIENPHUTUNG
         FROM TLENHSUACHUA WHERE ID = ?`,
      [TLENHSUACHUAID]
    );
    if (!ls.length) return res.status(404).json({ error: 'Lenh sua chua khong ton tai' });

    const { DXEID, DKHACHHANGID, TONGTIENCONG, TONGTIENPHUTUNG } = ls[0];
    const workflowRows = await db.query(
      `SELECT FIRST 1 ID, TRANGTHAI FROM TTRANGTHAIXE
        WHERE DXEID=? AND TLENHSUACHUAID=? AND STATUS=1
        ORDER BY NGAY_TRANGTHAI DESC`,
      [DXEID, TLENHSUACHUAID]
    );
    if (!workflowRows.length || Number(workflowRows[0].TRANGTHAI) !== 3) {
      return res.status(409).json({ error: 'Chi lap thanh toan khi xe da o buoc Giao xe' });
    }

    const giamGia   = TIENGIAMGIA || 0;
    const tienTruocGiam = TONGTIENCONG + TONGTIENPHUTUNG;
    const tienSauGiam   = tienTruocGiam - giamGia;
    const tienThue      = Math.round(tienSauGiam * ((TILETHUE || 0) / 100));
    const tongCong      = tienSauGiam + tienThue;

    const tongThanhToan = (TIENMAT || 0) + (CHUYENKHOAN || 0) + (THE || 0);
    const daThanhToan   = tongThanhToan >= tongCong ? 1 : 0;
    const conLai        = Math.max(0, tongCong - tongThanhToan);
    const congNo        = Math.max(0, tongThanhToan - tongCong);

    const id = db.uuidv4();
    const ma = 'HD' + Date.now().toString().slice(-8);

    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `INSERT INTO THOADONSUACHUA
         (ID, NAME, NGAY, DXEID, DKHACHHANGID, TLENHSUACHUAID,
          TIENPHUTUNG, TIENCONG, TIENDICHVU,
          TILEGIAMGIA, TIENGIAMGIA, TIENTHUE, TONGCONG,
          DATCOC, CONLAI, TIENMAT, CHUYENKHOAN, THE, CONGNO,
          DATHANHTOAN, STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      [
        id, ma, NGAY, DXEID, DKHACHHANGID, TLENHSUACHUAID,
        TONGTIENPHUTUNG, TONGTIENCONG,
        TILEGIAMGIA || 0, giamGia, tienThue, tongCong,
        conLai, TIENMAT || 0, CHUYENKHOAN || 0, THE || 0, congNo,
        daThanhToan, actor,
      ]
    );

    // cap nhat trang thai lenh sua chua
    await db.execute(
      `UPDATE TLENHSUACHUA SET TRANGTHAI=?, KETTHUC=COALESCE(KETTHUC,CURRENT_TIMESTAMP),
              USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [daThanhToan ? 3 : 5, TLENHSUACHUAID]
    );

    if (daThanhToan) {
      await db.query(
        `EXECUTE PROCEDURE SP_CHUYEN_TRANGTHAI(?, 4, ?, ?, ?, ?, ?)`,
        [DXEID, actor, 'Da giao xe va thanh toan du', 'Tu dong hoan thanh khi thanh toan', db.uuidv4(), db.uuidv4()]
      );
    }

    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/pay', async (req, res) => {
  try {
    const { TIENMAT, CHUYENKHOAN, THE } = req.body;
    const rows = await db.query(
      `SELECT ID, TONGCONG, TIENMAT, CHUYENKHOAN, THE, DXEID, TLENHSUACHUAID
         FROM THOADONSUACHUA WHERE ID=? AND STATUS=1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Hoa don khong ton tai' });
    const invoice = rows[0];
    const cash = TIENMAT == null ? Number(invoice.TIENMAT || 0) : Number(TIENMAT || 0);
    const transfer = CHUYENKHOAN == null ? Number(invoice.CHUYENKHOAN || 0) : Number(CHUYENKHOAN || 0);
    const card = THE == null ? Number(invoice.THE || 0) : Number(THE || 0);
    const remaining = Math.max(0, Number(invoice.TONGCONG || 0) - cash - transfer - card);
    const paid = remaining <= 0 ? 1 : 0;
    await db.execute(
      `UPDATE THOADONSUACHUA
          SET TIENMAT=?, CHUYENKHOAN=?, THE=?, CONLAI=?, DATHANHTOAN=?,
              USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID = ?`,
      [cash, transfer, card, remaining, paid, req.params.id]
    );
    if (paid && invoice.TLENHSUACHUAID) {
      const flow = await db.query(
        `SELECT FIRST 1 TRANGTHAI FROM TTRANGTHAIXE
          WHERE DXEID=? AND TLENHSUACHUAID=? AND STATUS=1
          ORDER BY NGAY_TRANGTHAI DESC`,
        [invoice.DXEID, invoice.TLENHSUACHUAID]
      );
      if (Number(flow[0]?.TRANGTHAI) === 3) {
        const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
        await db.query(
          `EXECUTE PROCEDURE SP_CHUYEN_TRANGTHAI(?, 4, ?, ?, ?, ?, ?)`,
          [invoice.DXEID, actor, 'Da giao xe va thanh toan du', 'Tu dong hoan thanh khi thanh toan', db.uuidv4(), db.uuidv4()]
        );
        await db.execute(
          `UPDATE TLENHSUACHUA SET TRANGTHAI=3, KETTHUC=COALESCE(KETTHUC,CURRENT_TIMESTAMP), USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [actor, invoice.TLENHSUACHUAID]
        );
      }
    }
    res.json({ ok: true, paid: Boolean(paid), remaining });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
