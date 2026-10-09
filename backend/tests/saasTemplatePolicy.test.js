const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../tools/saas-template-from-source');
test('template deletion follows foreign-key children before parents',()=>{
  const order=policy.deletionOrder(['DMATHANG','TLENHSUACHUA','TPHATSINHSUACHUA','TPHATSINHSUACHUACT'],[
    {CHILD:'TPHATSINHSUACHUA',PARENT:'TLENHSUACHUA'},
    {CHILD:'TPHATSINHSUACHUACT',PARENT:'TPHATSINHSUACHUA'},
    {CHILD:'TPHATSINHSUACHUACT',PARENT:'DMATHANG'},
  ]);
  for(const [child,parent]of [['TPHATSINHSUACHUA','TLENHSUACHUA'],['TPHATSINHSUACHUACT','TPHATSINHSUACHUA'],['TPHATSINHSUACHUACT','DMATHANG']])assert.ok(order.indexOf(child)<order.indexOf(parent));
});
test('cyclic delete dependencies fail before any deletion',()=>{
  assert.throws(()=>policy.deletionOrder(['A','B'],[{CHILD:'A',PARENT:'B'},{CHILD:'B',PARENT:'A'}]),/chu trình/);
});
