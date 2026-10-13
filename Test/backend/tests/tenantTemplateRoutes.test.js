const test=require('node:test'),assert=require('node:assert/strict');
const db=require('../../../backend/src/db.js'),web=require('../../../backend/src/services/webReportDesigner.js'),tenancy=require('../../../backend/src/tenancy.js');
test('tenant editor isolates identical IDs, rejects injected scripts on save/preview, supports copies',async()=>{
 process.env.SAAS_ENABLED='true';
 const originals={query:db.query,queryBlob:db.queryBlob,transaction:db.transaction,backup:web.backup,listBackups:web.listBackups,preview:web.preview};
 const base='<?xml version="1.0"?><Report><ScriptText>trusted</ScriptText><ReportPage Name="P"><ReportTitleBand Name="B"><TextObject Name="Text1" Text="Cảm ơn" Width="80"/></ReportTitleBand></ReportPage></Report>';
 const stores={A:Buffer.from(base),B:Buffer.from(base)},backups=[];let rendered=0;
 db.queryBlob=async(sql,[id])=>id==='same-id'?stores[tenancy.key()]:null;
 db.query=async()=>[{ID:'same-id'}];
 db.transaction=async fn=>fn(async sql=>sql.includes('SCONFIG')?[{ID:'config',OTHERCONFIG:'[]'}]:[{ID:'same-id',TEMPLATE:stores[tenancy.key()]}],async(sql,params)=>{if(sql.startsWith('UPDATE STEMPLATE'))stores[tenancy.key()]=params[0];});
 web.backup=(id,bytes)=>backups.push({tenant:tenancy.key(),bytes});web.listBackups=()=>[];
 web.preview=async()=>{rendered++;return Buffer.from('%PDF-test');};
 const router=require('../../../backend/src/routes/printTemplates.js');
 async function request(tenant,method,route,body){return tenancy.run({id:tenant,database:tenant+'.fdb'},async()=>{
  const req={method:method.toUpperCase(),path:route==='/'?'/':'/same-id/'+route.split('/').pop(),params:{id:'same-id'},body};
  const result={status:200};const res={set(){return this;},status(n){result.status=n;return this;},json(data){result.data=data;return this;},send(data){result.data=data;return this;}};
  let allowed=false;router.stack.find(l=>!l.route).handle(req,res,()=>{allowed=true;});
  if(allowed)await router.stack.find(l=>l.route?.path===route&&l.route.methods[method]).route.stack[0].handle(req,res);
  return result;
 });}
 try{
  const changed=base.replace('Width="80"','Width="100"');
  const saved=await request('A','put','/:id/web-content',{content:changed,version:web.revision(stores.A)});assert.equal(saved.status,200);
  assert.equal(stores.B.toString(),base);assert.equal(backups[0].tenant,'A');
  const injected=changed.replace('trusted','attack');
  assert.equal((await request('A','put','/:id/web-content',{content:injected,version:web.revision(stores.A)})).status,400);
  assert.equal((await request('A','post','/:id/web-preview',{content:injected,payload:{parameters:{},tables:{}}})).status,400);assert.equal(rendered,0);
  assert.equal((await request('A','post','/:id/web-preview',{content:changed,payload:{parameters:{},tables:{}}})).status,200);assert.equal(rendered,1);
  assert.equal((await request('B','post','/',{name:'Bản sao',content:base,configName:'MauHoaDonBanHang',sourceTemplateId:'other-store-id'})).status,404);
  assert.equal((await request('B','post','/',{name:'Bản sao',content:base,configName:'MauHoaDonBanHang',sourceTemplateId:'same-id'})).status,201);
  assert.equal((await request('A','post','/',{name:'FRX',content:base,configName:'MauHoaDonBanHang'})).status,403);
 }finally{Object.assign(db,{query:originals.query,queryBlob:originals.queryBlob,transaction:originals.transaction});Object.assign(web,{backup:originals.backup,listBackups:originals.listBackups,preview:originals.preview});}
});
