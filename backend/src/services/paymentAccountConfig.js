const configName = 'PaymentBankAccountId';

async function accountOptions(query) {
  const rows = await query('SELECT ID,NAME,SOTAIKHOAN,TENNGANHANG FROM DTAIKHOANNGANHANG WHERE STATUS=1 ORDER BY NAME');
  return rows.map(row => ({ value: row.ID, label: [row.TENNGANHANG, row.SOTAIKHOAN, row.NAME].filter(Boolean).join(' — ') }));
}

async function validateAccount(query, value) {
  if (value == null || value === '') return;
  const rows = await query('SELECT ID FROM DTAIKHOANNGANHANG WHERE ID=? AND STATUS=1', [value]);
  if (!rows.length) throw Object.assign(new Error('Tài khoản nhận thanh toán không còn hoạt động hoặc không tồn tại.'), { status: 400 });
}

module.exports = { configName, accountOptions, validateAccount };
