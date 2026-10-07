const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const router = require('../src/routes/employees');
const reportService = require('../src/services/employeeCommissions');
const handler = (method,path) => router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
async function call(method,path,body={},params={},query={}) {
  let status=200,result;
  await handler(method,path)({body,params,query,accessUser:{ID:'SYSTEM'}},{status(value){status=value;return this;},json(value){result=value;},set(){return this;}});
  return {status,result};
}
test('Firebird employee profile, salary and commission report use real rows; test data rolls back', {skip:process.env.TEST_FIREBIRD!=='1'}, async () => {
  const original={query:db.query,execute:db.execute,transaction:db.transaction,queryBlob:db.queryBlob};
  const rollback=new Error('ROLLBACK_EMPLOYEE_TEST');let employeeId;
  await assert.rejects(original.transaction(async(query,execute,uuid)=>{
    db.query=query;db.execute=execute;db.transaction=callback=>callback(query,execute,uuid);
    db.queryBlob=async(sql,params,field)=>{
      const [row]=await query(sql,params); const blob=row?.[field]; if (!blob) return null;
      if (Buffer.isBuffer(blob)) return blob;
      return new Promise((resolve,reject)=>blob((error,name,stream)=>{if(error)return reject(error);const chunks=[];stream.on('data',chunk=>chunks.push(chunk));stream.on('error',reject);stream.on('end',()=>resolve(Buffer.concat(chunks)));}));
    };
    try {
      const departmentId=uuid();
      await execute("INSERT INTO DPHONGBAN (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'Employee test',1,'SYSTEM')",[departmentId]);
      const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPTkAAAAASUVORK5CYII=';
      const created=await call('post','/',{NAME:'Employee payroll test',DPHONGBANID:departmentId,LOAINHANVIEN:1,CACHTINHLUONG:0,LUONGTHANG:8000000,PHOTO:photo});
      assert.equal(created.status,200,created.result.error);employeeId=created.result.id;
      const [employee]=await query('SELECT * FROM DNHANVIEN WHERE ID=?',[employeeId]);
      assert.ok(employee.CODE.startsWith('NV-'));assert.equal(Number(employee.LUONGTHANG),8000000);
      assert.ok(employee.SIMAGEID);
      const storedBytes=await db.queryBlob('SELECT IMAGE FROM SIMAGE WHERE ID=?',[employee.SIMAGEID],'IMAGE');
      assert.deepEqual(storedBytes,Buffer.from(photo.split(',')[1],'base64'));
      const mediaHeaders={};let servedBytes;
      await handler('get','/:id/image')({params:{id:employeeId}},{set(key,value){mediaHeaders[key]=value;return this;},send(value){servedBytes=value;},status(){return this;},json(value){assert.fail(value.error);}});
      assert.equal(mediaHeaders['Content-Type'],'image/png');assert.deepEqual(servedBytes,storedBytes);
      const updated=await call('put','/:id',{NAME:'Edited payroll employee',LUONGTHANG:9000000},{id:employeeId});
      assert.equal(updated.status,200,updated.result.error);
      const profile=(await call('get','/',{},{},{includeInactive:'1'})).result.data.find(row=>row.ID===employeeId);
      assert.equal(profile.PHONGBAN,'Employee test');assert.equal(Number(profile.LUONGTHANG),9000000);assert.equal(Number(profile.LOAINHANVIEN),1);
      assert.equal(profile.SIMAGEID,employee.SIMAGEID);assert.equal(Number(profile.CO_ANHNV),1);
      assert.equal((await call('put','/:id',{NAME:'Invalid photo',PHOTO:'bad'},{id:employeeId})).status,400);
      assert.equal((await query('SELECT SIMAGEID FROM DNHANVIEN WHERE ID=?',[employeeId]))[0].SIMAGEID,employee.SIMAGEID);
      assert.equal((await call('put','/:id',{NAME:profile.NAME,PHOTO:null},{id:employeeId})).status,200);
      assert.equal((await query('SELECT SIMAGEID FROM DNHANVIEN WHERE ID=?',[employeeId]))[0].SIMAGEID,null);
      assert.equal((await call('put','/:id',{NAME:'',LUONGTHANG:-1},{id:employeeId})).status,400);
      assert.equal((await call('put','/:id',{NAME:'Invalid',DPHONGBANID:'missing'},{id:employeeId})).status,400);
      const [customer]=await query('SELECT FIRST 1 ID FROM DKHACHHANG WHERE STATUS=1');
      const vehicle=uuid(),repair=uuid();
      await execute("INSERT INTO DXE (ID,NAME,BIENSO,DKHACHHANGID,STATUS,USERCREATEDID) VALUES (?,'Payroll test','PAY-ROLL',?,1,'SYSTEM')",[vehicle,customer.ID]);
      await execute("INSERT INTO TLENHSUACHUA (ID,NAME,DXEID,DKHACHHANGID,NGAY,STATUS,USERCREATEDID) VALUES (?,'PAY-TEST',?,?,'2026-10-01',1,'SYSTEM')",[repair,vehicle,customer.ID]);
      await execute("INSERT INTO TTRANGTHAIXE (ID,NAME,DXEID,DKHACHHANGID,TLENHSUACHUAID,TRANGTHAI,STATUS,USERCREATEDID) VALUES (?,'WF-PAY',?,?,?,4,1,'SYSTEM')",[uuid(),vehicle,customer.ID,repair]);
      await execute("INSERT INTO THOADONSUACHUA (ID,NAME,TLENHSUACHUAID,DXEID,DKHACHHANGID,DATHANHTOAN,STATUS,USERCREATEDID) VALUES (?,'INV-PAY',?,?,?,1,1,'SYSTEM')",[uuid(),repair,vehicle,customer.ID]);
      const assignment=uuid();
      await execute("INSERT INTO TPHANCONGNHANVIEN (ID,TLENHSUACHUAID,DNHANVIENID,HOAHONG,TILECHIA,PHUTRACHCHINH,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,200000,100,1,1,'SYSTEM','2026-10-06')",[assignment,repair,employeeId]);
      const payroll=uuid();
      await execute("INSERT INTO TBANGLUONG (ID,NAME,NAM,THANG,STATUS,USERCREATEDID) VALUES (?,'PAY-TEST-10',2026,10,1,'SYSTEM')",[payroll]);
      await execute("INSERT INTO TBANGLUONGCHITIET (ID,TBANGLUONGID,DNHANVIENID,LUONGCOBAN,HOAHONG,THUONG,PHAT,TONGCONG,STATUS,USERCREATEDID) VALUES (?,?,?,8000000,150000,50000,20000,8180000,1,'SYSTEM')",[uuid(),payroll,employeeId]);
      const report=await reportService.load(query,{month:'2026-10',from:'2026-10-01',to:'2026-10-31'});
      assert.equal(report.data.find(row=>row.ID===assignment).ELIGIBLE,true);
      assert.equal(Number(report.payroll.find(row=>row.DNHANVIENID===employeeId).TONGCONG),8180000);
      const prior=await reportService.load(query,{month:'2026-09',from:'2026-09-01',to:'2026-09-30'});
      assert.ok(!prior.data.some(row=>row.ID===assignment));assert.ok(!prior.payroll.some(row=>row.DNHANVIENID===employeeId));
      assert.equal((await call('patch','/:id/status',{status:0},{id:employeeId})).status,200);
      assert.ok((await reportService.load(query,{month:'2026-10'})).data.some(row=>row.ID===assignment),'Inactive employee keeps historical commission');
      assert.equal((await call('patch','/:id/status',{status:1},{id:employeeId})).status,200);
      throw rollback;
    } finally {Object.assign(db,original);}
  }),error=>error===rollback);
  assert.equal((await db.query('SELECT ID FROM DNHANVIEN WHERE ID=?',[employeeId])).length,0);
});
