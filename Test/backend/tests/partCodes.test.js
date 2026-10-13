const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../backend/src/db.js');
const router = require('../../../backend/src/routes/parts.js');
const handler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;

test('automatic, stale preview and manually edited part codes all save one barcode value', async () => {
  const original={transaction:db.transaction,query:db.query};
  try {
    for (const [body,expected,automatic] of [
      [{NAME:'Part'},'MH002',true],
      [{NAME:'Part',CODE:'MH001',AUTO_CODE:'MH001'},'MH002',true],
      [{NAME:'Part',CODE:'MY-CODE',AUTO_CODE:'MH001',BARCODE:'OTHER'},'MY-CODE',false],
    ]) {
      const writes=[];
      db.transaction=callback=>callback(async(sql,params)=>{
        if(sql.includes('FROM SCONFIG')) return [{TEXTVALUE:'MH(***)'}];
        if(sql.includes('FROM SNUMBERCOUNTER')) return [{PERIODKEY:'ALL',SEQ:0}];
        if(sql.includes('FROM DMATHANG')) return params[0]==='MH001' ? [{ID:'existing'}] : [];
        throw new Error(sql);
      },async(sql,params)=>writes.push({sql,params}));
      let status=200,result;
      await handler({body,get:()=> 'SYSTEM'}, {status(value){status=value;return this;},json(value){result=value;}});
      assert.equal(status,200,result?.error);
      assert.equal(result.code,expected);
      const insert=writes.find(row=>row.sql.includes('INSERT INTO DMATHANG'));
      assert.equal(insert.params[2],expected);
      assert.equal(insert.params[3],expected);
      assert.equal(writes.some(row=>row.sql.includes('SNUMBERCOUNTER')),automatic);
    }
  } finally {Object.assign(db,original);}
});
