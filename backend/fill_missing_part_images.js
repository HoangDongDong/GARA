// Fill only empty DMATHANG.ANH values with the user-provided image.
// Run: node fill_missing_part_images.js [image.png]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./src/db');

const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function main() {
  const imagePath = path.resolve(process.argv[2] || path.join(__dirname, 'assets/part-default.png'));
  const image = fs.readFileSync(imagePath);
  if (image.length > 3 * 1024 * 1024 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Expected a PNG image up to 3 MB');
  }
  const value = Buffer.from(`data:image/png;base64,${image.toString('base64')}`, 'utf8');
  const rows = await db.query('SELECT ID, CODE, CASE WHEN ANH IS NULL THEN 1 ELSE 0 END AS WAS_NULL, CASE WHEN ANH IS NULL THEN 0 ELSE OCTET_LENGTH(ANH) END AS IMAGE_BYTES FROM DMATHANG');
  const missing = rows.filter(row => Number(row.IMAGE_BYTES) === 0);
  const existingHashes = {};
  for (const row of rows.filter(row => Number(row.IMAGE_BYTES) > 0)) {
    existingHashes[row.ID] = hash(await db.queryBlob('SELECT ANH FROM DMATHANG WHERE ID=?', [row.ID], 'ANH'));
  }
  if (!missing.length) {
    console.log(JSON.stringify({ updated: 0, message: 'All parts already have images' }));
    return;
  }
  const backupPath = path.join(__dirname, `part-images-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ imagePath, imageSha256: hash(image), before: missing, existingHashes }, null, 2));
  await db.transaction(async (query, execute) => {
    for (const row of missing) {
      await execute('UPDATE DMATHANG SET ANH=? WHERE ID=? AND (ANH IS NULL OR OCTET_LENGTH(ANH)=0)', [value, row.ID]);
    }
  });
  for (const row of missing) {
    const saved = await db.queryBlob('SELECT ANH FROM DMATHANG WHERE ID=?', [row.ID], 'ANH');
    if (!saved || hash(saved) !== hash(value)) throw new Error(`Image verification failed: ${row.CODE}`);
  }
  for (const [id, expected] of Object.entries(existingHashes)) {
    const saved = await db.queryBlob('SELECT ANH FROM DMATHANG WHERE ID=?', [id], 'ANH');
    if (!saved || hash(saved) !== expected) throw new Error(`Existing image changed: ${id}`);
  }
  console.log(JSON.stringify({ updated: missing.length, verified: true, preserved: Object.keys(existingHashes).length, backupPath }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
