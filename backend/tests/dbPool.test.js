const test=require('node:test');
const assert=require('node:assert/strict');
const db=require('../src/db');
test('driver pool serves concurrent queries and releases committed and rolled-back transactions', {skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  db.enablePool();
  try {
    const rows=await Promise.all(Array.from({length:18},(_,index)=>db.query('SELECT CAST(? AS INTEGER) AS TEST_NUMBER FROM RDB$DATABASE',[index])));
    assert.deepEqual(rows.map(row=>row[0].TEST_NUMBER),Array.from({length:18},(_,i)=>i));
    const id=db.uuidv4(),rollback=new Error('POOL_ROLLBACK');
    await assert.rejects(db.transaction(async(query,execute)=>{
      await execute("INSERT INTO DNHACUNGCAP (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'POOL TEST',1,'TEST')",[id]);
      assert.equal((await query('SELECT ID FROM DNHACUNGCAP WHERE ID=?',[id])).length,1);
      throw rollback;
    }),error=>error===rollback);
    assert.equal((await db.query('SELECT ID FROM DNHACUNGCAP WHERE ID=?',[id])).length,0);
    assert.equal(await db.transaction(async query=>(await query('SELECT 1 AS OK FROM RDB$DATABASE'))[0].OK),1);
  } finally {await db.closePool();}
});
