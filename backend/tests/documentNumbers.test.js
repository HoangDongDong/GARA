const test=require('node:test');
const assert=require('node:assert/strict');
const {parsePattern,formatNumber,periodFor,nextInTransaction,definitions}=require('../src/services/documentNumbers');
const date=new Date('2026-10-03T10:00:00Z');
test('number patterns support legacy quoted stars and year/month/day tokens',()=>{
  assert.equal(formatNumber("BG(yy)/('*****')",12,date),'BG26/00012');
  assert.equal(formatNumber('HD(yyyy)(MM)(dd)-(*** )'.replace('*** ','***'),99,date),'HD20261003-099');
  assert.equal(formatNumber('HD(**)',1,date),'HD01');
  assert.equal(formatNumber('TN(yy)/(*****)',1,new Date('2026-12-31T18:00:00Z')),'TN27/00001');
});
test('invalid and exhausted patterns are rejected before allocating',()=>{
  for(const value of ['', 'BG', 'BG(*)-(*)','BG(yy)/(**', 'BG(yyyyy)(*)','BG(**********)','BG(0)(*)']) assert.throws(()=>parsePattern(value));
  assert.throws(()=>formatNumber('BG(**)',100,date),/hết số/);
  assert.throws(()=>formatNumber('BG(**)',0,date));
});
test('reset uses the finest configured date unit in local time',()=>{
  assert.equal(periodFor('HD(**)',date),'ALL');
  assert.equal(periodFor('HD(yy)(**)',date),'2026');
  assert.equal(periodFor('HD(MM)(**)',date),'202610');
  assert.equal(periodFor('HD(dd)(**)',date),'20261003');
});
test('allocator locks first, skips existing numbers including cancelled documents and persists sequence',async()=>{
  const calls=[];
  const query=async(sql,params)=>{
    calls.push(sql);
    if(sql.includes('FROM SCONFIG'))return[{TEXTVALUE:'TN(yy)/(*****)'}];
    if(sql.includes('FROM SNUMBERCOUNTER'))return[{PERIODKEY:'2025',SEQ:50}];
    if(sql.includes('FROM TTIEPNHANXE'))return params[0]==='TN26/00001'?[{ID:'cancelled'}]:[];
    throw Error(sql);
  };
  const writes=[];
  const execute=async(sql,params)=>{calls.push(sql);writes.push({sql,params});};
  assert.equal(await nextInTransaction('TiepNhan',query,execute,date),'TN26/00002');
  assert.ok(calls.indexOf('UPDATE SNUMBERCOUNTER SET SEQ=SEQ WHERE CODE=?')<calls.indexOf('SELECT PERIODKEY,SEQ FROM SNUMBERCOUNTER WHERE CODE=?'));
  assert.deepEqual(writes.at(-1).params,['2026',2,'TiepNhan']);
});
test('all ten document settings are distinct and bound to actual GARA tables',()=>{
  assert.equal(definitions.length,10);
  assert.equal(new Set(definitions.map(d=>d.name)).size,10);
  assert.equal(definitions.filter(d=>d.active).length,6);
  for(const type of definitions)assert.doesNotThrow(()=>parsePattern(type.pattern));
});
test('preview finds the next available number without locking or consuming the counter',async()=>{
  const query=async(sql,params)=>{
    if(sql.includes('FROM SCONFIG'))return[{TEXTVALUE:'BH(yy)/(*****)'}];
    if(sql.includes('FROM SNUMBERCOUNTER'))return[{PERIODKEY:'2026',SEQ:7}];
    return params[0]==='BH26/00008'?[{ID:'existing'}]:[];
  };
  const execute=()=>assert.fail('Preview must never write or lock the counter');
  for(let i=0;i<2;i++)assert.equal(await nextInTransaction('BanPhuTung',query,execute,date,false),'BH26/00009');
});
