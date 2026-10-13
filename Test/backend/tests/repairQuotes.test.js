const test=require('node:test');
const assert=require('node:assert/strict');
const quotes=require('../../../backend/src/services/repairQuotes.js');
const order={ID:'repair',TRANGTHAI:0,TBAOGIAID:'quote',TILETHUE:10,TILEPHIDICHVU:10,TILEGIAMGIA:10};
const rows=[{ID:'service1',LOAI:1,THANHTIEN:100000,TILETHUE:10},{ID:'service2',LOAI:1,THANHTIEN:200000,TILETHUE:10},{ID:'part',LOAI:0,THANHTIEN:300000,TILETHUE:10}];
test('customer acceptance rejects empty, duplicate and foreign lines',()=>{
  for(const ids of [[],['service1','service1'],['other'],null])assert.throws(()=>quotes.calculateAccepted(order,rows,ids),/Chọn ít nhất/);
});
test('accepted services and parts determine discounts, fees and VAT',()=>{
  const data=quotes.calculateAccepted(order,rows,['service1','part']);
  assert.equal(data.totals.subtotal,400000);
  assert.equal(data.totals.discount,40000);
  assert.equal(data.totals.serviceFee,36000);
  assert.equal(data.totals.tax,39600);
  assert.equal(data.totals.total,435600);
});
test('a fixed discount exceeding the accepted amount cannot silently increase the price',()=>{
  assert.throws(()=>quotes.calculateAccepted({...order,TIENGIAMGIAPHIEU:150000},rows,['service1']),/Tiền giảm/);
});
test('confirmation retains quote amounts and deactivates only declined repair lines',async()=>{
  const writes=[];
  const query=async sql=>sql.includes('TLENHSUACHUACHITIET')?rows:[order];
  const result=await quotes.confirm(query,async(sql,params)=>writes.push({sql,params}),()=>assert.fail('existing quote must be reused'),'repair',['service1','part'],'actor');
  assert.equal(result.quoteId,'quote');
  assert.deepEqual(writes.filter(w=>w.sql.includes('SET STATUS=-1')).map(w=>w.params[1]),['service2']);
  assert.deepEqual(writes.filter(w=>w.sql.includes('KHACHDUYET')).map(w=>[w.params[2],w.params[0]]),[['service1',1],['service2',0],['part',1]]);
  assert.ok(writes.every(w=>!w.sql.includes('UPDATE TBAOGIA SET')));
  const header=writes.find(w=>w.sql.includes('SET TONGTIENCONG'));
  assert.deepEqual(header.params.slice(0,3),[100000,300000,435600]);
});
test('confirmed repairs reject attempts to change their accepted items',async()=>{
  await assert.rejects(quotes.confirm(async()=>[{...order,TRANGTHAI:1}],()=>assert.fail('no mutations'),()=>{},'repair',['service1'],'actor'),/Chỉ xác nhận/);
});
