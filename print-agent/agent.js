'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const {recoverLedger}=require('./ledger');
const ROOT=__dirname,DATA=process.env.GARA_AGENT_DATA||path.join(ROOT,'data');fs.mkdirSync(DATA,{recursive:true});
const PORT=Number(process.env.GARA_AGENT_PORT||3790),VERSION='0.1.0';
const HELPER=process.env.GARA_PRINT_HELPER||path.join(ROOT,'helper','bin','Release','net8.0-windows10.0.19041.0','Garage.PrintHelper.exe');
const atomic=(file,value)=>{const temp=file+'.tmp';const fd=fs.openSync(temp,'w');try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);};
const read=(name,fallback)=>{try{return JSON.parse(fs.readFileSync(path.join(DATA,name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
const run=(exe,args,timeout=120000)=>new Promise((resolve,reject)=>execFile(exe,args,{windowsHide:true,timeout,maxBuffer:4*1024*1024},(e,out,err)=>e?reject(new Error(String(err||e.message).slice(0,1000))):resolve(out)));
async function protect(value,decrypt=false){const script=`Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String('${Buffer.from(value).toString('base64')}'); $o=[Security.Cryptography.ProtectedData]::${decrypt?'Unprotect':'Protect'}($b,$null,[Security.Cryptography.DataProtectionScope]::LocalMachine); [Console]::Write([Convert]::ToBase64String($o))`;return Buffer.from((await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],10000)).trim(),'base64');}
let config=read('config.json',{}),credential='',ledger=read('jobs.json',{}),busy=false,lastError='',lastSeen='';
const save=()=>atomic(path.join(DATA,'jobs.json'),ledger);
async function api(route,body,raw=false){const response=await fetch(config.serverUrl+'/api/print-agent'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(raw?90000:10000)});if(!response.ok){let error;try{error=(await response.json()).error;}catch{}throw Object.assign(new Error(error||'API '+response.status),{status:response.status});}return raw?Buffer.from(await response.arrayBuffer()):response.json();}
async function pair(serverUrl,ticket){const url=new URL(serverUrl);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Cần HTTPS; chỉ localhost được dùng HTTP.');url.pathname='';url.search='';url.hash='';const response=await fetch(url.origin+'/api/print-agent/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,name:require('node:os').hostname()}),signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok)throw Error(result.error);credential=result.token;config={serverUrl:url.origin,stationId:result.stationId,protectedToken:(await protect(Buffer.from(result.token))).toString('base64')};atomic(path.join(DATA,'config.json'),config);return {stationId:config.stationId};}
async function printers(){return JSON.parse(await run(HELPER,['printers'],10000));}
async function heartbeat(){if(!credential)return;await api('/heartbeat',{version:VERSION,printers:await printers()});lastSeen=new Date().toISOString();}
async function report(id,state,detail){await api('/jobs/'+id+'/status',{state,detail});}
async function recover(){await recoverLedger(ledger,report,save);}
async function processJob(job){const id=job.ID;if(ledger[id]){await recover();return;}
const row=ledger[id]={state:'received',completedCopies:0,at:new Date().toISOString()};save();const file=path.join(DATA,id+'.pdf');
try{
 const pdf=await api('/jobs/'+id+'/pdf',undefined,true);
 if(pdf.length>50*1024*1024||crypto.createHash('sha256').update(pdf).digest('hex')!==job.PDFHASH||pdf.subarray(0,5).toString()!=='%PDF-')throw Error('PDF không hợp lệ hoặc hash không khớp.');
 fs.writeFileSync(file,pdf);
 await report(id,'dispatching','Agent bắt đầu gửi tới '+job.PRINTERNAME);
 row.state='dispatching';save();
 for(let i=0;i<job.COPIES;i++){
  const result=JSON.parse(await run(HELPER,['print',file,job.PRINTERNAME,String([54,58,80].includes(job.WIDTHMM)?job.WIDTHMM:0),'GARA-'+id+'-'+(i+1)],120000));
  if(!result.submitted)throw Error('Helper chưa xác nhận gửi spooler.');
  row.spoolIds=[...(row.spoolIds||[]),result.spoolId];row.completedCopies=i+1;save();
 }
 row.state='submitted';row.detail='Spooler đã nhận '+row.completedCopies+' bản (ID '+row.spoolIds.join(',')+'); chưa xác nhận giấy đã ra.';save();
}catch(e){row.state=row.state==='dispatching'?'needs_review':'failed';row.detail=e.message+'; số bản đã gửi: '+row.completedCopies;save();}
finally{try{fs.unlinkSync(file);}catch{}}
// A report/network failure must never remove local evidence of submission.
await report(id,row.state,row.detail);row.reported=true;save();
}
async function tick(){if(busy||!credential)return;busy=true;try{await recover();const {job}=await api('/claim',{});if(job)await processJob(job);lastError='';}catch(e){lastError=e.message;}finally{busy=false;}}
const session=crypto.randomBytes(24).toString('hex');
function reply(res,status,body,type='application/json'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);}
const server=http.createServer(async(req,res)=>{
try{
 if(req.headers.host!=='127.0.0.1:'+PORT&&req.headers.host!=='localhost:'+PORT)return reply(res,403,{error:'Host không được phép.'});
 if(req.headers.origin&&!['http://127.0.0.1:'+PORT,'http://localhost:'+PORT].includes(req.headers.origin))return reply(res,403,{error:'Origin không được phép.'});
 if(req.method==='GET'&&req.url==='/'){res.setHeader('Set-Cookie',`gara_agent=${session}; HttpOnly; SameSite=Strict; Path=/`);return reply(res,200,fs.readFileSync(path.join(ROOT,'ui.html'),'utf8'),'text/html; charset=utf-8');}
 if(!String(req.headers.cookie||'').split(';').map(s=>s.trim()).includes('gara_agent='+session))return reply(res,403,{error:'Mở trang cấu hình Agent trước.'});
 if(req.method==='GET'&&req.url==='/status')return reply(res,200,{version:VERSION,stationId:config.stationId,serverUrl:config.serverUrl,lastSeen,lastError,busy,printers:await printers(),jobs:Object.entries(ledger).slice(-20).map(([id,row])=>({id,...row}))});
 if(req.method==='POST'&&req.url==='/pair'){if(busy)throw Error('Đang xử lý lệnh; đợi kết thúc trước khi ghép.');let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>4096)throw Error('Yêu cầu quá lớn.');chunks.push(chunk);}const body=JSON.parse(Buffer.concat(chunks));const result=await pair(body.serverUrl,body.ticket);await heartbeat();return reply(res,200,result);}
 reply(res,404,{error:'Không có API.'});
}catch(e){reply(res,400,{error:e.message});}
});
async function start(){try{fs.unlinkSync(path.join(DATA,'stop.request'));}catch{}for(const row of Object.values(ledger)){if(['received','dispatching'].includes(row.state)){row.state='needs_review';row.detail='Agent khởi động lại khi công việc chưa kết thúc; kiểm tra giấy trước khi in lại.';}}save();if(config.protectedToken)credential=(await protect(Buffer.from(config.protectedToken,'base64'),true)).toString();server.listen(PORT,'127.0.0.1',()=>console.log('GARA Print Agent: http://127.0.0.1:'+PORT));try{await heartbeat();}catch(e){lastError=e.message;}setInterval(()=>heartbeat().catch(e=>{lastError=e.message;}),30000);setInterval(()=>{if(fs.existsSync(path.join(DATA,'stop.request'))){if(!busy)process.exit(0);return;}tick();},1500);await tick();}
start().catch(e=>{console.error(e.message);process.exitCode=1;});
