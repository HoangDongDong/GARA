const express = require('express');
const router = express.Router();
const db = require('../db');
const { renderSalesInvoice } = require('../services/salesPrint');

const productSql = `
  SELECT M.ID, M.NAME, M.CODE, M.GIABAN, M.GIANHAP, M.BAOHANH,
         COALESCE((SELECT SUM(NC.SOLUONG) FROM TNHAPKHOCHITIET NC WHERE NC.DMATHANGID = M.ID), 0)
       - COALESCE((SELECT SUM(XP.SOLUONG) FROM TXUATPHUTUNG XP WHERE XP.DMATHANGID = M.ID), 0)
       - COALESCE((SELECT SUM(CT.SLXUAT) FROM TDONHANGCHITIET CT WHERE CT.DMATHANGID = M.ID AND CT.STATUS = 1), 0) AS TON_KHO
    FROM DMATHANG M
   WHERE M.ID = ? AND M.STATUS = 1 AND COALESCE(M.TAMKHOA, 0) = 0`;

router.get('/', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT FIRST 50 DH.ID, DH.NAME, DH.NGAY, DH.DKHACHHANGID,
             KH.NAME AS TEN_KH, DH.TIENHANG, DH.TIENGIAMGIA,
             DH.TONGCONG, DH.TIENTHANHTOAN, DH.DATHANHTOAN,
             DH.LOAITHANHTOAN, DH.NOTE
        FROM TDONHANG DH
        LEFT JOIN DKHACHHANG KH ON KH.ID = DH.DKHACHHANGID
       WHERE DH.STATUS = 1
       ORDER BY DH.NGAY DESC, DH.TIMECREATED DESC
    `);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Render the sale with the default "Hóa đơn bán hàng" template (or ?templateId=) as PDF.
router.get('/:id/print', async (req, res) => {
  try {
    const printing = require('../services/documentPrint');
    if(!printing.permitted(req.accessUser,printing.typeByKey('MauHoaDonBanHang'))) return res.status(403).json({error:'Bạn cần quyền Xem và In bán hàng.'});
    const result = await renderSalesInvoice(req.params.id, {
      templateId: req.query.templateId || null,
      user: req.accessUser?.USERNAME || req.get('X-User') || null,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(result.orderName || 'hoa-don')}.pdf"`,
      'Cache-Control': 'no-store',
      'X-Template-Name': encodeURIComponent(result.template.name),
    });
    res.send(result.pdf);
  } catch (e) {
    res.status(500).json({ error: `Không tạo được bản in: ${e.message}` });
  }
});

router.get('/next-number', async (req,res) => {
  try {
    const code=await require('../services/documentNumbers').previewNumber('BanPhuTung');
    res.set('Cache-Control','no-store').json({code,provisional:true});
  } catch(e){res.status(e.status||500).json({error:e.message});}
});

router.get('/:id', async (req, res) => {
  try {
    const header = await db.query(`SELECT DH.*, KH.NAME AS TEN_KH FROM TDONHANG DH LEFT JOIN DKHACHHANG KH ON KH.ID=DH.DKHACHHANGID WHERE DH.ID=?`, [req.params.id]);
    if (!header.length) return res.status(404).json({ error: 'Khong tim thay phieu ban hang' });
    const items = await db.query(`SELECT CT.*, M.CODE FROM TDONHANGCHITIET CT LEFT JOIN DMATHANG M ON M.ID=CT.DMATHANGID WHERE CT.TDONHANGID=? AND CT.STATUS=1`, [req.params.id]);
    res.json({ data: { ...header[0], items } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { DKHACHHANGID, DKHOXUATID, NOTE, TILEGIAMGIA = 0, LOAITHANHTOAN = 0, items = [] } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Phieu ban hang chua co san pham' });

    const user = req.get('X-User') || 'SYSTEM';
    const result = await db.transaction(async (query, execute, uuidv4) => {
      const normalized = [];
      for (const item of items) {
        const quantity = Number(item.SOLUONG || 0);
        if (!item.DMATHANGID || quantity <= 0) throw new Error('So luong san pham khong hop le');
        const products = await query(productSql, [item.DMATHANGID]);
        if (!products.length) throw new Error('San pham khong ton tai hoac da ngung ban');
        const product = products[0];
        if (quantity > Number(product.TON_KHO || 0)) throw new Error(`${product.NAME} khong du ton kho`);
        normalized.push({ ...product, quantity, amount: quantity * Number(product.GIABAN || 0) });
      }

      const subtotal = normalized.reduce((sum, item) => sum + item.amount, 0);
      const discountRate = Math.max(0, Math.min(100, Number(TILEGIAMGIA || 0)));
      const discount = subtotal * discountRate / 100;
      const total = subtotal - discount;
      const id = uuidv4();
      const code = await require('../services/documentNumbers').nextInTransaction('BanPhuTung',query,execute);
      const method = Number(LOAITHANHTOAN || 0);

      await execute(`
        INSERT INTO TDONHANG
          (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, NGAY,
           DKHACHHANGID, DKHOXUATID, TIENHANG, TIENHANGCHUAGIAM,
           TILEGIAMGIA, TIENGIAMGIA, TONGCONG, GIOTHANHTOAN,
           USERTHANHTOANID, TIENTHANHTOAN, LOAITHANHTOAN, DATHANHTOAN,
           THANHTOAN, TIENMAT, CHUYENKHOAN, THE, CONNO, CONLAI, CONGNO)
        VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                ?, ?, ?, 1, ?, ?, ?, ?, 0, 0, 0)`,
        [id, code, NOTE || null, user, DKHACHHANGID || null, DKHOXUATID || null,
         subtotal, subtotal, discountRate, discount, total, user, total, method, total,
         method === 0 ? total : 0, method === 1 ? total : 0, method === 2 ? total : 0]
      );

      for (const item of normalized) {
        await execute(`
          INSERT INTO TDONHANGCHITIET
            (ID, TDONHANGID, STATUS, USERCREATEDID, TIMECREATED,
             DMATHANGID, BAOHANH, THANHTIEN, DONGIA, SLXUAT,
             DKHOHANGID, TENHANG, GIAVON)
          VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), id, user, item.ID, item.BAOHANH || null, item.amount,
           Number(item.GIABAN || 0), item.quantity, DKHOXUATID || null,
           item.NAME, Number(item.GIANHAP || 0)]
        );
      }
      return { id, code, total };
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
