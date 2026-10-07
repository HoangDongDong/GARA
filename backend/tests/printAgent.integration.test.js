const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const db=require('../src/db'),s=require('../src/services/printAgent');
test('Agent tickets, credentials, claim, cancellation and submission evidence',{skip:process.env.GARA_PRINT_INTEGRATION!=='1'},async()=>{
 const [admin]=await db.query("SELECT FIRST 1 ID,USERNAME,ISADMIN FROM SUSER WHERE ISADMIN=1 AND STATUS=1");
 const ticket=await s.pairing(admin),paired=await s.pair(ticket.ticket,'Agent integration test'),station=await s.authenticate(paired.token),ids=[];
 try{
  await assert.rejects(s.pair(ticket.ticket,'duplicate'),/đã dùng/);
  await assert.rejects(s.authenticate('invalid'),/thu hồi/);
  await assert.rejects(s.pairing({ISADMIN:0}),/Admin/);
  await s.heartbeat(station,{version:'test',printers:[{name:'Test Printer'}]});
  const {printers}=await s.configuration(),printer=printers.find(p=>p.STATIONID===station.ID);
  async function fixture(){const id=crypto.randomUUID();ids.push(id);await db.execute("INSERT INTO PRINT_JOBS (ID,USERID,TYPEKEY,RECORDID,PRINTERID,STATIONID,PRINTERNAME,WIDTHMM,COPIES,STATE,IDEMKEY,EXPIRES) VALUES (?,?, 'MauPhieuSuaChua','test',?,?, 'Test Printer',80,1,'queued',?,DATEADD(5 MINUTE TO CURRENT_TIMESTAMP))",[id,admin.ID,printer.ID,station.ID,crypto.randomUUID()]);return id;}
  const id=await fixture(),claimed=await s.claim(station);assert.equal(claimed.ID,id);assert.equal(await s.claim(station),null);
  await s.report(station,id,{state:'dispatching'});await s.report(station,id,{state:'submitted',detail:'spool 42'});
  await s.report(station,id,{state:'submitted',detail:'report retry'});assert.equal((await s.getJob(admin,id)).DETAIL,'spool 42');
  await assert.rejects(s.cancel(admin,id),/bắt đầu/);
  await assert.rejects(s.getJob({ID:'other',ISADMIN:0},id),/Không tìm/);
  const cancelled=await fixture();await s.claim(station);await s.cancel(admin,cancelled);await assert.rejects(s.report(station,cancelled,{state:'dispatching'}),/hủy/);
  const uncertain=await fixture();await s.claim(station);await s.report(station,uncertain,{state:'dispatching'});await db.execute('UPDATE PRINT_JOBS SET LEASEUNTIL=DATEADD(-1 SECOND TO CURRENT_TIMESTAMP) WHERE ID=?',[uncertain]);await s.claim(station);assert.equal((await s.getJob(admin,uncertain)).STATE,'needs_review');
  await s.configure(admin,printer.ID,{enabled:true,widthMm:80});
  const bytes=Buffer.from('%PDF-1.4\nimmutable test snapshot');await db.execute('UPDATE PRINT_JOBS SET PDFDATA=?,PDFHASH=? WHERE ID=?',[bytes,s.hash(bytes),id]);
  const key=crypto.randomUUID(),again=await s.reprint(admin,id,key);ids.push(again.ID);const duplicate=await s.reprint(admin,id,key);assert.equal(duplicate.ID,again.ID);assert.equal(again.PDFHASH,s.hash(bytes));assert.deepEqual(await db.queryBlob('SELECT PDFDATA FROM PRINT_JOBS WHERE ID=?',[again.ID],'PDFDATA'),bytes);await s.cancel(admin,again.ID);
  await s.revoke(admin,station.ID);await assert.rejects(s.authenticate(paired.token),/thu hồi/);
 }finally{for(const id of ids){await db.execute('DELETE FROM PRINT_JOB_EVENTS WHERE JOBID=?',[id]);await db.execute('DELETE FROM PRINT_JOBS WHERE ID=?',[id]);}await db.execute('DELETE FROM PRINT_PRINTERS WHERE STATIONID=?',[station.ID]);await db.execute('DELETE FROM PRINT_STATIONS WHERE ID=?',[station.ID]);await db.execute('DELETE FROM PRINT_PAIRINGS WHERE TICKETHASH=?',[s.hash(ticket.ticket)]);}
});
