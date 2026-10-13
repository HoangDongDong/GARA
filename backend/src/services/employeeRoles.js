const defaults = ['Nhân viên', 'Kỹ thuật viên', 'Cố vấn dịch vụ', 'Thủ kho', 'Thu ngân'];
const failure = (message, statusCode = 400) => Object.assign(new Error(message), {statusCode});

async function initialize(db) {
  if (!(await db.query("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME='DVAITRONHANVIEN'")).length) {
    await db.execute(`CREATE TABLE DVAITRONHANVIEN (
      CODE INTEGER NOT NULL PRIMARY KEY, NAME VARCHAR(255) CHARACTER SET UTF8 NOT NULL,
      STATUS INTEGER DEFAULT 1 NOT NULL, USERCREATEDID VARCHAR(36),
      TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
  await db.transaction(async (query, execute) => {
    for (const [code, name] of defaults.entries()) {
      if (!(await query('SELECT CODE FROM DVAITRONHANVIEN WHERE CODE=?', [code])).length) {
        await execute("INSERT INTO DVAITRONHANVIEN (CODE,NAME,STATUS,USERCREATEDID) VALUES (?,?,1,'SYSTEM')", [code, name]);
      }
    }
  });
}

const list = query => query('SELECT CODE,NAME,STATUS FROM DVAITRONHANVIEN ORDER BY CODE');
async function create(db, name, actor) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 255) throw failure('Tên vai trò cần từ 1 đến 255 ký tự.');
  name = name.trim();
  return db.transaction(async (query, execute) => {
    // Serialize new role codes across API processes using a seeded row.
    await execute('UPDATE DVAITRONHANVIEN SET STATUS=STATUS WHERE CODE=0');
    if ((await query('SELECT CODE FROM DVAITRONHANVIEN WHERE UPPER(TRIM(NAME))=UPPER(?)', [name])).length) throw failure('Vai trò công việc đã tồn tại.', 409);
    const [row] = await query('SELECT MAX(CODE) AS LASTCODE FROM DVAITRONHANVIEN');
    const code = Number(row.LASTCODE) + 1;
    await execute('INSERT INTO DVAITRONHANVIEN (CODE,NAME,STATUS,USERCREATEDID) VALUES (?,?,1,?)', [code,name,actor]);
    return {CODE:code,NAME:name,STATUS:1};
  });
}
module.exports = {defaults,initialize,list,create};
