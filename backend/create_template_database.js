/**
 * Tạo database mẫu độc lập từ GARAGE.FDB bằng gbak/restore và làm rỗng
 * đúng các bảng nghiệp vụ được chỉ định. Database nguồn không bị thay đổi.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SOURCE = 'D:/Garage/GARAGE.FDB';
const TARGET = 'D:/Garage/TEPMLATE.FDB';
const GBAK = 'C:/Program Files/Firebird/Firebird_2_5/bin/gbak.exe';
const USER = 'SYSDBA';
const PASSWORD = 'masterkey';
const backupFile = path.join('D:/Garage', `TEPMLATE-${Date.now()}.fbk`);

const TABLES = [
  'DKHACHHANG', 'DMATHANG', 'DNHACUNGCAP', 'DNHANVIEN', 'DNHOMMATHANG',
  // Yêu cầu ghi BAOGIACHTIET; tên thật trong schema là TBAOGIACHITIET.
  'DVITRIKHO', 'DXE', 'TBAOGIA', 'TBAOGIACHITIET', 'TBAOHANH', 'TDONHANG',
  'TDONHANGCHITIET', 'THOADONSUACHUA', 'TLENHSUACHUA',
  'TLENHSUACHUACHITIET', 'TLICHSUTRANGTHAI', 'TNHAPKHO',
  'TNHAPKHOCHITIET', 'TTIEPNHANXE', 'TTIEPNHANXEHINH', 'TTRANGTHAIANH',
  'TTRANGTHAIXE', 'TWORKFLOWMAP', 'TXUATPHUTUNG',
];

function runGbak(args, label) {
  const result = spawnSync(GBAK, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${label} thất bại:\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
}

async function main() {
  if (fs.existsSync(TARGET)) {
    throw new Error(`Database đích đã tồn tại: ${TARGET}. Không tự động ghi đè.`);
  }

  console.log(`1/4 Sao lưu schema và dữ liệu từ ${SOURCE}`);
  runGbak(['-b', '-v', '-user', USER, '-password', PASSWORD, `localhost:${SOURCE}`, backupFile], 'GBAK backup');

  console.log(`2/4 Khôi phục thành database độc lập ${TARGET}`);
  runGbak(['-c', '-v', '-user', USER, '-password', PASSWORD, backupFile, `localhost:${TARGET}`], 'GBAK restore');

  process.env.FB_DATABASE = TARGET;
  const db = require('./src/db');

  const existingRows = await db.query(`
    SELECT TRIM(RDB$RELATION_NAME) AS TABLE_NAME
      FROM RDB$RELATIONS
     WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0
  `);
  const existing = new Set(existingRows.map((row) => row.TABLE_NAME));
  const missing = TABLES.filter((table) => !existing.has(table));
  if (missing.length) throw new Error(`Không tìm thấy bảng: ${missing.join(', ')}`);

  const relations = await db.query(`
    SELECT TRIM(RC.RDB$RELATION_NAME) AS CHILD_TABLE,
           TRIM(PRC.RDB$RELATION_NAME) AS PARENT_TABLE
      FROM RDB$RELATION_CONSTRAINTS RC
      JOIN RDB$REF_CONSTRAINTS RF
        ON RF.RDB$CONSTRAINT_NAME = RC.RDB$CONSTRAINT_NAME
      JOIN RDB$RELATION_CONSTRAINTS PRC
        ON PRC.RDB$CONSTRAINT_NAME = RF.RDB$CONST_NAME_UQ
     WHERE RC.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);

  // Xếp bảng con trước bảng cha. Nếu có vòng tham chiếu, phần còn lại giữ
  // đúng thứ tự khai báo và Firebird sẽ báo rõ constraint gây cản trở.
  const targets = new Set(TABLES);
  const ordered = [];
  const remaining = new Set(TABLES);
  while (remaining.size) {
    const deletable = [...remaining].filter((parent) => !relations.some((relation) => (
      relation.PARENT_TABLE === parent
      && remaining.has(relation.CHILD_TABLE)
      && relation.CHILD_TABLE !== parent
    )));
    if (!deletable.length) {
      ordered.push(...remaining);
      break;
    }
    deletable.forEach((table) => {
      ordered.push(table);
      remaining.delete(table);
    });
  }

  const externalChildren = relations.filter((relation) => (
    targets.has(relation.PARENT_TABLE) && !targets.has(relation.CHILD_TABLE)
  ));
  for (const relation of externalChildren) {
    const rows = await db.query(`SELECT COUNT(*) AS CNT FROM ${relation.CHILD_TABLE}`);
    if (Number(rows[0]?.CNT || 0) > 0) {
      throw new Error(`${relation.CHILD_TABLE} còn dữ liệu và tham chiếu ${relation.PARENT_TABLE}; bảng này không nằm trong danh sách được phép xóa.`);
    }
  }

  console.log(`3/4 Xóa dữ liệu trong ${ordered.length} bảng theo thứ tự khóa ngoại`);
  await db.transaction(async (query, execute) => {
    for (const table of ordered) {
      await execute(`DELETE FROM ${table}`);
    }
  });

  console.log('4/4 Xác minh số bản ghi');
  let failed = false;
  for (const table of TABLES) {
    const rows = await db.query(`SELECT COUNT(*) AS CNT FROM ${table}`);
    const count = Number(rows[0]?.CNT || 0);
    console.log(`${table}: ${count}`);
    if (count !== 0) failed = true;
  }
  if (failed) throw new Error('Có bảng chưa được làm rỗng hoàn toàn.');
  console.log(`HOÀN TẤT: ${TARGET}`);
}

main()
  .then(() => {
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
    process.exit(1);
  });
