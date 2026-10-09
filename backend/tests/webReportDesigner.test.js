const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const designer = require('../src/services/webReportDesigner');

test('server validates XML and rejects malformed reports, DTD and oversized content', () => {
  assert.equal(designer.validate('<Report><ReportPage Name="P"/></Report>').documentElement.tagName, 'Report');
  assert.equal(designer.validate('\uFEFF<?xml version="1.0" encoding="utf-8"?><Report><ReportPage/></Report>').documentElement.tagName, 'Report');
  for (const xml of ['<Report><ReportPage></Report>', '<Report/>', '<html><ReportPage/></html>', '<!DOCTYPE Report><Report><ReportPage/></Report>', '<Report><ReportPage x="1" x="2"/></Report>']) assert.throws(() => designer.validate(xml));
  assert.throws(() => designer.validate('x'.repeat(20 * 1024 * 1024 + 1)), e => e.status === 413);
});
test('all shipped FRX reports pass structural validation', () => {
  let count = 0;
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name.endsWith('.frx')) { designer.validate(fs.readFileSync(full, 'utf8')); count++; } } }
  walk(path.resolve(__dirname, '../templates'));
  assert.ok(count >= 60);
});
test('revision changes only when content changes and BLOB bytes are consumed', async () => {
  const content = Buffer.from('original');
  assert.equal(designer.revision(content), designer.revision('original'));
  assert.notEqual(designer.revision(content), designer.revision('updated'));
  const { Readable } = require('stream');
  assert.deepEqual(await designer.readBlob(callback => callback(null, 'blob', Readable.from([content]))), content);
});
test('backup reads reject traversal and nonexistent IDs', () => {
  assert.throws(() => designer.readBackup('test', '../../package.json'), e => e.status === 404);
  assert.throws(() => designer.readBackup('test', '0000000000000-00000000-0000-0000-0000-000000000000.frx'), e => e.status === 404);
});
