const express = require('express');
const router = express.Router();
const db = require('../db');
const charges = require('../services/defaultChargeRates');
const policy = require('../services/pricingPolicy');
const repairPayment = require('../services/repairPayment');

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
              HD.TILETHUE, HD.TILEPHIDICHVU, HD.PHIDICHVU,
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
    policy.assertOverride(req, 'REPAIR');
    const { TLENHSUACHUAID, NGAY, TIENGIAMGIA } = req.body;
    if (!TLENHSUACHUAID) return res.status(400).json({ error: 'Phai chon lenh sua chua' });
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const result = await db.transaction(async (query, execute, uuidv4) => {
      const [order] = await query(`SELECT DXEID, DKHACHHANGID, TONGTIENCONG, TONGTIENPHUTUNG,
        TILETHUE, TILEPHIDICHVU, TIENTHUE, PHIDICHVU, TONGCONG, TIENGIAMGIA,
        CHARGEVERSION, TILEGIAMGIA, NGUONGIAMGIA, TAXSUMMARY
        FROM TLENHSUACHUA WHERE ID=? AND STATUS=1 WITH LOCK`, [TLENHSUACHUAID]);
      if (!order) throw Object.assign(new Error('Lệnh sửa chữa không tồn tại.'), { status: 404 });
      const existing = await query('SELECT FIRST 1 ID FROM THOADONSUACHUA WHERE TLENHSUACHUAID=? AND STATUS=1', [TLENHSUACHUAID]);
      if (existing.length) throw Object.assign(new Error('Lệnh sửa chữa đã có hóa đơn. Hãy thanh toán hóa đơn hiện có.'), { status: 409 });
      const workflowRows = await query(`SELECT FIRST 1 ID, TRANGTHAI FROM TTRANGTHAIXE
        WHERE DXEID=? AND TLENHSUACHUAID=? AND STATUS=1 ORDER BY NGAY_TRANGTHAI DESC`, [order.DXEID, TLENHSUACHUAID]);
      if (Number(workflowRows[0]?.TRANGTHAI) !== 3) throw Object.assign(new Error('Chỉ lập thanh toán khi xe đã ở bước Giao xe.'), { status: 409 });
      const defaults = await charges.load(query);
      const rates = charges.resolve({
        TILETHUE: order.TILETHUE ?? req.body.TILETHUE,
        TILEPHIDICHVU: order.TILEPHIDICHVU ?? req.body.TILEPHIDICHVU,
      }, defaults);
      const subtotal = Number(order.TONGTIENCONG || 0) + Number(order.TONGTIENPHUTUNG || 0);
      const discountPolicy = Number(order.CHARGEVERSION) === 1
        ? { discountRate: Number(order.TILEGIAMGIA || 0), discountSource: order.NGUONGIAMGIA }
        : { discountRate: 0, discountSource: 'Giảm giá trên hóa đơn' };
      const discountRate = Number(req.body.TILEGIAMGIA ?? discountPolicy.discountRate);
      if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) throw Object.assign(new Error('Tỷ lệ giảm giá không hợp lệ.'), { status: 400 });
      const fixedDiscount = TIENGIAMGIA == null ? null : Number(TIENGIAMGIA);
      if (fixedDiscount != null && (!Number.isFinite(fixedDiscount) || fixedDiscount < 0)) throw Object.assign(new Error('Giảm giá không hợp lệ.'), { status: 400 });
      if (Number(order.CHARGEVERSION) === 1 && (discountRate !== Number(order.TILEGIAMGIA || 0)
        || fixedDiscount != null && fixedDiscount !== Number(order.TIENGIAMGIA || 0))) {
        throw Object.assign(new Error('Giảm giá đã chốt trên báo giá. Hóa đơn giữ nguyên chính sách đã được khách xác nhận.'), { status: 409 });
      }
      const totals = Number(order.CHARGEVERSION) === 1
        ? { subtotal, discount: Number(order.TIENGIAMGIA || 0), tax: Number(order.TIENTHUE || 0), serviceFee: Number(order.PHIDICHVU || 0),
            total: Number(order.TONGCONG || 0), taxGroups: policy.summary(order.TAXSUMMARY) }
        : { ...charges.calculate(subtotal, rates, fixedDiscount ?? subtotal * discountRate / 100), taxGroups: [] };
      const discount = totals.discount;
      const payments = ['TIENMAT', 'CHUYENKHOAN', 'THE'].map(key => Number(req.body[key] ?? 0));
      const { paid, remaining } = repairPayment.calculate(totals.total, payments, req.body.ALLOW_DEBT, order.DKHACHHANGID);
      const paymentSettings = await require('../services/paymentSettings').load('repair', query);
      if (paymentSettings.requireBill && !['REPAIR','FINANCE'].some(code => require('../permissionPolicy').has(req.accessUser,code,17))) throw Object.assign(new Error('Cần quyền Xem và In hóa đơn khi bill bắt buộc.'), { status: 403 });
      require('../services/paymentSettings').assertDebt(paymentSettings, remaining);
      const id = uuidv4();
      const code = await require('../services/documentNumbers').nextInTransaction('HoaDonSuaChua', query, execute);
      await execute(`INSERT INTO THOADONSUACHUA
         (ID, NAME, NGAY, DXEID, DKHACHHANGID, TLENHSUACHUAID,
          TIENPHUTUNG, TIENCONG, TIENDICHVU,
          TILEGIAMGIA, TIENGIAMGIA, TIENTHUE, TONGCONG,
          DATCOC, CONLAI, TIENMAT, CHUYENKHOAN, THE, CONGNO,
          DATHANHTOAN, STATUS, USERCREATEDID, TIMECREATED, TILETHUE, TILEPHIDICHVU, PHIDICHVU)
       VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        [id, code, NGAY || null, order.DXEID, order.DKHACHHANGID, TLENHSUACHUAID,
         Number(order.TONGTIENPHUTUNG || 0), Number(order.TONGTIENCONG || 0), discountRate,
         discount, totals.tax, totals.total, remaining, ...payments, remaining, paid ? 1 : 0, actor,
         rates.taxRate, rates.serviceRate, totals.serviceFee]);
      await execute('UPDATE THOADONSUACHUA SET CHARGEVERSION=?, NGUONGIAMGIA=?, TAXSUMMARY=? WHERE ID=?',
        [order.CHARGEVERSION || null, req.body.TILEGIAMGIA != null || fixedDiscount != null ? 'Giảm giá riêng cho phiếu này' : discountPolicy.discountSource,
          JSON.stringify(totals.taxGroups), id]);
      await execute(`UPDATE TLENHSUACHUA SET TRANGTHAI=?, KETTHUC=COALESCE(KETTHUC,CURRENT_TIMESTAMP),
        USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [3, actor, TLENHSUACHUAID]);
      await query('EXECUTE PROCEDURE SP_CHUYEN_TRANGTHAI(?, 4, ?, ?, ?, ?, ?)',
        [order.DXEID, actor, paid ? 'Da giao xe va thanh toan du' : 'Da giao xe va ghi nhan cong no', 'Tu dong hoan thanh khi xac nhan thanh toan', uuidv4(), uuidv4()]);
      return { id, code, ...totals, ...rates, paid, remaining, completed: true, requireBill: paymentSettings.requireBill };
    });
    res.json({ ok: true, ...result });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.patch('/:id/pay', async (req, res) => {
  try {
    const { TIENMAT, CHUYENKHOAN, THE } = req.body;
    const result = await db.transaction(async (query, execute, uuidv4) => {
    const rows = await query(
      `SELECT ID, TONGCONG, TIENMAT, CHUYENKHOAN, THE, DXEID, TLENHSUACHUAID, DKHACHHANGID
         FROM THOADONSUACHUA WHERE ID=? AND STATUS=1 WITH LOCK`,
      [req.params.id]
    );
    if (!rows.length) throw Object.assign(new Error('Hóa đơn không tồn tại.'), { status: 404 });
    const invoice = rows[0];
    const cash = TIENMAT == null ? Number(invoice.TIENMAT || 0) : Number(TIENMAT || 0);
    const transfer = CHUYENKHOAN == null ? Number(invoice.CHUYENKHOAN || 0) : Number(CHUYENKHOAN || 0);
    const card = THE == null ? Number(invoice.THE || 0) : Number(THE || 0);
    if ([cash, transfer, card].some((value, index) => value < Number(invoice[['TIENMAT', 'CHUYENKHOAN', 'THE'][index]] || 0))) {
      throw Object.assign(new Error('Không được giảm số tiền đã thu trên hóa đơn.'), { status: 409 });
    }
    const { remaining, paid } = repairPayment.calculate(Number(invoice.TONGCONG || 0), [cash, transfer, card], req.body.ALLOW_DEBT, invoice.DKHACHHANGID);
    const paymentSettings = await require('../services/paymentSettings').load('repair', query);
    if (paymentSettings.requireBill && !['REPAIR','FINANCE'].some(code => require('../permissionPolicy').has(req.accessUser,code,17))) throw Object.assign(new Error('Cần quyền Xem và In hóa đơn khi bill bắt buộc.'), { status: 403 });
    require('../services/paymentSettings').assertDebt(paymentSettings, remaining);
    await execute(
      `UPDATE THOADONSUACHUA
          SET TIENMAT=?, CHUYENKHOAN=?, THE=?, CONLAI=?, CONGNO=?, DATHANHTOAN=?,
              USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID = ?`,
      [cash, transfer, card, remaining, remaining, paid ? 1 : 0, req.params.id]
    );
    let completed = false;
    if (invoice.TLENHSUACHUAID) {
      const flow = await query(
        `SELECT FIRST 1 TRANGTHAI FROM TTRANGTHAIXE
          WHERE DXEID=? AND TLENHSUACHUAID=? AND STATUS=1
          ORDER BY NGAY_TRANGTHAI DESC`,
        [invoice.DXEID, invoice.TLENHSUACHUAID]
      );
      completed = Number(flow[0]?.TRANGTHAI) === 4;
      if (Number(flow[0]?.TRANGTHAI) === 3) {
        const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
        await query(
          `EXECUTE PROCEDURE SP_CHUYEN_TRANGTHAI(?, 4, ?, ?, ?, ?, ?)`,
          [invoice.DXEID, actor, paid ? 'Da giao xe va thanh toan du' : 'Da giao xe va ghi nhan cong no', 'Tu dong hoan thanh khi xac nhan thanh toan', uuidv4(), uuidv4()]
        );
        await execute(
          `UPDATE TLENHSUACHUA SET TRANGTHAI=3, KETTHUC=COALESCE(KETTHUC,CURRENT_TIMESTAMP), USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [actor, invoice.TLENHSUACHUAID]
        );
        completed = true;
      }
    }
    return { ok: true, paid: Boolean(paid), remaining, completed, requireBill: paymentSettings.requireBill };
    });
    res.json(result);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = router;
