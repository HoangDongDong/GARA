// One-time repair: legacy receipt FRX files omitted their physical paper width.
const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const printing = require('./src/services/documentPrint');
async function migrate() {
  const info = await printing.info(printing.typeByKey('MauHoaDonBanHang'));
  const changes = [];
  for (const option of info.templates) {
    const width = option.label.match(/\b(54|58|77|80)\s*mm\b/i)?.[1];
    if (!width) continue;
    const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [option.value], 'TEMPLATE');
    const xml = content.toString('utf8');
    const page = xml.match(/<ReportPage\b[^>]*>/)?.[0];
    if (!page || /\bPaperWidth=/.test(page)) continue;
    changes.push({ id: option.value, name: option.label, before: xml, after: xml.replace(page, page.replace('<ReportPage', `<ReportPage PaperWidth="${width}" PaperHeight="297"`)) });
  }
  if (changes.length) {
    fs.writeFileSync(path.join(__dirname, `legacy-sales-paper-backup-${Date.now()}.json`), JSON.stringify(changes, null, 2));
    await db.transaction(async (query, execute) => {
      for (const change of changes) await execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(change.after), change.id]);
    });
  }
  console.log(`Repaired ${changes.length} legacy receipt paper definitions in database.`);
}
if (require.main === module) migrate().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { migrate };
