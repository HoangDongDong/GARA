const express=require('express'),service=require('../services/printAgent');
const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.message});}};
const agent=express.Router(),users=express.Router();
const tenancy=require('../tenancy');
agent.use(async(req,res,next)=>{
  if(!tenancy.enabled())return next();
  try{
    const pairing=req.method==='POST'&&req.path==='/pair';
    const credential=pairing?String(req.body.ticket||''):String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const split=credential.indexOf('.');
    const id=credential.slice(0,split),raw=credential.slice(split+1);
    if(split<1||!(/^[a-f0-9-]{36}$/.test(id)||id==='legacy')||!raw)throw Object.assign(Error('Agent cần được ghép lại với cửa hàng.'),{status:401});
    const tenant=await require('../services/platform').find(id);
    if(!pairing&&!['/heartbeat'].includes(req.path)&&!tenancy.writable(tenant))throw Object.assign(Error('Gói sử dụng đã hết hạn.'),{status:402});
    if(pairing){if(!tenancy.writable(tenant))throw Object.assign(Error('Gói sử dụng đã hết hạn.'),{status:402});req.body.ticket=raw;}
    else req.headers.authorization='Bearer '+raw;
    return tenancy.run(tenant,next);
  }catch(error){res.status(error.status||503).json({error:error.status?error.message:'Chưa kết nối được cửa hàng.'});}
});
agent.post('/pair',wrap(async(req,res)=>{const result=await service.pair(req.body.ticket,req.body.name);if(tenancy.enabled())result.token=tenancy.key()+'.'+result.token;res.json(result);}));
agent.use(async(req,res,next)=>{try{req.station=await service.authenticate(String(req.headers.authorization||'').replace(/^Bearer\s+/i,''));next();}catch(e){res.status(e.status||401).json({error:e.message});}});
agent.post('/heartbeat',wrap(async(req,res)=>res.json(await service.heartbeat(req.station,req.body))));
agent.post('/claim',wrap(async(req,res)=>res.json({job:await service.claim(req.station)})));
agent.get('/jobs/:id/pdf',wrap(async(req,res)=>res.type('pdf').send(await service.pdf(req.station,req.params.id))));
agent.post('/jobs/:id/status',wrap(async(req,res)=>res.json(await service.report(req.station,req.params.id,req.body))));
users.get('/configuration',wrap(async(req,res)=>res.json(await service.configuration())));
users.post('/pairing',wrap(async(req,res)=>{const result=await service.pairing(req.accessUser);if(tenancy.enabled())result.ticket=tenancy.key()+'.'+result.ticket;res.json(result);}));
users.put('/printers/:id',wrap(async(req,res)=>res.json(await service.configure(req.accessUser,req.params.id,req.body))));
users.post('/stations/:id/revoke',wrap(async(req,res)=>res.json(await service.revoke(req.accessUser,req.params.id))));
users.post('/jobs',wrap(async(req,res)=>res.json(await service.createJob(req.accessUser,req.body))));
users.get('/jobs/:id',wrap(async(req,res)=>res.json(await service.getJob(req.accessUser,req.params.id))));
users.post('/jobs/:id/cancel',wrap(async(req,res)=>res.json(await service.cancel(req.accessUser,req.params.id))));
users.post('/jobs/:id/reprint',wrap(async(req,res)=>res.json(await service.reprint(req.accessUser,req.params.id,req.body.idempotencyKey))));
module.exports={agent,users};
