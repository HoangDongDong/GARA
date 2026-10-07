const fs = require('fs');
const path = require('path');
const db = require('./src/db');
async function migrate() {
  const rows = await db.query('SELECT ID,NAME FROM STEMPLATE WHERE NAME=? AND STATUS IN (0,30)', ['80mm2']);
  if (rows.length !== 1) throw new Error('Không xác định được mẫu 80mm2 duy nhất.');
  const id = rows[0].ID;
  const source = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [id], 'TEMPLATE');
  let xml = source.toString('utf8');
  if (!xml.includes('Name="AlignedTotalQuantity"')) {
    const detail = xml.match(/<TableObject Name="detail"[\s\S]*?<\/TableObject>/)?.[0];
    const widths = [...(detail || '').matchAll(/<TableColumn\b[^>]*Width="([^"]+)"/g)].map(match => Number(match[1]));
    const left = detail?.match(/\bLeft="([^"]+)"/)?.[1] || '0';
    if (widths.length < 2 || !xml.includes('Name="Row23"')) throw new Error('Không tìm thấy cột SL hoặc dòng tổng SL.');
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const quantity = `<TableObject Name="AlignedTotalQuantity" Left="${left}" Width="${totalWidth}" Height="18.9"><TableColumn Name="AlignedQuantityLabelColumn" Width="${widths[0]}"/><TableColumn Name="AlignedQuantityValueColumn" Width="${widths[1]}"/><TableColumn Name="AlignedQuantityEmptyColumn" Width="${totalWidth - widths[0] - widths[1]}"/><TableRow Name="AlignedQuantityRow" Height="18.9" VisibleExpression="[PrintShow_quantity]"><TableCell Name="AlignedQuantityLabel" Text="Tổng SL:" Padding="1, 1, 1, 1" Font="Tahoma, 8pt"/><TableCell Name="AlignedQuantityValue" Text="[Total SLX]" Padding="1, 1, 1, 1" HorzAlign="Right" Font="Tahoma, 7pt"/><TableCell Name="AlignedQuantityEmpty"/></TableRow></TableObject>`;
    xml = xml.replace(/<TableRow\b[^>]*Name="Row23"[\s\S]*?<\/TableRow>/, '');
    xml = xml.replace(/<TableObject Name="Table5"[^>]*>/, tag => quantity + tag.replace(/\sTop="[^"]*"/, '').replace('Name="Table5"', 'Name="Table5" Top="18.9"'));
  }
  const root = path.join(__dirname, 'tmp', 'sales-discount-template');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, `80mm2-before-quantity-${Date.now()}.frx`), source);
  await db.execute('UPDATE STEMPLATE SET TEMPLATE=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [Buffer.from(xml), id]);
  fs.writeFileSync(path.join(__dirname, 'templates', 'receipt80', '80mm2.frx'), xml);
  console.log('Đã căn Tổng SL dưới cột SL trong mẫu 80mm2:', id);
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
