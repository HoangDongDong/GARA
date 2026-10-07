const db = require('../db');

function group(rows, fallback) {
  const partners = new Map();
  for (const row of rows) {
    const amount = Number(row.AMOUNT || 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const key = row.PARTNER_ID || 'unknown';
    const partner = partners.get(key) || { id: key, customer: row.PARTNER_NAME || fallback, amount: 0, dueDate: null, documents: 0 };
    partner.amount += amount;
    partner.documents += 1;
    partners.set(key, partner);
  }
  return [...partners.values()].sort((a, b) => b.amount - a.amount || a.customer.localeCompare(b.customer, 'vi'));
}

async function load(query = db.query) {
  const data = await ledger(query);
  const receivable = data.receivable.filter(row => row.amount > 0);
  const payable = data.payable.filter(row => row.amount > 0);
  return { receivable, payable, receivableTotal: receivable.reduce((sum, row) => sum + row.amount, 0),
    payableTotal: payable.reduce((sum, row) => sum + row.amount, 0) };
}

function buildLedger(partners, documents, cash, kind) {
  const rows = new Map(partners.map(partner => [partner.ID, {
    id: partner.ID, customer: partner.NAME || '', code: partner.CODE || '', address: partner.DIACHI || '',
    phone: partner.DIENTHOAI || '', email: partner.EMAIL || '', groupId: partner.GROUP_ID || '',
    groupName: partner.GROUP_NAME || 'Chưa phân nhóm', amount: 0, history: [],
  }]));
  const partnerFor = id => {
    const key = id || 'unknown';
    if (!rows.has(key)) rows.set(key, {id:key,customer:'Đối tác chưa xác định',code:'',address:'',phone:'',email:'',groupId:'',groupName:'Chưa phân nhóm',amount:0,history:[]});
    return rows.get(key);
  };
  for (const doc of documents) {
    const total = Number(doc.TOTAL || 0);
    const storedRemaining = Number(doc.REMAINING ?? total);
    const remaining = Number(doc.PAID) === 1 ? Math.min(0,storedRemaining) : storedRemaining;
    partnerFor(doc.PARTNER_ID).history.push({id:doc.ID,code:doc.NAME || '',date:doc.NGAY,created:doc.TIMECREATED,
      description:doc.NOTE || doc.DESCRIPTION,total,payment:total-remaining,source:doc.SOURCE});
  }
  for (const entry of cash) {
    const payment = Number(entry.SOTIEN || 0) * (Number(entry.LOAI) === (kind === 'payable' ? 1 : 0) ? 1 : -1);
    partnerFor(entry.PARTNER_ID).history.push({id:entry.ID,code:entry.NAME || '',date:entry.NGAY,created:entry.TIMECREATED,
      description:entry.NOTE || (payment >= 0 ? 'Thanh toán' : 'Điều chỉnh công nợ'),total:0,payment,source:'cash'});
  }
  for (const row of rows.values()) {
    row.history.sort((a,b) => new Date(a.date || a.created || 0)-new Date(b.date || b.created || 0)
      || new Date(a.created || 0)-new Date(b.created || 0) || a.code.localeCompare(b.code));
    let balance = 0;
    for (const entry of row.history) { balance += entry.total-entry.payment; entry.balance = Math.round(balance*100)/100; }
    row.amount = Math.round(balance*100)/100;
  }
  return [...rows.values()].sort((a,b) => b.amount-a.amount || a.customer.localeCompare(b.customer,'vi'));
}

async function ledger(query = db.query) {
  const customers = await query(`SELECT KH.ID,KH.NAME,KH.MAKHACH AS CODE,KH.DIACHI,KH.DIENTHOAI,KH.EMAIL,
    KH.DNHOMKHACHHANGID AS GROUP_ID,G.NAME AS GROUP_NAME FROM DKHACHHANG KH
    LEFT JOIN DNHOMKHACHHANG G ON G.ID=KH.DNHOMKHACHHANGID WHERE KH.STATUS=1`);
  const suppliers = await query(`SELECT NCC.ID,NCC.NAME,NCC.MANHACUNGCAP AS CODE,NCC.DIACHI,NCC.DIENTHOAI,NCC.EMAIL,
    NCC.DNHOMNHACUNGCAPID AS GROUP_ID,G.NAME AS GROUP_NAME FROM DNHACUNGCAP NCC
    LEFT JOIN DNHOMNHACUNGCAP G ON G.ID=NCC.DNHOMNHACUNGCAPID WHERE NCC.STATUS=1`);
  const sales = await query(`SELECT ID,NAME,NGAY,TIMECREATED,NOTE,DKHACHHANGID AS PARTNER_ID,TONGCONG AS TOTAL,DATHANHTOAN AS PAID,
    COALESCE(CONLAI,CONGNO,TONGCONG-COALESCE(TIENTHANHTOAN,0)) AS REMAINING FROM TDONHANG WHERE STATUS=1`);
  const repairs = await query(`SELECT ID,NAME,NGAY,TIMECREATED,NOTE,DKHACHHANGID AS PARTNER_ID,TONGCONG AS TOTAL,DATHANHTOAN AS PAID,
    COALESCE(CONLAI,CONGNO,TONGCONG-COALESCE(TIENMAT,0)-COALESCE(CHUYENKHOAN,0)-COALESCE(THE,0)) AS REMAINING FROM THOADONSUACHUA WHERE STATUS=1`);
  const receipts = await query(`SELECT ID,NAME,NGAY,TIMECREATED,NOTE,DNHACUNGCAPID AS PARTNER_ID,TONGCONG AS TOTAL,DATHANHTOAN AS PAID,
    COALESCE(CONGNO,TONGCONG) AS REMAINING FROM TNHAPKHO WHERE STATUS=1`);
  const cash = await query(`SELECT ID,NAME,NGAY,TIMECREATED,NOTE,SOTIEN,LOAI,DKHACHHANGID,DNHACUNGCAPID FROM TTHUCHI WHERE STATUS=1 AND COALESCE(KHONGDOICONGNO,0)=0`);
  return {
    receivable:buildLedger(customers,[...sales.map(row=>({...row,DESCRIPTION:'Bán hàng',SOURCE:'sale'})),...repairs.map(row=>({...row,DESCRIPTION:'Sửa chữa',SOURCE:'repair'}))],cash.filter(row=>row.DKHACHHANGID).map(row=>({...row,PARTNER_ID:row.DKHACHHANGID})),'receivable'),
    payable:buildLedger(suppliers,receipts.map(row=>({...row,DESCRIPTION:'Nhập mua hàng',SOURCE:'receipt'})),cash.filter(row=>row.DNHACUNGCAPID).map(row=>({...row,PARTNER_ID:row.DNHACUNGCAPID})),'payable'),
  };
}

module.exports = { load, group, ledger, buildLedger };
