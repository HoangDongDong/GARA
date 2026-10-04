const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GARAGE.FDB:
 *  - TTIEPNHANXE: phieu tiep nhan (NGAY, DXEID, DKHACHHANGID,
                  DNHANVIENCOOVANID, DNHANVIENKTVID, ODO, MUCNHIENLIEU,
                  TINHTRANGXE, YEUCAUKHACH, PHUKIENDETRENKXE, TRANGTHAI)
                  TRANGTHAI: 0=Moi, 1=Dang xu ly, 2=Hoan thanh, 3=Da giao xe
 *
 *  - TLENHSUACHUA: lenh SC (DXEID, DKHACHHANGID, TTIEPNHANXEID, TBAOGIAID,
                    BATDAU, KETTHUC, TONGTIENCONG, TONGTIENPHUTUNG, TONGCONG,
                    TRANGTHAI: 0=Moi, 1=Dang sua, 2=Tam dung, 3=Hoan thanh,
                                4=QC, 5=Giao xe)
 *
 *  - TLENHSUACHUACHITIET: CT lenh (TLENHSUACHUAID, DMATHANGID, DDICHVUID,
                           DDONVITINHID, SOLUONG, DONGIA, THANHTIEN,
                           LOAI: 0=PT, 1=Cong)
 */

// ===== TTIEPNHANXE =====
router.get('/tiep-nhan', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT TN.ID, TN.NGAY, TN.ODO, TN.MUCNHIENLIEU, TN.TINHTRANGXE,
              TN.YEUCAUKHACH, TN.PHUKIENDETRENKXE, TN.TRANGTHAI, TN.NAME,
              TN.DXEID, V.BIENSO,
              TN.DKHACHHANGID, KH.NAME AS TEN_KH, KH.DIENTHOAI,
              TN.DNHANVIENCOOVANID, COV.NAME AS COVAN,
              TN.DNHANVIENKTVID,    KTV.NAME AS KTVTN
         FROM TTIEPNHANXE TN
         LEFT JOIN DXE          V   ON V.ID  = TN.DXEID
         LEFT JOIN DKHACHHANG   KH  ON KH.ID = TN.DKHACHHANGID
         LEFT JOIN DNHANVIEN    COV ON COV.ID = TN.DNHANVIENCOOVANID
         LEFT JOIN DNHANVIEN    KTV ON KTV.ID = TN.DNHANVIENKTVID
        WHERE TN.STATUS = 1
     ORDER BY TN.NGAY DESC`
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tiep-nhan', async (req, res) => {
  try {
    const {
      NGAY, DXEID, DKHACHHANGID, DNHANVIENCOOVANID, DNHANVIENKTVID,
      ODO, MUCNHIENLIEU, TINHTRANGXE, YEUCAUKHACH, PHUKIENDETRENKXE,
    } = req.body;
    if (!DXEID || !DKHACHHANGID) return res.status(400).json({ error: 'Phai chon xe va khach hang' });
    const active = await db.query(`SELECT FIRST 1 ID FROM TTRANGTHAIXE WHERE DXEID=? AND STATUS=1 AND TRANGTHAI<4`, [DXEID]);
    if (active.length) return res.status(409).json({ error: 'Xe dang co quy trinh sua chua chua hoan thanh' });

    const id = db.uuidv4();
    const ma = await require('../services/documentNumbers').nextNumber('TiepNhan');
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.execute(
      `INSERT INTO TTIEPNHANXE
         (ID, NAME, NGAY, DXEID, DKHACHHANGID, DNHANVIENCOOVANID, DNHANVIENKTVID,
          ODO, MUCNHIENLIEU, TINHTRANGXE, YEUCAUKHACH, PHUKIENDETRENKXE,
          TRANGTHAI, STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, CURRENT_TIMESTAMP)`,
      [
        id, ma, NGAY, DXEID, DKHACHHANGID,
        DNHANVIENCOOVANID || null, DNHANVIENKTVID || null,
        ODO || 0, MUCNHIENLIEU || null, TINHTRANGXE, YEUCAUKHACH, PHUKIENDETRENKXE,
        actor,
      ]
    );
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/tiep-nhan/:id/status', async (req, res) => {
  try {
    const { TRANGTHAI } = req.body;
    await db.execute(
      `UPDATE TTIEPNHANXE SET TRANGTHAI=?, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [TRANGTHAI, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== TLENHSUACHUA =====
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT LS.ID, LS.NAME, LS.NGAY, LS.BATDAU, LS.KETTHUC,
              LS.TONGTIENCONG, LS.TONGTIENPHUTUNG, LS.TONGCONG, LS.TRANGTHAI,
              LS.DXEID, V.BIENSO,
              LS.DKHACHHANGID, KH.NAME AS TEN_KH,
              LS.TTIEPNHANXEID, TN.NAME AS SOPHIEUTN
         FROM TLENHSUACHUA LS
         LEFT JOIN DXE        V  ON V.ID  = LS.DXEID
         LEFT JOIN DKHACHHANG KH ON KH.ID = LS.DKHACHHANGID
         LEFT JOIN TTIEPNHANXE TN ON TN.ID = LS.TTIEPNHANXEID
        WHERE LS.STATUS = 1
     ORDER BY LS.NGAY DESC`
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const head = await db.query(
      `SELECT LS.*, V.BIENSO, KH.NAME AS TEN_KH
         FROM TLENHSUACHUA LS
         LEFT JOIN DXE        V  ON V.ID  = LS.DXEID
         LEFT JOIN DKHACHHANG KH ON KH.ID = LS.DKHACHHANGID
       WHERE LS.ID = ?`,
      [req.params.id]
    );
    if (!head.length) return res.status(404).json({ error: 'Not found' });

    const details = await db.query(
      `SELECT CT.ID, CT.LOAI, CT.SOLUONG, CT.DONGIA, CT.THANHTIEN,
              CT.DMATHANGID, MH.NAME  AS TEN_PT, MH.CODE AS MA_PT,
              CT.DDICHVUID,   DV.NAME  AS TEN_DV, DV.CODE AS MA_DV
         FROM TLENHSUACHUACHITIET CT
         LEFT JOIN DMATHANG MH ON MH.ID = CT.DMATHANGID
         LEFT JOIN DDICHVU  DV ON DV.ID = CT.DDICHVUID
       WHERE CT.TLENHSUACHUAID = ?
    ORDER BY CT.ID`,
      [req.params.id]
    );
    res.json({ data: { ...head[0], details } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const {
      DXEID, DKHACHHANGID, TTIEPNHANXEID, NGAY,
      NOTE, items = [],
    } = req.body;
    if (!DXEID || !DKHACHHANGID) return res.status(400).json({ error: 'Phai chon xe va khach hang' });
    if (!items.length) return res.status(400).json({ error: 'Phai chon it nhat mot dich vu hoac phu tung' });

    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const result = await db.transaction(async (query, execute, uuidv4) => {
      const active = await query(
        `SELECT FIRST 1 ID, TLENHSUACHUAID, TTIEPNHANXEID, TRANGTHAI
           FROM TTRANGTHAIXE
          WHERE DXEID=? AND STATUS=1 AND TRANGTHAI<4
          ORDER BY NGAY_TRANGTHAI DESC, TIMECREATED DESC`,
        [DXEID]
      );
      const activeFlow = active[0] || null;
      if (activeFlow?.TLENHSUACHUAID) {
        const error = new Error('Xe dang co quy trinh sua chua chua hoan thanh');
        error.statusCode = 409;
        throw error;
      }
      if (activeFlow?.TTIEPNHANXEID && TTIEPNHANXEID && activeFlow.TTIEPNHANXEID !== TTIEPNHANXEID) {
        const error = new Error('Phieu tiep nhan khong khop voi quy trinh dang xu ly');
        error.statusCode = 409;
        throw error;
      }

      const id = uuidv4();
      const workflowId = activeFlow?.ID || uuidv4();
      const historyId = uuidv4();
      const ma = await require('../services/documentNumbers').nextInTransaction('LenhSuaChua',query,execute);
      let tongCong = 0;
      let tongPT = 0;
      for (const it of items) {
        const quantity = Math.max(1, Number(it.SOLUONG) || 1);
        const price = Math.max(0, Number(it.DONGIA) || 0);
        const amount = quantity * price;
        if (Number(it.LOAI || 0) === 0) tongPT += amount;
        else tongCong += amount;
      }
      const tongCongAll = tongCong + tongPT;

      await execute(
        `INSERT INTO TLENHSUACHUA
           (ID, NAME, NOTE, NGAY, DXEID, DKHACHHANGID, TTIEPNHANXEID,
            TONGTIENCONG, TONGTIENPHUTUNG, TONGCONG,
            TRANGTHAI, STATUS, USERCREATEDID, TIMECREATED)
         VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?, 0, 1, ?, CURRENT_TIMESTAMP)`,
        [id, ma, NOTE || null, NGAY, DXEID, DKHACHHANGID, TTIEPNHANXEID || null, tongCong, tongPT, tongCongAll, actor]
      );

      for (const it of items) {
        const type = Number(it.LOAI || 0);
        const quantity = Math.max(1, Number(it.SOLUONG) || 1);
        const price = Math.max(0, Number(it.DONGIA) || 0);
        await execute(
          `INSERT INTO TLENHSUACHUACHITIET
             (ID, TLENHSUACHUAID, DMATHANGID, DDICHVUID, DDONVITINHID,
              SOLUONG, DONGIA, THANHTIEN, LOAI, TRANGTHAI, NOTE,
              STATUS, USERCREATEDID, TIMECREATED)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, CURRENT_TIMESTAMP)`,
          [uuidv4(), id, type === 0 ? it.DMATHANGID || null : null,
            type === 1 ? it.DDICHVUID || null : null, it.DDONVITINHID || null,
            quantity, price, quantity * price, type, it.NOTE || null, actor]
        );
      }

      let advisorId = null;
      let technicianId = null;
      if (TTIEPNHANXEID) {
        const receptions = await query(
          `SELECT DNHANVIENCOOVANID, DNHANVIENKTVID FROM TTIEPNHANXE WHERE ID=?`,
          [TTIEPNHANXEID]
        );
        advisorId = receptions[0]?.DNHANVIENCOOVANID || null;
        technicianId = receptions[0]?.DNHANVIENKTVID || null;
        await execute(
          `UPDATE TTIEPNHANXE SET TRANGTHAI=1, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [actor, TTIEPNHANXEID]
        );
      }

      // Khi bang ke dich vu va bao gia da duoc luu thanh cong, buoc
      // "Tiep nhan & Bao gia" da hoan tat va ho so cho khach xac nhan sua chua.
      const quoteCompletedState = 1;
      if (activeFlow) {
        await execute(
          `UPDATE TTRANGTHAIXE
              SET TLENHSUACHUAID=?, TTIEPNHANXEID=COALESCE(TTIEPNHANXEID, ?),
                  TRANGTHAI=?, NGAY_TRANGTHAI=CURRENT_TIMESTAMP,
                  DNHANVIENKTVID=COALESCE(DNHANVIENKTVID, ?),
                  DNHANVIENCOOVANID=COALESCE(DNHANVIENCOOVANID, ?),
                  LYDO=?, GHICHU=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
            WHERE ID=?`,
          [id, TTIEPNHANXEID || null, quoteCompletedState, technicianId, advisorId,
            'Da hoan tat tiep nhan va bao gia, cho xac nhan sua chua', NOTE || null, actor, workflowId]
        );
      } else {
        await execute(
          `INSERT INTO TTRANGTHAIXE
             (ID, NAME, DXEID, DKHACHHANGID, TTIEPNHANXEID, TLENHSUACHUAID,
              TRANGTHAI, NGAY_VAO, NGAY_TRANGTHAI, DNHANVIENKTVID,
              DNHANVIENCOOVANID, LYDO, GHICHU, MUCUU_TIEN,
              STATUS, USERCREATEDID, TIMECREATED)
           VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP,
                   ?, ?, ?, ?, 0, 1, ?, CURRENT_TIMESTAMP)`,
          [workflowId, `WF-${ma}`, DXEID, DKHACHHANGID, TTIEPNHANXEID || null, id,
            quoteCompletedState, NGAY, technicianId, advisorId,
            'Da hoan tat tiep nhan va bao gia, cho xac nhan sua chua', NOTE || null, actor]
        );
      }
      await execute(
        `INSERT INTO TLICHSUTRANGTHAI
           (ID, TTRANGTHAIXEID, DXEID, TRANGTHAI_CU, TRANGTHAI_MOI,
            NGAY, DNHANVIENID, LYDO, GHICHU, STT,
            STATUS, USERCREATEDID, TIMECREATED)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [historyId, workflowId, DXEID, activeFlow ? Number(activeFlow.TRANGTHAI) : null,
          quoteCompletedState, 'Hoan tat tiep nhan va bao gia, chuyen sang xac nhan sua chua',
          NOTE || null, activeFlow ? 2 : 1, actor]
      );
      return { id, workflowId, code: ma, workflowState: quoteCompletedState };
    });

    res.json({ ok: true, ...result });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { TRANGTHAI } = req.body;
    await db.execute(
      `UPDATE TLENHSUACHUA SET TRANGTHAI=?, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [TRANGTHAI, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute(
      `UPDATE TLENHSUACHUA SET STATUS=0, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE ID=?`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
