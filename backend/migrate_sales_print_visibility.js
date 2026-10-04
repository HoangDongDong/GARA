const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const printing = require('./src/services/documentPrint');
const visibility = require('./src/services/salesPrintVisibility');
const fields = {
  subtotal: ['TIENHANG', 'SubtotalText'], quantity: ['Total SLX'], discount: ['TIENGIAMGIA', 'DiscountText'],
  tax: ['TIENTHUE'], shipping: ['PHIVANCHUYEN'], returns: ['DOITRA'], oldDebt: ['NOCU'],
  deposit: ['Đặt trước'], voucher: ['VOUCHER'], prepaid: ['THETRATRUOC'], pointsDeduction: ['TRUTICHLUY'],
  transfer: ['CHUYENKHOAN'], card: ['THE'], cashGiven: ['KHACHDUA'], change: ['TRALAI'], newDebt: ['Nợ mới'],
  points: ['DIEM'], loyalty: ['Điểm tích lũy'], thanks: ['LoiCamOn'], additionalCharges: ['AdditionalChargesText'],
};
function keyFor(content) {
  // Match the printed value, not unrelated fields in old visibility expressions.
  content = [...content.matchAll(/\bText="([^"]*)"/g)].map(match => match[1]).join(' ');
  if (/ToVndWords\(|\[VndWords_/.test(content)) return 'moneyWords';
  if (content.includes('[TONGCONG]') || content.includes('[TotalNumberText]') || content.includes('[SummaryText]')) return null;
  return Object.entries(fields).find(([, names]) => names.some(name => content.includes(`[${name}]`)))?.[0] || null;
}
function tag(xml, key) {
  const visibility = `VisibleExpression="[PrintShow_${key}]"`;
  return xml.replace(/^<([\w]+)\b[^>]*>/, opening => {
    opening = opening.replace(/\sVisibleExpression="[^"]*"/, '');
    return opening.replace(/\s*\/?>$/, ending => ` ${visibility}${ending}`);
  });
}
function annotate(xml) {
  xml = xml.replace(/<TableRow\b[^>]*>[\s\S]*?<\/TableRow>/g, row => {
    const key = keyFor(row); return key ? tag(row, key) : row;
  });
  // Absolute-positioned summary labels and values share a vertical row.
  xml = xml.replace(/<ReportSummaryBand\b[^>]*>[\s\S]*?<\/ReportSummaryBand>/g, band => {
    const objects = [...band.matchAll(/<TextObject\b[^>]*\/>/g)];
    const keys = new Map();
    for (const [object] of objects) {
      const key = keyFor(object), top = object.match(/\bTop="([^"]+)"/)?.[1] || '0';
      if (key) keys.set(top, key);
    }
    return band.replace(/<TextObject\b[^>]*\/>/g, object => {
      const key = keys.get(object.match(/\bTop="([^"]+)"/)?.[1] || '0');
      return key ? tag(object, key) : object;
    });
  });
  const names = [...visibility.definitions.map(item => item.key), 'additionalCharges'];
  const parameters = names.filter(key => !xml.includes(`Name="PrintShow_${key}"`)).map(key => `<Parameter Name="PrintShow_${key}" DataType="System.Boolean"/>`).join('');
  return xml.replace('</Dictionary>', `${parameters}</Dictionary>`);
}
async function migrate() {
  await db.transaction(async (query, execute) => {
    let [group] = await query('SELECT ID FROM SCONFIGGROUP WHERE NAME=?', [visibility.groupName]);
    if (!group) {
      group = { ID: db.uuidv4() };
      await execute("INSERT INTO SCONFIGGROUP (ID,NAME,STATUS,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,?,30,'ZZZ003A','SYSTEM',CURRENT_TIMESTAMP)", [group.ID, visibility.groupName]);
    }
    for (const [index, item] of visibility.definitions.entries()) {
      if (!(await query('SELECT ID FROM SCONFIG WHERE NAME=?', [item.name])).length) await execute("INSERT INTO SCONFIG (ID,NAME,CAPTION,INTVALUE,DATATYPE,CONTROLTYPE,STATUS,SCONFIGGROUPID,SORTORDER,SOCOT,USERCREATEDID,TIMECREATED) VALUES (?,?,?,30,3,7,30,?,?,2,'SYSTEM',CURRENT_TIMESTAMP)", [db.uuidv4(), item.name, `Hiện ${item.label.toLocaleLowerCase('vi')}`, group.ID, String(index + 1).padStart(3, '0')]);
    }
  });
  const info = await printing.info(printing.typeByKey('MauHoaDonBanHang'));
  const changes = [];
  for (const option of info.templates) {
    const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [option.value], 'TEMPLATE');
    const before = content.toString('utf8'), after = annotate(before);
    if (before !== after) changes.push({ id: option.value, name: option.label, before, after });
  }
  if (changes.length) {
    fs.writeFileSync(path.join(__dirname, `sales-print-visibility-backup-${Date.now()}.json`), JSON.stringify(changes, null, 2));
    await db.transaction(async (query, execute) => {
      for (const change of changes) await execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(change.after), change.id]);
    });
  }
  console.log(`Added ${visibility.definitions.length} display options; connected ${changes.length} existing sales templates.`);
}
if (require.main === module) migrate().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { migrate, annotate };
