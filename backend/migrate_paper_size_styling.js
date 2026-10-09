const fs=require('fs');
const path=require('path');
const db=require('./src/db');
const print=require('./src/services/documentPrint');
const {build}=require('./src/services/documentPaperSizes');
const {idFor}=require('./migrate_missing_paper_sizes');
async function migrate(){
 const added=JSON.parse(fs.readFileSync(path.join(__dirname,'tmp/paper-sizes-added.json'),'utf8'));
 const backup=[];
 for(const item of added){
  if(item.id!==idFor(item.key,item.size))throw Error('Không phải mẫu bổ sung được quản lý');
  const old=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[item.id],'TEMPLATE');
  if(!old)throw Error('Không tìm thấy '+item.id);
  backup.push({id:item.id,content:old.toString('utf8')});
  item.xml=build(print.typeByKey(item.key),item.size);
 }
 fs.writeFileSync(path.join(__dirname,'tmp',`paper-style-backup-${Date.now()}.json`),JSON.stringify(backup));
 await db.transaction(async(query,execute)=>{
  for(const item of added)await execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[Buffer.from(item.xml),item.id]);
 });
 for(const item of added)fs.writeFileSync(path.join(__dirname,'templates/paper-sizes',`${item.key}-${item.size}.frx`),item.xml);
 console.log(`Styled ${added.length} saved templates`);
}
if(require.main===module)migrate().catch(e=>{console.error(e);process.exitCode=1});
module.exports={migrate};
