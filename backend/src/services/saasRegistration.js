const crypto = require('crypto');
const platform = require('./platform');
const { hashPassword } = require('../authSecurity');
const fail = platform.fail;
const directory=require('./loginDirectory');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const instant = () => process.env.SAAS_REGISTRATION_MODE === 'instant';
const registrationReady = () => process.env.SAAS_REGISTRATION_ENABLED === 'true' && (instant() || mailReady());
function normalizePhone(input) {
  const raw=String(input || '').trim();
  if(!raw || /[^+\d\s().-]/.test(raw))throw fail('Số điện thoại không hợp lệ.');
  let number=raw.replace(/[\s().-]/g,'');
  if(number.startsWith('0084'))number='0'+number.slice(4);
  else if(number.startsWith('+84'))number='0'+number.slice(3);
  else if(/^84\d{9}$/.test(number))number='0'+number.slice(2);
  if(/^0[35789]\d{8}$/.test(number))return '+84'+number.slice(1);
  if(/^\+[1-9]\d{7,14}$/.test(number) && !number.startsWith('+84'))return number;
  throw fail('Nhập số di động Việt Nam 10 chữ số hoặc số quốc tế có mã quốc gia.');
}
function validate(body) {
  const value = { username:directory.validate(body.username), code: String(body.code || '').trim().toLowerCase(), name: String(body.name || '').trim(), owner: String(body.owner || '').trim(), email: String(body.email || '').trim().toLowerCase(), phone:normalizePhone(body.phone), password: String(body.password || '') };
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(value.code) || ['admin','api','www','legacy','platform','support'].includes(value.code)) throw fail('Mã cửa hàng cần 3–40 ký tự chữ thường, số hoặc dấu gạch ngang.');
  if (!value.name || value.name.length > 120 || !value.owner || value.owner.length > 120) throw fail('Tên cửa hàng và chủ cửa hàng cần 1–120 ký tự.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 255) throw fail('Email không hợp lệ.');
  if (value.password.length < 10 || value.password.length > 128) throw fail('Mật khẩu cần 10–128 ký tự.');
  if (body.acceptTerms !== true) throw fail('Vui lòng chấp nhận điều khoản sử dụng.');
  return value;
}
function mailReady() {
  try { return new URL(process.env.SAAS_MAIL_WEBHOOK).protocol === 'https:' && !!process.env.SAAS_MAIL_TOKEN && [process.env.SAAS_PUBLIC_URL,process.env.SAAS_TERMS_URL,process.env.SAAS_PRIVACY_URL].every(value=>new URL(value).protocol==='https:'); } catch { return false; }
}
async function sendEmail(email, token, code) {
  if (!mailReady()) throw fail('Dịch vụ xác minh email chưa được cấu hình.', 503);
  const url = new URL('/dang-ky', process.env.SAAS_PUBLIC_URL);
  url.searchParams.set('verify', token);
  const response = await fetch(process.env.SAAS_MAIL_WEBHOOK, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.SAAS_MAIL_TOKEN }, body: JSON.stringify({ to: email, subject: 'Xác minh cửa hàng KAZUKO', text: `Mã cửa hàng: ${code}\nXác minh đăng ký: ${url}\nLiên kết hết hạn sau 24 giờ.` }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw fail('Chưa gửi được email xác minh. Vui lòng thử gửi lại.', 503);
}
async function register(body) {
  if (!registrationReady()) throw fail('Đăng ký dùng thử chưa được mở.', 503);
  const value = validate(body);
  const id = crypto.randomUUID(), token = crypto.randomBytes(32).toString('base64url');
  const duplicate=async q=>{
    const [row]=await q('SELECT SLUG,EMAILKEY,PHONEKEY FROM SAAS_TENANTS WHERE SLUG=? OR EMAILKEY=? OR PHONEKEY=?',[value.code,digest(value.email),digest(value.phone)]);
    const [login]=await q('SELECT LOGINKEY FROM SAAS_LOGINS WHERE LOGINKEY=?',[directory.key(value.username)]);
    if(login)throw fail('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.',409);
    if(row)throw fail(row.SLUG===value.code?'Mã cửa hàng đã được đăng ký.':row.EMAILKEY===digest(value.email)?'Email đã được đăng ký.':'Số điện thoại đã được đăng ký.',409);
  };
  try { await platform.transaction(async q => {
    await duplicate(q);
    await q("INSERT INTO SAAS_TENANTS (ID,SLUG,NAME,DBPATH,STATE,EMAIL,EMAILKEY,PHONE,PHONEKEY,OWNERNAME,OWNERLOGIN,PASSWORDHASH,VERIFYHASH,VERIFYUNTIL,VERIFIED) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,DATEADD(24 HOUR TO CURRENT_TIMESTAMP),?)", [id,value.code,value.name,require('path').join(platform.root(),'tenants',id+'.fdb'),instant()?'provisioning':'pending',value.email,digest(value.email),value.phone,digest(value.phone),value.owner,value.username,hashPassword(value.password),digest(token),instant()?1:0]);
    await directory.reserve(q,value.username,id,'SAAS_OWNER');
    if(instant())await q("INSERT INTO SAAS_JOBS (ID,TENANTID,STATE) VALUES (?,?,'queued')",[crypto.randomUUID(),id]);
    await platform.audit(q, 'registration', id, 'registration.created', instant()?'Đăng ký dùng thử trực tiếp; chưa xác minh email/số điện thoại.':'Chờ xác minh email.');
  }); } catch(error) { if(!error.status)await duplicate(platform.query);throw error; }
  if(instant())return {ok:true,code:value.code,username:value.username,statusToken:token,message:'Đăng ký thành công. Đang tạo dữ liệu riêng cho cửa hàng.'};
  await sendEmail(value.email, token, value.code);
  return { ok: true, username:value.username, message: 'Kiểm tra email để xác minh đăng ký. Sau khi xác minh, cửa hàng sẽ được khởi tạo.', code: value.code };
}
async function resend(body) {
  if (process.env.SAAS_REGISTRATION_ENABLED !== 'true' || !mailReady()) throw fail('Đăng ký dùng thử chưa được mở.', 503);
  const email = String(body.email || '').trim().toLowerCase(), code = String(body.code || '').trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('base64url');
  const found = await platform.transaction(async q => {
    const [row] = await q("SELECT ID FROM SAAS_TENANTS WHERE EMAIL=? AND SLUG=? AND STATE='pending' AND VERIFIED=0 WITH LOCK", [email,code]);
    if (!row) return false;
    await q('UPDATE SAAS_TENANTS SET VERIFYHASH=?,VERIFYUNTIL=DATEADD(24 HOUR TO CURRENT_TIMESTAMP) WHERE ID=?', [digest(token),row.ID]);
    return true;
  });
  if (found) await sendEmail(email, token, code);
  return { ok: true, message: 'Nếu đăng ký đang chờ xác minh, email đã được gửi lại.' };
}
async function verify(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ''))) throw fail('Liên kết xác minh không hợp lệ.');
  return platform.transaction(async q => {
    const [row] = await q('SELECT ID,SLUG,VERIFIED FROM SAAS_TENANTS WHERE VERIFYHASH=? AND VERIFYUNTIL>CURRENT_TIMESTAMP WITH LOCK', [digest(token)]);
    if (!row) throw fail('Liên kết xác minh không hợp lệ hoặc đã hết hạn.');
    if (!row.VERIFIED) {
      await q("UPDATE SAAS_TENANTS SET VERIFIED=1,STATE='provisioning' WHERE ID=?", [row.ID]);
      await q("INSERT INTO SAAS_JOBS (ID,TENANTID,STATE) VALUES (?,?,'queued')", [crypto.randomUUID(),row.ID]);
      await platform.audit(q, 'registration', row.ID, 'registration.verified', 'Đưa vào hàng đợi khởi tạo.');
    }
    return { ok: true, code: row.SLUG, statusToken: token };
  });
}
async function status(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ''))) throw fail('Mã theo dõi không hợp lệ.');
  const [row] = await platform.query('SELECT ID,SLUG,STATE,ENDSAT FROM SAAS_TENANTS WHERE VERIFYHASH=? AND VERIFYUNTIL>CURRENT_TIMESTAMP AND VERIFIED=1', [digest(token)]);
  if (!row) throw fail('Mã theo dõi đã hết hạn.', 404);
  const [login]=await platform.query('SELECT LOGINNAME FROM SAAS_LOGINS WHERE TENANTID=? AND USERID=?',[row.ID,'SAAS_OWNER']);
  return { code:row.SLUG,state:row.STATE,endsAt:row.ENDSAT,username:login?.LOGINNAME };
}
module.exports = { validate, register, resend, verify, status, mailReady, digest, instant, registrationReady, normalizePhone };
