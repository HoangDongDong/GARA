const express = require('express');
const router = express.Router();
const db = require('../db');

const normalizePlate = (value) => String(value || '').replace(/[-.\s]/g, '').toUpperCase();

/**
 * GARAGE.FDB - DXE:
 *   BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT, MAUXE,
 *   SOKHUNG, SOMAY, ODO, NHIENLIEU, DKHACHHANGID, GHICHU
 */

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT V.ID, V.BIENSO, V.PHIENBAN, V.NAMSANXUAT, V.MAUXE,
              V.SOKHUNG, V.SOMAY, V.ODO, V.NHIENLIEU, V.MUCNHIENLIEU,
              V.GHICHU, V.STATUS,
              V.DHANGXEID, HX.NAME  AS HANG_XE,
              V.DDONGXEID, DX.NAME  AS DONG_XE,
              V.DKHACHHANGID, KH.NAME AS TEN_KH, KH.DIENTHOAI
         FROM DXE V
         LEFT JOIN DHANGXE HX ON HX.ID = V.DHANGXEID
         LEFT JOIN DDONGXE DX ON DX.ID = V.DDONGXEID
         LEFT JOIN DKHACHHANG KH ON KH.ID = V.DKHACHHANGID
        WHERE V.STATUS = 1
     ORDER BY V.TIMECREATED DESC`
    );
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vehicles/brands - dropdown hang xe
router.get('/meta/brands', async (req, res) => {
  try {
    const brands = await db.query(`SELECT ID, NAME FROM DHANGXE WHERE STATUS=1 ORDER BY NAME`);
    const models = await db.query(`SELECT ID, NAME, DHANGXEID FROM DDONGXE WHERE STATUS=1 ORDER BY NAME`);
    res.json({ data: { brands, models } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/vehicles/warranties - danh sach bao hanh (co the filter theo bien so)
router.get('/warranties', async (req, res) => {
  try {
    const { plate, status } = req.query;
    let whereParts = ['BH.STATUS = 1'];
    const params = [];
    if (plate) {
      whereParts.push(`V.BIENSO LIKE ?`);
      params.push(`%${plate.toUpperCase().replace(/[-. ]/g, '')}%`);
    }
    if (status !== undefined) {
      whereParts.push('BH.TRANGTHAI = ?');
      params.push(Number(status));
    }
    const rows = await db.query(
      `SELECT BH.ID, BH.NAME, BH.NOTE, BH.NGAYBATDAU, BH.NGAYKETTHUC,
              BH.LOAI, BH.TRANGTHAI, BH.KETQUAXULY, BH.CHIPHI,
              BH.DXEID, V.BIENSO,
              HX.NAME AS HANG_XE, DX.NAME AS DONG_XE,
              M.NAME AS TEN_MATHANG, M.CODE AS MA_MATHANG,
              DV.NAME AS TEN_DICHVU,
              LS.NAME AS SO_PHIEU,
              KH.NAME AS TEN_KH
         FROM TBAOHANH BH
         LEFT JOIN DXE V   ON V.ID = BH.DXEID
         LEFT JOIN DHANGXE HX ON HX.ID = V.DHANGXEID
         LEFT JOIN DDONGXE DX ON DX.ID = V.DDONGXEID
         LEFT JOIN DMATHANG M  ON M.ID = BH.DMATHANGID
         LEFT JOIN DDICHVU  DV ON DV.ID = BH.DDICHVUID
         LEFT JOIN TLENHSUACHUA LS ON LS.ID = BH.TLENHSUACHUAID
         LEFT JOIN DKHACHHANG KH ON KH.ID = BH.DKHACHHANGID
        WHERE ${whereParts.join(' AND ')}
        ORDER BY BH.NGAYBATDAU DESC, BH.TIMECREATED DESC`,
      params
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/vehicles/:id/warranties - bao hanh cua mot xe cu the
router.get('/:id/warranties', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT BH.ID, BH.NAME, BH.NOTE, BH.NGAYBATDAU, BH.NGAYKETTHUC,
              BH.LOAI, BH.TRANGTHAI, BH.KETQUAXULY, BH.CHIPHI,
              M.NAME AS TEN_MATHANG, M.CODE AS MA_MATHANG,
              DV.NAME AS TEN_DICHVU,
              LS.NAME AS SO_PHIEU
         FROM TBAOHANH BH
         LEFT JOIN DMATHANG M  ON M.ID = BH.DMATHANGID
         LEFT JOIN DDICHVU  DV ON DV.ID = BH.DDICHVUID
         LEFT JOIN TLENHSUACHUA LS ON LS.ID = BH.TLENHSUACHUAID
        WHERE BH.DXEID = ? AND BH.STATUS = 1
        ORDER BY BH.NGAYBATDAU DESC`,
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/vehicles/:id/warranties - tao bao hanh moi cho xe
router.post('/:id/warranties', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    // Kiem tra xe ton tai
    const vRows = await db.query(
      `SELECT FIRST 1 V.ID, V.BIENSO, V.DKHACHHANGID FROM DXE V WHERE V.ID = ? AND V.STATUS = 1`,
      [vehicleId]
    );
    if (!vRows.length) return res.status(404).json({ error: 'Xe khong ton tai' });
    const vehicle = vRows[0];

    const { NGAYBATDAU, NGAYKETTHUC, NOTE, LOAI, DMATHANGID, DDICHVUID, TLENHSUACHUAID } = req.body;
    if (!NGAYBATDAU || !NGAYKETTHUC) return res.status(400).json({ error: 'Thieu ngay bat dau / ket thuc' });

    // Dem so phieu BH cua xe nay de tao ma
    const countRows = await db.query(
      `SELECT COUNT(*) AS CNT FROM TBAOHANH WHERE DXEID = ?`, [vehicleId]
    );
    const seq = (countRows[0]?.CNT || 0) + 1;
    const bienSoSlug = String(vehicle.BIENSO || '').replace(/[-. ]/g, '');
    const name = `BH-${bienSoSlug}-${seq}`;

    const id = db.uuidv4();
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `INSERT INTO TBAOHANH
         (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED,
          DXEID, DKHACHHANGID, DMATHANGID, DDICHVUID, TLENHSUACHUAID,
          NGAYBATDAU, NGAYKETTHUC, LOAI, TRANGTHAI, CHIPHI)
       VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        id, name, NOTE || null, actor,
        vehicleId, vehicle.DKHACHHANGID || null,
        DMATHANGID || null, DDICHVUID || null, TLENHSUACHUAID || null,
        NGAYBATDAU, NGAYKETTHUC,
        LOAI != null ? Number(LOAI) : 0,
      ]
    );
    res.json({ ok: true, id, name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/vehicles/warranties - tao bao hanh (khong can co vehicle truoc)
router.post('/warranties', async (req, res) => {
  try {
    const { DXEID, BIENSO, NGAYBATDAU, NGAYKETTHUC, NOTE, LOAI, DMATHANGID } = req.body;

    let vehicleId = DXEID;
    let dkhachhangid = null;
    let bienSo = BIENSO;

    if (!vehicleId && BIENSO) {
      const vRows = await db.query(
        `SELECT FIRST 1 ID, BIENSO, DKHACHHANGID FROM DXE
          WHERE STATUS = 1
            AND UPPER(REPLACE(REPLACE(REPLACE(BIENSO,'-',''),'.',''),' ',''))
                = UPPER(REPLACE(REPLACE(REPLACE(?  ,'-',''),'.',''),' ',''))`,
        [BIENSO]
      );
      if (vRows.length) {
        vehicleId = vRows[0].ID;
        dkhachhangid = vRows[0].DKHACHHANGID;
        bienSo = vRows[0].BIENSO;
      }
    } else if (vehicleId) {
      const vRows = await db.query(`SELECT FIRST 1 BIENSO, DKHACHHANGID FROM DXE WHERE ID = ?`, [vehicleId]);
      if (vRows.length) { dkhachhangid = vRows[0].DKHACHHANGID; bienSo = vRows[0].BIENSO; }
    }

    if (!NGAYBATDAU || !NGAYKETTHUC) return res.status(400).json({ error: 'Thieu ngay bat dau / ket thuc' });

    const countRows = vehicleId
      ? await db.query(`SELECT COUNT(*) AS CNT FROM TBAOHANH WHERE DXEID = ?`, [vehicleId])
      : [{ CNT: 0 }];
    const seq = (countRows[0]?.CNT || 0) + 1;
    const bienSoSlug = String(bienSo || 'XX').replace(/[-. ]/g, '');
    const name = `BH-${bienSoSlug}-${seq}`;

    const id = db.uuidv4();
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `INSERT INTO TBAOHANH
         (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED,
          DXEID, DKHACHHANGID, DMATHANGID,
          NGAYBATDAU, NGAYKETTHUC, LOAI, TRANGTHAI, CHIPHI)
       VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        id, name, NOTE || null, actor,
        vehicleId || null, dkhachhangid || null,
        DMATHANGID || null,
        NGAYBATDAU, NGAYKETTHUC,
        LOAI != null ? Number(LOAI) : 0,
      ]
    );
    res.json({ ok: true, id, name, bienSo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/vehicles/:id/profile - ho so xe tong hop

router.get('/:id/profile', async (req, res) => {
  try {
    const vehicleRows = await db.query(`
      SELECT V.ID, V.BIENSO, V.PHIENBAN, V.NAMSANXUAT, V.MAUXE,
             V.SOKHUNG, V.SOMAY, V.ODO, V.NHIENLIEU, V.MUCNHIENLIEU, V.GHICHU,
             V.TIMECREATED, V.DKHACHHANGID, V.DHANGXEID, V.DDONGXEID,
             HX.NAME AS HANG_XE, DX.NAME AS DONG_XE,
             KH.NAME AS TEN_KH, KH.DIENTHOAI, KH.EMAIL, KH.DIACHI,
             KH.MASOTHUE, KH.NOTE AS GHICHU_KH, NH.NAME AS NHOM_KH
        FROM DXE V
        LEFT JOIN DHANGXE HX ON HX.ID = V.DHANGXEID
        LEFT JOIN DDONGXE DX ON DX.ID = V.DDONGXEID
        LEFT JOIN DKHACHHANG KH ON KH.ID = V.DKHACHHANGID
        LEFT JOIN DNHOMKHACHHANG NH ON NH.ID = KH.DNHOMKHACHHANGID
       WHERE V.ID = ? AND V.STATUS = 1
    `, [req.params.id]);
    if (!vehicleRows.length) return res.status(404).json({ error: 'Khong tim thay xe' });

    const repairs = await db.query(`
      SELECT LS.ID, LS.NAME, LS.NGAY, LS.KETTHUC, LS.TRANGTHAI,
             LS.TONGTIENCONG, LS.TONGTIENPHUTUNG, LS.TONGCONG,
             LS.NOTE, TN.ODO, TN.YEUCAUKHACH, TN.TINHTRANGXE,
             CV.NAME AS TEN_COVAN, KTV.NAME AS TEN_KTV
        FROM TLENHSUACHUA LS
        LEFT JOIN TTIEPNHANXE TN ON TN.ID = LS.TTIEPNHANXEID
        LEFT JOIN DNHANVIEN CV ON CV.ID = TN.DNHANVIENCOOVANID
        LEFT JOIN DNHANVIEN KTV ON KTV.ID = TN.DNHANVIENKTVID
       WHERE LS.DXEID = ? AND LS.STATUS = 1
       ORDER BY LS.NGAY DESC, LS.TIMECREATED DESC
    `, [req.params.id]);

    const repairInvoices = await db.query(`
      SELECT HD.ID, HD.NAME, HD.TLENHSUACHUAID, HD.DATHANHTOAN,
             HD.CONLAI, HD.TONGCONG, HD.NGAY
        FROM THOADONSUACHUA HD
       WHERE HD.DXEID = ? AND HD.STATUS = 1
       ORDER BY HD.NGAY DESC, HD.TIMECREATED DESC
    `, [req.params.id]);

    const repairDetails = await db.query(`
      SELECT CT.ID, CT.TLENHSUACHUAID, CT.LOAI, CT.SOLUONG,
             CT.DONGIA, CT.THANHTIEN, CT.NOTE,
             COALESCE(M.NAME, DV.NAME) AS TEN_HANG_MUC,
             M.CODE AS MA_HANG, DVT.NAME AS DONVI
        FROM TLENHSUACHUACHITIET CT
        JOIN TLENHSUACHUA LS ON LS.ID = CT.TLENHSUACHUAID
        LEFT JOIN DMATHANG M ON M.ID = CT.DMATHANGID
        LEFT JOIN DDICHVU DV ON DV.ID = CT.DDICHVUID
        LEFT JOIN DDONVITINH DVT ON DVT.ID = CT.DDONVITINHID
       WHERE LS.DXEID = ? AND LS.STATUS = 1 AND COALESCE(CT.STATUS, 1) = 1
       ORDER BY CT.TIMECREATED, CT.ID
    `, [req.params.id]);

    const replacedParts = await db.query(`
      SELECT XP.ID, XP.TLENHSUACHUAID, XP.NGAYXUAT, XP.SOLUONG,
             XP.DONGIA, XP.THANHTIEN, XP.BAOHANH, XP.NOTE,
             M.CODE, M.NAME AS TEN_MATHANG, DVT.NAME AS DONVI,
             LS.NAME AS SO_PHIEU, TN.ODO
        FROM TXUATPHUTUNG XP
        LEFT JOIN DMATHANG M ON M.ID = XP.DMATHANGID
        LEFT JOIN DDONVITINH DVT ON DVT.ID = M.DDONVITINHID
        LEFT JOIN TLENHSUACHUA LS ON LS.ID = XP.TLENHSUACHUAID
        LEFT JOIN TTIEPNHANXE TN ON TN.ID = LS.TTIEPNHANXEID
       WHERE XP.DXEID = ? AND COALESCE(XP.STATUS, 1) = 1
       ORDER BY XP.NGAYXUAT DESC, XP.TIMECREATED DESC
    `, [req.params.id]);

    const warranties = await db.query(`
      SELECT BH.ID, BH.NAME, BH.NOTE, BH.NGAYBATDAU, BH.NGAYKETTHUC,
             BH.LOAI, BH.TRANGTHAI, BH.KETQUAXULY, BH.CHIPHI,
             M.NAME AS TEN_MATHANG, DV.NAME AS TEN_DICHVU,
             LS.NAME AS SO_PHIEU
        FROM TBAOHANH BH
        LEFT JOIN DMATHANG M ON M.ID = BH.DMATHANGID
        LEFT JOIN DDICHVU DV ON DV.ID = BH.DDICHVUID
        LEFT JOIN TLENHSUACHUA LS ON LS.ID = BH.TLENHSUACHUAID
       WHERE BH.DXEID = ? AND BH.STATUS = 1
       ORDER BY BH.NGAYBATDAU DESC, BH.TIMECREATED DESC
    `, [req.params.id]);

    const media = await db.query(`
      SELECT H.ID, H.LOAIHINH, H.MOTA, H.TIMECREATED, TN.ODO
        FROM TTIEPNHANXEHINH H
        JOIN TTIEPNHANXE TN ON TN.ID = H.TTIEPNHANXEID
       WHERE TN.DXEID = ? AND H.STATUS = 1
       ORDER BY H.TIMECREATED DESC
    `, [req.params.id]);

    const workflows = await db.query(`
      SELECT TT.ID, TT.TLENHSUACHUAID, TT.TRANGTHAI,
             TT.NGAY_VAO, TT.NGAY_TRANGTHAI, TT.LYDO, TT.GHICHU,
             W.TEN AS TRANGTHAI_TEN
        FROM TTRANGTHAIXE TT
        LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = TT.TRANGTHAI
       WHERE TT.DXEID = ? AND TT.STATUS = 1
       ORDER BY TT.NGAY_VAO DESC, TT.TIMECREATED DESC
    `, [req.params.id]);

    const workflowHistory = await db.query(`
      SELECT LS.ID, LS.TTRANGTHAIXEID, LS.TRANGTHAI_CU, LS.TRANGTHAI_MOI,
             LS.NGAY, LS.LYDO, LS.GHICHU, LS.DNHANVIENID,
             NV.NAME AS TEN_NV, W_CU.TEN AS TEN_CU, W_MOI.TEN AS TEN_MOI
        FROM TLICHSUTRANGTHAI LS
        JOIN TTRANGTHAIXE TT ON TT.ID = LS.TTRANGTHAIXEID
        LEFT JOIN DNHANVIEN NV ON NV.ID = LS.DNHANVIENID
        LEFT JOIN TWORKFLOWMAP W_CU ON W_CU.STT_WORKFLOW = LS.TRANGTHAI_CU
        LEFT JOIN TWORKFLOWMAP W_MOI ON W_MOI.STT_WORKFLOW = LS.TRANGTHAI_MOI
       WHERE TT.DXEID = ? AND TT.STATUS = 1
       ORDER BY LS.NGAY, LS.ID
    `, [req.params.id]);

    const detailsByRepair = new Map();
    for (const detail of repairDetails) {
      const list = detailsByRepair.get(detail.TLENHSUACHUAID) || [];
      list.push(detail);
      detailsByRepair.set(detail.TLENHSUACHUAID, list);
    }
    const historyByWorkflow = new Map();
    for (const event of workflowHistory) {
      const list = historyByWorkflow.get(event.TTRANGTHAIXEID) || [];
      list.push(event);
      historyByWorkflow.set(event.TTRANGTHAIXEID, list);
    }
    const workflowByRepair = new Map();
    for (const workflow of workflows) {
      if (!workflow.TLENHSUACHUAID || workflowByRepair.has(workflow.TLENHSUACHUAID)) continue;
      workflowByRepair.set(workflow.TLENHSUACHUAID, {
        ...workflow,
        HISTORY: historyByWorkflow.get(workflow.ID) || [],
      });
    }
    const invoiceByRepair = new Map();
    for (const invoice of repairInvoices) {
      if (!invoice.TLENHSUACHUAID || invoiceByRepair.has(invoice.TLENHSUACHUAID)) continue;
      invoiceByRepair.set(invoice.TLENHSUACHUAID, invoice);
    }
    res.json({
      data: {
        vehicle: vehicleRows[0],
        repairs: repairs.map((repair) => ({
          ...repair,
          ITEMS: detailsByRepair.get(repair.ID) || [],
          WORKFLOW: workflowByRepair.get(repair.ID) || null,
          INVOICE: invoiceByRepair.get(repair.ID) || null,
        })),
        replacedParts,
        warranties,
        media,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT, MAUXE,
      SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU, DKHACHHANGID, GHICHU,
    } = req.body;
    const plate = String(BIENSO || '').trim().toUpperCase();
    if (!plate) return res.status(400).json({ error: 'Bien so khong duoc trong' });
    const duplicate = await db.query(
      `SELECT FIRST 1 ID FROM DXE
        WHERE STATUS=1
          AND UPPER(REPLACE(REPLACE(REPLACE(BIENSO, '-', ''), '.', ''), ' ', ''))=?`,
      [normalizePlate(plate)]
    );
    if (duplicate.length) return res.status(409).json({ error: 'Bien so xe da ton tai' });

    const id = db.uuidv4();
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `INSERT INTO DXE
         (ID, NAME, BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT,
          MAUXE, SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU,
          DKHACHHANGID, GHICHU,
          STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      [
        id, plate, plate,
        DHANGXEID || null, DDONGXEID || null, PHIENBAN, NAMSANXUAT,
        MAUXE, SOKHUNG, SOMAY, Number(ODO) || 0, NHIENLIEU,
        Math.max(0, Math.min(100, Number(MUCNHIENLIEU) || 0)),
        DKHACHHANGID || null, GHICHU, actor,
      ]
    );
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT, MAUXE,
      SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU, DKHACHHANGID, GHICHU,
    } = req.body;
    const plate = String(BIENSO || '').trim().toUpperCase();
    if (!plate) return res.status(400).json({ error: 'Bien so khong duoc trong' });
    const duplicate = await db.query(
      `SELECT FIRST 1 ID FROM DXE
        WHERE STATUS=1
          AND UPPER(REPLACE(REPLACE(REPLACE(BIENSO, '-', ''), '.', ''), ' ', ''))=?
          AND ID<>?`,
      [normalizePlate(plate), req.params.id]
    );
    if (duplicate.length) return res.status(409).json({ error: 'Bien so xe da ton tai' });
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `UPDATE DXE
          SET NAME=?, BIENSO=?, DHANGXEID=?, DDONGXEID=?, PHIENBAN=?,
              NAMSANXUAT=?, MAUXE=?, SOKHUNG=?, SOMAY=?, ODO=?,
              NHIENLIEU=?, MUCNHIENLIEU=?, DKHACHHANGID=?, GHICHU=?,
              USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID = ?`,
      [
        plate, plate,
        DHANGXEID || null, DDONGXEID || null, PHIENBAN, NAMSANXUAT,
        MAUXE, SOKHUNG, SOMAY, Number(ODO) || 0, NHIENLIEU,
        Math.max(0, Math.min(100, Number(MUCNHIENLIEU) || 0)),
        DKHACHHANGID || null, GHICHU, actor, req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(
      `UPDATE DXE SET STATUS=0, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
