const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const { runRenderer, fillMissingVariables } = require('./salesPrint');
const { mapLegacyMoneyWords } = require('./legacyPrintExpressions');

const MAX_BYTES = 20 * 1024 * 1024;
const backupRoot = path.resolve(__dirname, '../../storage/print-template-backups');
const revision = content => crypto.createHash('sha256').update(content).digest('hex');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

function validate(content) {
  if (typeof content !== 'string' || !content.trim()) throw fail('Nội dung mẫu không được để trống.');
  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) throw fail('Mẫu vượt quá giới hạn 20 MB.', 413);
  if (/<!DOCTYPE|<!ENTITY/i.test(content)) throw fail('Không hỗ trợ khai báo DTD hoặc ENTITY trong mẫu.');
  let invalid = false;
  let doc;
  try {
    doc = new DOMParser({ onError: () => { invalid = true; } }).parseFromString(content.replace(/^\uFEFF/, ''), 'application/xml');
  } catch { invalid = true; }
  if (invalid || !doc || doc.documentElement?.tagName !== 'Report' || !doc.getElementsByTagName('ReportPage').length) throw fail('Mẫu FRX không phải XML Report hợp lệ hoặc chưa có trang in.');
  return doc;
}
function readBlob(blob) {
  if (blob == null) return Promise.resolve(null);
  if (Buffer.isBuffer(blob)) return Promise.resolve(blob);
  if (typeof blob !== 'function') return Promise.resolve(Buffer.from(String(blob), 'utf8'));
  return new Promise((resolve, reject) => blob((err, name, stream) => {
    if (err) return reject(err);
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  }));
}
function directory(id) { return path.join(require('../tenancy').storageDirectory(backupRoot), revision(String(id))); }
function listBackups(id) {
  const dir = directory(id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => /^\d{13}-[a-f0-9-]{36}\.frx$/.test(name)).sort().reverse().slice(0, 30).map(name => ({ id: name, createdAt: new Date(Number(name.slice(0, 13))).toISOString() }));
}
function backup(id, content) {
  const dir = directory(id);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomUUID()}.frx`;
  fs.writeFileSync(path.join(dir, name), content, { flag: 'wx' });
  return name;
}
function readBackup(id, name) {
  if (!/^\d{13}-[a-f0-9-]{36}\.frx$/.test(name)) throw fail('Bản sao lưu không hợp lệ.', 404);
  const file = path.join(directory(id), name);
  if (!fs.existsSync(file)) throw fail('Không tìm thấy bản sao lưu.', 404);
  return fs.readFileSync(file, 'utf8');
}
async function preview(content, payload) {
  validate(content);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !payload.parameters || !payload.tables) throw fail('Thiếu dữ liệu mẫu để xem trước.');
  if (Buffer.byteLength(JSON.stringify(payload)) > 2 * 1024 * 1024) throw fail('Dữ liệu xem trước vượt quá 2 MB.', 413);
  // Use the same legacy expression adapter as document printing, only on the
  // temporary preview copy; never rewrite the persisted template.
  content = mapLegacyMoneyWords(content, payload);
  fillMissingVariables(content, payload);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-web-preview-'));
  try {
    const templatePath = path.join(dir, 'template.frx'), dataPath = path.join(dir, 'data.json');
    fs.writeFileSync(templatePath, content, 'utf8'); fs.writeFileSync(dataPath, JSON.stringify(payload), 'utf8');
    return await runRenderer(templatePath, dataPath, path.join(dir, 'preview.pdf'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
module.exports = { validate, revision, readBlob, listBackups, backup, readBackup, preview, fail };
