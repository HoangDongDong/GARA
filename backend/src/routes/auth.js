const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../authSecurity');
const { authenticate, loadAccessUser } = require('../accessControl');

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username ?? req.body.USERNAME ?? '').trim();
    const password = String(req.body.password ?? req.body.PASSWORD ?? '');
    if (!username || !password) return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' });
    const rows = await db.query(
      `SELECT FIRST 1 ID, USERNAME, NAME, PASSWORD, NOTE
         FROM SUSER WHERE UPPER(USERNAME)=UPPER(?) AND STATUS=1`, [username]
    );
    const account = rows[0];
    const storedPassword = account?.PASSWORD || account?.NOTE;
    if (!account || !verifyPassword(password, storedPassword)) {
      return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu.' });
    }
    if (!String(storedPassword).startsWith('scrypt$')) {
      await db.execute(`UPDATE SUSER SET PASSWORD=?,NOTE=NULL,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [hashPassword(password), account.ID]);
    } else if (account.NOTE) {
      await db.execute(`UPDATE SUSER SET NOTE=NULL,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [account.ID]);
    }
    const user = await loadAccessUser(account.ID);
    res.json({ ok: true, token: signToken(account.ID), data: {
      ID: user.ID, USERNAME: user.USERNAME, TEN_HIEN_THI: user.EMPLOYEENAME || user.NAME || user.USERNAME,
      ROLE: user.GROUPNAME || (Number(user.ISADMIN) === 1 ? 'Admin' : ''), ISADMIN: Number(user.ISADMIN || 0),
      DNHANVIENID: user.DNHANVIENID, PERMISSIONS: user.permissions,
    }});
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/me', authenticate, (req, res) => {
  const user = req.accessUser;
  res.json({ data: { ID: user.ID, USERNAME: user.USERNAME, TEN_HIEN_THI: user.EMPLOYEENAME || user.NAME || user.USERNAME, ROLE: user.GROUPNAME, ISADMIN: Number(user.ISADMIN || 0), PERMISSIONS: user.permissions } });
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
