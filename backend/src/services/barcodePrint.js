function validEan8(code) {
 if(!/^\d{7,8}$/.test(code))return false;
 if(code.length===7)return true;
 const sum=[...code.slice(0,7)].reduce((total,digit,index)=>total+Number(digit)*(index%2===0?3:1),0);
 return (10-sum%10)%10===Number(code[7]);
}
function adaptBarcodeTemplate(xml,data) {
 const item=data.tables.Table0[0];
 const code=String(item?.BARCODE||item?.CODE||'').trim();
 if(/\bBarcode="EAN8"/.test(xml)&&code&&!validEan8(code)){
  return {xml:xml.replace(/<BarcodeObject\b[^>]*>/g,tag=>tag.includes('Barcode="EAN8"')?tag.replace('Barcode="EAN8"','Barcode="Code128" Barcode.AutoEncode="true"'):tag),
   notice:'Mã phụ tùng không phù hợp EAN8; bản in dùng CODE128 và giữ bố cục tem đã chọn.'};
 }
 return {xml,notice:''};
}
// Legacy label sheets store several copies across one Table0 row (NAME0..4).
function prepareBarcodePayload(xml, data) {
 const item=data.tables.Table0[0];
 if(!item)return data;
 const code=String(item.BARCODE||item.CODE||'').trim();
 if(!code)throw Object.assign(new Error('Phụ tùng chưa có mã vạch hoặc mã phụ tùng để in tem.'),{status:409});
 const row={...item,CODE:code,BARCODE:code};
 // Only map fields backed by the saved item; unrelated bindings still fail.
 const dictionary=xml.match(/<TableDataSource\b[^>]*Name="Table0"[^>]*>([\s\S]*?)<\/TableDataSource>/)?.[1]||'';
 for(const match of dictionary.matchAll(/<Column\b[^>]*Name="([^"]+)"/g)){
  const field=match[1],indexed=field.match(/^(.*)([0-4])$/);
  if(indexed&&Object.hasOwn(row,indexed[1]))row[field]=row[indexed[1]];
 }
 data.tables.Table0=[row];
 return data;
}
module.exports={prepareBarcodePayload,adaptBarcodeTemplate,validEan8};
