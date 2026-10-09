const crypto=require('crypto'),fs=require('fs'),path=require('path');
const securityDir=process.env.AUTH_SECURITY_DIR || path.resolve(__dirname,'../storage/security');
fs.mkdirSync(securityDir,{recursive:true});
const secretFile=path.join(securityDir,'token-secret');
const configured=process.env.AUTH_TOKEN_SECRET;
let secret=configured && !['change-this-secret-in-production','kazuko-garage-local-access-control'].includes(configured) && configured.length>=32 ? configured : null;
if(!secret){try{secret=fs.readFileSync(secretFile,'utf8').trim();}catch(e){if(e.code!=='ENOENT')throw e;const generated=crypto.randomBytes(48).toString('base64url');try{fs.writeFileSync(secretFile,generated,{flag:'wx',mode:0o600});secret=generated;}catch(e){if(e.code!=='EEXIST')throw e;secret=fs.readFileSync(secretFile,'utf8').trim();}}}
if(secret.length<32)throw Error('Secret phiên không hợp lệ.');
const TOKEN_TTL_SECONDS=12*60*60;
const revocationFile=path.join(securityDir,'revoked-sessions.json');
let revoked={};try{revoked=JSON.parse(fs.readFileSync(revocationFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');return ['scrypt',salt,crypto.scryptSync(String(password),salt,32).toString('hex')].join('$');}
function verifyPassword(password,stored){if(!stored)return false;if(!String(stored).startsWith('scrypt$'))return String(password)===String(stored);try{const [,salt,expectedHex]=String(stored).split('$');if(!salt||!expectedHex||expectedHex.length!==64)return false;const actual=crypto.scryptSync(String(password),salt,32),expected=Buffer.from(expectedHex,'hex');return actual.length===expected.length && crypto.timingSafeEqual(actual,expected);}catch{return false;}}
const credentialVersion=stored=>crypto.createHmac('sha256',secret).update(String(stored||'')).digest('base64url');
function signToken(userId,version,claims={}){if(!version)throw Error('Thiếu phiên bản thông tin đăng nhập.');const payload=Buffer.from(JSON.stringify({sub:userId,pv:version,tid:claims.tenantId,aud:claims.audience||'garage',jti:crypto.randomUUID(),exp:Math.floor(Date.now()/1000)+TOKEN_TTL_SECONDS})).toString('base64url');return payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url');}
function verifyToken(token){try{const parts=String(token||'').split('.');if(parts.length!==2)return null;const [payload,signature]=parts,expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return data.sub && data.pv && data.jti && Number.isFinite(data.exp) && data.exp>Math.floor(Date.now()/1000) && !revoked[data.jti] ? data:null;}catch{return null;}}
function revokeToken(token){const data=verifyToken(token);if(!data)return;const now=Math.floor(Date.now()/1000);revoked=Object.fromEntries(Object.entries(revoked).filter(([,expiry])=>expiry>now));revoked[data.jti]=data.exp;fs.writeFileSync(revocationFile+'.tmp',JSON.stringify(revoked),{mode:0o600});fs.renameSync(revocationFile+'.tmp',revocationFile);}
module.exports={hashPassword,verifyPassword,signToken,verifyToken,credentialVersion,revokeToken};
