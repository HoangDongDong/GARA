const test = require('node:test');
const assert = require('node:assert/strict');
const payment = require('../src/services/receiptPayment');
const db = require('../src/db');
const router = require('../src/routes/inventoryReceipts');
const debts = require('../src/services/debts');

test('receipt payments default to zero, support partial/full payments and preserve advances', () => {
  assert.deepEqual(payment.calculate(2200000),{payment:0,debt:2200000,paid:false});
  assert.deepEqual(payment.calculate(2200000,500000),{payment:500000,debt:1700000,paid:false});
  assert.deepEqual(payment.calculate(2200000,2200000),{payment:2200000,debt:0,paid:true});
  assert.deepEqual(payment.calculate(2200000,2300000),{payment:2300000,debt:-100000,paid:true});
  assert.equal(payment.calculate(10.02,0.01).debt,10.01);
  for (const invalid of [-1,NaN,Infinity,'bad',0.001]) assert.throws(()=>payment.calculate(2200000,invalid),error=>error.statusCode===400);
});

test('Firebird receipt amount survives save/reload, debt ledger and idempotent partial settlement', {skip:process.env.TEST_FIREBIRD!=='1'}, async () => {
  const originals={query:db.query,execute:db.execute,transaction:db.transaction};
  const rollback=new Error('RECEIPT_PAYMENT_ROLLBACK');
  const call=async(method,path,body,params={})=>{
    const handler=router.stack.find(layer=>layer.route?.path===path && layer.route.methods[method]).route.stack[0].handle;
    let status=200,result;
    await handler({body,params,get:()=> 'TEST'}, {status(value){status=value;return this;},json(value){result=value;}});
    assert.equal(status,200,result?.error);
    return result;
  };
  await assert.rejects(originals.transaction(async(query,execute,uuid)=>{
    Object.assign(db,{query,execute,transaction:callback=>callback(query,execute,uuid)});
    try {
      const [warehouse]=await query('SELECT FIRST 1 ID FROM DKHOHANG WHERE STATUS=1');
      const [employee]=await query('SELECT FIRST 1 ID FROM DNHANVIEN WHERE STATUS=1');
      const [part]=await query('SELECT FIRST 1 ID FROM DMATHANG WHERE STATUS=1');
      const supplier=uuid();
      await execute("INSERT INTO DNHACUNGCAP (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'PAYMENT TEST',1,'TEST')",[supplier]);
      let first;
      for (const amount of [0,500000,2200000,2300000]) {
        const result=await call('post','/',{NAME:`TEST-PAY-${uuid().slice(0,8)}`,DNHACUNGCAPID:supplier,DKHOHANGID:warehouse.ID,DNHANVIENID:employee.ID,
          TIENHANG:2200000,TONGCONG:2200000,TIENTHANHTOAN:amount,items:[{DMATHANGID:part.ID,SOLUONG:1,DONGIA:2200000}]});
        first ||= result.id;
        const loaded=(await call('get','/:id',{}, {id:result.id})).data.receipt;
        assert.equal(Number(loaded.CONGNO),2200000-amount);
        assert.equal(Number(loaded.DATHANHTOAN),amount>=2200000?1:0);
        const ledger=(await debts.ledger(query)).payable.find(row=>row.id===supplier);
        assert.equal(ledger.history.find(row=>row.id===result.id).payment,amount);
      }
      for (let retry=0;retry<2;retry++) {
        const result=await call('patch','/:id/pay',{TIENTHANHTOAN:1000000},{id:first});
        assert.equal(result.debt,1200000);
        const loaded=(await call('get','/:id',{}, {id:first})).data.receipt;
        assert.equal(Number(loaded.CONGNO),1200000);
      }
      const ledger=(await debts.ledger(query)).payable.find(row=>row.id===supplier);
      assert.equal(ledger.history.find(row=>row.id===first).payment,1000000);
      assert.equal(ledger.amount,2800000);
      throw rollback;
    } finally {Object.assign(db,originals);}
  }),error=>error===rollback);
});
