const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./src/db');
const { templateFilter } = require('./src/services/systemConfigOptions');
const idFor = sourceId => {
  const h = crypto.createHash('sha256').update(`garage-repair-provisional-print:${sourceId}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
};
function adapt(xml) {
  return xml.replace(/LỆNH SỬA CHỮA|PHIẾU SỬA CHỮA|Lệnh sửa chữa|Phiếu sửa chữa/g, 'PHIẾU TẠM TÍNH');
}
async function migrate() {
  const [source] = await db.query("SELECT ID,TEXTVALUE,OTHERCONFIG,SCONFIGGROUPID FROM SCONFIG WHERE NAME='MauPhieuSuaChua' AND STATUS=30");
  const ids = templateFilter(source?.OTHERCONFIG)?.ids || [];
  if (!ids.length || !source.TEXTVALUE) throw Error('Chưa cấu hình mẫu lệnh sửa chữa để tạo phiếu tạm tính.');
  const templates = [];
  for (const sourceId of ids) {
    const [row] = await db.query('SELECT ID,NAME FROM STEMPLATE WHERE ID=? AND STATUS IN (0,30)', [sourceId]);
    if (!row) continue;
    const blob = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [sourceId], 'TEMPLATE');
    if (!blob) continue;
    templates.push({ id: idFor(sourceId), name: row.NAME.replace(/Lệnh sửa chữa|lệnh sửa chữa/g, 'Phiếu tạm tính'), xml: adapt(blob.toString('utf8')) });
  }
  if (!templates.some(row => row.id === idFor(source.TEXTVALUE))) throw Error('Không đọc được mẫu mặc định.');
  await db.transaction(async (query, execute, uuid) => {
    for (const item of templates) {
      const existing = await query('SELECT ID FROM STEMPLATE WHERE ID=?', [item.id]);
      if (!existing.length) await execute("INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,'SYSTEM',CURRENT_TIMESTAMP,?,0)", [item.id, item.name, Buffer.from(item.xml)]);
    }
    const [config] = await query("SELECT ID,TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME='MauPhieuTamTinh' AND STATUS=30");
    const assigned = [...new Set([...(templateFilter(config?.OTHERCONFIG)?.ids || []), ...templates.map(row => row.id)])];
    if (config) await execute('UPDATE SCONFIG SET OTHERCONFIG=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [JSON.stringify(assigned), config.ID]);
    else await execute("INSERT INTO SCONFIG (ID,NAME,CAPTION,STATUS,CONTROLTYPE,DATATYPE,SCONFIGGROUPID,OTHERCONFIG,TEXTVALUE,MOREDETAIL,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,'MauPhieuTamTinh','Mẫu phiếu tạm tính',30,'8',1,?,?,?,'Phiếu tạm tính sửa chữa trước thanh toán.',19,'SYSTEM',CURRENT_TIMESTAMP)", [uuid(), source.SCONFIGGROUPID, JSON.stringify(assigned), idFor(source.TEXTVALUE)]);
  });
  const root = path.join(__dirname, 'templates', 'provisional');
  fs.mkdirSync(root, { recursive: true });
  for (const item of templates) fs.writeFileSync(path.join(root, `${item.id}.frx`), item.xml);
  console.log(`Phiếu tạm tính: ${templates.length} mẫu in đã sẵn sàng.`);
}
if (require.main === module) migrate().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = { migrate, adapt, idFor };
