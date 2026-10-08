const test=require('node:test');
const assert=require('node:assert/strict');
const {prepare}=require('../src/services/documentReceiptVariants');
const {hideUnusedDiscountColumns}=require('../src/services/salesLineDiscountPrint');
test('document quantity total follows the resized quantity column',()=>{
 const fs=require('fs');
 const {fitMoneyColumns}=require('../src/services/salesLineDiscountPrint');
 const source=fs.readFileSync(require('path').join(__dirname,'../templates/receipt80/MauPhieuSuaChua-stt.frx'),'utf8');
 const rows=[{DONGIA:2200000,LineNetAmount:2200000,LineDiscountRate:0}];
 const xml=fitMoneyColumns(hideUnusedDiscountColumns(source,rows),rows);
 const table=xml.match(/<TableObject Name="detail"[\s\S]*?<\/TableObject>/)[0];
 const widths=[...table.matchAll(/<TableColumn[^>]*Width="([^"]+)"/g)].map(m=>Number(m[1]));
 const total=xml.match(/<TextObject Name="VariantTotalQuantity"[^>]*>/)[0];
 assert.equal(Number(total.match(/Left="([^"]+)"/)[1]),widths[0]+widths[1]);
 assert.equal(Number(total.match(/Width="([^"]+)"/)[1]),widths[2]);
});
test('repair receipt shows allocated discount once and preserves invoice total',()=>{
 const data={parameters:{TIENHANG:100000,TIENGIAMGIA:10000,TONGCONG:99000},tables:{Table0:[{THANHTIEN:100000,TIENGIAMGIA:10000,TILEGIAMGIA:10}]}};
 prepare(data);
 assert.equal(data.tables.Table0[0].LineNetAmount,90000);
 assert.equal(data.tables.Table0[0].LineDiscountText,'10%');
 assert.equal(data.parameters.TIENHANG,90000);
 assert.equal(data.parameters.TIENGIAMGIA,0);
 assert.equal(data.parameters.TONGCONG,99000);
});
test('zero discounts hide the column in document variants',()=>{
 const data={parameters:{TIENHANG:100000,TIENGIAMGIA:0},tables:{Table0:[{THANHTIEN:100000,TILEGIAMGIA:0}]}};
 prepare(data);
 const xml='<TableObject><TableColumn Width="30"/><TableColumn Width="50"/><TableRow><TableCell Text="CK %"/><TableCell Text="Thành tiền"/></TableRow></TableObject>';
 assert.ok(!hideUnusedDiscountColumns(xml,data.tables.Table0).includes('CK %'));
 assert.equal(data.tables.Table0[0].LineNetAmount,100000);
});
