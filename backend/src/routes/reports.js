const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Bao cao tong quan.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [kh]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM DKHACHHANG WHERE STATUS=1`);
    const [xe]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM DXE        WHERE STATUS=1`);
    const [pt]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM DMATHANG   WHERE STATUS=1 AND TAMKHOA=0`);
    const [nv]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM DNHANVIEN  WHERE STATUS=1`);
    const [tn]    = await db.query(`SELECT COUNT(*) AS TOTAL FROM TTIEPNHANXE WHERE STATUS=1`);
    const [lsc]   = await db.query(`SELECT COUNT(*) AS TOTAL FROM TLENHSUACHUA WHERE STATUS=1`);
    const [hd]    = await db.query(
      `SELECT COUNT(*) AS TOTAL,
              COALESCE(SUM(CASE WHEN DATHANHTOAN=1 THEN TONGCONG ELSE 0 END),0) AS DOANH_THU,
              COALESCE(SUM(CASE WHEN DATHANHTOAN=0 THEN CONLAI ELSE 0 END),0)    AS CONG_NO
         FROM THOADONSUACHUA WHERE STATUS=1`
    );
    const [kho]   = await db.query(
      `SELECT COALESCE(SUM(TON_KHO),0) AS TONG_SL,
              COALESCE(SUM(TON_KHO * COALESCE(GIANHAP,0)),0) AS GIA_TRI
         FROM (
           SELECT M.ID, M.GIANHAP,
                  COALESCE((SELECT SUM(NCT.SOLUONG) FROM TNHAPKHOCHITIET NCT WHERE NCT.DMATHANGID=M.ID),0)
                - COALESCE((SELECT SUM(XP.SOLUONG) FROM TXUATPHUTUNG XP WHERE XP.DMATHANGID=M.ID),0)
                - COALESCE((SELECT SUM(DH.SLXUAT) FROM TDONHANGCHITIET DH WHERE DH.DMATHANGID=M.ID),0)
                  AS TON_KHO
             FROM DMATHANG M
            WHERE M.STATUS=1 AND M.TAMKHOA=0
         )`
    );

    res.json({
      data: {
        khachHang: kh.TOTAL,
        xe:        xe.TOTAL,
        phuTung:   pt.TOTAL,
        nhanVien:  nv.TOTAL,
        tiepNhan:  tn.TOTAL,
        lenhSuaChua: lsc.TOTAL,
        hoaDon:    hd.TOTAL,
        doanhThu:  hd.DOANH_THU,
        congNo:    hd.CONG_NO,
        tongSLKho: kho.TONG_SL,
        giaTriKho: kho.GIA_TRI,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// doanh thu theo ngay
router.get('/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await db.query(
      `SELECT CAST(NGAY AS DATE)        AS NGAY,
              COUNT(*)                  AS SO_HD,
              COALESCE(SUM(TONGCONG),0) AS DOANH_THU,
              COALESCE(SUM(TIENPHUTUNG),0) AS TIEN_PT,
              COALESCE(SUM(TIENCONG),0)    AS TIEN_CONG
         FROM THOADONSUACHUA
        WHERE STATUS=1 AND DATHANHTOAN=1
          AND CAST(NGAY AS DATE) BETWEEN ? AND ?
     GROUP BY CAST(NGAY AS DATE)
     ORDER BY NGAY`,
      [from || '2000-01-01', to || '2100-12-31']
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lich bao duong va nhac han gan nhat
router.get('/maintenance', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT FIRST 20 LS.ID, LS.NAME, LS.DXEID, LS.DKHACHHANGID,
             LS.LOAIBAODUONG, LS.CHUKY_NGAY, LS.CHUKY_KM,
             LS.ODO_LANCUOI, LS.NGAY_LANCUOI, LS.NGAY_DUKIEN,
             LS.ODO_DUKIEN, LS.DANH_AC_CHUYEN,
             V.BIENSO, V.ODO AS ODO_HIENTAI, KH.NAME AS TEN_KH
        FROM TLICHSUBAODUONG LS
        LEFT JOIN DXE V ON V.ID = LS.DXEID
        LEFT JOIN DKHACHHANG KH ON KH.ID = LS.DKHACHHANGID
       WHERE LS.STATUS = 1
       ORDER BY CASE WHEN LS.NGAY_DUKIEN IS NULL THEN 1 ELSE 0 END,
                LS.NGAY_DUKIEN, LS.TIMECREATED DESC
    `);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
