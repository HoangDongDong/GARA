const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./src/db');
const print = require('./src/services/documentPrint');
const { templateFilter } = require('./src/services/systemConfigOptions');
const variants = [
  { key: 'stt', name: '80mm - STT, Mặt hàng, SL, Giá, CK%, Thành tiền', widths: [22, 65, 30, 49, 30, 49.7], labels: ['STT', 'Mặt hàng', 'SL', 'Giá', 'CK %', 'Thành tiền'], fields: ['[Row#]', '[Table0.DMATHANG_NAME]', '[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]', '[Table0.DONGIA]', '[Table0.LineDiscountRate]%', '[Table0.LineNetAmount]'], sl: 2, nameIndex: 1 },
  { key: 'simple', name: '80mm - Mặt hàng, SL, Giá, CK%, Thành tiền', widths: [87, 21, 49, 30, 58.7], labels: ['Mặt hàng', 'SL', 'Giá', 'CK %', 'Thành tiền'], fields: ['[Table0.DMATHANG_NAME]', '[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]', '[Table0.DONGIA]', '[Table0.LineDiscountRate]%', '[Table0.LineNetAmount]'], sl: 1, nameIndex: 0 },
  { key: 'two-lines', name: '80mm - Mỗi mặt hàng 2 dòng', widths: [40, 72, 49, 84.7], labels: ['SL', 'Giá', 'CK %', 'Thành tiền'], fields: ['[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]', '[Table0.DONGIA]', '[Table0.LineDiscountRate]%', '[Table0.LineNetAmount]'], sl: 0, nameIndex: -1 },
];
function build(source, variant) {
  const make = (name, detail) => {
    const opening = source.match(new RegExp(`<TableObject Name="${name}"[^>]*>`))?.[0];
    if (!opening) throw new Error('Thiếu bảng ' + name);
    const texts = detail ? variant.fields : variant.labels.map(label => variant.key !== 'two-lines' && label === 'Thành tiền' ? 'T Tiền' : label);
    const columns = variant.widths.map((width, index) => `<TableColumn Name="${name}VariantColumn${index}" Width="${width}"/>`).join('');
    const title = detail && variant.key === 'two-lines'
      ? `<TableRow Name="VariantItemTitleRow" MinHeight="18.9" AutoSize="true"><TableCell Name="VariantItemTitle" Text="[Table0.DMATHANG_NAME]" ColSpan="4" Padding="1, 1, 1, 1" Font="Tahoma, 8pt, style=Bold"/>${[1,2,3].map(i => `<TableCell Name="VariantItemTitleEmpty${i}"/>`).join('')}</TableRow>` : '';
    const row = `<TableRow Name="${name}VariantRow" MinHeight="18.9" AutoSize="true">` + texts.map((text, index) => {
      const numeric = detail && index !== variant.nameIndex && !text.endsWith('%') && text !== '[Row#]';
      return `<TableCell Name="${name}VariantCell${index}" Text="${text}" Border.Lines="All" Border.Style="Dash" Padding="1, 1, 1, 1" ${detail ? '' : 'Fill.Color="255, 255, 192"'} HorzAlign="${index === variant.nameIndex ? 'Left' : 'Right'}" VertAlign="Center" Font="Tahoma, ${!detail && text === 'STT' ? 6 : 7}pt${detail ? '' : ', style=Bold'}" ${numeric ? 'WordWrap="false" Format="Number" Format.UseLocale="false" Format.DecimalDigits="0" Format.GroupSeparator=","' : ''}/>`;
    }).join('') + '</TableRow>';
    return opening.replace(/Height="[^"]*"/, `Height="${detail && title ? 37.8 : 18.9}"`) + columns + title + row + '</TableObject>';
  };
  let xml = source.replace(/<TableObject Name="colHeader"[\s\S]*?<\/TableObject>/, make('colHeader', false)).replace(/<TableObject Name="detail"[\s\S]*?<\/TableObject>/, make('detail', true));
  if (variant.key === 'two-lines') xml = xml.replace(/<DataBand\b[^>]*Name="Data1"[^>]*>/, tag => tag.replace(/Height="[^"]*"/, 'Height="37.8"'));
  const left = Number(source.match(/<TableObject Name="detail"[^>]*Left="([^"]+)"/)?.[1] || 0);
  const offset = variant.widths.slice(0, variant.sl).reduce((sum, width) => sum + width, 0);
  const quantity = `<TextObject Name="VariantTotalQuantityLabel" Left="${left + (variant.sl === 0 ? variant.widths[0] + 6 : 0)}" Width="${variant.sl === 0 ? 160 : offset}" Height="18.9" Text="Tổng SL:" Padding="1, 1, 1, 1" Font="Tahoma, 8pt" VisibleExpression="[PrintShow_quantity]"/><TextObject Name="VariantTotalQuantity" Left="${left + offset}" Width="${variant.widths[variant.sl]}" Height="18.9" Text="[Total SLX]" Padding="1, 1, 1, 1" HorzAlign="Right" Font="Tahoma, 7pt" VisibleExpression="[PrintShow_quantity]"/>`;
  return xml.replace(/<TableObject Name="AlignedTotalQuantity"[\s\S]*?<\/TableObject>/, quantity);
}
async function migrate() {
  const [base] = await db.query('SELECT ID FROM STEMPLATE WHERE NAME=? AND STATUS IN (0,30)', ['80mm2']);
  if (!base) throw new Error('Không tìm thấy mẫu 80mm2.');
  const source = (await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [base.ID], 'TEMPLATE')).toString('utf8');
  const generated = variants.map(variant => {
    const hash = crypto.createHash('sha256').update('garage-sales-receipt-variant:' + variant.key).digest('hex');
    return { ...variant, id: `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`, xml: build(source, variant) };
  });
  await db.transaction(async (query, execute) => {
    const [config] = await query('SELECT ID,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30 WITH LOCK', ['MauHoaDonBanHang']);
    const ids = templateFilter(config.OTHERCONFIG)?.ids || [];
    for (const item of generated) {
      const [existing] = await query('SELECT ID FROM STEMPLATE WHERE ID=?', [item.id]);
      if (existing) await execute('UPDATE STEMPLATE SET NAME=?, TEMPLATE=?, STATUS=30, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [item.name, Buffer.from(item.xml), item.id]);
      else await execute("INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,'SYSTEM',CURRENT_TIMESTAMP,?,0)", [item.id,item.name,Buffer.from(item.xml)]);
      if (!ids.includes(item.id)) ids.push(item.id);
    }
    await execute('UPDATE SCONFIG SET OTHERCONFIG=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [JSON.stringify(ids),config.ID]);
  });
  for (const item of generated) fs.writeFileSync(path.join(__dirname,'templates','receipt80',`sales-${item.key}.frx`),item.xml);
  fs.writeFileSync(path.join(__dirname,'tmp','sales-receipt-variants.json'),JSON.stringify(generated.map(({id,key,name})=>({id,key,name})),null,2));
  console.log(JSON.stringify(generated.map(({id,name})=>({id,name}))));
}
if (require.main === module) migrate().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={build,variants,migrate};
