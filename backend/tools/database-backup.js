const fs=require('fs'),path=require('path'),{execFile}=require('child_process');
const config=require('../src/config');
function executable(){const candidates=[process.env.FB_GBAK,'C:/Program Files/Firebird/Firebird_2_5/bin/gbak.exe','C:/Program Files (x86)/Firebird/Firebird_2_5/bin/gbak.exe'].filter(Boolean);const found=candidates.find(file=>fs.existsSync(file));if(!found)throw Error('Không tìm thấy gbak. Đặt FB_GBAK tới công cụ Firebird phù hợp.');return found;}
function run(args){return new Promise((resolve,reject)=>execFile(executable(),args,{windowsHide:true,maxBuffer:1024*1024},(err)=>err?reject(new Error('Firebird gbak thất bại; database hiện tại không bị thay đổi.')):resolve()));}
async function backup(options=config.firebird, destination, metadataOnly=false){
  const root=path.resolve(destination || process.env.FB_BACKUP_DIR || path.join(path.dirname(options.database),'backups'));
  fs.mkdirSync(root,{recursive:true});
  const target=path.join(root,'garage-'+new Date().toISOString().replace(/[:.]/g,'-')+'.fbk');
  await run(['-b',...(metadataOnly?['-m']:[]),'-user',options.user,'-password',options.password,`${options.host}/${options.port}:${options.database}`,target]);
  if(!fs.statSync(target).size)throw Error('Bản sao lưu rỗng.');
  console.log('Backup created: '+target);return target;
}
async function restore(source,target,options=config.firebird){
  source=path.resolve(source);target=path.resolve(target);
  if(path.extname(source).toLowerCase()!=='.fbk'||path.extname(target).toLowerCase()!=='.fdb')throw Error('Nguồn phải là .fbk, đích phải là .fdb mới.');
  if(target.toLowerCase()===path.resolve(config.firebird.database).toLowerCase()||fs.existsSync(target))throw Error('Chỉ khôi phục sang file mới; không ghi đè database hoặc file hiện có.');
  if(!fs.existsSync(source))throw Error('Không tìm thấy bản sao lưu.');
  await run(['-c','-user',options.user,'-password',options.password,source,`${options.host}/${options.port}:${target}`]);
  await new Promise((resolve,reject)=>require('node-firebird').attach({...options,database:target},(error,db)=>{if(error)return reject(Error('Không kết nối được database đã khôi phục.'));db.query('SELECT 1 AS OK FROM RDB$DATABASE',(error)=>{db.detach();error?reject(Error('Database khôi phục không đọc được.')):resolve();});}));
  console.log('Restored and verified: '+target);
}
if(require.main===module){const [command,...args]=process.argv.slice(2);(command==='backup'?backup():command==='restore'&&args.length===2?restore(...args):Promise.reject(Error('Dùng: node tools/database-backup.js backup | restore <backup.fbk> <new.fdb>'))).catch(error=>{console.error(error.message);process.exitCode=1;});}
module.exports={backup,restore};
