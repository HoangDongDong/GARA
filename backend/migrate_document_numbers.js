const db = require('./src/db');
const {definitions} = require('./src/services/documentNumbers');
async function migrate() {
  const tables = await db.query("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME='SNUMBERCOUNTER'");
  if (!tables.length) await db.execute('CREATE TABLE SNUMBERCOUNTER (CODE VARCHAR(40) NOT NULL PRIMARY KEY, PERIODKEY VARCHAR(20), SEQ INTEGER DEFAULT 0 NOT NULL)');
  await db.transaction(async(query,execute)=>{
    let [group] = await query("SELECT ID FROM SCONFIGGROUP WHERE NAME='Số phiếu'");
    if (!group) {
      group={ID:db.uuidv4()};
      await execute("INSERT INTO SCONFIGGROUP (ID,NAME,STATUS,SORTORDER,USERCREATEDID,TIMECREATED) VALUES (?,'Số phiếu',30,'ZZZ002A','SYSTEM',CURRENT_TIMESTAMP)",[group.ID]);
    }
    for (const [index,type] of definitions.entries()) {
      if (!(await query('SELECT ID FROM SCONFIG WHERE NAME=?',[type.name])).length) {
        await execute("INSERT INTO SCONFIG (ID,NAME,CAPTION,TEXTVALUE,DATATYPE,CONTROLTYPE,STATUS,SCONFIGGROUPID,SORTORDER,SOCOT,MOREDETAIL,USERCREATEDID,TIMECREATED) VALUES (?,?,?,?,1,1,30,?,?,1,?,'SYSTEM',CURRENT_TIMESTAMP)",
          [db.uuidv4(),type.name,type.label,type.pattern,group.ID,String(index+1).padStart(3,'0'),type.active?'Áp dụng khi tạo phiếu mới. Không đổi số phiếu đã lưu.':'Có bảng dữ liệu; chưa có luồng lập phiếu riêng. Cấu hình sẵn để sử dụng khi bổ sung nghiệp vụ.']);
      }
      if (!(await query('SELECT CODE FROM SNUMBERCOUNTER WHERE CODE=?',[type.key])).length) await execute('INSERT INTO SNUMBERCOUNTER (CODE,SEQ) VALUES (?,0)',[type.key]);
    }
  });
  console.log('Đã thêm nhóm Số phiếu, 10 mẫu và bộ đếm; giữ nguyên cấu hình và chứng từ hiện có.');
}
if(require.main===module)migrate().catch(e=>{console.error(e);process.exitCode=1;});
module.exports=migrate;
