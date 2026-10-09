const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const db=require('../src/db');
test('customer display shares pending sale across devices, ignores another session clear and uses saved payment state',async()=>{
  const originalQuery=db.query;
  db.query=async()=>[{ID:'saved',NAME:'TEST-SALE',TONGCONG:100000,CONLAI:25000,DATHANHTOAN:0}];
  const app=express();app.use(express.json());app.use((req,res,next)=>{req.accessUser={ID:'staff'};next();});app.use('/display',require('../src/routes/secondaryPayment'));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const url=`http://127.0.0.1:${server.address().port}/display`;
  const session='11111111-1111-4111-8111-111111111111';
  const write=body=>fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,...body})});
  const read=async()=>((await (await fetch(url)).json()).data);
  try{
    assert.equal((await write({state:'pending',order:{NAME:'TEST',TONGCONG:100000,details:[{TEN_PT:'Mặt hàng thử',SOLUONG:1,DONGIA:100000,THANHTIEN:100000}]}})).status,200);
    assert.equal((await read()).TONGCONG,100000);
    await write({state:'clear',session:'22222222-2222-4222-8222-222222222222'});
    assert.equal((await read()).NAME,'TEST');
    assert.equal((await write({state:'saved',saleId:'saved'})).status,200);
    assert.equal((await read()).invoice.CONLAI,25000);
    assert.equal((await read()).invoice.DATHANHTOAN,0);
    assert.equal((await write({state:'pending',order:{TONGCONG:-1,details:[{}]}})).status,400);
    await write({state:'clear'});assert.equal(await read(),null);
  }finally{db.query=originalQuery;await new Promise(resolve=>server.close(resolve));}
});
