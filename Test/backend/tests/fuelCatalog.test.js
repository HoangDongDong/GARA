const test=require('node:test');
const assert=require('node:assert/strict');
const {initializeFuelCatalog}=require('../../../backend/src/services/fuelOptions.js');

test('fuel migration preserves existing rows and imports values from vehicle records',async()=>{
  const names=new Set(['Xăng','Custom fuel']);let createdTable=false;
  const mock={query:async()=>[{FOUND:1}],execute:async()=>{createdTable=true;},transaction:callback=>callback(async(sql,params)=>{
    if(sql.includes('FROM DXE'))return[{NAME:'Custom fuel'},{NAME:'Vehicle fuel'}];
    return names.has(params[0]) ? [{ID:params[0]}] : [];
  },async(sql,params)=>names.add(params[1]),()=> 'id')};
  await initializeFuelCatalog(mock);
  assert.equal(createdTable,false);
  assert.ok(names.has('Vehicle fuel'));
  assert.ok(names.has('Custom fuel'));
  assert.equal(names.size,8);
  await initializeFuelCatalog(mock);
  assert.equal(names.size,8);
});

test('fuel catalog supports create/edit/status and vehicle metadata uses the same records; all writes roll back', {skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const db=require('../../../backend/src/db.js'),tenancy=require('../../../backend/src/tenancy.js'),platform=require('../../../backend/src/services/platform.js'),fs=require('fs');
  const catalog=require('../../../backend/src/services/catalogData.js');
  const router=require('../../../backend/src/routes/vehicles.js');
  const handler=router.stack.find(layer=>layer.route?.path==='/meta/brands').route.stack[0].handle;
  const [store]=(await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS')).filter(row=>row.DBPATH&&fs.existsSync(row.DBPATH));
  await tenancy.run(platform.map(store),async()=>{
    const original={query:db.query,execute:db.execute,transaction:db.transaction};
    const rollback=new Error('ROLLBACK_FUEL_TEST');
    await assert.rejects(original.transaction(async(query,execute,uuid)=>{
      db.query=query;db.execute=execute;db.transaction=callback=>callback(query,execute,uuid);
      const fuelNames=async()=>{
        let result,status=200;
        await handler({}, {json(value){result=value;},status(value){status=value;return this;}});
        assert.equal(status,200,result.error);
        return result.data.fuels;
      };
      try {
        const name='Fuel test '+uuid();
        const created=await catalog.save('fuels',null,{NAME:name,NOTE:'Fuel test'},'SYSTEM');
        const loaded=await catalog.load('fuels');
        assert.equal(loaded.readonly,undefined);
        assert.ok(loaded.data.some(row=>row.ID===created.id));
        assert.ok((await fuelNames()).includes(name));
        await assert.rejects(catalog.save('fuels',null,{NAME:name},'SYSTEM'),error=>error.status===409);
        const renamed=name+' updated';
        await catalog.save('fuels',created.id,{NAME:renamed},'SYSTEM');
        assert.ok((await fuelNames()).includes(renamed));
        await catalog.setStatus('fuels',created.id,0,'SYSTEM');
        assert.ok(!(await fuelNames()).includes(renamed));
        throw rollback;
      } finally {Object.assign(db,original);}
    }),error=>error===rollback);
  });
});
