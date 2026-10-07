const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const print = require('./src/services/documentPrint');
async function migrate() {
  const selected = await print.resolve(print.typeByKey('MauHoaDonBanHang'));
  let xml = selected.content.toString('utf8');
  if (!xml.includes('Name="SalesReceiptMoneyWordsRow"')) {
    const row = '<TableRow Name="SalesReceiptMoneyWordsRow" MinHeight="18.9" AutoSize="true" VisibleExpression="[PrintShow_moneyWords]"><TableCell Name="SalesReceiptMoneyWordsCell" Text="Bằng chữ: [ToVndWords([TONGCONG])] đồng." Font="Tahoma, 8pt, style=Italic" ColSpan="3" VertAlign="Center"/><TableCell Name="SalesReceiptMoneyWordsEmpty1"/><TableCell Name="SalesReceiptMoneyWordsEmpty2"/></TableRow>';
    if (!xml.includes('<TableRow Name="Row29"')) throw new Error('Không tìm thấy dòng cảm ơn trong mẫu bill.');
    xml = xml.replace('<TableRow Name="Row29"', row + '<TableRow Name="Row29"');
  }
  const root = path.join(__dirname, 'tmp', 'sales-discount-template');
  fs.mkdirSync(root, { recursive: true });
  const backup = path.join(root, `before-money-words-${selected.ID}-${Date.now()}.frx`);
  fs.writeFileSync(backup, selected.content);
  await db.transaction(async (query, execute) => {
    const [current] = await query('SELECT TEXTVALUE FROM SCONFIG WHERE NAME=? AND STATUS=30 WITH LOCK', ['MauHoaDonBanHang']);
    if (current?.TEXTVALUE !== selected.ID) throw new Error('Mẫu mặc định đã thay đổi.');
    await execute('UPDATE STEMPLATE SET TEMPLATE=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(xml), selected.ID]);
    await execute('UPDATE SCONFIG SET INTVALUE=30, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE NAME=? AND STATUS=30', ['SalesPrintShow_moneyWords']);
  });
  fs.writeFileSync(path.join(__dirname, 'templates', 'receipt80', 'MauHoaDonBanHang.frx'), xml);
  console.log(JSON.stringify({ templateId: selected.ID, backup }));
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
