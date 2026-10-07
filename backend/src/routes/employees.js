const express = require('express');
const router = express.Router();
const db = require('../db');
const { parsePhoto, imageMime, storePhoto } = require('../services/employeePhoto');

router.get('/:id/image', async (req, res) => {
  try {
    const bytes = await db.queryBlob('SELECT I.IMAGE FROM DNHANVIEN N JOIN SIMAGE I ON I.ID=N.SIMAGEID AND I.STATUS=1 WHERE N.ID=? AND N.STATUS IN (0,1)', [req.params.id], 'IMAGE');
    const mime = imageMime(bytes);
    if (!mime) return res.status(404).json({error:'Chưa có ảnh nhân viên.'});
    res.set('Content-Type',mime).set('Cache-Control','private, no-store').set('X-Content-Type-Options','nosniff').send(bytes);
  } catch(error) {res.status(500).json({error:error.message});}
});

router.get('/meta', async (req, res) => {
  try { res.json({ data: { departments: await db.query('SELECT ID,NAME,STATUS FROM DPHONGBAN ORDER BY NAME') } }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/commissions', async (req, res) => {
  try { res.set('Cache-Control', 'no-store').json(await require('../services/employeeCommissions').load(db.query, req.query)); }
  catch (error) { res.status(error.statusCode || 500).json({ error: error.message }); }
});

async function profile(body, current = {}) {
  const result = {};
  for (const key of ['NAME','CODE','DIENTHOAI','EMAIL','DIACHI','CHUNGCHI','CHUYENMON','NOTE','DPHONGBANID']) {
    const raw = key in body ? body[key] : current[key];
    if (raw != null && typeof raw !== 'string') throw Object.assign(new Error('Thông tin nhân viên không hợp lệ.'), { statusCode: 400 });
    if (String(raw || '').length > 255) throw Object.assign(new Error('Nội dung tối đa 255 ký tự.'), { statusCode: 400 });
    result[key] = String(raw || '').trim() || null;
  }
  if (!result.NAME) throw Object.assign(new Error('Họ và tên không được để trống.'), { statusCode: 400 });
  result.LOAINHANVIEN = Number(body.LOAINHANVIEN ?? current.LOAINHANVIEN ?? 0);
  if (![0,1,2,3,4].includes(result.LOAINHANVIEN)) throw Object.assign(new Error('Vai trò nhân viên không hợp lệ.'), { statusCode: 400 });
  result.CACHTINHLUONG = Number(body.CACHTINHLUONG ?? current.CACHTINHLUONG ?? 0);
  if (![0,1].includes(result.CACHTINHLUONG)) throw Object.assign(new Error('Cách tính lương không hợp lệ.'), { statusCode: 400 });
  for (const key of ['LUONGTHANG','LUONGCA']) {
    result[key] = Number(body[key] ?? current[key] ?? 0);
    if (!Number.isFinite(result[key]) || result[key] < 0 || result[key] > 1000000000 || Math.abs(result[key] * 100 - Math.round(result[key] * 100)) > 1e-6) throw Object.assign(new Error('Mức lương không hợp lệ.'), { statusCode: 400 });
  }
  if (result.DPHONGBANID && !(await db.query('SELECT ID FROM DPHONGBAN WHERE ID=? AND STATUS=1', [result.DPHONGBANID])).length && result.DPHONGBANID !== current.DPHONGBANID) throw Object.assign(new Error('Phòng ban không còn hoạt động.'), { statusCode: 400 });
  if (result.CODE && (await db.query('SELECT ID FROM DNHANVIEN WHERE UPPER(TRIM(CODE))=? AND ID<>?', [result.CODE.toUpperCase(), current.ID || ''])).length) throw Object.assign(new Error('Mã nhân viên đã tồn tại.'), { statusCode: 409 });
  return result;
}

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '') === '1';
    const rows = await db.query(
      `SELECT n.ID, n.NAME, n.CODE, n.NOTE, n.DIENTHOAI, n.DIACHI,
              n.EMAIL, n.CHUNGCHI, n.CHUYENMON, n.SIMAGEID, n.TIMECREATED,n.TIMEMODIFIED,
              CASE WHEN EXISTS (SELECT 1 FROM SIMAGE I WHERE I.ID=n.SIMAGEID AND I.STATUS=1 AND I.IMAGE IS NOT NULL) THEN 1 ELSE 0 END AS CO_ANHNV,
              n.NGHITHU7, n.NGHICHUNHAT, n.LOAINHANVIEN, n.CACHTINHLUONG,
              n.LUONGCA, n.LUONGTHANG, n.STATUS,n.DPHONGBANID,p.NAME AS PHONGBAN,
              u.ID AS SUSERID, u.USERNAME, g.ID AS SGROUPUSERID, g.NAME AS CHUCVU
         FROM DNHANVIEN n
         LEFT JOIN DPHONGBAN p ON p.ID=n.DPHONGBANID
         LEFT JOIN SUSER u ON u.DNHANVIENID=n.ID AND u.STATUS=1
         LEFT JOIN SGROUPUSER g ON g.ID=u.SGROUPUSERID AND g.STATUS=1
        WHERE ${includeInactive ? 'n.STATUS IN (0, 1)' : 'n.STATUS = 1'}
     ORDER BY n.TIMECREATED DESC`
    );
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = await profile(req.body);
    const photo = req.body.PHOTO !== undefined ? parsePhoto(req.body.PHOTO) : null;
    const id = db.uuidv4();
    if (!data.CODE) data.CODE = `NV-${id.slice(0,8).toUpperCase()}`;
    await db.transaction(async (query, execute, uuid) => {
    const imageId = await storePhoto(execute, uuid, photo, req.accessUser?.ID || 'SYSTEM', data.NAME);
    await execute(
      `INSERT INTO DNHANVIEN
         (ID,NAME,CODE,DIENTHOAI,EMAIL,DIACHI,CHUNGCHI,CHUYENMON,NOTE,DPHONGBANID,LOAINHANVIEN,
          CACHTINHLUONG,LUONGCA,LUONGTHANG,SIMAGEID,USERCREATEDID,TIMECREATED,STATUS)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,1)`,
      [id,data.NAME,data.CODE,data.DIENTHOAI,data.EMAIL,data.DIACHI,data.CHUNGCHI,data.CHUYENMON,data.NOTE,data.DPHONGBANID,data.LOAINHANVIEN,data.CACHTINHLUONG,data.LUONGCA,data.LUONGTHANG,imageId, req.accessUser?.ID || 'SYSTEM']
    );
    });
    res.json({ ok: true, id });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const [current] = await db.query('SELECT * FROM DNHANVIEN WHERE ID=?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    const data = await profile(req.body, current);
    const changedPhoto = req.body.PHOTO !== undefined;
    const photo = changedPhoto ? parsePhoto(req.body.PHOTO) : null;
    await db.transaction(async (query, execute, uuid) => {
    const imageId = changedPhoto ? await storePhoto(execute, uuid, photo, req.accessUser?.ID || 'SYSTEM', data.NAME) : current.SIMAGEID;
    await execute(
      `UPDATE DNHANVIEN
          SET NAME=?, CODE=?, DIENTHOAI=?, EMAIL=?, DIACHI=?, CHUNGCHI=?, CHUYENMON=?, NOTE=?, DPHONGBANID=?, LOAINHANVIEN=?, CACHTINHLUONG=?, LUONGCA=?, LUONGTHANG=?,
              SIMAGEID=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP
        WHERE ID=?`,
      [data.NAME,data.CODE,data.DIENTHOAI,data.EMAIL,data.DIACHI,data.CHUNGCHI,data.CHUYENMON,data.NOTE,data.DPHONGBANID,data.LOAINHANVIEN,data.CACHTINHLUONG,data.LUONGCA,data.LUONGTHANG,imageId, req.accessUser?.ID || 'SYSTEM', req.params.id]
    );
    });
    res.json({ ok: true });
  } catch (e) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    if (![0,1].includes(req.body.status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    if (req.body.status === 0 && req.params.id === req.accessUser?.DNHANVIENID) return res.status(400).json({ error: 'Không thể ngừng hồ sơ của chính bạn đang đăng nhập.' });
    await db.transaction(async (query, execute) => {
      if (!(await query('SELECT ID FROM DNHANVIEN WHERE ID=?', [req.params.id])).length) throw Object.assign(new Error('Không tìm thấy nhân viên.'), { statusCode: 404 });
      await execute('UPDATE DNHANVIEN SET STATUS=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [req.body.status,req.accessUser?.ID || 'SYSTEM',req.params.id]);
      if (req.body.status === 0) await execute('UPDATE SUSER SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE DNHANVIENID=?', [req.accessUser?.ID || 'SYSTEM',req.params.id]);
    });
    res.json({ ok: true });
  } catch (error) { res.status(error.statusCode || 500).json({ error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.transaction(async (query, execute) => {
      await execute(`UPDATE DNHANVIEN SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [req.accessUser?.ID || 'SYSTEM', req.params.id]);
      await execute(`UPDATE SUSER SET STATUS=0,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE DNHANVIENID=?`, [req.accessUser?.ID || 'SYSTEM', req.params.id]);
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
