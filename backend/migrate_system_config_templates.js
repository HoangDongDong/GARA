/** Convert the imported catalogue to GARA document types with direct STEMPLATE IDs. */
const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const { documentTypes } = require('./src/services/garagePrintCatalog');
const { templateFilter } = require('./src/services/systemConfigOptions');

async function migrate() {
  const before = await db.query('SELECT ID,NAME,CAPTION,CONTROLTYPE,DATATYPE,SCONFIGGROUPID,OTHERCONFIG,TEXTVALUE,MOREDETAIL FROM SCONFIG');
  const backupPath = path.join(__dirname, `system-config-templates-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(before, null, 2));
  const messages = [];
  await db.transaction(async (query, execute, uuid) => {
    const [group] = await query("SELECT ID FROM SCONFIGGROUP WHERE NAME='In ấn & Mẫu' AND STATUS=30");
    if (!group) throw new Error('Không tìm thấy nhóm In ấn & Mẫu.');
    const templates = await query(`SELECT t.ID,t.NAME,t.STATUS,t.REPORTBASE,f.NAME AS FORM_NAME,f.LASTTEMPLATEID,
      td.NAME AS DATASET_NAME FROM STEMPLATE t LEFT JOIN SFORM f ON f.ID=t.SFORMID
      LEFT JOIN STABLEDESC td ON td.ID=t.STABLEDESCID WHERE t.STATUS IN (0,30) ORDER BY t.SORTORDER,t.AUTOID,t.NAME`);
    for (const [index, type] of documentTypes.entries()) {
      const row = before.find(item => item.NAME === type.key);
      let direct = null;
      if (row?.OTHERCONFIG && !/^(SFORMID|STABLEDESCID)\b/i.test(row.OTHERCONFIG.trim())) direct = templateFilter(row.OTHERCONFIG);
      const catalog = templates.filter(template => type.forms.includes(template.FORM_NAME) || (type.dataset && template.DATASET_NAME === type.dataset));
      const ids = direct?.ids ?? catalog.map(template => template.ID);
      const defaultId = row?.TEXTVALUE || catalog.find(template => template.LASTTEMPLATEID === template.ID)?.ID || ids[0] || '';
      const detail = ids.length ? `Mẫu dùng cho ${type.label.toLowerCase()}. Chọn mẫu và nhấn Ghi dữ liệu để lưu.` : `Chưa có mẫu ${type.label.toLowerCase()}. Có thể gắn mẫu trong Quản lý mẫu in và điều chỉnh nội dung cho nghiệp vụ này.`;
      if (row) {
        await execute(`UPDATE SCONFIG SET CAPTION=?,CONTROLTYPE='8',DATATYPE=1,OTHERCONFIG=?,TEXTVALUE=?,MOREDETAIL=?,SORTORDER=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
          [`Mẫu ${type.label.toLowerCase()}`,JSON.stringify(ids),defaultId,detail,index+1,row.ID]);
      } else {
        await execute(`INSERT INTO SCONFIG (ID,NAME,CAPTION,STATUS,CONTROLTYPE,DATATYPE,SCONFIGGROUPID,OTHERCONFIG,TEXTVALUE,MOREDETAIL,SORTORDER,USERCREATEDID,TIMECREATED)
          VALUES (?,?,?,30,'8',1,?,?,?,?,?,'SYSTEM',CURRENT_TIMESTAMP)`,
          [uuid(),type.key,`Mẫu ${type.label.toLowerCase()}`,group.ID,JSON.stringify(ids),defaultId,detail,index+1]);
      }
      messages.push(`${type.label}: ${ids.length} ID STEMPLATE trực tiếp.`);
    }
    // Existing alias, when present, keeps the same list as the current invoice setting.
    const alias = before.find(row => row.NAME === 'MauHoaDon');
    if (alias && /^(SFORMID|STABLEDESCID)\b/i.test(String(alias.OTHERCONFIG).trim())) {
      const invoice = await query("SELECT OTHERCONFIG FROM SCONFIG WHERE NAME='MauHoaDonBanHang'");
      await execute('UPDATE SCONFIG SET OTHERCONFIG=? WHERE ID=?',[invoice[0].OTHERCONFIG,alias.ID]);
    }
    await execute(`UPDATE SCONFIG SET SORTORDER=101,OTHERCONFIG=? WHERE NAME='KhoGiayBillPOS' AND (OTHERCONFIG IS NULL OR TRIM(OTHERCONFIG)='')`, ['80mm\r\n54mm\r\n58mm\r\nA4\r\nA5']);
    await execute("UPDATE SCONFIG SET SORTORDER=102 WHERE NAME='SoLanIn'");
    await execute("UPDATE SCONFIG SET SORTORDER=103 WHERE NAME='InTuDongSauThanhToan'");
  });
  console.log(`Sao lưu trước khi chuyển đổi: ${backupPath}`);
  messages.forEach(message => console.log(message));
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode=1; });
module.exports = migrate;
