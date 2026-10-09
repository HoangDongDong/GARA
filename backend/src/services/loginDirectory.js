const crypto=require('crypto');
const platform=require('./platform');
const tenancy=require('../tenancy');
const normalize=value=>String(value||'').trim().toLowerCase();
const key=value=>crypto.createHash('sha256').update(normalize(value)).digest('hex');
function validate(value){const name=normalize(value);if(!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(name))throw platform.fail('Tên đăng nhập cần 3–60 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');return name;}
async function reserve(q,name,tenantId,userId,localName=name){
  const [existing]=await q('SELECT TENANTID,USERID FROM SAAS_LOGINS WHERE LOGINKEY=?',[key(name)]);
  if(existing && (existing.TENANTID!==tenantId || existing.USERID!==userId))throw platform.fail('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.',409);
  if(existing)return;
  await q('INSERT INTO SAAS_LOGINS (LOGINKEY,LOGINNAME,TENANTID,USERID,LOCALNAME) VALUES (?,?,?,?,?)',[key(name),normalize(name),tenantId,userId,localName]);
}
async function resolve(name){
  const [row]=await platform.query('SELECT LOGINNAME,TENANTID,USERID,LOCALNAME FROM SAAS_LOGINS WHERE LOGINKEY=?',[key(name)]);
  if(!row)throw platform.fail('Sai tài khoản hoặc mật khẩu.',401);
  try{return {...row,tenant:await platform.find(row.TENANTID)};}catch(error){if(error.status===403)throw platform.fail('Tài khoản chưa sẵn sàng hoặc cửa hàng đã bị khóa.',403);throw error;}
}
async function bind(userId,username,task){
  if(!tenancy.enabled())return task();
  const name=validate(username),tenantId=tenancy.current().id;
  try{return await platform.transaction(async q=>{
    await q('DELETE FROM SAAS_LOGINS WHERE TENANTID=? AND USERID=?',[tenantId,userId]);
    await reserve(q,name,tenantId,userId,username);
    // Reserve the unique global name before writing to the separate store database.
    // Failed store writes roll back the directory reservation.
    return task();
  });}catch(error){if(!error.status && /unique|PRIMARY or UNIQUE/i.test(error.message))throw platform.fail('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.',409);throw error;}
}
module.exports={normalize,key,validate,reserve,resolve,bind};
