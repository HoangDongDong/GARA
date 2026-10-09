const fs=require('fs');
const db=require('../db');
const {types}=require('./documentPrint');
const {templateFilter}=require('./systemConfigOptions');
function paper(xml){
 const page=xml.match(/<ReportPage\b[^>]*>/)?.[0]||'';
 const w=Number(page.match(/\bPaperWidth="([^"]+)"/)?.[1]);
 const h=Number(page.match(/\bPaperHeight="([^"]+)"/)?.[1]);
 if(Math.abs(w-80)<1)return '80mm';
 if(Math.abs(Math.min(w,h)-148)<2&&Math.abs(Math.max(w,h)-210)<2)return 'A5';
 if(Math.abs(Math.min(w,h)-210)<2&&Math.abs(Math.max(w,h)-297)<2)return w>h?'A4-ngang':'A4-doc';
 return `${w}x${h}`;
}
async function audit(){
 const configs=await db.query('SELECT ID,NAME,TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE STATUS=30');
 const result=[];
 for(const type of types){
  const config=configs.find(c=>c.NAME===type.key),templates=[];
  for(const id of templateFilter(config?.OTHERCONFIG)?.ids||[]){
   const [row]=await db.query('SELECT ID,NAME,STATUS FROM STEMPLATE WHERE ID=?',[id]);
   if(!row||![0,30].includes(Number(row.STATUS)))continue;
   const content=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[id],'TEMPLATE');
   if(content)templates.push({...row,paper:paper(content.toString('utf8'))});
  }
  result.push({key:type.key,label:type.label,config,templates,missing:['A4-doc','A4-ngang','A5','80mm'].filter(size=>!templates.some(t=>t.paper===size))});
 }
 return result;
}
if(require.main===module)audit().then(result=>{fs.writeFileSync('tmp/paper-size-audit.json',JSON.stringify(result,null,2));for(const r of result)console.log(`${r.label}: thiếu ${r.missing.join(', ')||'không'} (${r.templates.length} mẫu)`)}).catch(e=>{console.error(e);process.exitCode=1});
module.exports={audit,paper};
