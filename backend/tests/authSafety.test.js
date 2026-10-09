const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
process.env.AUTH_SECURITY_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'garage-auth-test-'));
const security=require('../src/authSecurity');
test('sessions bind to password version, expire, reject malformed tokens and revoke on logout',()=>{
  const hash=security.hashPassword('test-password'),version=security.credentialVersion(hash);
  assert.equal(security.verifyPassword('test-password',hash),true);assert.equal(security.verifyPassword('wrong',hash),false);
  assert.notEqual(version,security.credentialVersion(security.hashPassword('new-password')));
  assert.throws(()=>security.signToken('test-user'),/phiên bản/);
  const token=security.signToken('test-user',version),data=security.verifyToken(token);
  assert.equal(data.sub,'test-user');assert.equal(data.pv,version);assert.ok(data.exp-Math.floor(Date.now()/1000)<=43200);
  assert.equal(security.verifyToken(token+'.extra'),null);assert.equal(security.verifyToken('invalid'),null);
  security.revokeToken(token);assert.equal(security.verifyToken(token),null);
});
test('password reset makes previously issued token fail authentication without exposing credentials',async()=>{
  const db=require('../src/db'),original=db.query;
  const oldHash=security.hashPassword('old'),token=security.signToken('test-user',security.credentialVersion(oldHash));
  db.query=async sql=>sql.includes('FROM SUSER')?[{ID:'test-user',ISADMIN:0,PASSWORD:security.hashPassword('new')}]:[];
  let status=200,next=false;
  try{const access=require('../src/accessControl');const user=await access.loadAccessUser('test-user');assert.equal(user.PASSWORD,undefined);assert.equal(user.NOTE,undefined);await access.authenticate({headers:{authorization:'Bearer '+token},method:'GET',query:{}},{status(n){status=n;return this;},json(){}},()=>{next=true;});assert.equal(status,401);assert.equal(next,false);}finally{db.query=original;}
});
