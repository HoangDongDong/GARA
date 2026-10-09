const express = require('express');
const router = express.Router();
const db = require('../db');
const receiptPayment = require('../services/receiptPayment');

router.get('/', async (req, res) => {
  try {
    const page=require('../services/documentList').filters(req.query,'NK');
    const rows = await db.query(`
      SELECT ${page.select} NK.ID, NK.NAME, NK.NOTE, NK.NGAY,
             NK.DNHACUNGCAPID, NCC.NAME AS TEN_NCC,
             NK.DKHOHANGID, K.NAME AS TEN_KHO,
             NK.DNHANVIENID, NV.NAME AS TEN_NHANVIEN,
             NK.TIENHANG, NK.TILEGIAMGIA, NK.TIENGIAMGIA,
             NK.TONGCONG, NK.LOAI, NK.CONGNO, NK.DATHANHTOAN,
             NK.SOLOHANG, NK.STATUS
        FROM TNHAPKHO NK
        LEFT JOIN DNHACUNGCAP NCC ON NCC.ID = NK.DNHACUNGCAPID
        LEFT JOIN DKHOHANG K ON K.ID = NK.DKHOHANGID
        LEFT JOIN DNHANVIEN NV ON NV.ID = NK.DNHANVIENID
       WHERE NK.STATUS = 1${page.where}
       ORDER BY NK.NGAY DESC, NK.TIMECREATED DESC, NK.ID DESC
    `,page.params);
    res.json(require('../services/documentList').response(rows,page));
  } catch (e) {
    res.status(e.status||500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const headers = await db.query(`
      SELECT NK.ID, NK.NAME, NK.NOTE, NK.NGAY,
             NK.DNHACUNGCAPID, NCC.NAME AS TEN_NCC,
             NK.DKHOHANGID, K.NAME AS TEN_KHO,
             NK.DNHANVIENID, NV.NAME AS TEN_NHANVIEN,
             NK.TIENHANG, NK.TILEGIAMGIA, NK.TIENGIAMGIA,
             NK.TONGCONG, NK.LOAI, NK.CONGNO, NK.DATHANHTOAN,
             NK.SOLOHANG, NK.STATUS
        FROM TNHAPKHO NK
        LEFT JOIN DNHACUNGCAP NCC ON NCC.ID = NK.DNHACUNGCAPID
        LEFT JOIN DKHOHANG K ON K.ID = NK.DKHOHANGID
        LEFT JOIN DNHANVIEN NV ON NV.ID = NK.DNHANVIENID
       WHERE NK.ID = ? AND NK.STATUS = 1
    `, [req.params.id]);
    if (!headers.length) return res.status(404).json({ error: 'Khong tim thay phieu nhap kho' });

    const items = await db.query(`
      SELECT CT.ID, CT.DMATHANGID, M.CODE, M.NAME AS TEN_MATHANG,
             CT.DDONVITINHID, DVT.NAME AS TEN_DVT,
             CT.SOLUONG, CT.DONGIA, CT.THANHTIEN, CT.GIAVON,
             CT.HANSUDUNG, CT.DKHOHANGID, CT.NOTE
        FROM TNHAPKHOCHITIET CT
        LEFT JOIN DMATHANG M ON M.ID = CT.DMATHANGID
        LEFT JOIN DDONVITINH DVT ON DVT.ID = CT.DDONVITINHID
       WHERE CT.TNHAPKHOID = ? AND CT.STATUS = 1
       ORDER BY CT.TIMECREATED, CT.ID
    `, [req.params.id]);
    res.json({ data: { receipt: headers[0], items } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    require('../permissionPolicy').assert(req.accessUser,'COST');
    if (Number(req.body.TIENTHANHTOAN || 0) !== 0) require('../permissionPolicy').assert(req.accessUser, 'PAYMENTS', 4);
    const {
      NAME, NGAY, NOTE, SOLOHANG,
      DNHACUNGCAPID, DKHOHANGID, DNHANVIENID,
      TIENHANG, TIENGIAMGIA, TONGCONG, TIENTHANHTOAN = 0, items,
    } = req.body;
    const requestedCode = String(NAME || '').trim();
    if (!DNHACUNGCAPID) return res.status(400).json({ error: 'Vui long chon nha cung cap' });
    if (!DKHOHANGID) return res.status(400).json({ error: 'Vui long chon kho nhap' });
    if (!DNHANVIENID) return res.status(400).json({ error: 'Vui long chon nhan vien nhap' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Phieu nhap chua co mat hang' });

    const validated = require('../services/receiptValidation').normalize(req.body);
    const payment = receiptPayment.calculate(validated.total, TIENTHANHTOAN);
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const result = await require('../services/idempotency').run(req,async (query, execute, uuidv4) => {
      await require('../services/stock').lock(execute, validated.items.map(item=>item.DMATHANGID));
      await require('../services/receiptValidation').references(query,req.body,validated.items);
      if (requestedCode) await execute("UPDATE SNUMBERCOUNTER SET SEQ=SEQ WHERE CODE='NhapKho'");
      const code = requestedCode || await require('../services/documentNumbers').nextInTransaction('NhapKho',query,execute);
      const duplicates = await query(`SELECT FIRST 1 ID FROM TNHAPKHO WHERE NAME = ?`, [code]);
      if (duplicates.length) {
        const error = new Error('So phieu nhap da ton tai');
        error.statusCode = 409;
        throw error;
      }

      const receiptId = uuidv4();
      const {goods,discount,total}=validated;
      await execute(`
        INSERT INTO TNHAPKHO
          (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, NGAY,
           DNHACUNGCAPID, DKHOHANGID, DNHANVIENID, TIENHANG,
           TILEGIAMGIA, TIENGIAMGIA, TONGCONG, LOAI, CONGNO,
           DATHANHTOAN, SOLOHANG)
        VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?, ?)`,
        [receiptId, code, NOTE || null, actor, NGAY ? new Date(NGAY) : new Date(),
          DNHACUNGCAPID, DKHOHANGID, DNHANVIENID, goods,
          discount, total, payment.debt, payment.paid ? 1 : 0, SOLOHANG || null]
      );

      for (const item of validated.items) {
        const quantity = Number(item.SOLUONG || 0);
        const price = Number(item.DONGIA || 0);
        const amount = Number(item.THANHTIEN ?? quantity * price);
        if (!item.DMATHANGID || quantity <= 0) {
          throw new Error('Chi tiet mat hang khong hop le');
        }
        await execute(`
          INSERT INTO TNHAPKHOCHITIET
            (ID, STATUS, USERCREATEDID, TIMECREATED, TNHAPKHOID,
             DMATHANGID, DDONVITINHID, SOLUONG, DONGIA, THANHTIEN,
             GIAVON, DKHOHANGID)
          VALUES (?, 1, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), actor, receiptId, item.DMATHANGID, item.DDONVITINHID || null,
            quantity, price, amount, price, DKHOHANGID]
        );
      }
      return { id: receiptId, code, ...payment };
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

router.patch('/:id/pay', async (req, res) => {
  try {
    require('../permissionPolicy').assert(req.accessUser,'COST');
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const payment = await db.transaction(async (query,execute) => {
      const [receipt] = await query('SELECT TONGCONG FROM TNHAPKHO WHERE ID=? AND STATUS=1 WITH LOCK',[req.params.id]);
      if (!receipt) throw Object.assign(new Error('Không tìm thấy phiếu nhập kho.'), {statusCode:404});
      if (req.body.TIENTHANHTOAN == null) throw Object.assign(new Error('Vui lòng nhập tiền thanh toán.'), {statusCode:400});
      const amount = receiptPayment.calculate(receipt.TONGCONG || 0, req.body.TIENTHANHTOAN);
      await execute(`UPDATE TNHAPKHO SET CONGNO=?, DATHANHTOAN=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=? AND STATUS=1`,[amount.debt,amount.paid ? 1 : 0,actor,req.params.id]);
      return amount;
    });
    res.json({ ok: true, ...payment });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.transaction(async (query, execute) => {
      const items=await query('SELECT DMATHANGID,SOLUONG,DKHOHANGID FROM TNHAPKHOCHITIET WHERE TNHAPKHOID=? AND STATUS=1',[req.params.id]);
      await require('../services/stock').lock(execute,items.map(item=>item.DMATHANGID));
      const [receipt]=await query('SELECT TONGCONG,CONGNO,DATHANHTOAN,DNHACUNGCAPID,DKHOHANGID FROM TNHAPKHO WHERE ID=? AND STATUS=1 WITH LOCK',[req.params.id]);
      if(!receipt)throw Object.assign(new Error('Không tìm thấy phiếu nhập.'),{statusCode:404});
      if(Number(receipt.DATHANHTOAN)===1 || Number(receipt.CONGNO??receipt.TONGCONG)!==Number(receipt.TONGCONG))throw Object.assign(new Error('Phiếu đã thanh toán; phải xử lý hoàn tiền trước khi hủy.'),{statusCode:409});
      if((await query('SELECT FIRST 1 ID FROM TTHUCHI WHERE DNHACUNGCAPID=? AND STATUS=1 AND COALESCE(KHONGDOICONGNO,0)=0',[receipt.DNHACUNGCAPID])).length)throw Object.assign(new Error('Nhà cung cấp đã có thanh toán công nợ; cần đối chiếu trước khi hủy phiếu.'),{statusCode:409});
      await require('../services/stock').requireAvailable(query,items.map(item=>({...item,DKHOHANGID:item.DKHOHANGID||receipt.DKHOHANGID})));
      await execute(
        `UPDATE TNHAPKHO
            SET STATUS=0, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
          WHERE ID=?`,
        [actor, req.params.id]
      );
      await execute(
        `UPDATE TNHAPKHOCHITIET
            SET STATUS=0, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
          WHERE TNHAPKHOID=?`,
        [actor, req.params.id]
      );
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(e.statusCode || e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
