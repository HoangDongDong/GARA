const test=require('node:test');
const assert=require('node:assert/strict');
const db=require('../../../backend/src/db.js');
const router=require('../../../backend/src/routes/customers.js');
const handler=router.stack.find(layer=>layer.route?.path==='/' && layer.route.methods.post).route.stack[0].handle;

test('customer code is generated for blank or stale suggestions, but respects a manually edited code',async()=>{
  const original={query:db.query,transaction:db.transaction};
  try {
    for(const [body,expected,automatic] of [
      [{NAME:'Customer'},'KH002',true],
      [{NAME:'Customer',MAKHACH:'KH001',AUTO_CODE:'KH001'},'KH002',true],
      [{NAME:'Customer',MAKHACH:'VIP-CUSTOM',AUTO_CODE:'KH001'},'VIP-CUSTOM',false],
    ]) {
      const writes=[];
      db.query=async()=>[];
      db.transaction=callback=>callback(async(sql,params)=>{
        if(sql.includes('FROM SCONFIG'))return[{TEXTVALUE:'KH(***)'}];
        if(sql.includes('FROM SNUMBERCOUNTER'))return[{PERIODKEY:'ALL',SEQ:0}];
        return params[0]==='KH001' ? [{ID:'existing'}] : [];
      },async(sql,params)=>writes.push({sql,params}));
      let status=200,result;
      await handler({body,get:()=> 'SYSTEM'},{status(value){status=value;return this;},json(value){result=value;}});
      assert.equal(status,200,result?.error);
      assert.equal(result.code,expected);
      assert.equal(writes.find(row=>row.sql.includes('INSERT INTO DKHACHHANG')).params[2],expected);
      assert.equal(writes.some(row=>row.sql.includes('SNUMBERCOUNTER')),automatic);
    }
  } finally {Object.assign(db,original);}
});
