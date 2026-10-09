const router = require('express').Router();
const tenancy = require('../tenancy');
const platform = require('../services/platform');
const registration = require('../services/saasRegistration');
const security = require('../authSecurity');
const credentials=require('../services/platformCredentials');
const wrap = task => async (req,res) => { try { res.set('Cache-Control','no-store'); await task(req,res); } catch (error) { if (!error.status) console.error('SaaS:',error.message); res.status(error.status || 503).json({ error:error.status ? error.message : 'Hệ thống cửa hàng tạm thời chưa sẵn sàng.' }); } };
const attempts = new Map();
function limit(req,res,next) {
  const now = Date.now();
  for (const [key,entry] of attempts) if (entry.until < now) attempts.delete(key);
  const key = req.ip + ':' + (req.path.startsWith('/admin')?'admin':'registration');
  if (!attempts.has(key)) {
    if (attempts.size >= 10000) return res.status(429).json({error:'Vui lòng thử lại sau.'});
    attempts.set(key,{count:0,until:now+3600000});
  }
  const entry = attempts.get(key);
  const maximum=registration.instant() && !req.path.startsWith('/admin')?300:20;
  if (++entry.count > maximum) return res.status(429).set('Retry-After',String(Math.ceil((entry.until-now)/1000))).json({error:'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.'});
  next();
}
router.get('/info',(req,res) => res.json({ enabled:tenancy.enabled(), registrationOpen:tenancy.enabled() && registration.registrationReady(), verificationRequired:!registration.instant(), trialDays:Math.max(1,Math.min(90,Number(process.env.SAAS_TRIAL_DAYS)||14)), termsUrl:process.env.SAAS_TERMS_URL || null, privacyUrl:process.env.SAAS_PRIVACY_URL || null }));
router.use((req,res,next) => tenancy.enabled() ? next() : res.status(404).json({error:'Chế độ nhiều cửa hàng chưa được bật.'}));
router.post('/register',limit,wrap(async(req,res) => res.status(201).json(await registration.register(req.body))));
router.post('/resend',limit,wrap(async(req,res) => res.json(await registration.resend(req.body))));
router.post('/verify',limit,wrap(async(req,res) => res.json(await registration.verify(req.body.token))));
router.post('/status',wrap(async(req,res) => res.json(await registration.status(req.body.token))));
router.get('/admin/setup-status',wrap(async(req,res)=>res.json({needsSetup:!credentials.passwordHash()})));
router.post('/admin/setup',limit,wrap(async(req,res)=>{credentials.setup(req,req.body.password);res.json({ok:true});}));
router.post('/admin/login',limit,wrap(async(req,res) => {
  const stored = credentials.passwordHash();
  if (!stored?.startsWith('scrypt$')) throw platform.fail('Tài khoản quản trị nền tảng chưa được cấu hình.',503);
  if (String(req.body.password||'').length>128 || !security.verifyPassword(req.body.password,stored)) throw platform.fail('Thông tin quản trị không đúng.',401);
  res.json({token:security.signToken('platform-admin',security.credentialVersion(stored),{audience:'platform'})});
}));
// Separate middleware, never accept a store Admin's garage token here.
router.use('/admin',(req,res,next) => {
  const payload = security.verifyToken(String(req.headers.authorization||'').replace(/^Bearer\s+/i,''));
  const stored = credentials.passwordHash();
  if (!stored || !payload || payload.aud!=='platform' || payload.sub!=='platform-admin' || payload.pv!==security.credentialVersion(stored)) return res.status(401).json({error:'Cần đăng nhập quản trị nền tảng.'});
  next();
});
router.post('/admin/logout',(req,res) => { security.revokeToken(String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')); res.json({ok:true}); });
router.get('/admin/tenants',wrap(async(req,res) => {
  const offset = Number(req.query.offset||0);
  if (!Number.isInteger(offset)||offset<0) throw platform.fail('Phân trang không hợp lệ.');
  const rows = await platform.query(`SELECT FIRST 101 SKIP ${offset} ID,SLUG,NAME,STATE,EMAIL,PHONE,CREATED,STARTSAT,ENDSAT,SCHEMAVERSION FROM SAAS_TENANTS ORDER BY CREATED DESC,ID`);
  res.json({data:rows.slice(0,100),hasMore:rows.length>100});
}));
router.get('/admin/operations',wrap(async(req,res) => res.json({jobs:await platform.query('SELECT FIRST 100 ID,TENANTID,STATE,ATTEMPTS,ERROR,CREATED,FINISHED FROM SAAS_JOBS ORDER BY CREATED DESC'),backups:await platform.query('SELECT FIRST 100 ID,TENANTID,STATE,CREATED,VERIFIED FROM SAAS_BACKUPS ORDER BY CREATED DESC'),audit:await platform.query('SELECT FIRST 100 ACTOR,TENANTID,ACTION,DETAIL,CREATED FROM SAAS_AUDIT ORDER BY CREATED DESC')})));
router.post('/admin/tenants/:id/:action',wrap(async(req,res) => {
  const action = req.params.action, id = req.params.id, reason = String(req.body.reason||'').trim();
  if (!['extend','suspend','resume','retry'].includes(action)||reason.length<5||reason.length>500) throw platform.fail('Chọn thao tác hợp lệ và nhập lý do 5–500 ký tự.');
  await platform.transaction(async q => {
    const [row] = await q('SELECT ID,STATE FROM SAAS_TENANTS WHERE ID=? WITH LOCK',[id]);
    if (!row) throw platform.fail('Không tìm thấy cửa hàng.',404);
    if (action==='extend') {
      const days = Number(req.body.days);
      if (!Number.isInteger(days)||days<1||days>365||!['active','suspended'].includes(row.STATE)) throw platform.fail('Gia hạn từ 1–365 ngày cho cửa hàng đã khởi tạo.');
      await q('UPDATE SAAS_TENANTS SET ENDSAT=DATEADD(? DAY TO CASE WHEN ENDSAT>CURRENT_TIMESTAMP THEN ENDSAT ELSE CURRENT_TIMESTAMP END) WHERE ID=?',[days,id]);
    } else if (action==='retry') {
      if (row.STATE!=='failed') throw platform.fail('Chỉ thử lại tác vụ đã thất bại.');
      await q("UPDATE SAAS_JOBS SET STATE='queued',ATTEMPTS=0,ERROR=NULL,LEASEUNTIL=NULL,LEASEID=NULL WHERE TENANTID=?",[id]);
      await q("UPDATE SAAS_TENANTS SET STATE='provisioning' WHERE ID=?",[id]);
    } else {
      if (!['active','suspended'].includes(row.STATE)) throw platform.fail('Cửa hàng chưa được khởi tạo.');
      await q('UPDATE SAAS_TENANTS SET STATE=? WHERE ID=?',[action==='suspend'?'suspended':'active',id]);
    }
    await platform.audit(q,'platform-admin',id,'tenant.'+action,reason);
  });
  res.json({ok:true});
}));
module.exports = router;
