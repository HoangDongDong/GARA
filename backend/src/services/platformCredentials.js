const fs=require('fs'),path=require('path');
const security=require('../authSecurity');
const file=()=>path.join(process.env.AUTH_SECURITY_DIR||path.resolve(__dirname,'../../storage/security'),'platform-admin-password');
function passwordHash(){if(process.env.SAAS_ADMIN_PASSWORD_HASH)return process.env.SAAS_ADMIN_PASSWORD_HASH;try{return fs.readFileSync(file(),'utf8').trim();}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function setup(req,password){
  const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.ip);
  let origin=false;try{const url=new URL(req.headers.origin);origin=['localhost','127.0.0.1','[::1]'].includes(url.hostname);}catch{}
  if(!loopback||!origin)throw Object.assign(Error('Thiết lập lần đầu phải thực hiện trên máy chủ qua localhost.'),{status:403});
  if(passwordHash())throw Object.assign(Error('Mật khẩu quản trị đã được thiết lập.'),{status:409});
  if(typeof password!=='string'||password.length<12||password.length>128)throw Object.assign(Error('Mật khẩu quản trị cần 12–128 ký tự.'),{status:400});
  fs.mkdirSync(path.dirname(file()),{recursive:true});
  try{fs.writeFileSync(file(),security.hashPassword(password),{flag:'wx',mode:0o600});}catch(error){if(error.code==='EEXIST')throw Object.assign(Error('Mật khẩu quản trị đã được thiết lập.'),{status:409});throw error;}
}
module.exports={passwordHash,setup};
