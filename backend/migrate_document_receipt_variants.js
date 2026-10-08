const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const db=require('./src/db');
const print=require('./src/services/documentPrint');
const {templateFilter}=require('./src/services/systemConfigOptions');
const {idFor:baseId}=require('./migrate_document_receipt80');
const {build,variants}=require('./migrate_sales_receipt_variants');
const keys=['MauPhieuSuaChua','MauPhieuBanGiao','MauHoaDonSuaChua','MauPhieuXuatKho'];
const idFor=(key,variant)=>{const h=crypto.createHash('sha256').update(`garage-document-receipt-variant:${key}:${variant}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};
function adapt(source,variant){
 const target=272.16;
 const original=Number(source.match(/<TableObject Name="detail"[^>]*Width="([^"]+)"/)?.[1]);
 const left=Number(source.match(/<TableObject Name="detail"[^>]*Left="([^"]+)"/)?.[1]||0);
 if(!original)throw Error('Thiếu bảng chi tiết 80mm');
 let xml=source.replace(/<ReportPage\b[^>]*>/,tag=>tag.replace(/LeftMargin="[^"]*"/,'LeftMargin="0"').replace(/RightMargin="[^"]*"/,'RightMargin="8"'));
 xml=xml.replace(/<(?:TableObject|TextObject|PictureObject|TableColumn|ReportTitleBand|DataBand|ReportSummaryBand)\b[^>]*>/g,tag=>tag.replace(/\bWidth="([^"]+)"/,(_,w)=>`Width="${Math.round(Number(w)*target/original*100)/100}"`).replace(/\bLeft="([^"]+)"/,(_,x)=>`Left="${Math.max(0,Math.round((Number(x)-left)*target/original*100)/100)}"`));
 xml=xml.replace(/<TableRow Name="Row23"[\s\S]*?<\/TableRow>/,'');
 xml=xml.replace(/<TableObject Name="Table5"[^>]*>/,tag=>tag.replace(/\sTop="[^"]*"/,'').replace(/>$/,' Top="18.9">'));
 xml=xml.replace(/(<ReportSummaryBand\b[^>]*>)/,'$1<TableObject Name="AlignedTotalQuantity"></TableObject>');
 const widths=variant.key==='stt'?[18,90.16,30,49,30,55]:variant.key==='simple'?[108.16,30,49,30,55]:[30,80,30,132.16];
 xml=build(xml,{...variant,widths}).replaceAll('[Table0.DMATHANG_NAME]','[Table0.ItemName]').replaceAll('[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]','[Table0.SOLUONG]').replaceAll('[PrintShow_quantity]','true');
 xml=xml.replace(/<TableCell\b[^>]*Text="STT"[^>]*\/>/,tag=>tag.replace(/\/>$/,' WordWrap="false"/>').replace('Tahoma, 6pt','Tahoma, 5.5pt'));
 xml=xml.replace(/<Column Name="Line(?:DiscountRate|NetAmount)"[^>]*\/>/g,'');
 xml=xml.replace(/(<TableDataSource Name="Table0"[^>]*>)/,'$1<Column Name="LineDiscountRate" DataType="System.Decimal"/><Column Name="LineNetAmount" DataType="System.Decimal"/>');
 xml=xml.replace('</Dictionary>','<Parameter Name="DocumentReceiptVariants" DataType="System.Boolean"/></Dictionary>');
 // Put notes below both item rows rather than overlapping the second row.
 if(variant.key==='two-lines')xml=xml.replace(/<TextObject\b[^>]*Name="ReceiptItemNote"[^>]*>/,tag=>tag.replace(/Top="[^"]*"/,'Top="37.8"'));
 return xml;
}
async function migrate(){
 const generated=[],previous=[];
 for(const key of keys){
  const type=print.typeByKey(key);
  const source=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[baseId(key)],'TEMPLATE');
  if(!source)throw Error(`Thiếu mẫu 80mm: ${key}`);
  const [config]=await db.query('SELECT ID,TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30',[key]);
  previous.push({key,config});
  for(const variant of variants){
   const id=idFor(key,variant.key);
   const old=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[id],'TEMPLATE');
   if(old)previous.push({id,content:old.toString('utf8')});
   generated.push({key,variant:variant.key,id,name:`${variant.name} - ${type.label}`,xml:adapt(source.toString('utf8'),variant)});
  }
 }
 fs.mkdirSync(path.join(__dirname,'tmp'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'tmp',`document-variants-backup-${Date.now()}.json`),JSON.stringify(previous));
 await db.transaction(async(query,execute)=>{
  for(const key of keys){
   const [config]=await query('SELECT ID,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30 WITH LOCK',[key]);
   const ids=templateFilter(config.OTHERCONFIG)?.ids||[];
   for(const item of generated.filter(item=>item.key===key)){
    const [existing]=await query('SELECT ID FROM STEMPLATE WHERE ID=?',[item.id]);
    if(existing)await execute('UPDATE STEMPLATE SET NAME=?,TEMPLATE=?,STATUS=30,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[item.name,Buffer.from(item.xml),item.id]);
    else await execute("INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,'SYSTEM',CURRENT_TIMESTAMP,?,0)",[item.id,item.name,Buffer.from(item.xml)]);
    if(!ids.includes(item.id))ids.push(item.id);
   }
   await execute('UPDATE SCONFIG SET OTHERCONFIG=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[JSON.stringify(ids),config.ID]);
  }
 });
 for(const item of generated)fs.writeFileSync(path.join(__dirname,'templates','receipt80',`${item.key}-${item.variant}.frx`),item.xml);
 console.log(JSON.stringify(generated.map(({key,variant,id,name})=>({key,variant,id,name}))));
}
if(require.main===module)migrate().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={keys,idFor,adapt,migrate};
