const express = require('express');
const router = express.Router();
const db = require('../db');
const { loadFuelOptions } = require('../services/fuelOptions');

const normalizePlate = (value) => String(value || '').replace(/[-.\s]/g, '').toUpperCase();
const VEHICLE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

function parseVehicleImage(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(String(value || ''));
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > VEHICLE_IMAGE_MAX_BYTES) return null;
  return { mime, dataUrl: `data:${mime};base64,${buffer.toString('base64')}` };
}

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
              CASE WHEN V.ANHXE IS NULL THEN 0 ELSE 1 END AS CO_ANHXE,
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
    const fuelOptions = await loadFuelOptions();
    const fuels = fuelOptions.data.filter((row) => Number(row.STATUS) === 1).map((row) => row.NAME);
    res.json({ data: { brands, models, fuels } });
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
router.post('/:id/warranties',async(req,res)=>{try{res.json({ok:true,...await require('../services/warranty').save({...req.body,DXEID:req.params.id},req.accessUser.ID)});}catch(e){res.status(e.status||500).json({error:e.message});}});

// POST /api/vehicles/warranties - tao bao hanh (khong can co vehicle truoc)
router.post('/warranties',async(req,res)=>{try{res.json({ok:true,...await require('../services/warranty').save(req.body,req.accessUser.ID)});}catch(e){res.status(e.status||500).json({error:e.message});}});
router.put('/warranties/:id',async(req,res)=>{try{res.json({ok:true,...await require('../services/warranty').save(req.body,req.accessUser.ID,req.params.id)});}catch(e){res.status(e.status||500).json({error:e.message});}});

// GET /api/vehicles/:id/profile - ho so xe tong hop

router.get('/:id/profile', async (req, res) => {
  try {
    const vehicleRows = await db.query(`
      SELECT V.ID, V.BIENSO, V.PHIENBAN, V.NAMSANXUAT, V.MAUXE,
             V.SOKHUNG, V.SOMAY, V.ODO, V.NHIENLIEU, V.MUCNHIENLIEU, V.GHICHU,
             V.TIMECREATED, V.DKHACHHANGID, V.DHANGXEID, V.DDONGXEID,
             CASE WHEN V.ANHXE IS NULL THEN 0 ELSE 1 END AS CO_ANHXE,
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
      SELECT H.ID, H.LOAIHINH, H.MOTA, H.TIMECREATED, TN.ODO,
             (SELECT FIRST 1 LS.NAME
                FROM TLENHSUACHUA LS
               WHERE LS.TTIEPNHANXEID = TN.ID AND LS.STATUS = 1
               ORDER BY LS.TIMECREATED DESC) AS SO_PHIEU
        FROM TTIEPNHANXEHINH H
        JOIN TTIEPNHANXE TN ON TN.ID = H.TTIEPNHANXEID
       WHERE TN.DXEID = ? AND H.STATUS = 1
       ORDER BY H.TIMECREATED DESC
    `, [req.params.id]);

    const appointments = await db.query(`
      SELECT LS.ID, LS.NAME, LS.NOTE, LS.LOAIBAODUONG,
             LS.CHUKY_NGAY, LS.CHUKY_KM, LS.ODO_LANCUOI, LS.NGAY_LANCUOI,
             LS.NGAY_DUKIEN, LS.ODO_DUKIEN, LS.DANH_AC_CHUYEN, LS.TIMECREATED
        FROM TLICHSUBAODUONG LS
       WHERE LS.DXEID = ? AND LS.STATUS = 1
       ORDER BY CASE WHEN LS.NGAY_DUKIEN IS NULL THEN 1 ELSE 0 END,
                LS.NGAY_DUKIEN, LS.TIMECREATED DESC
    `, [req.params.id]);

    // Ảnh được chụp/lưu theo từng bước của quy trình sửa chữa.
    // Chỉ trả metadata; nội dung BLOB được tải qua endpoint riêng để hồ sơ xe
    // không phải nhận toàn bộ Base64 trong một response lớn.
    const workflowMedia = await db.query(`
      SELECT A.ID, A.TTRANGTHAIXEID, A.TLENHSUACHUAID, A.TRANGTHAI,
             A.TENFILE, A.MIME, A.MOTA, A.THUTU, A.TIMECREATED,
             LS.NAME AS SO_PHIEU, TN.ODO, W.TEN AS TRANGTHAI_TEN
        FROM TTRANGTHAIANH A
        LEFT JOIN TLENHSUACHUA LS ON LS.ID = A.TLENHSUACHUAID
        LEFT JOIN TTIEPNHANXE TN ON TN.ID = LS.TTIEPNHANXEID
        LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = A.TRANGTHAI
       WHERE A.DXEID = ? AND A.STATUS = 1
       ORDER BY A.TIMECREATED DESC, A.THUTU DESC
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
        appointments,
        media,
        workflowMedia: workflowMedia.map((item) => ({
          ...item,
          URL: `/api/workflow/images/${item.ID}/content`,
        })),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vehicles/:id/image - ảnh đại diện được lưu trực tiếp trong DXE.ANHXE
router.get('/:id/image', async (req, res) => {
  try {
    const blob = await db.queryBlob('SELECT ANHXE FROM DXE WHERE ID=? AND STATUS=1', [req.params.id], 'ANHXE');
    if (!blob) return res.status(404).json({ error: 'Xe chua co anh ho so' });
    const image = parseVehicleImage(blob.toString('utf8'));
    if (!image) return res.status(422).json({ error: 'Du lieu anh xe khong hop le' });
    res.set('Content-Type', image.mime);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(image.dataUrl.split(',')[1], 'base64'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const {
      BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT, MAUXE,
      SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU, DKHACHHANGID, GHICHU, ANHXE,
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
    const vehicleImage = ANHXE ? parseVehicleImage(ANHXE) : null;
    if (ANHXE && !vehicleImage) return res.status(400).json({ error: 'Anh ho so xe khong hop le hoac vuot qua 3 MB' });
    await db.execute(
      `INSERT INTO DXE
         (ID, NAME, BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT,
          MAUXE, SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU,
          DKHACHHANGID, GHICHU, ANHXE,
          STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      [
        id, plate, plate,
        DHANGXEID || null, DDONGXEID || null, PHIENBAN, NAMSANXUAT,
        MAUXE, SOKHUNG, SOMAY, Number(ODO) || 0, NHIENLIEU,
        Math.max(0, Math.min(100, Number(MUCNHIENLIEU) || 0)),
        DKHACHHANGID || null, GHICHU,
        vehicleImage ? Buffer.from(vehicleImage.dataUrl, 'utf8') : null,
        actor,
      ]
    );
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      BIENSO, DHANGXEID, DDONGXEID, PHIENBAN, NAMSANXUAT, MAUXE,
      SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU, DKHACHHANGID, GHICHU, ANHXE,
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
    const vehicleImage = ANHXE !== undefined && ANHXE ? parseVehicleImage(ANHXE) : null;
    if (ANHXE && !vehicleImage) return res.status(400).json({ error: 'Anh ho so xe khong hop le hoac vuot qua 3 MB' });
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
    if (ANHXE !== undefined) {
      await db.execute('UPDATE DXE SET ANHXE=? WHERE ID=?', [vehicleImage ? Buffer.from(vehicleImage.dataUrl, 'utf8') : null, req.params.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(
      `UPDATE DXE SET STATUS=0, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [req.accessUser.ID,req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
