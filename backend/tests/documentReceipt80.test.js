const test=require('node:test');
const assert=require('node:assert/strict');
const {template,keys}=require('../src/services/documentReceipt80');
const source=`<Report><Dictionary/><ReportPage PaperWidth="80"><ReportTitleBand Height="182"><TextObject Text="HÓA ĐƠN BÁN HÀNG"/><TableObject Name="colHeader" Top="163.1"></TableObject></ReportTitleBand><DataBand Name="Data1" Height="18.9"><TableObject Name="detail"><TableCell Text="[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]"/></TableObject></DataBand><ReportSummaryBand><TableRow Name="Row18"><TableCell Text="[TONGCONG]"/></TableRow><TableRow Name="Row29" VisibleExpression="[PrintShow_thanks]"/></ReportSummaryBand></ReportPage></Report>`;
test('sales bill uses the document quantity directly, rather than subtracting two generic quantity aliases',()=>{
 for(const key of keys){const xml=template(source,{key});assert.ok(xml.includes('[DocTitle]'));assert.ok(!xml.includes('SLNHAPCHUAQUYDOI'));assert.ok(!xml.includes('SLXUATCHUAQUYDOI'));assert.ok(xml.includes('Format.GroupSeparator=","'));assert.ok(xml.includes('[Extra]'));}
});
test('reception retains descriptive values and suppresses invoice totals',()=>{
 const xml=template(source,{key:'MauPhieuTiepNhan'});assert.ok(xml.includes('[Table0.ValueText]'));assert.ok(xml.includes('Visible="false" Name="Row18"'));assert.ok(xml.includes('Height="226"'));assert.ok(xml.includes('Top="207.1"'));
});
test('migration refuses a non-80mm or incompatible sales layout',()=>{
 assert.throws(()=>template(source.replace('PaperWidth="80"','PaperWidth="210"'),{key:keys[0]}),/80mm/);
 assert.throws(()=>template(source.replace('Name="detail"','Name="other"'),{key:keys[0]}),/bảng chi tiết/);
});
