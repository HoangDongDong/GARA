const db = require('./src/db');
const { functions, initialMode } = require('./src/permissionPolicy');
async function migrate() {
  await db.transaction(async (query, execute, uuid) => {
    const groups = await query('SELECT ID FROM SGROUPUSER WHERE STATUS=1');
    for (let index = 0; index < functions.length; index++) {
      const [code, name, group] = functions[index];
      const [existing] = await query('SELECT FIRST 1 ID FROM SFUNCTION WHERE CODE=?', [code]);
      const functionId = existing?.ID || uuid();
      if (!existing) await execute('INSERT INTO SFUNCTION (ID,CODE,NAME,NOTE,STATUS,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,1,?,\'SYSTEM\',CURRENT_TIMESTAMP)', [functionId, code, name, group, 100 + index]);
      for (const target of groups) {
        if ((await query('SELECT FIRST 1 ID FROM SGROUPROLE WHERE SGROUPUSERID=? AND SFUNCTIONID=?', [target.ID, functionId])).length) continue;
        const oldRows = await query('SELECT F.CODE,R.MODE FROM SGROUPROLE R JOIN SFUNCTION F ON F.ID=R.SFUNCTIONID WHERE R.SGROUPUSERID=? AND R.STATUS=1 AND F.STATUS=1', [target.ID]);
        const old = Object.fromEntries(oldRows.map(row => [row.CODE, Number(row.MODE)]));
        await execute('INSERT INTO SGROUPROLE (ID,SGROUPUSERID,SFUNCTIONID,MODE,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,1,\'SYSTEM\',CURRENT_TIMESTAMP)', [uuid(), target.ID, functionId, initialMode(code, old)]);
      }
    }
  });
  console.log('Đã bổ sung 11 quyền chi tiết; không ghi đè quyền đã được chỉnh.');
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = migrate;
