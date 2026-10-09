const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
process.env.AUTH_SECURITY_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'garage-platform-credentials-'));
delete process.env.SAAS_ADMIN_PASSWORD_HASH;
const credentials=require('../src/services/platformCredentials'),security=require('../src/authSecurity');
test('first platform password setup requires localhost and cannot overwrite credentials',()=>{
  delete process.env.SAAS_ADMIN_PASSWORD_HASH;
  const local={ip:'127.0.0.1',headers:{origin:'http://localhost:5173'}};
  assert.equal(credentials.passwordHash(),null);
  for(const req of [{...local,ip:'192.0.2.1'},{...local,headers:{origin:'https://evil.example'}},{...local,headers:{}}])assert.throws(()=>credentials.setup(req,'fixture-password-123'),e=>e.status===403);
  assert.throws(()=>credentials.setup(local,'short'),e=>e.status===400);
  credentials.setup(local,'fixture-password-123');
  assert.ok(security.verifyPassword('fixture-password-123',credentials.passwordHash()));
  assert.throws(()=>credentials.setup(local,'overwrite-password-123'),e=>e.status===409);
  assert.ok(security.verifyPassword('fixture-password-123',credentials.passwordHash()));
});
