export function prepareRequest(config,storage=localStorage,makeKey=()=>crypto.randomUUID()){
  if(config.method!=='post'||!/\/(sales|inventory-receipts|finance\/(vouchers|debts\/payments))\/?$/.test(config.url))return config;
  let user={};try{user=JSON.parse(storage.getItem('garage_user')||'{}');}catch{}
  const signature=JSON.stringify([user.TENANT?.id || 'legacy',user.ID || '',config.url,config.data]);
  let hash=2166136261;for(const c of signature)hash=Math.imul(hash^c.charCodeAt(0),16777619);
  const slot='garage_pending_request_'+(hash>>>0);
  let saved;try{saved=JSON.parse(storage.getItem(slot)||'null');}catch{}
  if(!saved||saved.signature!==signature||Date.now()-saved.created>3600000){saved={signature,created:Date.now(),key:makeKey()};storage.setItem(slot,JSON.stringify(saved));}
  config.headers['Idempotency-Key']=saved.key;config.requestSlot=slot;return config;
}
export function finishRequest(config,storage=localStorage){
  if(!config?.requestSlot)return;
  let saved;try{saved=JSON.parse(storage.getItem(config.requestSlot)||'null');}catch{}
  if(saved?.key===config.headers?.['Idempotency-Key'])storage.removeItem(config.requestSlot);
}
