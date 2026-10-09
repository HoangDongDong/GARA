const test = require('node:test');
const assert = require('node:assert/strict');
const tenancy = require('../src/tenancy');
const platform = require('../src/services/platform');
const registration = require('../src/services/saasRegistration');
test('tenant context stays isolated across interleaved requests and requires context in SaaS',async()=>{
  const before=process.env.SAAS_ENABLED;process.env.SAAS_ENABLED='true';
  try{
    assert.throws(()=>tenancy.database(),/Thiếu/);
    const tasks=['A','B'].map(id=>tenancy.run({id,database:id+'.fdb'},async()=>{await new Promise(r=>setTimeout(r,id==='A'?20:5));assert.equal(tenancy.database(),id+'.fdb');assert.equal(tenancy.key(),id);assert.ok(tenancy.storageDirectory('backups').endsWith(id));}));
    await Promise.all(tasks);
    assert.throws(()=>tenancy.key(),/Thiếu/);
  }finally{if(before===undefined)delete process.env.SAAS_ENABLED;else process.env.SAAS_ENABLED=before;}
});
test('subscription expiry applies to mutations even for a store administrator',()=>{
  const tenant={id:'A',database:'A.fdb',state:'active',endsAt:new Date(Date.now()-1000).toISOString()};
  assert.equal(tenancy.writable(tenant),false);
  tenancy.run(tenant,()=>{
    let status;const response={status(n){status=n;return this;},json(v){assert.equal(v.code,'SUBSCRIPTION_EXPIRED');}};
    tenancy.guard({method:'POST',accessUser:{ISADMIN:1}},response,()=>assert.fail('must reject'));
    assert.equal(status,402);let read=false;tenancy.guard({method:'GET'},response,()=>{read=true;});assert.equal(read,true);
  });
});
test('database path is resolved from registry and cannot escape tenant root',()=>{
  assert.throws(()=>platform.map({ID:'../other',DBPATH:'../other.fdb'}));
  assert.throws(()=>platform.map({ID:'12345678-1234-1234-1234-123456789012',DBPATH:'D:/Garage/GARAGE.FDB'}),/Ánh xạ/);
});
test('registration validates slug, email, password and terms before persistence',()=>{
  const form={username:'garage-owner',code:'garage-a',name:'Garage A',owner:'Chủ A',email:'owner@example.invalid',phone:'0900000001',password:'test-password-123',acceptTerms:true};
  assert.equal(registration.validate(form).code,'garage-a');
  for(const extra of [{username:'a'},{username:'invalid name'},{code:'../garage'},{email:'wrong'},{password:'123456'},{acceptTerms:false},{code:'platform'}])assert.throws(()=>registration.validate({...form,...extra}));
});

test('phone normalization rejects invalid numbers and collapses local/international aliases',()=>{
 for(const input of ['0900000001','+84 900 000 001','0084900000001','84900000001'])assert.equal(registration.normalizePhone(input),'+84900000001');
 for(const input of ['', '123', '+840900000001','phone0900000001'])assert.throws(()=>registration.normalizePhone(input));
});
