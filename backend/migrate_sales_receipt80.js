const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const { templateFilter } = require('./src/services/systemConfigOptions');
const receipt = { ID:'9b447cb8-062e-4c1d-907a-359a79f779bf', NAME:'Mẫu bill 80mm - gọn theo ảnh' };
async function migrate() {
  const [config] = await db.query("SELECT ID,NAME,TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME='MauHoaDonBanHang' AND STATUS=30");
  if (!config) throw Error('Không tìm thấy cấu hình mẫu bán hàng.');
  const file = path.join(__dirname, 'templates', 'gara', 'MauHoaDonBanHang-80mm-gon.frx');
  const xml = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(path.join(__dirname, `sales-receipt80-config-backup-${Date.now()}.json`), JSON.stringify(config, null, 2));
  await db.transaction(async (query, execute) => {
    const [current] = await query('SELECT OTHERCONFIG FROM SCONFIG WHERE ID=? WITH LOCK', [config.ID]);
    const [existing] = await query('SELECT ID FROM STEMPLATE WHERE ID=?', [receipt.ID]);
    if (!existing) await execute("INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,'SYSTEM',CURRENT_TIMESTAMP,?,0)", [receipt.ID, receipt.NAME, Buffer.from(xml)]);
    else if (process.argv.includes('--refresh-generated')) await execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(xml), receipt.ID]);
    const ids = templateFilter(current.OTHERCONFIG)?.ids || [];
    if (!ids.includes(receipt.ID)) {
      ids.push(receipt.ID);
      await execute('UPDATE SCONFIG SET OTHERCONFIG=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [JSON.stringify(ids), config.ID]);
    }
  });
  console.log(`Đã gắn ${receipt.NAME} vào hóa đơn bán phụ tùng. Giữ mẫu mặc định hiện tại.`);
  console.log(file);
}
if (require.main === module) migrate().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { migrate };
