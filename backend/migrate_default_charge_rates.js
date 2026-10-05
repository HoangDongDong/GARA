const db = require('./src/db');
const { definitions, salesToggles } = require('./src/services/defaultChargeRates');

async function migrate(database = db) {
  return database.transaction(async (query, execute, uuidv4) => {
    const groupName = 'Thuế & phí dịch vụ';
    const groups = await query('SELECT ID FROM SCONFIGGROUP WHERE NAME=?', [groupName]);
    const groupId = groups[0]?.ID || uuidv4();
    if (!groups.length) await execute(
      "INSERT INTO SCONFIGGROUP (ID, NAME, STATUS, SORTORDER, USERCREATEDID, TIMECREATED) VALUES (?, ?, 30, ?, 'SYSTEM', CURRENT_TIMESTAMP)",
      [groupId, groupName, 'ZZZ004A'],
    );
    let added = 0;
    for (const [index, item] of definitions.entries()) {
      const existing = await query('SELECT ID FROM SCONFIG WHERE NAME=?', [item.name]);
      if (existing.length) continue;
      await execute(`INSERT INTO SCONFIG
        (ID, NAME, CAPTION, DATATYPE, CONTROLTYPE, DECIMALVALUE, SCONFIGGROUPID, STATUS, SORTORDER, MOREDETAIL, USERCREATEDID, TIMECREATED)
        VALUES (?, ?, ?, 4, 9, ?, ?, 30, ?, ?, 'SYSTEM', CURRENT_TIMESTAMP)`,
      [uuidv4(), item.name, item.caption, item.value, groupId, String(index + 1).padStart(3, '0'),
        'Nhập tỷ lệ từ 0 đến 100%, tối đa 2 chữ số thập phân.']);
      added++;
    }
    for (const [index, item] of salesToggles.entries()) {
      const existing = await query('SELECT ID FROM SCONFIG WHERE NAME=?', [item.name]);
      if (existing.length) continue;
      await execute(`INSERT INTO SCONFIG
        (ID, NAME, CAPTION, DATATYPE, CONTROLTYPE, INTVALUE, SCONFIGGROUPID, STATUS, SORTORDER, USERCREATEDID, TIMECREATED)
        VALUES (?, ?, ?, 3, 7, ?, ?, 30, ?, 'SYSTEM', CURRENT_TIMESTAMP)`,
      [uuidv4(), item.name, item.caption, item.value, groupId, String(index + 3).padStart(3, '0')]);
      added++;
    }
    return { added };
  });
}

if (require.main === module) migrate().then(result => {
  console.log(`Đã thêm ${result.added} cấu hình thuế và phí dịch vụ.`);
  process.exit(0);
}).catch(error => { console.error(error.message); process.exit(1); });

module.exports = { migrate };
