const router = require('express').Router();
const db = require('../db');
const tenancy = require('../tenancy');
const screens = new Map();
function current() { const key = tenancy.key(); const screen = screens.get(key); if (screen && screen.expires <= Date.now()) { screens.delete(key); return null; } return screen; }
router.get('/', (req, res) => { res.set('Cache-Control','no-store'); res.json({ data: current()?.order || null }); });
router.put('/', async (req, res) => {
  try {
    const { session, state, order } = req.body;
    if (!/^[a-z0-9-]{36}$/i.test(String(session || '')) || !['pending','saved','clear'].includes(state)) return res.status(400).json({ error: 'Dữ liệu màn hình không hợp lệ.' });
    const owner = req.accessUser.ID + ':' + session;
    let screen = current();
    const save = value => { if (value) screens.set(tenancy.key(), value); else screens.delete(tenancy.key()); };
    if (state === 'clear') { if (current()?.owner === owner) save(null); return res.json({ ok: true }); }
    if (state === 'saved') {
      const [sale] = await db.query('SELECT ID,NAME,TONGCONG,CONLAI,DATHANHTOAN FROM TDONHANG WHERE ID=? AND STATUS=1', [req.body.saleId]);
      if (!sale) return res.status(404).json({ error: 'Không tìm thấy phiếu đã lưu.' });
      if (current()?.owner === owner) screen = { owner, expires: Date.now()+60000, order: { ...screen.order, NAME: sale.NAME, TONGCONG: Number(sale.TONGCONG), invoice: { ...screen.order, TONGCONG: Number(sale.TONGCONG), CONLAI: Number(sale.CONLAI || 0), DATHANHTOAN: Number(sale.DATHANHTOAN) }, displaySaved: true } };
      if (current()?.owner === owner) save(screen);
      return res.json({ ok:true });
    }
    if (!order || !Array.isArray(order.details) || !order.details.length || order.details.length > 300) return res.status(400).json({ error:'Danh sách mặt hàng không hợp lệ.' });
    const number = value => { const n = Number(value || 0); if (!Number.isFinite(n) || n < 0 || n > 1e12) throw Error('Số tiền không hợp lệ.'); return n; };
    const text = value => String(value || '').slice(0,200);
    const clean = { NAME:text(order.NAME), displaySale:true, TONGCONG:number(order.TONGCONG), TIENGIAMGIA:number(order.TIENGIAMGIA), PHIDICHVU:number(order.PHIDICHVU), TIENTHUE:number(order.TIENTHUE), details:order.details.map((row,index)=>({ ID:String(index), TEN_PT:text(row.TEN_PT), SOLUONG:number(row.SOLUONG), DONGIA:number(row.DONGIA), THANHTIEN:number(row.THANHTIEN) })) };
    screen = { owner, order:clean, expires:Date.now()+45000 };
    for (const [key, value] of screens) if (value.expires <= Date.now()) screens.delete(key);
    save(screen);
    res.json({ ok:true });
  } catch (error) { res.status(400).json({ error:error.message }); }
});
module.exports = router;
