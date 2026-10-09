const entries=new Map();
function middleware(req,res,next) {
  const now=Date.now(),window=15*60*1000;
  for(const [key,value] of entries)if(value.until<=now)entries.delete(key);
  const username=String(req.body?.username ?? req.body?.USERNAME ?? '').trim().toLowerCase().slice(0,120);
  const tenant=String(req.body?.tenantCode||'legacy').trim().toLowerCase().slice(0,40);
  const keys=[['ip:'+req.ip,50],['account:'+username,15]];
  for(const [key,limit] of keys) {
    const entry=entries.get(key);
    if(entry && entry.count>=limit){res.set('Retry-After',String(Math.ceil((entry.until-now)/1000)));return res.status(429).json({error:'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.'});}
  }
  // Bound memory even if requests use a different username each time.
  if(entries.size>10000)return res.status(429).json({error:'Hệ thống đang nhận quá nhiều yêu cầu đăng nhập.'});
  for(const [key] of keys){const entry=entries.get(key)||{count:0,until:now+window};entry.count++;entries.set(key,entry);}
  res.on('finish',()=>{if(res.statusCode===200)for(const [key] of keys)entries.delete(key);});
  next();
}
module.exports={middleware};
