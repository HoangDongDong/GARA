const os = require('os');
try { os.userInfo(); } catch { os.userInfo = () => ({ username: process.env.USERNAME || 'SYSTEM' }); }

const firebird = require('node-firebird');
const { v4: uuid } = require('uuid');
const config = require('./src/config').firebird;

const FUNCTIONS = [
  ['DASHBOARD', 'Tổng quan', 'Tổng quan'],
  ['REPAIR', 'Sửa chữa - Dịch vụ', 'Nghiệp vụ'],
  ['SALES', 'Bán hàng (POS)', 'Nghiệp vụ'],
  ['INVENTORY', 'Nhập kho', 'Kho hàng'],
  ['SUPPLIERS', 'Nhà cung cấp', 'Danh mục'],
  ['CUSTOMERS', 'Khách hàng', 'Danh mục'],
  ['VEHICLES', 'Hồ sơ xe & Lịch sử', 'Nghiệp vụ'],
  ['WARRANTY', 'Bảo hành', 'Nghiệp vụ'],
  ['FINANCE', 'Thu - Chi / Công nợ', 'Tài chính'],
  ['EMPLOYEES', 'Nhân viên / Kỹ thuật viên', 'Nhân sự'],
  ['REPORTS', 'Báo cáo', 'Báo cáo'],
  ['ADMIN', 'Quản trị - Phân quyền', 'Hệ thống'],
  ['SETTINGS', 'Cấu hình', 'Hệ thống'],
];

const attach = () => new Promise((resolve, reject) => firebird.attach(config, (error, db) => error ? reject(error) : resolve(db)));
const query = (db, sql, params = []) => new Promise((resolve, reject) => db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows || [])));

async function hasColumn(db, table, column) {
  const rows = await query(db, `SELECT 1 AS FOUND FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?`, [table, column]);
  return rows.length > 0;
}

async function hasIndex(db, name) {
  const rows = await query(db, `SELECT 1 AS FOUND FROM RDB$INDICES WHERE RDB$INDEX_NAME=?`, [name]);
  return rows.length > 0;
}

async function addColumn(db, table, column, definition) {
  if (await hasColumn(db, table, column)) return;
  await query(db, `ALTER TABLE ${table} ADD ${column} ${definition}`);
  console.log(`Added ${table}.${column}`);
}

(async () => {
  const db = await attach();
  try {
    await addColumn(db, 'DNHANVIEN', 'EMAIL', 'VARCHAR(255)');
    await addColumn(db, 'DNHANVIEN', 'CHUNGCHI', 'VARCHAR(255)');
    await addColumn(db, 'SUSER', 'PASSWORD', 'VARCHAR(255)');
    await addColumn(db, 'SUSER', 'USERNAME', 'VARCHAR(255)');
    await addColumn(db, 'SUSER', 'EMAIL', 'VARCHAR(255)');
    await addColumn(db, 'SUSER', 'ISADMIN', 'INTEGER DEFAULT 0');
    await addColumn(db, 'SUSER', 'SGROUPUSERID', 'VARCHAR(36)');
    await addColumn(db, 'SUSER', 'DNHANVIENID', 'VARCHAR(36)');

    await query(db, `UPDATE SUSER SET USERNAME=NAME WHERE USERNAME IS NULL OR TRIM(USERNAME)=''`);
    await query(db, `UPDATE SUSER SET PASSWORD=NOTE WHERE PASSWORD IS NULL`);
    await query(db, `UPDATE SUSER SET ISADMIN=1 WHERE UPPER(USERNAME)='ADMIN'`);
    await query(db, `UPDATE SUSER SET ISADMIN=0 WHERE ISADMIN IS NULL`);
    await query(db, `UPDATE SUSER SET NOTE=NULL WHERE PASSWORD STARTING WITH 'scrypt$'`);

    let adminGroups = await query(db, `SELECT FIRST 1 ID FROM SGROUPUSER WHERE UPPER(NAME)='ADMIN'`);
    const adminGroupId = adminGroups[0]?.ID || uuid();
    if (!adminGroups.length) {
      await query(db, `INSERT INTO SGROUPUSER (ID,NAME,NOTE,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`, [adminGroupId, 'Admin', 'Toàn quyền hệ thống', 1, 'SYSTEM']);
    }
    await query(db, `UPDATE SUSER SET SGROUPUSERID=? WHERE ISADMIN=1 AND SGROUPUSERID IS NULL`, [adminGroupId]);

    for (let index = 0; index < FUNCTIONS.length; index += 1) {
      const [code, name, groupName] = FUNCTIONS[index];
      let found = await query(db, `SELECT FIRST 1 ID FROM SFUNCTION WHERE CODE=?`, [code]);
      let functionId = found[0]?.ID;
      if (!functionId) {
        functionId = uuid();
        await query(db, `INSERT INTO SFUNCTION (ID,NAME,NOTE,STATUS,SORTORDER,USERCREATEDID,TIMECREATED,CODE) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,?)`, [functionId, name, groupName, 1, index + 1, 'SYSTEM', code]);
      }
      const role = await query(db, `SELECT FIRST 1 ID FROM SGROUPROLE WHERE SGROUPUSERID=? AND SFUNCTIONID=?`, [adminGroupId, functionId]);
      if (!role.length) {
        await query(db, `INSERT INTO SGROUPROLE (ID,STATUS,USERCREATEDID,TIMECREATED,SGROUPUSERID,SFUNCTIONID,MODE) VALUES (?,1,'SYSTEM',CURRENT_TIMESTAMP,?,?,31)`, [uuid(), adminGroupId, functionId]);
      } else {
        await query(db, `UPDATE SGROUPROLE SET STATUS=1, MODE=31 WHERE ID=?`, [role[0].ID]);
      }
    }

    // Quản trị người dùng và cấu hình hệ thống là hai khu vực đặc quyền.
    // Dọn các quyền từng được cấp nhầm cho mọi nhóm không phải Admin.
    await query(db, `
      UPDATE SGROUPROLE
         SET MODE=0, USERMODIFIEDID='SYSTEM', TIMEMODIFIED=CURRENT_TIMESTAMP
       WHERE SGROUPUSERID<>?
         AND SFUNCTIONID IN (SELECT ID FROM SFUNCTION WHERE CODE IN ('ADMIN','SETTINGS'))`, [adminGroupId]);

    if (!await hasIndex(db, 'UX_SUSER_USERNAME')) {
      await query(db, `CREATE UNIQUE INDEX UX_SUSER_USERNAME ON SUSER (USERNAME)`);
    }
    console.log('Access-control migration completed.');
  } finally {
    db.detach();
  }
})().catch((error) => { console.error(error); process.exit(1); });
