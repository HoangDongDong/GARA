/**
 * Route: /api/system-config
 * Đọc và ghi cấu hình hệ thống từ bảng SCONFIG / SCONFIGGROUP trong GARAGE.FDB.
 *
 * GET  /               - toàn bộ SCONFIG kèm tên nhóm
 * GET  /groups         - danh sách SCONFIGGROUP
 * GET  /grouped        - nhóm và metadata cho giao diện cấu hình
 * GET  /:name          - một cấu hình theo NAME (e.g. CompanyName)
 * PUT  /:name          - cập nhật giá trị theo DATATYPE
 * PUT  /bulk           - cập nhật trong transaction [{ id hoặc name, value }]
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');
const { validateLogo } = require('../services/companyLogo');
const { decodeConfigImage, encodeConfigImage } = require('../services/configImageStorage');
const { templateFilter, templateOptions } = require('../services/systemConfigOptions');


// ---- helpers ----
function toVal(row) {
  const dt = Number(row.DATATYPE || 1);
  if (dt === 2) return row.DATETIMEVALUE ?? null;
  if (dt === 3) return row.INTVALUE ?? null;
  if (dt === 4) return row.DECIMALVALUE ?? null;
  return row.TEXTVALUE ?? null;
}

// GET /api/system-config
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT s.ID, s.NAME, s.CAPTION, s.TEXTVALUE, s.INTVALUE, s.DECIMALVALUE,
             s.DATETIMEVALUE, s.DATATYPE, s.CONTROLTYPE, s.SORTORDER,
             s.STATUS, s.SHOWONREPORT, s.HEADER, s.FOOTER, s.SOCOT, s.TAB,
             g.NAME AS GROUP_NAME, g.ID AS GROUP_ID
        FROM SCONFIG s
        LEFT JOIN SCONFIGGROUP g ON g.ID = s.SCONFIGGROUPID
       WHERE s.STATUS = 30
       ORDER BY g.SORTORDER, s.SORTORDER, s.NAME`);
    res.json({
      data: rows.map((r) => ({ ...r, value: toVal(r) })),
      total: rows.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/system-config/db-info  — thông tin kết nối DB thực (không expose mật khẩu)
router.get('/db-info', async (req, res) => {
  try {
    const fb = config.firebird;
    const pingOk = await db.ping().then(() => true).catch(() => false);
    res.json({
      dbType: 'Firebird 2.5',
      host: fb.host || '127.0.0.1',
      port: fb.port || 3050,
      database: fb.database || '',
      user: fb.user || 'SYSDBA',
      connected: pingOk,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Preview only: never reserves or consumes a document number.
router.post('/number-preview', (req,res) => {
  try {
    const {parsePattern,formatNumber,periodFor}=require('../services/documentNumbers');
    const {pattern,digits}=parsePattern(req.body.pattern);
    res.json({first:formatNumber(pattern,1),last:formatNumber(pattern,10**digits-1),reset:periodFor(pattern)==='ALL'?'Liên tục':pattern.includes('(dd)')?'Mỗi ngày':pattern.includes('(MM)')?'Mỗi tháng':'Mỗi năm'});
  } catch(e){res.status(400).json({error:e.message});}
});

// GET /api/system-config/groups
router.get('/groups', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT ID, NAME, AUTOID, SORTORDER FROM SCONFIGGROUP WHERE STATUS=30 ORDER BY SORTORDER, AUTOID`
    );
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Metadata-driven editor, matching the grouped load/save flow of the GYM app.
router.get('/grouped', async (req, res) => {
  try {
    const groups = await db.query(`SELECT ID, NAME FROM SCONFIGGROUP
      WHERE (STATUS <> -1 OR STATUS IS NULL) AND NAME <> 'Không hiển thị'
      ORDER BY SORTORDER, NAME`);
    const rows = await db.query(`SELECT ID, NAME, CAPTION, CONTROLTYPE, DATATYPE,
      OTHERCONFIG, REFTABLEID, TEXTVALUE, INTVALUE, DECIMALVALUE, DATETIMEVALUE,
      MOREDETAIL, NOTE, SCONFIGGROUPID, SOCOT, TAB,
      CASE WHEN BLOBVALUE IS NULL THEN 0 ELSE 1 END AS HAS_BLOB
      FROM SCONFIG WHERE STATUS <> -1 OR STATUS IS NULL ORDER BY SORTORDER, NAME`);
    const data = groups.map(g => ({ groupId: g.ID, groupName: g.NAME, items: [] }));
    const map = new Map(data.map(g => [g.groupId, g]));
    const optionCache = new Map();
    for (const row of rows) {
      if (!map.has(row.SCONFIGGROUPID)) continue;
      const blob = row.HAS_BLOB ? await db.queryBlob('SELECT BLOBVALUE FROM SCONFIG WHERE ID=?', [row.ID], 'BLOBVALUE') : null;
      const filter = templateFilter(row.OTHERCONFIG);
      let options;
      if (filter) {
        const key = JSON.stringify(filter.ids);
        if (!optionCache.has(key)) optionCache.set(key, await templateOptions(db.query, filter));
        options = optionCache.get(key);
      }
      map.get(row.SCONFIGGROUPID).items.push({ ...row, BLOBVALUE: decodeConfigImage(blob)?.toString('base64') ?? null, OPTIONS: options });
    }
    // Garage's existing seed uses 7=checkbox, 9=number; GYM uses 9=checkbox, 3=number.
    res.json({ data, controlConvention: rows.some(r => Number(r.CONTROLTYPE) === 7) ? 'garage' : 'gym' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function inputError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function typedValue(row, value) {
  const type = Number(row.DATATYPE || 1);
  const column = { 1: 'TEXTVALUE', 2: 'DATETIMEVALUE', 3: 'INTVALUE', 4: 'DECIMALVALUE', 5: 'BLOBVALUE' }[type];
  if (!column) throw inputError(`Kiểu dữ liệu không được hỗ trợ: ${row.NAME}`);
  if (value == null || (value === '' && type !== 1)) return [column, null];
  if (type === 3 || type === 4) {
    const number = Number(value);
    if (!Number.isFinite(number) || (type === 3 && (!Number.isInteger(number) || number < -2147483648 || number > 2147483647))) {
      throw inputError(`Giá trị số không hợp lệ: ${row.NAME}`);
    }
    return [column, number];
  }
  if (type === 2) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw inputError(`Ngày giờ không hợp lệ: ${row.NAME}`);
    return [column, date];
  }
  if (type === 5) {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw inputError(`Ảnh không hợp lệ: ${row.NAME}`);
    const blob=Buffer.from(value,'base64');
    if(row.NAME==='CompanyLogo')validateLogo(blob);
    return [column,encodeConfigImage(blob)];
  }
  return [column, String(value)];
}

async function updateItems(items, userId) {
  if (!Array.isArray(items) || !items.length) throw inputError('Danh sách cấu hình trống.');
  await db.transaction(async (query, execute) => {
    const seen = new Set();
    for (const item of items) {
      if (!item || (!item.id && !item.name) || !Object.hasOwn(item, 'value')) throw inputError('Thiếu mã hoặc giá trị cấu hình.');
      const rows = await query(`SELECT ID, NAME, DATATYPE, OTHERCONFIG FROM SCONFIG WHERE ${item.id ? 'ID' : 'NAME'}=? AND (STATUS <> -1 OR STATUS IS NULL)`, [item.id || item.name]);
      if (rows.length !== 1) throw inputError(`Không tìm thấy cấu hình duy nhất: ${item.id || item.name}`);
      const row = rows[0];
      require('../services/salesPrintVisibility').validate(row.NAME, item.value);
      if (require('../services/documentNumbers').definitions.some(type=>type.name===row.NAME)) require('../services/documentNumbers').parsePattern(item.value);
      if (seen.has(row.ID)) throw inputError(`Cấu hình bị trùng: ${row.NAME}`);
      seen.add(row.ID);
      const [column, value] = typedValue(row, item.value);
      const filter = templateFilter(row.OTHERCONFIG);
      if (filter && value) {
        if (!filter.ids.includes(String(value).toLowerCase())) throw inputError(`Mẫu in không thuộc danh sách của ${row.NAME}.`);
        const templates = await query('SELECT ID FROM STEMPLATE WHERE ID=? AND STATUS IN (0,30)', [value]);
        if (!templates.length) throw inputError(`Mẫu in không thuộc danh sách của ${row.NAME}.`);
      }
      await execute(`UPDATE SCONFIG SET ${column}=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [value, userId, row.ID]);
    }
  });
  require('../services/salesPrint')._invalidateCompanyCache?.();
}

// PUT /api/system-config/bulk  body: [{ name, value }]
router.put('/bulk', async (req, res) => {
  try {
    const items = req.body;
    await updateItems(items, req.accessUser?.ID || null);
    res.json({ ok: true, updated: items.length });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// GET /api/system-config/:name
router.get('/:name', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM SCONFIG WHERE NAME=? AND STATUS=30`, [req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy cấu hình.' });
    const row = rows[0];
    res.json({ data: { ...row, value: toVal(row) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/system-config/:name  body: { value }
router.put('/:name', async (req, res) => {
  try {
    await updateItems([{ name: req.params.name, value: req.body.value }], req.accessUser?.ID || null);
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = router;
