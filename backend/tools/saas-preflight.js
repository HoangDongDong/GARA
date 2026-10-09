require('../src/config');
const fs = require('fs');
const path = require('path');
const platform = require('../src/services/platform');
async function check() {
  const results=[];
  async function item(name,task){try{await task();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}}
  await item('Platform database',()=>platform.query('SELECT FIRST 1 ID FROM SAAS_TENANTS'));
  await item('Verified clean template',async()=>require('../src/services/saasWorker').manifest());
  await item('Frontend build',async()=>{if(!fs.existsSync(path.resolve(__dirname,'../../frontend/dist/index.html')))throw Error('Chưa build frontend.');});
  await item('FastReport renderer',async()=>{if(!fs.existsSync(process.env.FASTREPORT_RENDERER_EXE||path.resolve(__dirname,'../tools/fastreport-renderer/bin/Renderer/Garage.FastReportRenderer.exe')))throw Error('Chưa có renderer trên máy chủ.');});
  await item('Platform admin credential',async()=>{if(!require('../src/services/platformCredentials').passwordHash()?.startsWith('scrypt$'))throw Error('Mở /nen-tang trên localhost để thiết lập mật khẩu quản trị lần đầu.');});
  await item('Public HTTPS and email verification',async()=>{if(!require('../src/services/saasRegistration').mailReady())throw Error('Chưa cấu hình tên miền HTTPS, điều khoản, chính sách dữ liệu và dịch vụ email.');});
  results.forEach(row=>console.log((row.ok?'PASS':'PENDING')+' '+row.name+(row.error?': '+row.error:'')));
  return results;
}
if(require.main===module)check().then(results=>{if(results.some(row=>!row.ok))process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports=check;
