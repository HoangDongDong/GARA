const test=require('node:test');const assert=require('node:assert/strict');
const {prepareBarcodePayload,adaptBarcodeTemplate,validEan8}=require('../src/services/barcodePrint');
const print=require('../src/services/documentPrint');
function sheet(count,barcode='Code128'){
 return `<TableDataSource Name="Table0">${Array.from({length:count},(_,i)=>`<Column Name="NAME${i}"/><Column Name="GIABAN${i}"/><Column Name="CODE${i}"/>`).join('')}</TableDataSource>${Array.from({length:count},(_,i)=>`<Text Text="[Table0.NAME${i}] [Table0.GIABAN${i}]"/><BarcodeObject DataColumn="Table0.CODE${i}" Barcode="${barcode}"/>`).join('')}`;
}
test('two, three and five-column sheets print the saved name, price and scannable code in every slot',()=>{
 for(const count of [2,3,5]){
  const xml=sheet(count),data={parameters:{},tables:{Table0:[{NAME:'Nước',CODE:'PT0002',BARCODE:'',GIABAN:1000}]}};
  prepareBarcodePayload(xml,data);assert.equal(data.tables.Table0.length,1);
  for(let i=0;i<count;i++){assert.equal(data.tables.Table0[0]['NAME'+i],'Nước');assert.equal(data.tables.Table0[0]['GIABAN'+i],1000);assert.equal(data.tables.Table0[0]['CODE'+i],'PT0002');}
  assert.doesNotThrow(()=>print.validateBindings(xml,data));
 }
});
test('explicit barcode takes priority and valid EAN8 keeps its symbology',()=>{
 const data=()=>({tables:{Table0:[{NAME:'Part',CODE:'PT0002',BARCODE:'12345670',GIABAN:0}]}});
 const d=data();prepareBarcodePayload(sheet(3,'EAN8'),d);assert.equal(d.tables.Table0[0].CODE0,'12345670');
 assert.equal(adaptBarcodeTemplate(sheet(3,'EAN8'),d).notice,'');
 assert.equal(validEan8('12345670'),true);assert.equal(validEan8('1234567'),true);assert.equal(validEan8('12345671'),false);
});
test('alphanumeric and invalid-checksum EAN8 codes use CODE128 without changing the chosen sheet',()=>{
 for(const code of ['PT0001','12345671']){
  const data={tables:{Table0:[{NAME:'chuột',CODE:code,GIABAN:0}]}};
  const source=sheet(5,'EAN8');const result=adaptBarcodeTemplate(source,data);
  assert.ok(result.notice.includes('CODE128'));assert.equal((result.xml.match(/Barcode="Code128"/g)||[]).length,5);
  assert.ok(!result.xml.includes('Barcode="EAN8"'));assert.equal(source.includes('Barcode="EAN8"'),true);
  prepareBarcodePayload(result.xml,data);assert.equal(data.tables.Table0[0].CODE4,code);
 }
});
test('no identifier is fabricated and unknown template fields remain rejected',()=>{
 assert.throws(()=>prepareBarcodePayload(sheet(2),{tables:{Table0:[{ID:'uuid',NAME:'Part'}]}}),/chưa có mã/);
 const data={parameters:{},tables:{Table0:[{NAME:'Part',CODE:'PT01',GIABAN:0}]}};
 const xml=sheet(2)+'<Text Text="[Table0.Unknown0]"/>';
 prepareBarcodePayload(xml,data);assert.throws(()=>print.validateBindings(xml,data),/Unknown0/);
});
