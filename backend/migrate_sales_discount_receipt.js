const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const print = require('./src/services/documentPrint');
const { template } = require('./src/services/salesLineDiscountPrint');
async function migrate() {
  const selected = await print.resolve(print.typeByKey('MauHoaDonBanHang'));
  const source = selected.content.toString('utf8');
  const updated = template(source);
  if (!updated.includes('[Table0.LineDiscountRate]%') || !updated.includes('[Table0.LineNetAmount]')) throw new Error('Mẫu bill không có bảng chi tiết được hỗ trợ.');
  const root = path.join(__dirname, 'tmp', 'sales-discount-template');
  fs.mkdirSync(root, { recursive: true });
  const backup = path.join(root, `${selected.ID}-${Date.now()}.frx`);
  fs.writeFileSync(backup, selected.content);
  await db.transaction(async (query, execute) => {
    const [current] = await query('SELECT TEXTVALUE FROM SCONFIG WHERE NAME=? AND STATUS=30 WITH LOCK', ['MauHoaDonBanHang']);
    if (current?.TEXTVALUE !== selected.ID) throw new Error('Mẫu mặc định đã thay đổi, vui lòng chạy lại.');
    await execute('UPDATE STEMPLATE SET TEMPLATE=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(updated, 'utf8'), selected.ID]);
  });
  const target = path.join(__dirname, 'templates', 'receipt80', 'MauHoaDonBanHang.frx');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, updated);
  console.log(JSON.stringify({ templateId: selected.ID, name: selected.NAME, backup, source: target }));
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
