const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const enabled=process.env.TEST_SAAS_FIREBIRD==='1';
test('real Firebird SaaS registration, provisioning, isolation and subscription controls',{skip:!enabled,timeout:120000},async()=>{
  // All credentials and business fixtures below belong to newly created test databases.
  require('../src/config');
  const productionRoot=path.resolve(process.env.SAAS_DATA_ROOT||'D:/Garage/saas');
  const root=path.join(productionRoot,'tests',crypto.randomUUID());
  fs.mkdirSync(path.join(root,'templates'),{recursive:true});
  process.env.SAAS_DATA_ROOT=root;process.env.SAAS_PLATFORM_DATABASE=path.join(root,'platform.fdb');
  process.env.AUTH_SECURITY_DIR=path.join(root,'test-security');delete process.env.AUTH_TOKEN_SECRET;
  process.env.SAAS_ENABLED='true';process.env.SAAS_REGISTRATION_ENABLED='true';process.env.SAAS_REGISTRATION_MODE='email';
  process.env.SAAS_MAIL_WEBHOOK='https://mailer.example.invalid/send';process.env.SAAS_MAIL_TOKEN='test-only';process.env.SAAS_PUBLIC_URL='https://app.example.invalid';process.env.SAAS_TERMS_URL='https://app.example.invalid/terms';process.env.SAAS_PRIVACY_URL='https://app.example.invalid/privacy';
  const manifest=JSON.parse(fs.readFileSync(path.join(productionRoot,'template-current.json'),'utf8'));
  const clean=path.join(root,'templates','clean.fbk');fs.copyFileSync(manifest.backup,clean);manifest.backup=clean;fs.writeFileSync(path.join(root,'template-current.json'),JSON.stringify(manifest));
  const platform=require('../src/services/platform'),tenancy=require('../src/tenancy'),db=require('../src/db');
  await require('../tools/saas-bootstrap').bootstrap();
  const registration=require('../src/services/saasRegistration'),worker=require('../src/services/saasWorker');
  const actualFetch=global.fetch,mail=[];
  global.fetch=async(url,options)=>{assert.equal(url,process.env.SAAS_MAIL_WEBHOOK);mail.push(JSON.parse(options.body));return {ok:true};};
  const bodies=['a','b'].map(s=>({username:'test-owner-'+s,code:'test-garage-'+s,name:'Test Garage '+s,owner:'Test Owner '+s,email:'test-'+s+'@example.invalid',phone:s==='a'?'0900000001':'0900000002',password:'test-password-123',acceptTerms:true}));
  let codes;
  try{
    for(const body of bodies)await registration.register(body);
    assert.equal(mail.length,2);
    codes=mail.map(item=>new URL(item.text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('verify'));
    for(const token of codes){await registration.verify(token);await registration.verify(token);}
    assert.equal((await platform.query('SELECT ID FROM SAAS_JOBS')).length,2);
    await worker.processOne();await worker.processOne();assert.equal(await worker.processOne(),false);
  }finally{global.fetch=actualFetch;}
  process.env.SAAS_REGISTRATION_MODE='instant';
  delete process.env.SAAS_MAIL_WEBHOOK;
  const instantBody={...bodies[0],username:'instant-owner',code:'instant-garage',email:'instant@example.invalid',phone:'0900000003'};
  const created=await registration.register(instantBody);
  assert.equal((await registration.status(created.statusToken)).state,'provisioning');
  for(const extra of [{username:'duplicate-email-user',code:'duplicate-email',phone:'0900000004',email:'INSTANT@example.invalid'},{username:'duplicate-phone-user',code:'duplicate-phone',email:'other@example.invalid',phone:'+84 900 000 003'},{username:'duplicate-code-user',email:'other@example.invalid',phone:'0900000004'},{code:'duplicate-login',email:'third@example.invalid',phone:'0900000005'}])await assert.rejects(()=>registration.register({...instantBody,...extra}),e=>e.status===409);
  assert.equal((await platform.query('SELECT ID FROM SAAS_JOBS')).length,3);
  await worker.processOne();
  assert.equal((await registration.status(created.statusToken)).state,'active');
  assert.equal((await registration.status(created.statusToken)).username,'instant-owner');
  const tenants=await Promise.all(bodies.map(body=>platform.find(body.code,true)));
  for(const tenant of tenants){assert.equal(tenant.state,'active');assert.equal(tenancy.writable(tenant),true);assert.ok((await registration.status(codes[tenants.indexOf(tenant)])).state==='active');}
  db.enablePool();
  await Promise.all(tenants.map(tenant=>tenancy.run(tenant,async()=>{
    assert.equal((await db.query('SELECT COUNT(*) AS N FROM DKHACHHANG'))[0].N,0);
    assert.equal((await db.query('SELECT COUNT(*) AS N FROM TDONHANG'))[0].N,0);
    await db.execute("INSERT INTO DKHACHHANG (ID,NAME,STATUS,USERCREATEDID,TIMECREATED) VALUES ('same-id',?,1,'TEST',CURRENT_TIMESTAMP)",[tenant.code]);
  })));
  for(let i=0;i<10;i++)await Promise.all(tenants.map(tenant=>tenancy.run(tenant,async()=>{assert.equal((await db.query("SELECT NAME FROM DKHACHHANG WHERE ID='same-id'"))[0].NAME,tenant.code);})));
  for(const tenant of tenants)await tenancy.run(tenant,async()=>{
    assert.equal((await require('../src/services/salesPrint').company()).CompanyName,tenant.name);
    for(const type of require('../src/services/garagePrintCatalog').documentTypes){const [setting]=await db.query('SELECT TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME=?',[type.key]);assert.ok(setting.TEXTVALUE,type.key+' needs a default template');}
    const designer=require('../src/services/webReportDesigner');designer.backup('same-template',Buffer.from(tenant.code));const list=designer.listBackups('same-template');assert.equal(list.length,1);assert.equal(designer.readBackup('same-template',list[0].id),tenant.code);
  });
  const app=require('../src/server').app;
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port;
  const call=async(url,body,token,method)=>actualFetch(base+url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  try{
    const logins=[];for(const body of bodies){const r=await call('/api/auth/login',{username:body.username.toUpperCase(),password:body.password});assert.equal(r.status,200);logins.push(await r.json());}
    assert.equal((await call('/api/auth/login',{username:'unknown-user',password:'fixture-password'})).status,401);
    assert.equal((await call('/api/auth/login',{username:bodies[0].username,password:'wrong-password'})).status,401);
    assert.equal(logins[0].data.ID,logins[1].data.ID);assert.notEqual(logins[0].data.TENANT.id,logins[1].data.TENANT.id);
    for(let i=0;i<2;i++){const r=await call('/api/customers/same-id',null,logins[i].token);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal((await r.json()).data.NAME,bodies[i].code);}
    assert.equal((await call('/api/saas/admin/tenants',null,logins[0].token)).status,401);
    for(const tenant of tenants)await tenancy.run(tenant,async()=>{
      await db.execute("INSERT INTO SGROUPUSER (ID,NAME,STATUS,USERCREATEDID,TIMECREATED) VALUES ('TEST_GROUP','Test staff',1,'TEST',CURRENT_TIMESTAMP)");
      await db.execute("INSERT INTO DNHANVIEN (ID,NAME,STATUS,USERCREATEDID,TIMECREATED) VALUES ('TEST_EMPLOYEE','Test employee',1,'TEST',CURRENT_TIMESTAMP)");
    });
    const staffForm={username:'staff-one',password:'fixture-staff-password',employeeId:'TEST_EMPLOYEE',groupId:'TEST_GROUP'};
    const staffResponse=await call('/api/admin-access/users',staffForm,logins[0].token);assert.equal(staffResponse.status,201);
    const staffId=(await staffResponse.json()).id;
    assert.equal((await call('/api/admin-access/users',staffForm,logins[1].token)).status,409);
    assert.equal((await call('/api/auth/login',{username:'STAFF-ONE',password:staffForm.password})).status,200);
    assert.equal((await call('/api/admin-access/users/'+staffId,{username:'staff-renamed',groupId:'TEST_GROUP'},logins[0].token,'PUT')).status,200);
    assert.equal((await call('/api/auth/login',{username:'staff-one',password:staffForm.password})).status,401);
    assert.equal((await call('/api/auth/login',{username:'staff-renamed',password:staffForm.password})).status,200);
    assert.equal((await call('/api/admin-access/users/'+staffId,null,logins[0].token,'DELETE')).status,200);
    assert.equal((await call('/api/auth/login',{username:'staff-renamed',password:staffForm.password})).status,401);
    assert.equal((await call('/api/print-templates/same-template/web-preview',{content:'untrusted'},logins[0].token)).status,403);
    const security=require('../src/authSecurity');const old=security.signToken('SAAS_OWNER',security.credentialVersion('test'));
    process.env.SAAS_ADMIN_PASSWORD_HASH=security.hashPassword('test-platform-only-password');
    const adminResponse=await call('/api/saas/admin/login',{password:'test-platform-only-password'});assert.equal(adminResponse.status,200);const adminToken=(await adminResponse.json()).token;
    assert.equal((await call('/api/customers',null,adminToken)).status,401);
    const report=await call('/api/reports/center/run/customers',null,logins[0].token);
    assert.equal(report.status,200);const snapshot=(await report.json()).snapshot;assert.equal((await call('/api/reports/center/snapshots/'+snapshot+'/rows',null,logins[1].token)).status,410);
    assert.equal((await call('/api/customers',null,old)).status,401);
    const order={session:crypto.randomUUID(),state:'pending',order:{NAME:'tenant-a-order',TONGCONG:100,details:[{TEN_PT:'Test',SOLUONG:1,DONGIA:100,THANHTIEN:100}]}};
    assert.equal((await call('/api/secondary-payment',order,logins[0].token,'PUT')).status,200);
    assert.equal((await (await call('/api/secondary-payment',null,logins[1].token)).json()).data,null);
    await platform.query('UPDATE SAAS_TENANTS SET ENDSAT=DATEADD(-1 DAY TO CURRENT_TIMESTAMP) WHERE ID=?',[tenants[0].id]);
    assert.equal((await call('/api/customers/same-id',null,logins[0].token)).status,200);
    assert.equal((await call('/api/customers',{NAME:'must-not-save'},logins[0].token)).status,402);
    assert.equal((await call('/api/saas/admin/tenants/'+tenants[0].id+'/extend',{days:30,reason:'Test gia hạn'},adminToken)).status,200);
    assert.equal(tenancy.writable(await platform.find(tenants[0].id)),true);
    assert.equal((await call('/api/saas/admin/tenants/'+tenants[1].id+'/suspend',{reason:'Test khóa cửa hàng'},adminToken)).status,200);
    assert.equal((await call('/api/customers',null,logins[1].token)).status,403);
    assert.equal((await platform.query('SELECT PASSWORDHASH FROM SAAS_TENANTS WHERE ID=?',[tenants[0].id]))[0].PASSWORDHASH,null);
    const directory=require('../src/services/loginDirectory');
    await tenancy.run(tenants[0],async()=>{
      await assert.rejects(()=>directory.bind('SAAS_OWNER',bodies[1].username,()=>assert.fail('must not change store user')),e=>e.status===409);
      await assert.rejects(()=>directory.bind('SAAS_OWNER','rollback-user',()=>{throw Error('store write failed');}),/store write failed/);
      assert.equal((await directory.resolve(bodies[0].username)).USERID,'SAAS_OWNER');
      await assert.rejects(()=>directory.resolve('rollback-user'),e=>e.status===401);
      await directory.bind('SAAS_OWNER','renamed-owner',()=>db.execute("UPDATE SUSER SET USERNAME='renamed-owner' WHERE ID='SAAS_OWNER'"));
    });
    assert.equal((await call('/api/auth/login',{username:bodies[0].username,password:bodies[0].password})).status,401);
    assert.equal((await call('/api/auth/login',{username:'renamed-owner',password:bodies[0].password})).status,200);
    const backup=require('../tools/database-backup');const file=await backup.backup({...require('../src/config').firebird,database:tenants[0].database},path.join(root,'backups',tenants[0].id));
    const backupId=crypto.randomUUID();await platform.query("INSERT INTO SAAS_BACKUPS (ID,TENANTID,FILEPATH,STATE) VALUES (?,?,?,'done')",[backupId,tenants[0].id,file]);
    await require('../tools/saas-backup-verify')(backupId);assert.ok((await platform.query('SELECT VERIFIED FROM SAAS_BACKUPS WHERE ID=?',[backupId]))[0].VERIFIED);
  }finally{await new Promise(resolve=>server.close(resolve));await db.closePool();}
});
