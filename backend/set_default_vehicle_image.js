/**
 * Gán một ảnh mặc định vào DXE.ANHXE cho các xe chưa có ảnh.
 * Không ghi đè ảnh riêng đã tồn tại.
 *
 * Chạy:
 *   node set_default_vehicle_image.js "C:/duong-dan/anh.png"
 */
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

const imagePath = process.argv[2];
if (!imagePath) {
  console.error('Vui lòng truyền đường dẫn ảnh mặc định.');
  process.exit(1);
}

async function main() {
  const absolutePath = path.resolve(imagePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const mimeByExtension = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const mime = mimeByExtension[extension];
  if (!mime) throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');

  const bytes = fs.readFileSync(absolutePath);
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) {
    throw new Error('Ảnh rỗng hoặc vượt quá 3 MB.');
  }
  const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;

  const before = await db.query('SELECT COUNT(*) AS CNT FROM DXE WHERE ANHXE IS NULL');
  const preserved = await db.query('SELECT COUNT(*) AS CNT FROM DXE WHERE ANHXE IS NOT NULL');
  await db.execute(
    `UPDATE DXE
        SET ANHXE=?, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
      WHERE ANHXE IS NULL`,
    [Buffer.from(dataUrl, 'utf8')]
  );
  const after = await db.query('SELECT COUNT(*) AS CNT FROM DXE WHERE ANHXE IS NULL');

  console.log(`Đã gán ảnh mặc định: ${Number(before[0]?.CNT || 0)} xe.`);
  console.log(`Giữ nguyên ảnh riêng: ${Number(preserved[0]?.CNT || 0)} xe.`);
  console.log(`Xe còn thiếu ảnh: ${Number(after[0]?.CNT || 0)} xe.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
