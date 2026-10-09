const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const db = require('../db');
const config = require('../config');
const { documentTypes, buildCatalog } = require('../services/garagePrintCatalog');
const { templateFilter } = require('../services/systemConfigOptions');
const webDesigner = require('../services/webReportDesigner');

const router = express.Router();
router.use((req,res,next)=>{
  if(require('../tenancy').enabled() && ['POST','PUT','PATCH'].includes(req.method) && !/^\/[^/]+\/(?:default|assignment)$/.test(req.path))return res.status(403).json({error:'Bản SaaS hiện dùng mẫu in chuẩn. Chỉnh sửa/tải mẫu tùy ý sẽ mở sau khi bộ dựng báo cáo được cách ly.'});
  next();
});
const MAX_TEMPLATE_BYTES = 20 * 1024 * 1024;
const designerSessions = new Map();
const designerExecutable = process.env.FASTREPORT_DESIGNER_EXE || path.resolve(
  __dirname, '..', '..', 'tools', 'fastreport-designer', 'bin', 'Release',
  'net8.0-windows', 'Garage.FastReportDesigner.exe'
);

const safeFileName = (name) => String(name || 'mau-in')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'mau-in';

const quotePowerShellLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const launchDesigner = (templatePath) => {
  // The API server is commonly started in a hidden PowerShell window. Launching
  // the WinForms executable directly inherits that hidden startup state, so use
  // Start-Process to create a normal interactive desktop window and wait for it.
  const command = [
    `$process = Start-Process -FilePath ${quotePowerShellLiteral(designerExecutable)} -ArgumentList ${quotePowerShellLiteral(templatePath)} -WindowStyle Maximized -PassThru -Wait`,
    'exit $process.ExitCode',
  ].join('; ');

  return spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command', command,
  ], {
    cwd: path.dirname(designerExecutable),
    windowsHide: true,
    stdio: 'ignore',
  });
};

const templateListSql = `
  SELECT t.ID, t.NAME, t.NOTE, t.STATUS, t.AUTOID, t.SORTORDER,
         t.SFORMID, t.STABLEDESCID, t.SIMAGEID, t.REPORTBASE,
         t.BARCODE, t.BARCODECOL, t.TIMEMODIFIED,
         CASE WHEN t.TEMPLATE IS NULL THEN 0 ELSE 1 END AS HAS_TEMPLATE,
         f.NAME AS FORM_NAME, f.NOTEMPLATE AS NUMBER_PATTERN,
         f.LASTTEMPLATEID, f.FORMTYPE, f.LOAI,
         COALESCE(td.NAME, fd.NAME) AS DATASET_NAME,
         i.NAME AS IMAGE_NAME,
         CASE
           WHEN f.NAME IS NOT NULL THEN f.NAME
           WHEN td.NAME IS NOT NULL THEN td.NAME
           WHEN t.REPORTBASE = 30 THEN 'Mẫu cơ bản'
           WHEN t.BARCODE = 30 THEN 'Mã vạch'
           ELSE 'Mẫu khác'
         END AS CATEGORY_NAME
    FROM STEMPLATE t
    LEFT JOIN SFORM f ON f.ID = NULLIF(t.SFORMID, '')
    LEFT JOIN STABLEDESC td ON td.ID = NULLIF(t.STABLEDESCID, '')
    LEFT JOIN STABLEDESC fd ON fd.ID = NULLIF(f.STABLEDESCID, '')
    LEFT JOIN SIMAGE i ON i.ID = NULLIF(t.SIMAGEID, '')
   WHERE t.STATUS IN (0, 30)
   ORDER BY CATEGORY_NAME, t.SORTORDER, t.AUTOID, t.NAME`;

router.get('/:id/web-content', async (req, res) => {
  try {
    const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [req.params.id], 'TEMPLATE');
    if (!content) return res.status(404).json({ error: 'Không tìm thấy nội dung mẫu.' });
    res.set('Cache-Control', 'no-store').json({ content: content.toString('utf8'), version: webDesigner.revision(content), backups: webDesigner.listBackups(req.params.id) });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.put('/:id/web-content', async (req, res) => {
  try {
    webDesigner.validate(req.body?.content);
    if (!/^[a-f0-9]{64}$/.test(req.body?.version || '')) return res.status(400).json({ error: 'Thiếu phiên bản mẫu. Đóng và mở lại trình thiết kế.' });
    const content = Buffer.from(req.body.content, 'utf8');
    await db.transaction(async (query, execute) => {
      // Read and consume the BLOB inside the same row lock as the update.
      const [row] = await query('SELECT ID,TEMPLATE FROM STEMPLATE WHERE ID=? WITH LOCK', [req.params.id]);
      if (!row) throw webDesigner.fail('Không tìm thấy mẫu in.', 404);
      const current = await webDesigner.readBlob(row.TEMPLATE);
      if (!current || webDesigner.revision(current) !== req.body.version) throw webDesigner.fail('Mẫu đã được người khác thay đổi. Tải .frx để giữ bản đang sửa, sau đó đóng và mở lại mẫu mới nhất.', 409);
      if (!current.equals(content)) {
        webDesigner.backup(req.params.id, current);
        await execute('UPDATE STEMPLATE SET TEMPLATE=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [content, req.accessUser?.ID || null, req.params.id]);
      }
    });
    res.json({ ok: true, version: webDesigner.revision(content), backups: webDesigner.listBackups(req.params.id), message: 'Đã lưu mẫu từ trình thiết kế web.' });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.get('/:id/web-backups/:backupId', async (req, res) => {
  try { res.set('Cache-Control', 'no-store').json({ content: webDesigner.readBackup(req.params.id, req.params.backupId) }); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

// Limit simultaneous renderer processes; preview never writes to STEMPLATE.
let activeWebPreviews = 0;
router.post('/:id/web-preview', async (req, res) => {
  if (activeWebPreviews >= 2) return res.status(429).json({ error: 'Đang tạo nhiều bản xem trước. Vui lòng thử lại sau.' });
  activeWebPreviews++;
  try {
    const [row] = await db.query('SELECT ID FROM STEMPLATE WHERE ID=?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Không tìm thấy mẫu in.' });
    const pdf = await webDesigner.preview(req.body?.content, req.body?.payload);
    res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' }).send(pdf);
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
  finally { activeWebPreviews--; }
});

router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const xml = typeof req.body?.content === 'string' ? req.body.content : '';
    const type = documentTypes.find(item => item.key === req.body?.configName);
    if (!name || name.length > 200 || !type) return res.status(400).json({ error: 'Nhập tên mẫu (tối đa 200 ký tự) và chọn loại phiếu.' });
    const content = Buffer.from(xml, 'utf8');
    if (content.length > MAX_TEMPLATE_BYTES) return res.status(413).json({ error: 'Mẫu FastReport vượt quá giới hạn 20 MB.' });
    if (!xml.replace(/^\uFEFF/, '').trimStart().startsWith('<?xml') || !/<Report\b/i.test(xml)) return res.status(400).json({ error: 'Tệp không phải mẫu FastReport XML (.frx) hợp lệ.' });
    const id = crypto.randomUUID();
    await db.transaction(async (query, execute) => {
      const [setting] = await query('SELECT ID,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30 WITH LOCK', [type.key]);
      if (!setting) throw Object.assign(new Error('Không tìm thấy cấu hình loại phiếu.'), { status: 400 });
      await execute('INSERT INTO STEMPLATE (ID,NAME,STATUS,USERCREATEDID,TIMECREATED,TEMPLATE,REPORTBASE) VALUES (?,?,30,?,CURRENT_TIMESTAMP,?,0)', [id, name, req.accessUser?.ID || null, content]);
      const ids = [...new Set([...(templateFilter(setting.OTHERCONFIG)?.ids || []), id])];
      await execute('UPDATE SCONFIG SET OTHERCONFIG=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [JSON.stringify(ids), req.accessUser?.ID || null, setting.ID]);
    });
    res.status(201).json({ ok: true, data: { ID: id }, message: 'Đã nhập mẫu FastReport và gắn vào loại phiếu.' });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.get('/', async (req, res) => {
  try {
    const rows = await db.query(templateListSql);
    const configs = await db.query('SELECT NAME, OTHERCONFIG, TEXTVALUE FROM SCONFIG WHERE STATUS=30');
    const { data: templates, categories } = buildCatalog(rows, configs);
    res.json({
      data: templates,
      categories,
      meta: {
        database: require('../tenancy').enabled() ? require('../tenancy').current().code : path.basename(config.firebird.database),
        total: rows.length,
        categories: categories.length,
        designerAvailable: !require('../tenancy').enabled() && process.platform === 'win32' && fs.existsSync(designerExecutable),
        customDesignerAvailable: !require('../tenancy').enabled(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: `Không đọc được kho mẫu in: ${error.message}` });
  }
});

router.post('/:id/designer', async (req, res) => {
  try {
    if (require('../tenancy').enabled()) return res.status(403).json({ error: 'Hãy dùng trình thiết kế mẫu trên web cho cửa hàng trực tuyến.' });
    if (process.platform !== 'win32' || !fs.existsSync(designerExecutable)) {
      return res.status(503).json({
        error: 'FastReport Designer chưa được build trên máy chủ. Có thể dùng trình sửa XML dự phòng.',
      });
    }
    const rows = await db.query('SELECT ID, NAME FROM STEMPLATE WHERE ID=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy mẫu in.' });
    const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [req.params.id], 'TEMPLATE');
    if (!content) return res.status(404).json({ error: 'Mẫu in chưa có nội dung FastReport.' });

    const sessionId = crypto.randomUUID();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-fastreport-'));
    const templatePath = path.join(tempDir, `${safeFileName(rows[0].NAME)}.frx`);
    fs.writeFileSync(templatePath, content);

    const session = {
      id: sessionId,
      templateId: req.params.id,
      templateName: rows[0].NAME,
      userId: req.accessUser?.ID || null,
      tenant: require('../tenancy').key(),
      status: 'opening',
      message: 'Đang mở FastReport Designer...',
      startedAt: new Date().toISOString(),
    };
    designerSessions.set(sessionId, session);

    const child = launchDesigner(templatePath);
    session.status = 'editing';
    session.message = 'FastReport Designer đang mở. Hãy chỉnh sửa, lưu và đóng cửa sổ Designer.';

    child.on('error', (error) => {
      session.status = 'error';
      session.message = `Không khởi động được FastReport Designer: ${error.message}`;
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    });
    child.on('exit', async (code) => {
      try {
        if (code !== 0) {
          const errorPath = `${templatePath}.error.txt`;
          const detail = fs.existsSync(errorPath) ? fs.readFileSync(errorPath, 'utf8').split(/\r?\n/)[0] : '';
          session.status = 'error';
          session.message = detail || `FastReport Designer kết thúc với mã lỗi ${code}.`;
          return;
        }
        const updated = fs.readFileSync(templatePath);
        if (!updated.length || updated.length > MAX_TEMPLATE_BYTES || !/<Report\b/i.test(updated.toString('utf8'))) {
          session.status = 'error';
          session.message = 'Nội dung Designer trả về không phải mẫu FastReport hợp lệ.';
          return;
        }
        await db.execute(
          'UPDATE STEMPLATE SET TEMPLATE=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',
          [updated, session.userId, session.templateId]
        );
        session.status = 'saved';
        session.message = 'Đã lưu thay đổi từ FastReport Designer vào STEMPLATE.TEMPLATE.';
        session.bytes = updated.length;
        session.finishedAt = new Date().toISOString();
      } catch (error) {
        session.status = 'error';
        session.message = `Không đồng bộ được mẫu về cơ sở dữ liệu: ${error.message}`;
      } finally {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
        setTimeout(() => designerSessions.delete(sessionId), 10 * 60 * 1000).unref();
      }
    });

    res.status(202).json({ data: session });
  } catch (error) {
    res.status(500).json({ error: `Không mở được FastReport Designer: ${error.message}` });
  }
});

router.get('/designer-sessions/:sessionId', (req, res) => {
  const session = designerSessions.get(req.params.sessionId);
  if (!session || session.tenant !== require('../tenancy').key() || session.userId !== req.accessUser?.ID) return res.status(404).json({ error: 'Phiên FastReport Designer không còn tồn tại.' });
  res.json({ data: session });
});

router.get('/:id/content', async (req, res) => {
  try {
    const rows = await db.query('SELECT ID, NAME FROM STEMPLATE WHERE ID=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy mẫu in.' });
    const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [req.params.id], 'TEMPLATE');
    if (!content) return res.status(404).json({ error: 'Mẫu in chưa có nội dung FastReport.' });
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFileName(rows[0].NAME)}.frx"`,
      'Cache-Control': 'no-store',
      'X-Template-Name': encodeURIComponent(rows[0].NAME),
    });
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: `Không tải được mẫu FastReport: ${error.message}` });
  }
});

router.put('/:id/content', async (req, res) => {
  try {
    const xml = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!xml.trim()) return res.status(400).json({ error: 'Nội dung mẫu FastReport không được để trống.' });
    const content = Buffer.from(xml, 'utf8');
    if (content.length > MAX_TEMPLATE_BYTES) return res.status(413).json({ error: 'Mẫu FastReport vượt quá giới hạn 20 MB.' });
    if (!xml.replace(/^\uFEFF/, '').trimStart().startsWith('<?xml') || !/<Report\b/i.test(xml)) {
      return res.status(400).json({ error: 'Tệp không phải mẫu FastReport XML (.frx) hợp lệ.' });
    }
    const exists = await db.query('SELECT ID FROM STEMPLATE WHERE ID=?', [req.params.id]);
    if (!exists.length) return res.status(404).json({ error: 'Không tìm thấy mẫu in.' });
    await db.execute(
      'UPDATE STEMPLATE SET TEMPLATE=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',
      [content, req.accessUser?.ID || null, req.params.id]
    );
    res.json({ ok: true, bytes: content.length, message: 'Đã lưu mẫu vào STEMPLATE.TEMPLATE.' });
  } catch (error) {
    res.status(500).json({ error: `Không lưu được mẫu FastReport: ${error.message}` });
  }
});

router.put('/:id/default', async (req, res) => {
  try {
    const type = documentTypes.find(item => item.key === req.body?.configName);
    if (!type) return res.status(400).json({ error: 'Chọn loại phiếu GARA để đặt mẫu mặc định.' });
    await db.transaction(async (query, execute) => {
      const [setting] = await query('SELECT ID, OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30', [type.key]);
      const ids = templateFilter(setting?.OTHERCONFIG)?.ids || [];
      const [template] = await query('SELECT ID FROM STEMPLATE WHERE ID=? AND STATUS IN (0,30)', [req.params.id]);
      if (!setting || !template || !ids.includes(template.ID.toLowerCase())) throw Object.assign(new Error('Mẫu chưa được gắn vào loại phiếu này.'), { status: 400 });
      await execute('UPDATE SCONFIG SET TEXTVALUE=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?', [template.ID, req.accessUser?.ID || null, setting.ID]);
    });
    res.json({ ok: true, message: `Đã đặt mẫu mặc định cho ${type.label.toLowerCase()}.` });
  } catch (error) {
    res.status(error.status || 500).json({ error: `Không cập nhật được mẫu mặc định: ${error.message}` });
  }
});

router.put('/:id/assignment', async (req, res) => {
  try {
    const type = documentTypes.find(item => item.key === req.body?.configName);
    if (!type) return res.status(400).json({ error: 'Chọn loại phiếu GARA cần gắn mẫu.' });
    await db.transaction(async (query, execute) => {
      const [template] = await query('SELECT ID FROM STEMPLATE WHERE ID=? AND STATUS IN (0,30)', [req.params.id]);
      const [setting] = await query('SELECT ID, OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30', [type.key]);
      if (!template || !setting) throw Object.assign(new Error('Không tìm thấy mẫu hoặc cấu hình loại phiếu.'), { status: 400 });
      const ids = templateFilter(setting.OTHERCONFIG)?.ids || [];
      const updated = [...new Set([...ids, template.ID.toLowerCase()])];
      await execute('UPDATE SCONFIG SET OTHERCONFIG=?, MOREDETAIL=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',
        [JSON.stringify(updated), `Mẫu dùng cho ${type.label.toLowerCase()}. Chọn mẫu và nhấn Ghi dữ liệu để lưu.`, req.accessUser?.ID || null, setting.ID]);
    });
    res.json({ ok: true, message: `Đã gắn mẫu vào ${type.label.toLowerCase()}. Hãy chỉnh nội dung mẫu cho loại phiếu này trước khi sử dụng.` });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

module.exports = router;
