const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {check}=require('../../../backend/src/services/tenantTemplateEdits.js');
const original='<Report ScriptLanguage="CSharp"><ScriptText>trusted code</ScriptText><Dictionary><Parameter Name="CompanyName"/></Dictionary><ReportPage Name="P"><DataBand Name="B" Height="30"><TextObject Name="Text1" Text="[CompanyName]" Font="Arial, 10pt" Width="80"/></DataBand></ReportPage></Report>';
test('tenant edits permit layout and known fields, forbid code and executable inputs',()=>{
 assert.doesNotThrow(()=>check(original,original.replace('Width="80"','Width="100"').replace('[CompanyName]','Cửa hàng [CompanyName]')));
 for(const change of [original.replace('trusted code','System.IO.File.ReadAllText("secret")'),original.replace('[CompanyName]','[System.IO.File.ReadAllText("secret")]'),original.replace('Width="80"','Width="80" BeforePrintEvent="attack"'),original.replace('<Dictionary>','<Dictionary><MsSqlDataConnection ConnectionString="secret"/>'),original.replace('Width="80"','Width="NaN"'),original.replace('Font="Arial, 10pt"','Font="x, 10000pt"')])assert.throws(()=>check(original,change));
 const added=original.replace('</DataBand>','<TextObject Name="WebText1" Left="0" Top="0" Width="50" Height="20" Text="Xin cảm ơn" Font="Arial, 10pt"/></DataBand>');
 assert.doesNotThrow(()=>check(original,added));
 assert.throws(()=>check(original,added.replace('Text="Xin cảm ơn"','Text="Xin cảm ơn" Hyperlink.Value="file:///secret"')));
});
test('shipped templates remain editable without modifying trusted script/dictionary',()=>{
 const root=path.join(__dirname,'../../../backend/templates');let count=0;
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else if(f.name.endsWith('.frx')){const xml=fs.readFileSync(p,'utf8');assert.doesNotThrow(()=>check(xml,xml),p);count++;}}}walk(root);assert.ok(count>30);
});
test('tenant copies preserve existing formatting and reject arbitrary new events',()=>{
 const formatted=original.replace('Width="80"','Width="80" Format="Number"');
 const clone='<TextObject Name="Text1_Copy1" Text="[CompanyName]" Font="Arial, 10pt" Width="80" Format="Number"/>';
 const copy=formatted.replace('</DataBand>',clone+'</DataBand>');
 assert.doesNotThrow(()=>check(formatted,copy));
 assert.throws(()=>check(formatted,copy.replace('Name="Text1_Copy1"','Name="Text1_Copy1" BeforePrintEvent="attack"')));
});
