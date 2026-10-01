const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Workflow 5 trang thai vong doi xe:
 *  0=Tiep nhan & Bao gia, 1=Xac nhan sua chua, 2=Dang sua,
 *  3=Giao xe, 4=Hoan thanh
 */

/* GET /api/workflow - danh sach cac xe dang trong workflow */
router.get('/', async (req, res) => {
  try {
    const { trangthai } = req.query;
    let where = 'WHERE TT.STATUS = 1';
    const params = [];
    if (trangthai !== undefined && trangthai !== '') {
      where += ' AND TT.TRANGTHAI = ?';
      params.push(parseInt(trangthai, 10));
    }

    const rows = await db.query(
      `SELECT TT.ID, TT.DXEID, V.BIENSO, V.PHIENBAN,
              TT.DKHACHHANGID, KH.NAME AS TEN_KH, KH.DIENTHOAI,
              TT.TTIEPNHANXEID, TT.TLENHSUACHUAID,
              TT.TRANGTHAI, W.TEN AS TRANGTHAI_TEN, W.MAU AS TRANGTHAI_MAU, W.ICON,
              TT.NGAY_VAO, TT.NGAY_TRANGTHAI, TT.NGAY_DUKIEN,
              TT.DNHANVIENKTVID, NV.NAME AS TEN_KTV,
              TT.DNHANVIENCOOVANID, CV.NAME AS TEN_CV,
              TT.LYDO, TT.GHICHU, TT.MUCUU_TIEN
         FROM TTRANGTHAIXE TT
         LEFT JOIN DXE         V  ON V.ID  = TT.DXEID
         LEFT JOIN DKHACHHANG  KH ON KH.ID = TT.DKHACHHANGID
         LEFT JOIN DNHANVIEN   NV ON NV.ID = TT.DNHANVIENKTVID
         LEFT JOIN DNHANVIEN   CV ON CV.ID = TT.DNHANVIENCOOVANID
         LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = TT.TRANGTHAI
        ${where}
     ORDER BY TT.MUCUU_TIEN DESC, TT.NGAY_TRANGTHAI DESC`,
      params
    );
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/workflow/states - danh sach 5 trang thai */
router.get('/states', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT STT_WORKFLOW, TEN, MAU, ICON, TRANGTHAI_TN, TRANGTHAI_CD, TRANGTHAI_LSC, IS_TERMINAL, NEXT_STT
         FROM TWORKFLOWMAP
        WHERE STATUS = 1
     ORDER BY STT_WORKFLOW`
    );
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/workflow/by-plate/:plate - tra cuu workflow theo bien so */
router.get('/by-plate/:plate', async (req, res) => {
  try {
    const plate = req.params.plate.replace(/[-. ]/g, '').toUpperCase();

    const wf = await db.query(
      `SELECT TT.*, W.TEN AS TRANGTHAI_TEN, W.MAU AS TRANGTHAI_MAU
         FROM TTRANGTHAIXE TT
         LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = TT.TRANGTHAI
         LEFT JOIN DXE V ON V.ID = TT.DXEID
        WHERE TT.STATUS = 1
          AND UPPER(REPLACE(REPLACE(REPLACE(V.BIENSO, '-', ''), '.', ''), ' ', '')) = ?
        `,
      [plate]
    );
    if (!wf.length) return res.status(404).json({ error: 'Xe chua co trong workflow' });

    const history = await db.query(
      `SELECT LS.*, NV.NAME AS TEN_NV, W_CU.TEN AS TEN_CU, W_MOI.TEN AS TEN_MOI
         FROM TLICHSUTRANGTHAI LS
         LEFT JOIN DNHANVIEN  NV  ON NV.ID = LS.DNHANVIENID
         LEFT JOIN TWORKFLOWMAP W_CU  ON W_CU.STT_WORKFLOW  = LS.TRANGTHAI_CU
         LEFT JOIN TWORKFLOWMAP W_MOI ON W_MOI.STT_WORKFLOW = LS.TRANGTHAI_MOI
        WHERE LS.TTRANGTHAIXEID = ?
     ORDER BY LS.NGAY DESC`,
      [wf[0].ID]
    );

    res.json({ data: { current: wf[0], history } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/workflow/by-vehicle/:dxid */
router.get('/by-vehicle/:dxid', async (req, res) => {
  try {
    const wf = await db.query(
      `SELECT TT.*, W.TEN AS TRANGTHAI_TEN, W.MAU AS TRANGTHAI_MAU, W.ICON
         FROM TTRANGTHAIXE TT
         LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = TT.TRANGTHAI
         WHERE TT.STATUS = 1 AND TT.DXEID = ?
      ORDER BY TT.NGAY_TRANGTHAI DESC, TT.TIMECREATED DESC`,
      [req.params.dxid]
    );
    if (!wf.length) return res.json({ data: null, history: [] });

    const history = await db.query(
      `SELECT LS.*, NV.NAME AS TEN_NV, W_CU.TEN AS TEN_CU, W_MOI.TEN AS TEN_MOI
         FROM TLICHSUTRANGTHAI LS
         LEFT JOIN DNHANVIEN  NV  ON NV.ID = LS.DNHANVIENID
         LEFT JOIN TWORKFLOWMAP W_CU  ON W_CU.STT_WORKFLOW  = LS.TRANGTHAI_CU
         LEFT JOIN TWORKFLOWMAP W_MOI ON W_MOI.STT_WORKFLOW = LS.TRANGTHAI_MOI
        WHERE LS.TTRANGTHAIXEID = ?
     ORDER BY LS.NGAY DESC`,
      [wf[0].ID]
    );
    res.json({ data: wf[0], history });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/workflow/transition - chuyen trang thai xe
   Body: { DXEID, TRANGTHAI, DNHANVIENID, LYDO, GHICHU }
*/
router.post('/transition', async (req, res) => {
  try {
    const { DXEID, TRANGTHAI, DNHANVIENID, LYDO, GHICHU } = req.body;
    if (!DXEID || TRANGTHAI === undefined) {
      return res.status(400).json({ error: 'DXEID va TRANGTHAI la bat buoc' });
    }
    const targetState = parseInt(TRANGTHAI, 10);
    const currentRows = await db.query(
      `SELECT FIRST 1 ID, TRANGTHAI, TLENHSUACHUAID, TTIEPNHANXEID
         FROM TTRANGTHAIXE
        WHERE DXEID=? AND STATUS=1
        ORDER BY NGAY_TRANGTHAI DESC, TIMECREATED DESC`,
      [DXEID]
    );
    if (!currentRows.length) return res.status(404).json({ error: 'Xe chua co quy trinh sua chua' });
    const current = currentRows[0];
    if (targetState !== Number(current.TRANGTHAI) + 1) {
      return res.status(400).json({ error: 'Phai chuyen trang thai theo dung thu tu quy trinh' });
    }
    if (targetState === 4) {
      const paid = await db.query(
        `SELECT FIRST 1 ID FROM THOADONSUACHUA
          WHERE TLENHSUACHUAID=? AND STATUS=1 AND DATHANHTOAN=1`,
        [current.TLENHSUACHUAID]
      );
      if (!paid.length) {
        return res.status(409).json({ error: 'Chi duoc hoan thanh sau khi giao xe va thanh toan du' });
      }
    }

    const { v4: uuidv4 } = require('uuid');
    const newTtId = uuidv4();
    const newLsId = uuidv4();

    await db.query(
      `EXECUTE PROCEDURE SP_CHUYEN_TRANGTHAI(?, ?, ?, ?, ?, ?, ?)`,
      [DXEID, targetState, DNHANVIENID || 'SYSTEM', LYDO || null, GHICHU || null, newTtId, newLsId]
    );

    if (current.TLENHSUACHUAID) {
      if (targetState === 2) {
        await db.execute(
          `UPDATE TLENHSUACHUA SET TRANGTHAI=1, BATDAU=COALESCE(BATDAU,CURRENT_TIMESTAMP), USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [current.TLENHSUACHUAID]
        );
      } else if (targetState === 3) {
        await db.execute(
          `UPDATE TLENHSUACHUA SET TRANGTHAI=5, KETTHUC=COALESCE(KETTHUC,CURRENT_TIMESTAMP), USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [current.TLENHSUACHUAID]
        );
        if (current.TTIEPNHANXEID) {
          await db.execute(`UPDATE TTIEPNHANXE SET TRANGTHAI=3, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [current.TTIEPNHANXEID]);
        }

        // Khi giao xe, ghi nhận các phụ tùng thực tế đã dùng vào phiếu xuất.
        // Hồ sơ xe và tồn kho đều đọc từ TXUATPHUTUNG, nên thao tác này phải
        // idempotent để một lệnh sửa chữa không bị xuất trùng khi gọi lại API.
        const partRows = await db.query(
          `SELECT CT.DMATHANGID, SUM(CT.SOLUONG) AS SOLUONG,
                  MAX(CT.DONGIA) AS DONGIA, SUM(CT.THANHTIEN) AS THANHTIEN,
                  MAX(M.GIANHAP) AS GIAVON, MAX(M.BAOHANH) AS BAOHANH,
                  MAX(VT.DKHOHANGID) AS DKHOHANGID
             FROM TLENHSUACHUACHITIET CT
             LEFT JOIN DMATHANG M ON M.ID = CT.DMATHANGID
             LEFT JOIN DVITRIKHO VT ON VT.ID = M.DVITRIKHOID
            WHERE CT.TLENHSUACHUAID=? AND CT.LOAI=0
              AND CT.DMATHANGID IS NOT NULL AND COALESCE(CT.STATUS, 1)=1
         GROUP BY CT.DMATHANGID`,
          [current.TLENHSUACHUAID]
        );
        const issuedRows = await db.query(
          `SELECT DMATHANGID FROM TXUATPHUTUNG
            WHERE TLENHSUACHUAID=? AND COALESCE(STATUS, 1)=1`,
          [current.TLENHSUACHUAID]
        );
        const issuedPartIds = new Set(issuedRows.map((row) => row.DMATHANGID));
        for (const part of partRows) {
          if (issuedPartIds.has(part.DMATHANGID)) continue;
          await db.execute(
            `INSERT INTO TXUATPHUTUNG
              (ID, NOTE, TLENHSUACHUAID, DXEID, DMATHANGID, DKHOHANGID,
               DNHANVIENID, SOLUONG, DONGIA, THANHTIEN, GIAVON, NGAYXUAT,
               BAOHANH, DAHOANKHO, SLHOAN, STATUS, USERCREATEDID, TIMECREATED)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                     ?, 0, 0, 1, ?, CURRENT_TIMESTAMP)`,
            [db.uuidv4(), 'Tu dong xuat phu tung khi giao xe', current.TLENHSUACHUAID,
              DXEID, part.DMATHANGID, part.DKHOHANGID || null,
              DNHANVIENID || 'SYSTEM', Number(part.SOLUONG || 0),
              Number(part.DONGIA || 0), Number(part.THANHTIEN || 0),
              Number(part.GIAVON || 0), part.BAOHANH == null ? null : String(part.BAOHANH),
              DNHANVIENID || 'SYSTEM']
          );
        }
      } else if (targetState === 4) {
        await db.execute(
          `UPDATE TLENHSUACHUA SET TRANGTHAI=3, KETTHUC=COALESCE(KETTHUC,CURRENT_TIMESTAMP), USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [current.TLENHSUACHUAID]
        );
      }
    }

    res.json({ ok: true, TTRANGTHAIXEID: newTtId, LICHSU_ID: newLsId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/workflow/dashboard - thong ke theo trang thai */
router.get('/dashboard', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT TT.TRANGTHAI, W.TEN, W.MAU, W.ICON, COUNT(*) AS SO_LUONG
         FROM TTRANGTHAIXE TT
         LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = TT.TRANGTHAI
        WHERE TT.STATUS = 1
     GROUP BY TT.TRANGTHAI, W.TEN, W.MAU, W.ICON
     ORDER BY TT.TRANGTHAI`
    );
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
