const crypto=require('crypto'),db=require('../db');
const fail=(message,status)=>Object.assign(new Error(message),{status,statusCode:status});
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
async function run(req,task) {
  // Direct service tests have no HTTP headers; all HTTP callers require a key.
  if(!req.headers)return db.transaction(task);
  const key=req.headers['idempotency-key'];
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(String(key||'')))throw fail('Thiếu khóa chống gửi trùng. Vui lòng tải lại ứng dụng.',400);
  const scope=req.originalUrl.split('?')[0],actor=req.accessUser.ID;
  const id=crypto.createHash('sha256').update(JSON.stringify([actor,scope,key])).digest('hex');
  const hash=crypto.createHash('sha256').update(JSON.stringify(canonical(req.body))).digest('hex');
  return db.transaction(async(query,execute,uuid)=>{
    await execute('UPDATE SUSER SET ID=ID WHERE ID=? AND STATUS=1',[actor]);
    const [existing]=await query('SELECT PAYLOADHASH,RESULTDATA FROM APP_REQUESTS WHERE ID=?',[id]);
    if(existing){if(existing.PAYLOADHASH!==hash)throw fail('Khóa yêu cầu đã dùng với nội dung khác.',409);const data=await require('./webReportDesigner').readBlob(existing.RESULTDATA);return JSON.parse(data.toString('utf8'));}
    const result=await task(query,execute,uuid);
    await execute('INSERT INTO APP_REQUESTS (ID,PAYLOADHASH,RESULTDATA,TIMECREATED) VALUES (?,?,?,CURRENT_TIMESTAMP)',[id,hash,Buffer.from(JSON.stringify(result),'utf8')]);
    return result;
  });
}
module.exports={run,canonical};
