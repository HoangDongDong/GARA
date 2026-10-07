const db = require('../db');
const debts = require('./debts');
const numbers = require('./documentNumbers');
const fail = message => Object.assign(new Error(message), {statusCode:400});

async function create(input, actor, transaction = db.transaction) {
  const {kind, partnerId, date, note = '', categoryId = null, accountId = null} = input;
  const amount = Number(input.amount);
  if (!['receivable','payable'].includes(kind) || !partnerId) throw fail('Vui lòng chọn đối tác thanh toán.');
  if (!Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER
    || Math.abs(amount*100-Math.round(amount*100)) > 1e-6) throw fail('Số tiền phải lớn hơn 0, tối đa 2 chữ số thập phân.');
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw fail('Ngày thanh toán không hợp lệ.');
  if (typeof note !== 'string' || note.length > 255) throw fail('Diễn giải tối đa 255 ký tự.');
  return transaction(async (query, execute, uuid) => {
    const table = kind === 'payable' ? 'DNHACUNGCAP' : 'DKHACHHANG';
    // Serialize settlement requests for the same partner before checking its balance.
    await execute(`UPDATE ${table} SET STATUS=STATUS WHERE ID=? AND STATUS=1`, [partnerId]);
    const [partner] = await query(`SELECT ID FROM ${table} WHERE ID=? AND STATUS=1`, [partnerId]);
    if (!partner) throw fail('Đối tác không còn hoạt động.');
    if (categoryId) {
      const [category]=await query('SELECT ID FROM DLYDOTHUCHI WHERE ID=? AND STATUS=1 AND LOAI=?',[categoryId,kind==='payable'?1:0]);
      if (!category) throw fail('Phân loại thu/chi không hợp lệ.');
    }
    if (accountId) {
      await execute('UPDATE DTAIKHOANNGANHANG SET STATUS=STATUS WHERE ID=? AND STATUS=1',[accountId]);
      const [account]=await query('SELECT ID FROM DTAIKHOANNGANHANG WHERE ID=? AND STATUS=1',[accountId]);
      if (!account) throw fail('Tài khoản ngân hàng không còn hoạt động.');
    }
    const ledger = await debts.ledger(query);
    const balance = ledger[kind].find(row => row.id === partnerId)?.amount || 0;
    if (amount > balance) throw fail('Số tiền thanh toán vượt quá công nợ hiện tại. Vui lòng tải lại công nợ.');
    const code = await numbers.nextInTransaction(kind === 'payable' ? 'Chi' : 'Thu', query, execute, new Date(date));
    const id = uuid();
    await execute(`INSERT INTO TTHUCHI
      (ID,NAME,NOTE,STATUS,USERCREATEDID,TIMECREATED,NGAY,DKHACHHANGID,DNHACUNGCAPID,SOTIEN,LOAI,DLYDOTHUCHID,DTAIKHOANNGANHANGID)
      VALUES (?,?,?,1,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?)`,
      [id,code,note.trim() || 'Thanh toán công nợ',actor,new Date(date),
        kind === 'receivable' ? partnerId : null,kind === 'payable' ? partnerId : null,amount,kind === 'payable' ? 1 : 0,categoryId,accountId]);
    return {id,code,amount};
  });
}
module.exports = {create};
