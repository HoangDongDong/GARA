require('../src/config');
const path=require('path'),crypto=require('crypto'),fs=require('fs');
const platform=require('../src/services/platform'),backup=require('./database-backup');
async function verify(id){
  if(!/^[a-f0-9-]{36}$/.test(String(id||'')))throw Error('Cần ID bản sao lưu.');
  const [row]=await platform.query("SELECT ID,TENANTID,FILEPATH FROM SAAS_BACKUPS WHERE ID=? AND STATE='done'",[id]);
  if(!row)throw Error('Không tìm thấy bản sao lưu thành công.');
  const source=path.resolve(row.FILEPATH),root=path.join(platform.root(),'backups')+path.sep;
  if(!source.toLowerCase().startsWith(root.toLowerCase()))throw Error('Đường dẫn sao lưu không hợp lệ.');
  const directory=path.join(platform.root(),'restore-checks');fs.mkdirSync(directory,{recursive:true});
  const target=path.join(directory,id+'-'+crypto.randomUUID()+'.fdb');
  await backup.restore(source,target);
  await platform.query('UPDATE SAAS_BACKUPS SET VERIFIED=CURRENT_TIMESTAMP WHERE ID=?',[id]);
  console.log('Backup verification recorded; restored database retained separately.');
}
if(require.main===module)verify(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports=verify;
