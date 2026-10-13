const test = require('node:test');
const assert = require('node:assert/strict');
const roles = require('../../../backend/src/services/employeeRoles.js');

test('empty and oversized role names are rejected before opening a transaction', async () => {
  for (const name of ['', '   ', null, 123, 'a'.repeat(256)]) {
    await assert.rejects(roles.create({transaction:() => assert.fail('invalid input must not write')}, name, 'SYSTEM'), error => error.statusCode === 400);
  }
});

test('role creation locks before duplicate checks and allocates a stable code', async () => {
  const calls=[];
  const db={transaction:callback=>callback(async(sql,params)=>{
    calls.push({sql,params});
    return sql.includes('MAX(CODE)') ? [{LASTCODE:7}] : [];
  },async(sql,params)=>calls.push({sql,params}))};
  assert.deepEqual(await roles.create(db,'  Chăm sóc khách hàng  ','actor'),{CODE:8,NAME:'Chăm sóc khách hàng',STATUS:1});
  assert.ok(calls[0].sql.startsWith('UPDATE DVAITRONHANVIEN'));
  assert.deepEqual(calls.at(-1).params,[8,'Chăm sóc khách hàng','actor']);
});

test('existing role names cannot be duplicated', async () => {
  const db={transaction:callback=>callback(async()=>[{CODE:1}],async sql=>assert.ok(sql.startsWith('UPDATE')))};
  await assert.rejects(roles.create(db,'Kỹ thuật viên','SYSTEM'), error=>error.statusCode===409);
});

test('custom role survives employee create, list and reopen metadata on Firebird; all changes roll back', {skip:process.env.TEST_FIREBIRD!=='1'}, async () => {
  const db=require('../../../backend/src/db.js'),tenancy=require('../../../backend/src/tenancy.js'),platform=require('../../../backend/src/services/platform.js');
  const fs=require('fs');
  const [store]=(await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS')).filter(row=>row.DBPATH&&fs.existsSync(row.DBPATH));
  assert.ok(store);
  await tenancy.run(platform.map(store),async()=>{
    const original={query:db.query,execute:db.execute,transaction:db.transaction};
    const rollback=new Error('ROLLBACK_ROLE_TEST');
    await assert.rejects(original.transaction(async(query,execute,uuid)=>{
      db.query=query;db.execute=execute;db.transaction=callback=>callback(query,execute,uuid);
      try {
        const router=require('../../../backend/src/routes/employees.js');
        const call=async(method,path,body={})=>{
          const handler=router.stack.find(layer=>layer.route?.path===path&&layer.route.methods[method]).route.stack[0].handle;
          let result,status=200;
          await handler({body,query:{},accessUser:{ID:'SYSTEM',ISADMIN:1},get:()=> 'SYSTEM'}, {json(value){result=value;return this;},status(value){status=value;return this;}});
          return {status,result};
        };
        const name='Role test '+uuid();
        const created=await call('post','/roles',{NAME:name});
        assert.equal(created.status,200,created.result.error);
        const code=created.result.data.CODE;
        assert.ok(code>=5);
        assert.equal((await call('post','/roles',{NAME:name.toLowerCase()})).status,409);
        const employee=await call('post','/',{NAME:'Role test employee',LOAINHANVIEN:code});
        assert.equal(employee.status,200,employee.result.error);
        const metadata=await call('get','/meta');
        assert.ok(metadata.result.data.roles.some(row=>row.CODE===code&&row.NAME===name));
        const list=await call('get','/');
        assert.equal(list.result.data.find(row=>row.ID===employee.result.id).VAITRO,name);
        assert.equal((await call('post','/',{NAME:'Invalid role',LOAINHANVIEN:2147483647})).status,400);
        let denied, deniedStatus;
        const handler=router.stack.find(layer=>layer.route?.path==='/roles'&&layer.route.methods.post).route.stack[0].handle;
        await handler({body:{NAME:'Denied'},accessUser:{ID:'SYSTEM',permissions:{EMPLOYEES:1}}},{json(result){denied=result;},status(value){deniedStatus=value;return this;}});
        assert.equal(deniedStatus,403); assert.ok(denied.error);
        throw rollback;
      } finally {Object.assign(db,original);}
    }),error=>error===rollback);
  });
});
