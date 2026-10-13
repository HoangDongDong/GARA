const test=require('node:test');
const assert=require('node:assert/strict');

test('store catalog loads and saves email on Firebird; test records roll back',{skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const db=require('../../../backend/src/db.js'),platform=require('../../../backend/src/services/platform.js'),tenancy=require('../../../backend/src/tenancy.js'),fs=require('fs');
  const catalog=require('../../../backend/src/services/catalogData.js');
  const [store]=(await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS')).filter(row=>row.DBPATH&&fs.existsSync(row.DBPATH));
  await tenancy.run(platform.map(store),async()=>{
    const original={query:db.query,execute:db.execute,transaction:db.transaction};
    const rollback=new Error('ROLLBACK_STORE_TEST');
    await assert.rejects(original.transaction(async(query,execute,uuid)=>{
      db.query=query;db.execute=execute;db.transaction=callback=>callback(query,execute,uuid);
      try {
        const before=await catalog.load('stores');
        assert.equal(before.available,true);
        const id=(await catalog.save('stores',null,{NAME:'Store profile test '+uuid(),EMAIL:'store@example.com'},'SYSTEM')).id;
        const created=(await catalog.load('stores')).data.find(row=>row.ID===id);
        assert.equal(created.EMAIL,'store@example.com');
        await catalog.save('stores',id,{EMAIL:'updated@example.com',DIENTHOAI:'0900000000'},'SYSTEM');
        const updated=(await catalog.load('stores')).data.find(row=>row.ID===id);
        assert.equal(updated.EMAIL,'updated@example.com');
        assert.equal(updated.DIENTHOAI,'0900000000');
        await catalog.setStatus('stores',id,0,'SYSTEM');
        assert.equal((await catalog.load('stores')).data.find(row=>row.ID===id).STATUS,0);
        throw rollback;
      } finally {Object.assign(db,original);}
    }),error=>error===rollback);
  });
});
