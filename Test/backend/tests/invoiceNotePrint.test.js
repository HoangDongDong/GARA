const test=require('node:test'),assert=require('node:assert/strict');
const {apply}=require('../../../backend/src/services/invoiceNotePrint.js');
const template='<Report><ReportPage><DataBand Name="Items" Width="500" DataSource="Table0"><TextObject Text="[Table0.ItemName]"/></DataBand></ReportPage></Report>';
test('invoice notes appear once in italic and can grow for multiple lines',()=>{
 const params={NOTE:'  Ghi chú dòng một\nGhi chú dòng hai  '};const output=apply(template,params,'MauHoaDonBanHang');
 assert.equal(params.InvoiceNote,'Ghi chú dòng một\nGhi chú dòng hai');assert.match(output,/Name="InvoiceNoteBand"/);assert.match(output,/style=Italic/);assert.match(output,/CanGrow="true"/);
 assert.equal((apply(output,params,'MauHoaDonBanHang').match(/Ghi chú: \[InvoiceNote\]/g)||[]).length,1);
});
test('empty notes add no note band and do not alter line item notes',()=>{
 assert.doesNotMatch(apply(template,{NOTE:'   '},'MauHoaDonSuaChua'),/InvoiceNoteBand/);
 assert.match(apply(template,{NOTE:'Nội dung'},'MauHoaDonSuaChua'),/\[Table0.ItemName\]/);
});
test('an existing header note is italicized instead of duplicating it',()=>{
 const source='<Report><TextObject Text="[Description]" Font="Arial, 10pt, style=Bold"/></Report>';
 const output=apply(source,{Description:'Bảo hành theo phiếu'},'MauBaoGia');
 assert.match(output,/style=Bold, Italic/);assert.match(output,/VisibleExpression=/);assert.doesNotMatch(output,/InvoiceNoteBand/);
});
