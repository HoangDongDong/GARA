const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const db=require('./src/db');
const {types}=require('./src/services/documentPrint');
const {templateFilter}=require('./src/services/systemConfigOptions');
const {keys,template}=require('./src/services/documentReceipt80');
const idFor=key=>{const h=crypto.createHash('sha256').update('GARA-SALES-BILL-80:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};
async function migrate(){
 const configs=await db.query('SELECT ID,NAME,TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE STATUS=30');
 const sales=configs.find(row=>row.NAME==='MauHoaDonBanHang');
 if(!sales?.TEXTVALUE)throw Error('Chưa chọn mẫu bán hàng mặc định.');
 const source=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[sales.TEXTVALUE],'TEMPLATE');
 if(!source)throw Error('Mẫu bán hàng chưa có nội dung.');
 const generated=keys.map(key=>{const type=types.find(t=>t.key===key);const config=configs.find(row=>row.NAME===key);if(!config)throw Error(`Thiếu cấu hình ${key}`);return {type,config,id:idFor(key),xml:template(source.toString('utf8'),type)};});
 const previous=[];
 for(const item of generated){const [row]=await db.query('SELECT ID,NAME,STATUS FROM STEMPLATE WHERE ID=?',[item.id]);previous.push({config:item.config,template:row?{...row,content:(await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[item.id],'TEMPLATE'))?.toString('utf8')}:null});}
 const backup=path.join(__dirname,`document-receipt80-backup-${Date.now()}.json`);
 fs.writeFileSync(backup,JSON.stringify({salesTemplateId:sales.TEXTVALUE,previous},null,2));
 await db.transaction(async(query,execute)=>{for(const item of generated){
  const [current]=await query('SELECT OTHERCONFIG FROM SCONFIG WHERE ID=? WITH LOCK',[item.config.ID]);
  const [existing]=await query('SELECT ID FROM STEMPLATE WHERE ID=?',[item.id]);
  const name=`Mẫu in bill 80mm - ${item.type.label}`;
  if(existing)await execute('UPDATE STEMPLATE SET NAME=?,TEMPLATE=?,STATUS=30,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[name,Buffer.from(item.xml),item.id]);
  else await execute("INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,'SYSTEM',CURRENT_TIMESTAMP,?,0)",[item.id,name,Buffer.from(item.xml)]);
  const ids=templateFilter(current.OTHERCONFIG)?.ids||[];if(!ids.includes(item.id))ids.push(item.id);
  await execute('UPDATE SCONFIG SET TEXTVALUE=?,OTHERCONFIG=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[item.id,JSON.stringify(ids),item.config.ID]);
 }});
 const root=path.join(__dirname,'templates','receipt80');fs.mkdirSync(root,{recursive:true});
 for(const item of generated){fs.writeFileSync(path.join(root,item.type.key+'.frx'),item.xml);console.log(item.type.label,item.id);}
 console.log('Backup:',backup);
}
if(require.main===module)migrate().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={migrate,idFor};
