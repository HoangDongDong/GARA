const db = require('../db');

const DEFAULT_FUELS = ['Xăng', 'Dầu', 'Điện', 'Hybrid', 'LPG', 'Khác'];

async function loadFuelOptions() {
  const tables = await db.query('SELECT FIRST 1 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', ['DNHIENLIEU']);
  if (tables.length) {
    return { data: await db.query('SELECT ID, NAME, NOTE, CODE, STATUS FROM DNHIENLIEU ORDER BY NAME'), available: true, table: 'DNHIENLIEU' };
  }
  const vehicles = await db.query("SELECT DISTINCT TRIM(NHIENLIEU) AS NAME FROM DXE WHERE STATUS=1 AND NHIENLIEU IS NOT NULL AND TRIM(NHIENLIEU)<>'' ORDER BY 1");
  const names = [...new Set([...DEFAULT_FUELS, ...vehicles.map((row) => row.NAME).filter(Boolean)])];
  return {
    data: names.map((name) => ({ ID: name, NAME: name, NOTE: '', STATUS: 1 })),
    available: true, readonly: true, sourceNote: 'Danh sách dùng chung với form xe: các lựa chọn có sẵn và nhiên liệu đã lưu trong hồ sơ xe. Chưa có bảng danh mục riêng để thêm, sửa hoặc ngừng sử dụng tại đây.',
  };
}

module.exports = { loadFuelOptions };
