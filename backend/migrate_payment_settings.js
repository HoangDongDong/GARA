const db = require('./src/db');
const { definitions } = require('./src/services/paymentSettings');
async function migrate() {
  return db.transaction(async (query, execute, uuid) => {
    const name = 'Thanh toán';
    const groups = await query('SELECT ID FROM SCONFIGGROUP WHERE NAME=?', [name]);
    const groupId = groups[0]?.ID || uuid();
    if (!groups.length) await execute("INSERT INTO SCONFIGGROUP (ID,NAME,STATUS,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,?,30,'ZZZ004B','SYSTEM',CURRENT_TIMESTAMP)", [groupId, name]);
    let added = 0;
    for (const [index, item] of definitions.entries()) {
      const sortOrder = `PAY${String(index + 1).padStart(3, '0')}`;
      if ((await query('SELECT ID FROM SCONFIG WHERE NAME=?', [item.name])).length) {
        await execute('UPDATE SCONFIG SET SCONFIGGROUPID=?, SORTORDER=? WHERE NAME=?', [groupId, sortOrder, item.name]);
        continue;
      }
      const suffix = item.name.replace('Payment', '');
      let old = await query('SELECT INTVALUE FROM SCONFIG WHERE NAME IN (?,?) AND STATUS=30', ['Sales' + suffix, 'Repair' + suffix]);
      if (!old.length && suffix === 'AllowDebt') old = await query('SELECT INTVALUE FROM SCONFIG WHERE NAME=? AND STATUS=30', ['ChoPhepKhachNo']);
      const initial = !old.length ? 30 : suffix === 'AllowDebt'
        ? (old.every(row => Number(row.INTVALUE) === 30) ? 30 : 0)
        : (old.some(row => Number(row.INTVALUE) === 30) ? 30 : 0);
      await execute(`INSERT INTO SCONFIG (ID,NAME,CAPTION,DATATYPE,CONTROLTYPE,INTVALUE,SCONFIGGROUPID,STATUS,SORTORDER,MOREDETAIL,USERCREATEDID,TIMECREATED)
        VALUES (?,?,?,3,7,?,?,30,?,?,'SYSTEM',CURRENT_TIMESTAMP)`, [uuid(), item.name, item.caption, initial, groupId, sortOrder, item.detail]);
      added++;
    }
    await execute("UPDATE SCONFIG SET STATUS=-1 WHERE NAME IN ('ChoPhepKhachNo','SalesAllowDebt','SalesRequireBill','RepairAllowDebt','RepairRequireBill')");
    await execute(`UPDATE SCONFIGGROUP SET STATUS=-1 WHERE NAME=?
      AND NOT EXISTS (SELECT 1 FROM SCONFIG s WHERE s.SCONFIGGROUPID=SCONFIGGROUP.ID AND (s.STATUS<>-1 OR s.STATUS IS NULL))`, ['Thanh toán & công nợ']);
    return { added, group: name };
  });
}
if (require.main === module) migrate().then(result => { console.log(result); process.exit(0); }).catch(error => { console.error(error.message); process.exit(1); });
module.exports = { migrate };
