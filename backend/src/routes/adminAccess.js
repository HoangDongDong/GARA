const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword } = require('../authSecurity');

const clean = (value) => String(value ?? '').trim();
const duplicateError = (error) => String(error?.message || '').toLowerCase().includes('unique');

router.get('/overview', async (req, res) => {
  try {
    const [groups, users, functions, employees] = await Promise.all([
      db.query(`SELECT g.ID,g.NAME,g.NOTE,g.STATUS,COUNT(u.ID) AS USERCOUNT
                  FROM SGROUPUSER g LEFT JOIN SUSER u ON u.SGROUPUSERID=g.ID AND u.STATUS=1
                 WHERE g.STATUS=1 GROUP BY g.ID,g.NAME,g.NOTE,g.STATUS ORDER BY g.NAME`),
      db.query(`SELECT u.ID,u.USERNAME,u.NAME,u.EMAIL,u.STATUS,u.ISADMIN,u.SGROUPUSERID,u.DNHANVIENID,
                       n.NAME AS EMPLOYEENAME,g.NAME AS GROUPNAME
                  FROM SUSER u LEFT JOIN DNHANVIEN n ON n.ID=u.DNHANVIENID
                  LEFT JOIN SGROUPUSER g ON g.ID=u.SGROUPUSERID WHERE u.STATUS=1 ORDER BY u.USERNAME`),
      db.query(`SELECT ID,CODE,NAME,NOTE AS GROUPNAME,SORTORDER FROM SFUNCTION WHERE STATUS=1 ORDER BY SORTORDER,NAME`),
      db.query(`SELECT n.ID,n.NAME,n.DIENTHOAI,n.EMAIL,
                       (SELECT FIRST 1 u.ID FROM SUSER u WHERE u.DNHANVIENID=n.ID AND u.STATUS=1) AS USERID
                  FROM DNHANVIEN n WHERE n.STATUS=1 ORDER BY n.NAME`),
    ]);
    res.json({ data: { groups, users, functions, employees } });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/groups', async (req, res) => {
  try {
    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ error: 'Tên chức vụ không được để trống.' });
    const exists = await db.query(`SELECT ID FROM SGROUPUSER WHERE UPPER(NAME)=UPPER(?) AND STATUS=1`, [name]);
    if (exists.length) return res.status(409).json({ error: 'Chức vụ này đã tồn tại.' });
    const id = db.uuidv4();
    await db.execute(`INSERT INTO SGROUPUSER (ID,NAME,NOTE,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,1,?,CURRENT_TIMESTAMP)`, [id, name, clean(req.body.note) || null, req.accessUser.ID]);
    res.status(201).json({ ok: true, id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/groups/:id', async (req, res) => {
  try {
    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ error: 'Tên chức vụ không được để trống.' });
    await db.execute(`UPDATE SGROUPUSER SET NAME=?,NOTE=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=? AND STATUS=1`, [name, clean(req.body.note) || null, req.accessUser.ID, req.params.id]);
    res.json({ ok: true });
  } catch (error) { res.status(duplicateError(error) ? 409 : 500).json({ error: duplicateError(error) ? 'Tên chức vụ đã tồn tại.' : error.message }); }
});

router.delete('/groups/:id', async (req, res) => {
  try {
    const users = await db.query(`SELECT COUNT(*) AS TOTAL FROM SUSER WHERE SGROUPUSERID=? AND STATUS=1`, [req.params.id]);
    if (Number(users[0]?.TOTAL || 0) > 0) return res.status(409).json({ error: 'Chức vụ đang có tài khoản. Hãy chuyển tài khoản sang chức vụ khác trước.' });
    await db.execute(`UPDATE SGROUPUSER SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [req.accessUser.ID, req.params.id]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/groups/:id/permissions', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT f.ID AS FUNCTIONID,f.CODE,f.NAME,f.NOTE AS GROUPNAME,COALESCE(r.MODE,0) AS MODE
         FROM SFUNCTION f LEFT JOIN SGROUPROLE r ON r.SFUNCTIONID=f.ID AND r.SGROUPUSERID=? AND r.STATUS=1
        WHERE f.STATUS=1 ORDER BY f.SORTORDER,f.NAME`, [req.params.id]
    );
    res.json({ data: rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/groups/:id/permissions', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const groups = await db.query(`SELECT NAME FROM SGROUPUSER WHERE ID=? AND STATUS=1`, [req.params.id]);
    if (!groups.length) return res.status(404).json({ error: 'Không tìm thấy chức vụ.' });
    const isAdminGroup = String(groups[0].NAME || '').toLocaleLowerCase('vi') === 'admin';
    const restricted = await db.query(`SELECT ID FROM SFUNCTION WHERE CODE IN ('ADMIN','SETTINGS')`);
    const restrictedIds = new Set(restricted.map((item) => item.ID));
    await db.transaction(async (query, execute, uuid) => {
      for (const item of items) {
        const mode = isAdminGroup ? 31 : (restrictedIds.has(item.functionId) ? 0 : Math.max(0, Math.min(31, Number(item.mode || 0))));
        const existing = await query(`SELECT FIRST 1 ID FROM SGROUPROLE WHERE SGROUPUSERID=? AND SFUNCTIONID=?`, [req.params.id, item.functionId]);
        if (existing.length) {
          await execute(`UPDATE SGROUPROLE SET MODE=?,STATUS=1,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [mode, req.accessUser.ID, existing[0].ID]);
        } else {
          await execute(`INSERT INTO SGROUPROLE (ID,STATUS,USERCREATEDID,TIMECREATED,SGROUPUSERID,SFUNCTIONID,MODE) VALUES (?,1,?,CURRENT_TIMESTAMP,?,?,?)`, [uuid(), req.accessUser.ID, req.params.id, item.functionId, mode]);
        }
      }
    });
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const username = clean(req.body.username);
    const password = String(req.body.password || '');
    const employeeId = clean(req.body.employeeId) || null;
    const groupId = clean(req.body.groupId) || null;
    if (!employeeId || !username || !password || !groupId) return res.status(400).json({ error: 'Vui lòng chọn nhân viên, chức vụ và nhập đủ tài khoản, mật khẩu.' });
    if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    if (employeeId) {
      const linked = await db.query(`SELECT ID FROM SUSER WHERE DNHANVIENID=? AND STATUS=1`, [employeeId]);
      if (linked.length) return res.status(409).json({ error: 'Nhân viên này đã có tài khoản.' });
    }
    const employees = employeeId ? await db.query(`SELECT NAME,EMAIL FROM DNHANVIEN WHERE ID=? AND STATUS=1`, [employeeId]) : [];
    if (employeeId && !employees.length) return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    const id = db.uuidv4();
    await db.execute(
      `INSERT INTO SUSER (ID,NAME,USERNAME,PASSWORD,EMAIL,ISADMIN,SGROUPUSERID,DNHANVIENID,STATUS,USERCREATEDID,TIMECREATED)
       VALUES (?,?,?,?,?,0,?,?,1,?,CURRENT_TIMESTAMP)`,
      [id, employees[0]?.NAME || username, username, hashPassword(password), clean(req.body.email) || employees[0]?.EMAIL || null, groupId, employeeId, req.accessUser.ID]
    );
    res.status(201).json({ ok: true, id });
  } catch (error) { res.status(duplicateError(error) ? 409 : 500).json({ error: duplicateError(error) ? 'Tên đăng nhập đã tồn tại.' : error.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const username = clean(req.body.username);
    const groupId = clean(req.body.groupId) || null;
    const password = String(req.body.password || '');
    if (!username || !groupId) return res.status(400).json({ error: 'Tài khoản và chức vụ không được để trống.' });
    if (password && password.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    if (password) {
      await db.execute(`UPDATE SUSER SET USERNAME=?,EMAIL=?,SGROUPUSERID=?,PASSWORD=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=? AND STATUS=1`, [username, clean(req.body.email) || null, groupId, hashPassword(password), req.accessUser.ID, req.params.id]);
    } else {
      await db.execute(`UPDATE SUSER SET USERNAME=?,EMAIL=?,SGROUPUSERID=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=? AND STATUS=1`, [username, clean(req.body.email) || null, groupId, req.accessUser.ID, req.params.id]);
    }
    res.json({ ok: true });
  } catch (error) { res.status(duplicateError(error) ? 409 : 500).json({ error: duplicateError(error) ? 'Tên đăng nhập đã tồn tại.' : error.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.accessUser.ID) return res.status(409).json({ error: 'Không thể khóa chính tài khoản đang đăng nhập.' });
    const users = await db.query(`SELECT ISADMIN FROM SUSER WHERE ID=?`, [req.params.id]);
    if (Number(users[0]?.ISADMIN || 0) === 1) return res.status(409).json({ error: 'Không thể khóa tài khoản quản trị hệ thống.' });
    await db.execute(`UPDATE SUSER SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [req.accessUser.ID, req.params.id]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
