const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../authSecurity');
const { authenticate, loadAccessUser } = require('../accessControl');
const tenancy = require('../tenancy');
router.post('/login', require('../services/loginLimiter').middleware, async (req, res, next) => {
  if (!tenancy.enabled()) return next();
  try {
    const code = String(req.body.tenantCode || '').trim().toLowerCase();
    let tenant;
    if(code){
      if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(code)) return res.status(400).json({ error: 'Mã cửa hàng không hợp lệ.' });
      tenant=await require('../services/platform').find(code,true);
    }else{
      const login=await require('../services/loginDirectory').resolve(req.body.username ?? req.body.USERNAME);
      req.directoryLogin=login;
      tenant=login.tenant;
    }
    req.tenant = tenant;
    tenancy.run(tenant, next);
  } catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Chưa kết nối được hệ thống cửa hàng.' }); }
});

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username ?? req.body.USERNAME ?? '').trim();
    const password = String(req.body.password ?? req.body.PASSWORD ?? '');
    if (username.length>120 || password.length>256) return res.status(400).json({error:'Thông tin đăng nhập quá dài.'});
    if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' });
    const rows = await db.query(
      `SELECT FIRST 1 ID, USERNAME, NAME, PASSWORD, NOTE
         FROM SUSER WHERE ${req.directoryLogin?'ID=?':'UPPER(USERNAME)=UPPER(?)'} AND STATUS=1`, [req.directoryLogin?.USERID || username]
    );
    const account = rows[0];
    const storedPassword = account?.PASSWORD || account?.NOTE;
    if (!account || (req.directoryLogin && String(account.USERNAME).toLowerCase()!==String(req.directoryLogin.LOCALNAME).toLowerCase()) || !verifyPassword(password, storedPassword)) {
      return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu.' });
    }
    if (!String(storedPassword).startsWith('scrypt$')) {
      await db.execute(`UPDATE SUSER SET PASSWORD=?,NOTE=NULL,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [hashPassword(password), account.ID]);
    } else if (account.NOTE) {
      await db.execute(`UPDATE SUSER SET NOTE=NULL,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [account.ID]);
    }
    const user = await loadAccessUser(account.ID);
    res.json({ ok: true, token: signToken(account.ID,user.credentialVersion,{tenantId:req.tenant?.id}), data: {
      TENANT: req.tenant ? require('../services/platform').publicTenant(req.tenant) : null,
      ID: user.ID, USERNAME: req.directoryLogin?.LOGINNAME || user.USERNAME, TEN_HIEN_THI: user.EMPLOYEENAME || user.NAME || user.USERNAME,
      ROLE: user.GROUPNAME || (Number(user.ISADMIN) === 1 ? 'Admin' : ''), ISADMIN: Number(user.ISADMIN || 0),
      DNHANVIENID: user.DNHANVIENID, PERMISSIONS: user.permissions,
    }});
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/logout',authenticate,(req,res)=>{require('../authSecurity').revokeToken(String(req.headers.authorization||'').replace(/^Bearer\s+/i,''));res.json({ok:true});});

router.get('/me', authenticate, async (req, res) => {
  try{
  const user = req.accessUser;
  const [login]=req.tenant ? await require('../services/platform').query('SELECT LOGINNAME FROM SAAS_LOGINS WHERE TENANTID=? AND USERID=?',[req.tenant.id,user.ID]) : [];
  res.json({ data: { TENANT: req.tenant ? require('../services/platform').publicTenant(req.tenant) : null, ID: user.ID, USERNAME: login?.LOGINNAME || user.USERNAME, TEN_HIEN_THI: user.EMPLOYEENAME || user.NAME || user.USERNAME, ROLE: user.GROUPNAME, ISADMIN: Number(user.ISADMIN || 0), PERMISSIONS: user.permissions } });
  }catch(error){res.status(503).json({error:'Chưa tải được thông tin tài khoản.'});}
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPass, newPass } = req.body;
    if (!newPass || String(newPass).length < 6) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    const rows = await db.query(`SELECT PASSWORD, NOTE FROM SUSER WHERE ID=?`, [req.accessUser.ID]);
    if (!rows.length || !verifyPassword(oldPass, rows[0].PASSWORD || rows[0].NOTE)) return res.status(401).json({ error: 'Mật khẩu cũ không đúng.' });
    await db.execute(`UPDATE SUSER SET PASSWORD=?, NOTE=NULL, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [hashPassword(newPass), req.accessUser.ID]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
