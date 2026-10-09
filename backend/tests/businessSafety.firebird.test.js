const test=require('node:test'),assert=require('node:assert/strict'),db=require('../src/db');
test('Firebird validates real receiving, grouped sales and warehouse stock; all fixtures roll back',{skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const original=db.transaction,rollback=new Error('SAFETY_TEST_ROLLBACK');
  const route=file=>require('../src/routes/'+file).stack.find(layer=>layer.route?.path==='/'&&layer.route.methods.post).route.stack[0].handle;
  async function call(file,body){let status=200,result;await route(file)({body,accessUser:{ID:'TEST',ISADMIN:1},get:()=> 'TEST'},{status(n){status=n;return this;},json(value){result=value;}});return {status,result};}
  await assert.rejects(original(async(query,execute,uuid)=>{
    db.transaction=fn=>fn(query,execute,uuid);
    try{
      const [warehouse]=await query('SELECT FIRST 1 ID FROM DKHOHANG WHERE STATUS=1');
      const [employee]=await query('SELECT FIRST 1 ID FROM DNHANVIEN WHERE STATUS=1');
      const [unit]=await query('SELECT FIRST 1 ID FROM DDONVITINH WHERE STATUS=1');
      const [customer]=await query('SELECT FIRST 1 ID FROM DKHACHHANG WHERE STATUS=1');
      assert.ok(warehouse&&employee&&unit&&customer,'Active reference records required for rollback test');
      const part=uuid(),supplier=uuid();
      await execute("INSERT INTO DMATHANG (ID,NAME,CODE,GIABAN,GIANHAP,DDONVITINHID,STATUS,TAMKHOA,USERCREATEDID,TIMECREATED) VALUES (?,'SAFETY TEST',?,100,50,?,1,0,'TEST',CURRENT_TIMESTAMP)",[part,'SAFE-'+part.slice(0,8),unit.ID]);
      await execute("INSERT INTO DNHACUNGCAP (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'SAFETY TEST',1,'TEST')",[supplier]);
      const body={DNHACUNGCAPID:supplier,DKHOHANGID:warehouse.ID,DNHANVIENID:employee.ID,TIENHANG:50,TONGCONG:50,TIENTHANHTOAN:0,items:[{DMATHANGID:part,DDONVITINHID:unit.ID,SOLUONG:1,DONGIA:50}]};
      const invalid=await call('inventoryReceipts',{...body,TONGCONG:1});assert.equal(invalid.status,400);
      const saved=await call('inventoryReceipts',body);assert.equal(saved.status,200,saved.result?.error);
      const stock=require('../src/services/stock');await stock.requireAvailable(query,[{DMATHANGID:part,DKHOHANGID:warehouse.ID,SOLUONG:1}]);
      const sale=await call('sales',{DKHACHHANGID:customer.ID,DKHOXUATID:warehouse.ID,items:[{DMATHANGID:part,SOLUONG:1},{DMATHANGID:part,SOLUONG:1}]});assert.equal(sale.status,400,sale.result?.error);
      const [header]=await query('SELECT TONGCONG FROM TNHAPKHO WHERE ID=?',[saved.result.id]);assert.equal(Number(header.TONGCONG),50);
      const [user]=await query('SELECT FIRST 1 ID FROM SUSER WHERE STATUS=1');
      const req={headers:{'idempotency-key':uuid()},accessUser:{ID:user.ID},originalUrl:'/api/sales',body:{fixture:part}};
      const requests=require('../src/services/idempotency');let writes=0;
      const task=async()=>{writes++;return {id:saved.result.id};};
      assert.deepEqual(await requests.run(req,task),{id:saved.result.id});
      assert.deepEqual(await requests.run(req,task),{id:saved.result.id});assert.equal(writes,1);
      throw rollback;
    }finally{db.transaction=original;}
  }),error=>error===rollback);
});
