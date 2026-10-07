const db=require('./src/db');
async function migrate(){
  for(const [name,type] of [['TENDOITUONG','VARCHAR(255)'],['DIACHIDOITUONG','VARCHAR(255)'],['CHUNGTUGOC','VARCHAR(255)'],['GHICHU','VARCHAR(255)'],['KHONGDOICONGNO','SMALLINT DEFAULT 0']]){
    if(!(await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?',['TTHUCHI',name])).length)await db.execute(`ALTER TABLE TTHUCHI ADD ${name} ${type}`);
  }
}
if(require.main===module)migrate().then(()=>console.log('Đã chuẩn bị form phiếu thu/chi.')).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={migrate};
