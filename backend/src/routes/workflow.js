const express = require('express');
const router = express.Router();
const db = require('../db');

const WORKFLOW_IMAGE_LIMIT = 12;
const WORKFLOW_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseImageDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(String(value || ''));
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!ALLOWED_IMAGE_TYPES.has(mime) || !buffer.length || buffer.length > WORKFLOW_IMAGE_MAX_BYTES) return null;
  return { mime, buffer, dataUrl: `data:${mime};base64,${buffer.toString('base64')}` };
}

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

/* GET /api/workflow/board - dữ liệu thật cho Kanban/Danh sách điều phối */
router.get('/board', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT TT.ID,TT.DXEID,TT.DKHACHHANGID,TT.TTIEPNHANXEID,TT.TLENHSUACHUAID,
              TT.TRANGTHAI,TT.NGAY_VAO,TT.NGAY_TRANGTHAI,TT.NGAY_DUKIEN,
              TT.DNHANVIENKTVID,TT.DNHANVIENCOOVANID,TT.LYDO,TT.GHICHU,TT.MUCUU_TIEN,
              V.BIENSO,V.PHIENBAN,V.NAMSANXUAT,HX.NAME AS HANG_XE,DX.NAME AS DONG_XE,
              KH.NAME AS TEN_KH,KH.DIENTHOAI,
              TN.NAME AS SO_PHIEU_TN,TN.YEUCAUKHACH,TN.TINHTRANGXE,TN.ODO,
              LS.NAME AS SO_LENH,LS.NOTE AS LENH_NOTE,LS.TONGCONG,LS.TONGTIENCONG,LS.TONGTIENPHUTUNG,
              KTV.NAME AS TEN_KTV,CV.NAME AS TEN_CV,W.TEN AS TRANGTHAI_TEN
         FROM TTRANGTHAIXE TT
         LEFT JOIN DXE V ON V.ID=TT.DXEID
         LEFT JOIN DHANGXE HX ON HX.ID=V.DHANGXEID
         LEFT JOIN DDONGXE DX ON DX.ID=V.DDONGXEID
         LEFT JOIN DKHACHHANG KH ON KH.ID=TT.DKHACHHANGID
         LEFT JOIN TTIEPNHANXE TN ON TN.ID=TT.TTIEPNHANXEID
         LEFT JOIN TLENHSUACHUA LS ON LS.ID=TT.TLENHSUACHUAID
         LEFT JOIN DNHANVIEN KTV ON KTV.ID=TT.DNHANVIENKTVID
         LEFT JOIN DNHANVIEN CV ON CV.ID=TT.DNHANVIENCOOVANID
         LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW=TT.TRANGTHAI
        WHERE TT.STATUS=1
        ORDER BY CASE WHEN TT.TRANGTHAI<4 THEN 0 ELSE 1 END,TT.MUCUU_TIEN DESC,TT.NGAY_TRANGTHAI DESC`
    );
    const workflowIds = rows.map((row) => row.ID);
    const repairIds = rows.map((row) => row.TLENHSUACHUAID).filter(Boolean);
    let details = [];
    let history = [];
    if (repairIds.length) {
      const placeholders = repairIds.map(() => '?').join(',');
      details = await db.query(
        `SELECT CT.ID,CT.TLENHSUACHUAID,CT.LOAI,CT.SOLUONG,CT.DONGIA,CT.THANHTIEN,CT.NOTE,
                COALESCE(M.NAME,DV.NAME,CT.NOTE) AS TEN_HANG_MUC
           FROM TLENHSUACHUACHITIET CT
           LEFT JOIN DMATHANG M ON M.ID=CT.DMATHANGID
           LEFT JOIN DDICHVU DV ON DV.ID=CT.DDICHVUID
          WHERE COALESCE(CT.STATUS,1)=1 AND CT.TLENHSUACHUAID IN (${placeholders})
          ORDER BY CT.TIMECREATED,CT.ID`, repairIds
      );
    }
    if (workflowIds.length) {
      const placeholders = workflowIds.map(() => '?').join(',');
      history = await db.query(
        `SELECT H.ID,H.TTRANGTHAIXEID,H.TRANGTHAI_CU,H.TRANGTHAI_MOI,H.NGAY,H.LYDO,H.GHICHU,
                N.NAME AS TEN_NV,CU.TEN AS TEN_CU,MOI.TEN AS TEN_MOI
           FROM TLICHSUTRANGTHAI H
           LEFT JOIN DNHANVIEN N ON N.ID=H.DNHANVIENID
           LEFT JOIN TWORKFLOWMAP CU ON CU.STT_WORKFLOW=H.TRANGTHAI_CU
           LEFT JOIN TWORKFLOWMAP MOI ON MOI.STT_WORKFLOW=H.TRANGTHAI_MOI
          WHERE H.STATUS=1 AND H.TTRANGTHAIXEID IN (${placeholders})
          ORDER BY H.NGAY,H.TIMECREATED`, workflowIds
      );
    }
    const detailsByRepair = new Map();
    details.forEach((item) => {
      const list = detailsByRepair.get(item.TLENHSUACHUAID) || [];
      list.push(item); detailsByRepair.set(item.TLENHSUACHUAID, list);
    });
    const historyByWorkflow = new Map();
    history.forEach((item) => {
      const list = historyByWorkflow.get(item.TTRANGTHAIXEID) || [];
      list.push(item); historyByWorkflow.set(item.TTRANGTHAIXEID, list);
    });
    res.json({ data: rows.map((row) => ({
      ...row,
      ITEMS: detailsByRepair.get(row.TLENHSUACHUAID) || [],
      HISTORY: historyByWorkflow.get(row.ID) || [],
    })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

/* GET /api/workflow/:workflowId/images?state=0..4 */
router.get('/:workflowId/images', async (req, res) => {
  try {
    const params = [req.params.workflowId];
    let stateFilter = '';
    if (req.query.state !== undefined && req.query.state !== '') {
      const state = Number(req.query.state);
      if (!Number.isInteger(state) || state < 0 || state > 4) {
        return res.status(400).json({ error: 'Trang thai anh khong hop le' });
      }
      stateFilter = ' AND A.TRANGTHAI=?';
      params.push(state);
    }
    const rows = await db.query(
      `SELECT A.ID, A.TTRANGTHAIXEID, A.TLICHSUTRANGTHAIID, A.DXEID,
              A.TLENHSUACHUAID, A.TRANGTHAI, A.TENFILE, A.MIME,
              A.MOTA, A.THUTU, A.TIMECREATED
         FROM TTRANGTHAIANH A
        WHERE A.STATUS=1 AND A.TTRANGTHAIXEID=?${stateFilter}
        ORDER BY A.TRANGTHAI, A.THUTU, A.TIMECREATED`,
      params
    );
    res.json({ data: rows.map((row) => ({
      ...row,
      URL: `/api/workflow/images/${row.ID}/content`,
    })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/workflow/images/:id/content */
router.get('/images/:id/content', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT MIME, DULIEUANH FROM TTRANGTHAIANH WHERE ID=? AND STATUS=1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Anh khong ton tai' });
    const data = parseImageDataUrl(rows[0].DULIEUANH);
    if (!data) return res.status(422).json({ error: 'Du lieu anh khong hop le' });
    res.set('Content-Type', rows[0].MIME || data.mime);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(data.buffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/workflow/images - lưu nhiều ảnh cho một trạng thái */
router.post('/images', async (req, res) => {
  try {
    const { TTRANGTHAIXEID, DXEID, TLENHSUACHUAID, TRANGTHAI, images = [] } = req.body;
    const state = Number(TRANGTHAI);
    if (!TTRANGTHAIXEID || !DXEID || !Number.isInteger(state) || state < 0 || state > 4) {
      return res.status(400).json({ error: 'Thieu thong tin workflow hoac trang thai anh' });
    }
    if (!Array.isArray(images) || !images.length || images.length > WORKFLOW_IMAGE_LIMIT) {
      return res.status(400).json({ error: `Moi lan chi duoc tai 1-${WORKFLOW_IMAGE_LIMIT} anh` });
    }

    const workflowRows = await db.query(
      `SELECT ID, DXEID, TLENHSUACHUAID, TRANGTHAI
         FROM TTRANGTHAIXE WHERE ID=? AND DXEID=? AND STATUS=1`,
      [TTRANGTHAIXEID, DXEID]
    );
    if (!workflowRows.length) return res.status(404).json({ error: 'Khong tim thay luot sua chua' });
    if (state > Number(workflowRows[0].TRANGTHAI)) {
      return res.status(409).json({ error: 'Chua the luu anh cho trang thai chua dien ra' });
    }

    const prepared = images.map((image, index) => {
      const parsed = parseImageDataUrl(image.data);
      if (!parsed) {
        const error = new Error(`Anh thu ${index + 1} khong hop le hoac vuot qua 3 MB`);
        error.statusCode = 400;
        throw error;
      }
      return {
        parsed,
        name: String(image.name || `anh-trang-thai-${index + 1}.jpg`).slice(0, 255),
        description: String(image.description || '').slice(0, 500) || null,
      };
    });

    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const result = await db.transaction(async (query, execute, uuidv4) => {
      const history = await query(
        `SELECT FIRST 1 ID FROM TLICHSUTRANGTHAI
          WHERE TTRANGTHAIXEID=? AND TRANGTHAI_MOI=? AND STATUS=1
          ORDER BY NGAY DESC, TIMECREATED DESC`,
        [TTRANGTHAIXEID, state]
      );
      const currentCount = await query(
        `SELECT COUNT(*) AS CNT FROM TTRANGTHAIANH
          WHERE TTRANGTHAIXEID=? AND TRANGTHAI=? AND STATUS=1`,
        [TTRANGTHAIXEID, state]
      );
      let order = Number(currentCount[0]?.CNT || 0);
      const ids = [];
      for (const image of prepared) {
        const id = uuidv4();
        order += 1;
        await execute(
          `INSERT INTO TTRANGTHAIANH
             (ID, TTRANGTHAIXEID, TLICHSUTRANGTHAIID, DXEID, TLENHSUACHUAID,
              TRANGTHAI, TENFILE, MIME, DULIEUANH, MOTA, THUTU,
              STATUS, USERCREATEDID, TIMECREATED)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
          [id, TTRANGTHAIXEID, history[0]?.ID || null, DXEID,
            TLENHSUACHUAID || workflowRows[0].TLENHSUACHUAID || null,
            // Dùng Buffer để node-firebird mở luồng ghi BLOB thực sự. Truyền
            // chuỗi Base64 dài khiến driver suy luận VARCHAR và đóng connection
            // giữa lúc chuyển dữ liệu ảnh lớn.
            state, image.name, image.parsed.mime, Buffer.from(image.parsed.dataUrl, 'utf8'),
            image.description, order, actor]
        );
        ids.push(id);
      }
      return ids;
    });
    res.json({ ok: true, ids: result });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

router.delete('/images/:id', async (req, res) => {
  try {
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `UPDATE TTRANGTHAIANH SET STATUS=0, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
      [actor, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
        ORDER BY CASE WHEN TT.TRANGTHAI < 4 THEN 0 ELSE 1 END,
                 TT.NGAY_TRANGTHAI DESC, TT.TIMECREATED DESC`,
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
      ORDER BY CASE WHEN TT.TRANGTHAI < 4 THEN 0 ELSE 1 END,
               TT.NGAY_TRANGTHAI DESC, TT.TIMECREATED DESC`,
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

/* GET /api/workflow/by-vehicle/:dxid/all - tất cả số phiếu của xe */
router.get('/by-vehicle/:dxid/all', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT TT.ID, TT.DXEID, TT.DKHACHHANGID, TT.TTIEPNHANXEID,
              TT.TLENHSUACHUAID, TT.TRANGTHAI, TT.NGAY_VAO,
              TT.NGAY_TRANGTHAI, TT.TIMECREATED,
              W.TEN AS TRANGTHAI_TEN, W.MAU AS TRANGTHAI_MAU,
              LS.NAME AS SOPHIEU, LS.TONGCONG, TN.NAME AS SOPHIEUTIEPNHAN
         FROM TTRANGTHAIXE TT
         LEFT JOIN TWORKFLOWMAP W ON W.STT_WORKFLOW = TT.TRANGTHAI
         LEFT JOIN TLENHSUACHUA LS ON LS.ID = TT.TLENHSUACHUAID
         LEFT JOIN TTIEPNHANXE TN ON TN.ID = TT.TTIEPNHANXEID
        WHERE TT.STATUS=1 AND TT.DXEID=?
        ORDER BY CASE WHEN TT.TRANGTHAI < 4 THEN 0 ELSE 1 END,
                 TT.NGAY_TRANGTHAI DESC, TT.TIMECREATED DESC`,
      [req.params.dxid]
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
        ORDER BY CASE WHEN TRANGTHAI < 4 THEN 0 ELSE 1 END,
                 NGAY_TRANGTHAI DESC, TIMECREATED DESC`,
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
