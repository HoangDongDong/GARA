const relocationRequire = require('node:module').createRequire(require('node:path').resolve(__dirname, '../../../backend/package.json'));
const test=require('node:test'),assert=require('node:assert/strict');
const {DOMParser}=relocationRequire('@xmldom/xmldom');
const {isA5,apply,role,longDate}=require('../../../backend/src/services/a5TemplateTypography.js');
const xml='<Report><ScriptText>keep code</ScriptText><Dictionary/><ReportPage PaperWidth="148" PaperHeight="210"><ReportTitleBand Height="100"><TextObject Name="Title" Text="[DocTitle]" Font="Arial, 18pt, style=Bold" Height="25"/><TextObject Name="Company" Text="[CompanyName]" Font="Arial, 12pt" Height="20"/><TableObject Height="18.9"><TableColumn Width="50"/><TableColumn Width="100"/><TableRow Height="18.9"><TableCell Name="H1" Text="STT" Font="Arial, 11pt"/><TableCell Name="H2" Text="Tên hàng" Font="Arial, 11pt"/></TableRow></TableObject></ReportTitleBand><DataBand Height="18.9"><TableObject Height="18.9"><TableColumn Width="100"/><TableRow Height="18.9"><TableCell Name="D" Text="[Table0.ItemName]" Font="Arial, 8pt" Padding="2, 2, 2, 2"/></TableRow></TableObject></DataBand><ReportSummaryBand Height="50"><TableObject Height="18.9"><TableColumn Width="100"/><TableRow Height="18.9"><TableCell Name="TotalLabel" Text="Tổng:"/><TableCell Name="Amount" Text="[TONGCONG]"/></TableRow></TableObject></ReportSummaryBand></ReportPage></Report>';
test('A5 typography changes title/totals to 14, headers to 9, body to 10 and keeps bindings',()=>{
 assert.equal(isA5(xml),true);assert.equal(isA5(xml.replace('PaperWidth="148"','PaperWidth="210"').replace('PaperHeight="210"','PaperHeight="297"')),false);
 const result=apply(xml),doc=new DOMParser().parseFromString(result.xml,'application/xml');
 const named=name=>Array.from(doc.getElementsByTagName('*')).find(n=>n.getAttribute('Name')===name);
 for(const name of ['Title','TotalLabel','Amount'])assert.match(named(name).getAttribute('Font'),/^Tahoma, 14pt/);
 for(const name of ['H1','H2'])assert.match(named(name).getAttribute('Font'),/^Tahoma, 9pt/);
 for(const name of ['Company','D'])assert.equal(named(name).getAttribute('Font'),'Tahoma, 10pt');
 assert.equal(named('D').getAttribute('Text'),'[Table0.ItemName]');
 assert.equal(doc.getElementsByTagName('ScriptText')[0].textContent,'keep code');
 assert.ok(Number(named('D').parentNode.getAttribute('Height'))>=20);
 assert.equal(apply(result.xml).changed,0);
});
test('amount in words stays body text rather than a 14pt total',()=>{
 const node=new DOMParser().parseFromString('<TextObject Text="[ToVndWords([TONGCONG])] đồng."/>','application/xml').documentElement;
 assert.equal(role(node),'body');
});
test('A5 document date uses Vietnamese words, pads day/month and keeps business dates untouched',()=>{
 assert.equal(longDate('2026-10-09T00:00:00+07:00'),'Ngày 09 tháng 10 năm 2026');
 assert.equal(longDate('2026-01-02T00:00:00+07:00'),'Ngày 02 tháng 01 năm 2026');
 const original=xml.replace('Text="[CompanyName]"','Text="Ngày [DocDate]"');
 const result=apply(original),doc=new DOMParser().parseFromString(result.xml,'application/xml');
 const node=Array.from(doc.getElementsByTagName('TextObject')).find(n=>n.getAttribute('Name')==='Company');
 assert.equal(node.getAttribute('Text'),'[DocDateLong]');
 assert.ok(Array.from(doc.getElementsByTagName('Parameter')).some(n=>n.getAttribute('Name')==='DocDateLong'));
 assert.equal(apply(result.xml).changed,0);
 assert.equal(longDate('invalid'),'');
});
