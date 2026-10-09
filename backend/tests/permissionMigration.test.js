const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../src/permissionPolicy');
test('new action defaults preserve relevant old workflows without granting admin or catalog', () => {
  const old={REPAIR:31,EMPLOYEES:31,SALES:31,FINANCE:31,INVENTORY:31,REPORTS:31};
  for(const [code,,,mask] of policy.functions) {
    assert.equal(policy.initialMode(code,{}) ,0);
    assert.equal(policy.initialMode(code,old) & ~mask,0);
  }
  assert.equal(policy.initialMode('CATALOG',old),0);
  assert.equal(policy.initialMode('PAYMENTS',{REPAIR:31}),0);
  assert.equal(policy.initialMode('APPROVE_QUOTE',{REPAIR:3}),0);
  assert.equal(policy.initialMode('COST',{SALES:31,REPAIR:31}),0);
});
test('migration is transactional and repeat runs do not restore revoked roles', async () => {
  const db=require('../src/db'), original=db.transaction;
  const funcs=[], roles=[]; let counter=0, transactions=0;
  db.transaction=async callback=>{transactions++;return callback(async(sql,args=[])=>{
    if(sql==='SELECT ID FROM SGROUPUSER WHERE STATUS=1')return [{ID:'group'}];
    if(sql.startsWith('SELECT FIRST 1 ID FROM SFUNCTION'))return funcs.filter(f=>f.CODE===args[0]);
    if(sql.startsWith('SELECT FIRST 1 ID FROM SGROUPROLE'))return roles.filter(r=>r.group===args[0]&&r.func===args[1]);
    if(sql.startsWith('SELECT F.CODE,R.MODE'))return [{CODE:'REPAIR',MODE:31},{CODE:'EMPLOYEES',MODE:31}];
    throw Error(sql);
  },async(sql,args)=>{
    if(sql.startsWith('INSERT INTO SFUNCTION'))funcs.push({ID:args[0],CODE:args[1]});
    else if(sql.startsWith('INSERT INTO SGROUPROLE'))roles.push({ID:args[0],group:args[1],func:args[2],MODE:args[3]});
    else throw Error(sql);
  },()=>String(++counter));};
  try {
    const migrate=require('../migrate_permission_actions');
    await migrate(); assert.equal(funcs.length,11); assert.equal(roles.length,11);
    const role=roles.find(r=>r.func===funcs.find(f=>f.CODE==='ASSIGN_REPAIR').ID);
    assert.equal(role.MODE,4); role.MODE=0;
    await migrate(); assert.equal(role.MODE,0); assert.equal(roles.length,11); assert.equal(transactions,2);
  } finally {db.transaction=original;}
});
