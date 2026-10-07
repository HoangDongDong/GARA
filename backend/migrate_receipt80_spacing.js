const fs=require('fs'),path=require('path'),db=require('./src/db');
const {keys,compactRows}=require('./src/services/documentReceipt80');
const {idFor}=require('./migrate_document_receipt80');
async function migrate(){
 const ids=[...keys.map(idFor),'3f8b7a34-b36d-429f-8088-835a0c1f97d7'],updates=[];
 for(const id of ids){const bytes=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[id],'TEMPLATE');if(!bytes)continue;const before=bytes.toString('utf8'),after=compactRows(before);if(after!==before)updates.push({id,before,after});}
 fs.writeFileSync(path.join(__dirname,`receipt80-spacing-backup-${Date.now()}.json`),JSON.stringify(updates.map(({id,before})=>({id,content:before})),null,2));
 await db.transaction(async(q,x)=>{for(const row of updates)await x('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[Buffer.from(row.after),row.id]);});
 for(const key of keys){const file=path.join(__dirname,'templates','receipt80',key+'.frx');if(fs.existsSync(file))fs.writeFileSync(file,compactRows(fs.readFileSync(file,'utf8')));}
 console.log('Updated receipt spacing:',updates.length);
}
if(require.main===module)migrate().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={migrate};
