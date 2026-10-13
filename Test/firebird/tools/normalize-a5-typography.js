const fs=require('fs'),path=require('path'),crypto=require('crypto');
const db=require('../../../backend/src/db.js'),platform=require('../../../backend/src/services/platform.js'),tenancy=require('../../../backend/src/tenancy.js');
const web=require('../../../backend/src/services/webReportDesigner.js'),typography=require('../../../backend/src/services/a5TemplateTypography.js');
async function targets(){
 const rows=await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS');
 const stores=rows.filter(r=>r.DBPATH&&fs.existsSync(r.DBPATH)).map(platform.map);
 const manifestPath=path.join(platform.root(),'template-current.json');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 return {stores,manifest,manifestPath};
}
async function processStore(tenant,write){return tenancy.run(tenant,async()=>{
 const rows=await db.query('SELECT ID,NAME FROM STEMPLATE WHERE STATUS IN (0,30)');
 const result=[];
 for(const row of rows){
  const blob=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[row.ID],'TEMPLATE');if(!blob)continue;
  const xml=blob.toString('utf8');if(!typography.isA5(xml,row.NAME))continue;
  const converted=typography.apply(xml);web.validate(converted.xml);
  if(write&&converted.changed)await db.transaction(async(q,x)=>{
   const [current]=await q('SELECT TEMPLATE FROM STEMPLATE WHERE ID=? WITH LOCK',[row.ID]);
   const bytes=await web.readBlob(current.TEMPLATE);
   if(!bytes.equals(blob))throw Error('Mẫu đang được sửa: '+row.NAME);
   web.backup(row.ID,bytes);
   await x('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[Buffer.from(converted.xml),row.ID]);
  });
  result.push({id:row.ID,name:row.NAME,changed:converted.changed,roles:converted.roles});
 }
 return {store:tenant.code||tenant.id,templates:result};
});}
async function main(write=false){
 const {stores,manifest,manifestPath}=await targets();const results=[];
 for(const tenant of stores)results.push(await processStore(tenant,write));
 // Work on a restored clone. The current signup seed remains usable until the
 // new backup has been verified and its manifest is atomically published.
 if(write){
  const backup=require('../../../backend/tools/database-backup.js');
  const id=crypto.randomUUID(),seed=path.join(platform.root(),'template-a5-'+id+'.fdb');
  await backup.restore(manifest.backup,seed);
  const tenant={id:'a5-seed-'+id,database:seed,code:'new-store-seed'};
  results.push(await processStore(tenant,true));
  const file=await backup.backup({...require('../../../backend/src/config.js').firebird,database:seed},path.join(platform.root(),'templates'));
  const verified=path.join(platform.root(),'template-a5-verify-'+id+'.fdb');await backup.restore(file,verified);
  const audit=await processStore({id:'a5-verify-'+id,database:verified,code:'verify'},false);
  if(audit.templates.some(t=>t.changed))throw Error('Mẫu A5 trong bản sao lưu chưa đồng nhất.');
  const next={...manifest,backup:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),template:seed,created:new Date().toISOString(),seedVersion:6,a5Typography:'Tahoma:title-total14/body10/header9',a5Date:'Ngày dd tháng MM năm yyyy'};
  fs.copyFileSync(manifestPath,path.join(platform.root(),'template-manifest-before-a5-'+id+'.json'));
  fs.writeFileSync(manifestPath+'.tmp',JSON.stringify(next,null,2));fs.renameSync(manifestPath+'.tmp',manifestPath);
 }else results.push(await processStore({id:'a5-seed-audit',database:manifest.template,code:'new-store-seed'},false));
 const report=path.join(__dirname,'../../../backend/tmp/a5-typography-'+(write?'applied':'audit')+'.json');fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(results,null,2));
 console.log(JSON.stringify({write,report,stores:results.map(r=>({store:r.store,a5:r.templates.length,changes:r.templates.reduce((s,t)=>s+t.changed,0)}))}));
 return results;
}
if(require.main===module)main(process.argv.includes('--apply')).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={processStore,main};
