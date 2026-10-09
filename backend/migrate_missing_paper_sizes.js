const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const db=require('./src/db');
const print=require('./src/services/documentPrint');
const {audit}=require('./src/services/paperSizeAudit');
const {build}=require('./src/services/documentPaperSizes');
const {templateFilter}=require('./src/services/systemConfigOptions');
const labels={'A4-doc':'A4 dọc','A4-ngang':'A4 ngang',A5:'A5','80mm':'80mm'};
const idFor=(key,size)=>{const h=crypto.createHash('sha256').update(`garage-paper-size-v1:${key}:${size}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`};
async function migrate(){
 const before=await audit();
 const root=path.join(__dirname,'templates','paper-sizes');fs.mkdirSync(root,{recursive:true});
 fs.writeFileSync(path.join(__dirname,'tmp',`paper-sizes-backup-${Date.now()}.json`),JSON.stringify(before,null,2));
 const generated=before.flatMap(row=>row.missing.map(size=>({key:row.key,size,id:idFor(row.key,size),name:`GARA - ${row.label} ${labels[size]}`,xml:build(print.typeByKey(row.key),size)})));
 await db.transaction(async(query,execute)=>{
  for(const row of before.filter(r=>r.missing.length)){
   const [config]=await query('SELECT ID,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30 WITH LOCK',[row.key]);
   if(!config)throw Error(`Thiếu cấu hình ${row.key}`);
   const ids=templateFilter(config.OTHERCONFIG)?.ids||[];
   for(const item of generated.filter(g=>g.key===row.key)){
    const [existing]=await query('SELECT ID FROM STEMPLATE WHERE ID=?',[item.id]);
    if(existing)throw Error(`Mẫu bổ sung đã tồn tại nhưng chưa đăng ký: ${item.id}`);
    await execute("INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,'SYSTEM',CURRENT_TIMESTAMP,?,0)",[item.id,item.name,Buffer.from(item.xml)]);
    ids.push(item.id);
   }
   await execute('UPDATE SCONFIG SET OTHERCONFIG=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[JSON.stringify(ids),config.ID]);
  }
 });
 for(const item of generated)fs.writeFileSync(path.join(root,`${item.key}-${item.size}.frx`),item.xml);
 fs.writeFileSync(path.join(__dirname,'tmp','paper-sizes-added.json'),JSON.stringify(generated.map(({xml,...item})=>item),null,2));
 const after=await audit();
 if(after.some(r=>r.missing.length))throw Error('Vẫn còn khổ giấy chưa đủ');
 console.log(`Added ${generated.length} templates; all ${after.length} categories have four sizes.`);
}
if(require.main===module)migrate().catch(e=>{console.error(e);process.exitCode=1});
module.exports={migrate,idFor};
