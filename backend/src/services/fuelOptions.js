const db = require('../db.js');

const DEFAULT_FUELS = ['Xăng', 'Dầu', 'Điện', 'Hybrid', 'LPG', 'Khác'];

async function initializeFuelCatalog(database = db) {
  if (!(await database.query('SELECT FIRST 1 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', ['DNHIENLIEU'])).length) {
    await database.execute(`CREATE TABLE DNHIENLIEU (
      ID VARCHAR(36) NOT NULL PRIMARY KEY, NAME VARCHAR(255) CHARACTER SET UTF8 NOT NULL,
      CODE VARCHAR(255), NOTE VARCHAR(255) CHARACTER SET UTF8,
      STATUS INTEGER DEFAULT 1 NOT NULL, USERCREATEDID VARCHAR(36),
      TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP, USERMODIFIEDID VARCHAR(36), TIMEMODIFIED TIMESTAMP
    )`);
  }
  await database.transaction(async (query, execute, uuid) => {
    const vehicles = await query("SELECT DISTINCT TRIM(NHIENLIEU) AS NAME FROM DXE WHERE NHIENLIEU IS NOT NULL AND TRIM(NHIENLIEU)<>''");
    const names = [...new Set([...DEFAULT_FUELS,...vehicles.map(row => row.NAME).filter(Boolean)])];
    for (const name of names) {
      if (!(await query('SELECT FIRST 1 ID FROM DNHIENLIEU WHERE UPPER(TRIM(NAME))=UPPER(?)', [name])).length) {
        await execute("INSERT INTO DNHIENLIEU (ID,NAME,STATUS,USERCREATEDID) VALUES (?,?,1,'SYSTEM')", [uuid(),name]);
      }
    }
  });
}

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

module.exports = { loadFuelOptions, initializeFuelCatalog };
