const db = require('./src/db');
async function migrate() {
  for (const [table,column,type] of [
    ['TTHUCHI','DTAIKHOANNGANHANGID','VARCHAR(36)'],
    ['DTAIKHOANNGANHANG','SODUDAU','DECIMAL(18,2) DEFAULT 0'],
  ]) {
    const fields=await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?',[table,column]);
    if (!fields.length) await db.execute(`ALTER TABLE ${table} ADD ${column} ${type}`);
  }
  await db.transaction(async(query,execute,uuid)=>{
    for (const kind of [0,1]) {
      if (!(await query("SELECT ID FROM DLYDOTHUCHI WHERE NAME=? AND LOAI=? AND STATUS=1",['Thanh toán công nợ',kind])).length) {
        await execute('INSERT INTO DLYDOTHUCHI (ID,NAME,LOAI,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,1,?,CURRENT_TIMESTAMP)',[uuid(),'Thanh toán công nợ',kind,'SYSTEM']);
      }
    }
  });
  console.log('Đã bổ sung tài khoản trên phiếu thu/chi, số dư đầu kỳ và phân loại thanh toán công nợ.');
}
if(require.main===module)migrate().catch(error=>{console.error(error);process.exitCode=1;});
module.exports=migrate;
