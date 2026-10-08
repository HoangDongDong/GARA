const fs=require('fs');const os=require('os');const path=require('path');
const xml=x=>String(x??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Minimal uncompressed ZIP, sufficient for standards-compliant Office Open XML.
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(files){const local=[],central=[];let offset=0;for(const [name,value] of Object.entries(files)){const n=Buffer.from(name),b=Buffer.from(value),crc=crc32(b);const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(crc,14);h.writeUInt32LE(b.length,18);h.writeUInt32LE(b.length,22);h.writeUInt16LE(n.length,26);local.push(h,n,b);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc,16);c.writeUInt32LE(b.length,20);c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=h.length+n.length+b.length;}const tail=Buffer.alloc(22);tail.writeUInt32LE(0x06054b50);tail.writeUInt16LE(Object.keys(files).length,8);tail.writeUInt16LE(Object.keys(files).length,10);tail.writeUInt32LE(central.reduce((s,b)=>s+b.length,0),12);tail.writeUInt32LE(offset,16);return Buffer.concat([...local,...central,tail]);}
function display(value,type){if(value==null)return '—';if(type==='money'||type==='number')return Number(value).toLocaleString('vi-VN',{maximumFractionDigits:2});if(type==='date')return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):String(value);return String(value);}
function xlsx(result){const cols=result.report.columns;const lines=[[result.report.name],[`Tạo lúc ${result.createdAt}`],[JSON.stringify(result.filters)],...result.notes.map(n=>[n]),cols.map(c=>c.label),...result.rows.map(r=>cols.map(c=>r[c.key]??'')),cols.map((c,i)=>i===0?'TỔNG CỘNG':result.totals[c.key]??'')];const sheet=lines.map((row,i)=>`<row r="${i+1}">${row.map(v=>typeof v==='number'&&Number.isFinite(v)?`<c><v>${v}</v></c>`:`<c t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');return zip({
 '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
 '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Báo cáo" sheetId="1" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
 'xl/worksheets/sheet1.xml':`<?xml version="1.0" encoding="utf-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`,
 });}
// Layout adapted from DATA.fdb SREPORT -> SREPORTTEMPLATE (cash and stock forms).
// Legacy script/query content is never executed; garage report snapshots supply all values.
function buildPrintTemplate(result, layout, company) {
 const {periodCaption,filterCaption,signatureDate}=require('./reportPresentation');
 const width=layout==='portrait'?718.2:1046.5;
 const cols=[{key:'__index',label:'STT',type:'number'},...result.report.columns];
 const weights=cols.map(c=>c.key==='__index'?0.45:['name','partner','address','reason'].includes(c.key)?2.1:c.type==='date'?1.1:['money','number'].includes(c.type)?1.15:1.3);
 const remainingWeight=weights.slice(1).reduce((a,b)=>a+b,0);
 const widths=weights.map((w,i)=>i===0?44:(width-44)*w/remainingWeight);
 const font=cols.length>11?'Arial, 7pt':'Arial, 9pt';
 const numeric=c=>['money','number'].includes(c.type);
 const text=(name,value,left,top,w,h,style='',align='Center',expression=false)=>'<TextObject Name="'+name+'" Left="'+left+'" Top="'+top+'" Width="'+w+'" Height="'+h+'" Text="'+xml(value)+'" Font="Arial, '+(style.includes('title')?'16':style.includes('company')?'12':'10')+'pt'+(style.includes('bold')?', style=Bold':style.includes('italic')?', style=Italic':'')+'" HorzAlign="'+align+'" VertAlign="Center" CanGrow="true" AllowExpressions="'+expression+'"/>';
 const table=(name,values,bold=false,header=false)=>'<TableObject Name="'+name+'" Width="'+width+'" Height="28">'+widths.map((w,i)=>'<TableColumn Name="'+name+'Col'+i+'" Width="'+w+'"/>').join('')+'<TableRow Name="'+name+'Row" Height="28" MinHeight="28" AutoSize="true">'+cols.map((c,i)=>'<TableCell Name="'+name+'Cell'+i+'" Border.Lines="All" Border.Color="128, 128, 128" Text="'+xml(values[i])+'" Font="'+font+(bold?', style=Bold':'')+'" HorzAlign="'+(header||i===0||c.type==='date'?'Center':numeric(c)?'Right':'Left')+'" VertAlign="Center" Padding="4, 3, 4, 3" AllowExpressions="'+(name==='DataTable')+'"/>').join('')+'</TableRow></TableObject>';
 const headerLeft=company.logo?125:0,headerWidth=width-headerLeft;
 const logo=company.logo?'<PictureObject Name="CompanyLogo" Width="110" Height="70" Image="'+xml(company.logo.split(',')[1])+'" SizeMode="Zoom"/>':'';
 const contacts=[company.phone?'Điện thoại: '+company.phone:'',company.email?'Email: '+company.email:''].filter(Boolean).join('     ');
 const filters=filterCaption(result);
 const titleHeight=filters?205:175;
 const noteText=(result.notes||[]).join('\n');
 const dictionary=cols.map((c,i)=>'<Column Name="C'+i+'" DataType="System.String"/>').join('');
 const totalValues=cols.map((c,i)=>i===0?'':i===1?'TỔNG CỘNG':result.totals[c.key]==null?'':display(result.totals[c.key],c.type));
 // Merge descriptive columns before the first total, matching legacy total-row layout.
 const firstTotal=cols.findIndex(c=>result.totals[c.key]!=null);
 let totalTable=table('TotalTable',totalValues,true);
 const span=firstTotal<0?cols.length:Math.max(1,firstTotal);
 totalTable=totalTable.replace(/(<TableCell Name="TotalTableCell0"[^>]*Text=")[^"]*(")/,'$1TỔNG CỘNG$2').replace('<TableCell Name="TotalTableCell0"','<TableCell ColSpan="'+span+'" Name="TotalTableCell0"');
 const empty=result.rows.length?'':text('Empty','Không có dữ liệu phù hợp bộ lọc.',0,0,width,32);
 const summaryTop=result.rows.length?0:32;
 const template='<?xml version="1.0" encoding="utf-8"?><Report ScriptLanguage="CSharp" DoublePass="true"><Dictionary><TableDataSource Name="Rows" ReferenceName="Data.Rows" DataType="System.Int32" Enabled="true">'+dictionary+'</TableDataSource></Dictionary><ReportPage Name="Page1" PaperWidth="'+(layout==='portrait'?210:297)+'" PaperHeight="'+(layout==='portrait'?297:210)+'" Landscape="'+(layout!=='portrait')+'" LeftMargin="10" RightMargin="10" TopMargin="12" BottomMargin="10"><ReportTitleBand Name="Title" Width="'+width+'" Height="'+titleHeight+'" CanGrow="true">'+logo+text('CompanyName',company.name,headerLeft,0,headerWidth,24,'company bold')+text('CompanyAddress',company.address?'Địa chỉ: '+company.address:'',headerLeft,26,headerWidth,35)+text('CompanyContact',contacts,headerLeft,63,headerWidth,25)+text('ReportName',result.report.name.toLocaleUpperCase('vi-VN'),0,105,width,38,'title bold')+text('Period',periodCaption(result),0,145,width,25)+(filters?text('Filters',filters,0,173,width,28,'italic'):'')+'</ReportTitleBand><PageHeaderBand Name="Headers" Width="'+width+'" Height="28" CanGrow="true">'+table('HeaderTable',cols.map(c=>c.label),true,true)+'</PageHeaderBand><DataBand Name="Data1" Width="'+width+'" Height="28" CanGrow="true" DataSource="Rows">'+table('DataTable',cols.map((c,i)=>'[Rows.C'+i+']'))+'</DataBand><ReportSummaryBand KeepChild="true" Name="Summary" Width="'+width+'" Height="'+(summaryTop+28)+'" CanGrow="true">'+empty+totalTable.replace('<TableObject Name="TotalTable"','<TableObject Top="'+summaryTop+'" Name="TotalTable"')+'<ChildBand KeepChild="true" Name="NotesBand" Width="'+width+'" Height="'+(noteText?42:12)+'" CanGrow="true">'+(noteText?text('Notes',noteText,0,10,width,30,'italic','Left'):'')+'<ChildBand Name="SignatureBand" Width="'+width+'" Height="130">'+text('SignedDate',signatureDate(result.createdAt),width-300,10,300,24)+text('Signer','Người lập',width-300,35,300,24,'bold')+text('SignHint','(Ký, họ tên)',width-300,60,300,24,'italic')+'</ChildBand></ChildBand></ReportSummaryBand><PageFooterBand Name="Footer" Width="'+width+'" Height="22">'+text('Pages','Trang [Page#] / [TotalPages#]',0,0,width,20,'','Right',true)+'</PageFooterBand></ReportPage></Report>';
 const tables={Rows:result.rows.map((r,index)=>Object.fromEntries(cols.map((c,i)=>['C'+i,c.key==='__index'?String(index+1):display(r[c.key],c.type)])))};
 return {template,tables};
}
async function pdf(result,layout='landscape') {
 const {runRenderer}=require('./salesPrint');
 const company=await require('./reportPresentation').companyPresentation();
 const {template,tables}=buildPrintTemplate(result,layout,company);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'garage-report-'));
 try {
  fs.writeFileSync(path.join(dir,'report.frx'),template);
  fs.writeFileSync(path.join(dir,'data.json'),JSON.stringify({parameters:{},tables}));
  return await runRenderer(path.join(dir,'report.frx'),path.join(dir,'data.json'),path.join(dir,'report.pdf'));
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
module.exports={xlsx,pdf,buildPrintTemplate,xml,zip,crc32,display};
