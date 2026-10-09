const test=require('node:test');
const assert=require('node:assert/strict');
const {build,sizes}=require('../src/services/documentPaperSizes');
const {paper}=require('../src/services/paperSizeAudit');
const {types,validateBindings}=require('../src/services/documentPrint');
test('A4 and A5 totals form a compact block at the right while words and signatures retain full width',()=>{
 for(const size of ['A4-doc','A4-ngang','A5']){
  const xml=build(types.find(t=>t.key==='MauPhieuSuaChua'),size);
  const summary=xml.match(/<TableObject Name="StyledSummary"[^>]*>/)[0];
  const footer=xml.match(/<TableObject Name="StyledFooter"[^>]*>/)[0];
  const value=(tag,key)=>Number(tag.match(new RegExp(`\\b${key}="([^\\"]+)"`))[1]);
  assert.ok(value(summary,'Left')>0);
  assert.ok(value(summary,'Width')<value(footer,'Width'));
  assert.ok(Math.abs(value(summary,'Left')+value(summary,'Width')-value(footer,'Width'))<0.01);
  assert.equal(value(footer,'Left'),0);
  assert.ok(footer.includes('ShiftMode="Always"'));
 }
});
test('every category can generate all required paper sizes with printable receipt width',()=>{
 for(const type of types)for(const size of Object.keys(sizes)){
  const xml=build(type,size);
  assert.equal(paper(xml),size,`${type.key} ${size}`);
  const parameters=Object.fromEntries([...xml.matchAll(/<Parameter Name="([^"]+)"/g)].map(m=>[m[1],'']));
  const row=Object.fromEntries([...xml.matchAll(/<Column Name="([^"]+)"/g)].map(m=>[m[1],'']));
  assert.doesNotThrow(()=>validateBindings(xml,{parameters,tables:{Table0:[row]}}));
  if(size==='80mm'){
   assert.ok(xml.includes('RightMargin="8"'));
   for(const tag of xml.matchAll(/<(?:TextObject|BarcodeObject)\b[^>]*>/g)){
    const width=Number(tag[0].match(/\bWidth="([^"]+)"/)?.[1]||0),left=Number(tag[0].match(/\bLeft="([^"]+)"/)?.[1]||0);
    assert.ok(left+width<=272.17,`${type.key}: object outside printable width`);
   }
  }
 }
});
