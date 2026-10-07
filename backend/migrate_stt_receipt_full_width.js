const fs = require('fs');
const db = require('./src/db');
const print = require('./src/services/documentPrint');
async function migrate() {
  const name = '80mm - STT, Mặt hàng, SL, Giá, CK%, Thành tiền';
  const [row] = await db.query('SELECT ID FROM STEMPLATE WHERE NAME=? AND STATUS IN (0,30)', [name]);
  if (!row) throw new Error('Không tìm thấy mẫu bill có STT.');
  const source = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [row.ID], 'TEMPLATE');
  fs.writeFileSync(`tmp/sales-discount-template/stt-before-full-width-${Date.now()}.frx`, source);
  let xml = source.toString('utf8');
  const targetWidth = 302.4; // 80mm at FastReport's 96dpi coordinate scale.
  const originalWidth = Number(xml.match(/<TableObject Name="detail"[^>]*Width="([^"]+)"/)?.[1]);
  const factor = targetWidth / originalWidth;
  xml = xml.replace(/<ReportPage\b[^>]*>/, tag => tag.replace(/LeftMargin="[^"]*"/, 'LeftMargin="0"').replace(/RightMargin="[^"]*"/, 'RightMargin="0"'));
  xml = xml.replace(/<(?:ReportTitleBand|DataBand|ReportSummaryBand)\b[^>]*>/g, tag => tag.replace(/Width="[^"]*"/, `Width="${targetWidth}"`));
  xml = xml.replace(/<TableObject\b[^>]*>[\s\S]*?<\/TableObject>/g, table => {
    const width = Number(table.match(/\bWidth="([^"]+)"/)?.[1]);
    const name = table.match(/\bName="([^"]+)"/)?.[1];
    const columns = [...table.matchAll(/<TableColumn\b[^>]*\/>/g)].map(match => match[0]);
    table = table.replace(/\bLeft="[^"]*"/, 'Left="0"').replace(/\bWidth="[^"]*"/, `Width="${targetWidth}"`);
    const index = ['detail', 'colHeader'].includes(name) ? 1 : columns.length - 1;
    if (columns[index]) table = table.replace(columns[index], columns[index].replace(/Width="([^"]+)"/, (_, value) => `Width="${Math.round((Number(value) + targetWidth - width) * 100) / 100}"`));
    return table;
  });
  xml = xml.replace(/<(?:TextObject|PictureObject)\b[^>]*>/g, tag => {
    const left = Number(tag.match(/\bLeft="([^"]+)"/)?.[1] || 0);
    const width = Number(tag.match(/\bWidth="([^"]+)"/)?.[1] || 0);
    return tag.replace(/\bLeft="[^"]*"/, `Left="${Math.max(0, Math.round((left + 4) * factor * 100) / 100)}"`)
      .replace(/\bWidth="[^"]*"/, `Width="${Math.round(width * factor * 100) / 100}"`);
  });
  await db.execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(xml), row.ID]);
  fs.writeFileSync('templates/receipt80/sales-stt.frx', xml);
  const [order] = await db.query('SELECT ID FROM TDONHANG WHERE NAME=?', ['BH2610/00033']);
  const result = await print.render(print.typeByKey('MauHoaDonBanHang'), order.ID, {templateId:row.ID}, 'admin');
  fs.writeFileSync('tmp/stt-full-width.pdf', result.pdf);
  console.log('Đã lưu mẫu full khổ 80mm và kiểm tra PDF.');
}
if (require.main === module) migrate().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={migrate};
