const db=require('./src/db');
async function migrate(){await db.transaction(async(query,execute)=>{
  const tables=await query("SELECT RDB$RELATION_NAME AS NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME='APP_REQUESTS'");
  if(!tables.length)await execute('CREATE TABLE APP_REQUESTS (ID VARCHAR(64) NOT NULL PRIMARY KEY,PAYLOADHASH VARCHAR(64) NOT NULL,RESULTDATA BLOB SUB_TYPE TEXT,TIMECREATED TIMESTAMP)');
});}
if(require.main===module)migrate().then(()=>{console.log('Request safety schema ready.');process.exit(0);}).catch(e=>{console.error(e.message);process.exit(1);});
module.exports=migrate;
