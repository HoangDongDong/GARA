const db = require('./src/db');
const { configName } = require('./src/services/paymentAccountConfig');

async function migrate() {
  await db.transaction(async (query, execute, uuid) => {
    if ((await query('SELECT ID FROM SCONFIG WHERE NAME=?', [configName])).length) return;
    const [group] = await query("SELECT ID FROM SCONFIGGROUP WHERE NAME='Thông tin công ty' AND (STATUS <> -1 OR STATUS IS NULL)");
    if (!group) throw new Error('Không tìm thấy nhóm Thông tin công ty.');
    await execute(`INSERT INTO SCONFIG (ID,NAME,CAPTION,STATUS,CONTROLTYPE,DATATYPE,SCONFIGGROUPID,TEXTVALUE,MOREDETAIL,SORTORDER,USERCREATEDID,TIMECREATED)
      VALUES (?,?,'Tài khoản nhận thanh toán',30,'8',1,?,NULL,'Chọn tài khoản ngân hàng nhận tiền mặc định của gara.',11,'SYSTEM',CURRENT_TIMESTAMP)`, [uuid(), configName, group.ID]);
  });
  console.log('Đã bổ sung cấu hình tài khoản nhận thanh toán trong Thông tin công ty.');
}
if (require.main === module) migrate().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = migrate;
