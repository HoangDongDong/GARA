const test=require('node:test'),assert=require('node:assert/strict');
const db=require('../src/db');
const validation=require('../src/services/receiptValidation');
const stock=require('../src/services/stock');
test('receiving recomputes totals and rejects forged amounts, negative prices, invalid units and dates',async()=>{
  const body={TIENHANG:200000,TONGCONG:190000,TIENGIAMGIA:10000,items:[{DMATHANGID:'p',SOLUONG:2,DONGIA:100000,THANHTIEN:200000}]};
  assert.equal(validation.normalize(body).total,190000);
  for(const change of [{TONGCONG:1},{TIENHANG:1},{TIENGIAMGIA:200001},{NGAY:'2026-02-30'},{items:[{DMATHANGID:'p',SOLUONG:2,DONGIA:100000,THANHTIEN:7}]},{items:[{DMATHANGID:'p',SOLUONG:1,DONGIA:-100}]},{items:[{DMATHANGID:'p',SOLUONG:'bad',DONGIA:100}]}])assert.throws(()=>validation.normalize({...body,...change}));
  await assert.rejects(validation.references(async()=>[],{},{items:[]}),/không còn hoạt động/);
  await assert.rejects(validation.references(async(sql)=>sql.includes('DMATHANG')?[{ID:'p',DDONVITINHID:'base'}]:[{ID:'ok'}],{},[{DMATHANGID:'p',DDONVITINHID:'other'}]),/đơn vị cơ sở/);
});
test('stock locks sorted unique parts, groups duplicate lines and rejects insufficient stock per warehouse',async()=>{
  const writes=[];await stock.lock(async(sql,params)=>writes.push(params[0]),['b','a','b']);assert.deepEqual(writes,['a','b']);
  const rows=[{DMATHANGID:'p',DKHOHANGID:'w',SOLUONG:1},{DMATHANGID:'p',DKHOHANGID:'w',SOLUONG:1}];
  await assert.rejects(stock.requireAvailable(async()=>[{NAME:'Part',TON_KHO:1}],rows),/không đủ tồn/);
  let params;await stock.requireAvailable(async(sql,args)=>{params=args;return [{TON_KHO:2}];},rows);assert.deepEqual(params,['w','p']);
  assert.match(stock.movements,/N.STATUS=1/);assert.match(stock.movements,/H.STATUS=1/);assert.match(stock.movements,/SLHOAN/);assert.match(stock.movements,/SLNHAP/);
});
test('POS rejects duplicate part quantities before inserting a sale',async()=>{
  const route=require('../src/routes/sales').stack.find(l=>l.route?.path==='/'&&l.route.methods.post).route.stack[0].handle;
  const original=db.transaction;let inserted=0,status=200;
  db.transaction=async fn=>fn(async sql=>sql.includes('SCONFIG')?[]:[{ID:'p',NAME:'Part',GIABAN:100,TON_KHO:1}],async sql=>{if(sql.includes('INSERT INTO'))inserted++;},()=> 'test');
  try{await route({accessUser:{ISADMIN:1},body:{items:[{DMATHANGID:'p',SOLUONG:1},{DMATHANGID:'p',SOLUONG:1}]},get:()=> 'test'},{status(n){status=n;return this;},json(){}});assert.equal(status,400);assert.equal(inserted,0);}finally{db.transaction=original;}
});
test('purchase prices are hidden by context and purchase PDFs require COST',()=>{
  const {authorize}=require('../src/accessControl'),printing=require('../src/services/documentPrint');
  let result;const user={permissions:{INVENTORY:17}};
  const res={status(){return this;},json(value){result=value;}};
  authorize({accessUser:user,method:'GET',originalUrl:'/api/inventory-receipts/id'},res,()=>{});
  res.json({data:{items:[{SOLUONG:2,DONGIA:100,THANHTIEN:200}],receipt:{TONGCONG:200}}});
  assert.deepEqual(result.data.items,[{SOLUONG:2}]);assert.deepEqual(result.data.receipt,{});
  assert.equal(printing.permitted(user,printing.typeByKey('MauPhieuNhapKho')),false);
  assert.equal(printing.permitted({permissions:{INVENTORY:17,COST:1}},printing.typeByKey('MauPhieuNhapKho')),true);
});
test('PDF payloads remove prefixed confidential variables, preserving ordinary sale prices',()=>{
  const data={parameters:{DMATHANG_GIANHAP:100,DNHANVIEN_LUONGTHANG:200,GIAVON:100},tables:{Table0:[{DONGIA:300,GIAVON:100}]}};
  const safe=require('../src/services/printPrivacy').protect({permissions:{SALES:17}},data);
  assert.deepEqual(safe.parameters,{});assert.deepEqual(safe.tables.Table0,[{DONGIA:300}]);assert.equal(data.parameters.GIAVON,100);
});
test('document lookup uses bound search and valid pagination rather than truncating old records',()=>{
  const service=require('../src/services/documentList');const filter=service.filters({q:"' OR 1=1",offset:100,limit:50,from:'2026-10-01'},'DH');
  assert.equal(filter.select,'FIRST 51 SKIP 100');assert.ok(!filter.where.includes('OR 1=1'));assert.deepEqual(filter.params,["' OR 1=1",'2026-10-01']);
  assert.equal(service.response(Array.from({length:51},(_,ID)=>({ID})),filter).pagination.hasMore,true);
  for(const input of [{offset:-1},{limit:1000},{from:'2026-02-30'},{from:'2026-10-10',to:'2026-10-01'}])assert.throws(()=>service.filters(input,'DH'));
});
test('debt print includes opening balance and separate payments with date boundaries',()=>{
  const result=require('../src/services/debtPrint').summarize([{code:'old',date:'2026-09-01',total:100,payment:0},{code:'pay',date:'2026-10-01',total:0,payment:40},{code:'future',date:'2026-11-01',total:50,payment:0}],'2026-10-01','2026-10-31');
  assert.equal(result.total,60);assert.equal(result.rows[0].Amount,100);assert.equal(result.rows[1].Amount,-40);assert.equal(result.rows.length,2);
});
test('transactional retry returns original result and rejects changed payload',async()=>{
  const original=db.transaction,store=new Map();let writes=0;
  db.transaction=async fn=>fn(async(sql,params)=>store.has(params[0])?[store.get(params[0])]:[],async(sql,params)=>{if(sql.startsWith('INSERT INTO APP_REQUESTS'))store.set(params[0],{PAYLOADHASH:params[1],RESULTDATA:params[2]});},()=> 'id');
  const req={headers:{'idempotency-key':'test_request_123456789'},originalUrl:'/api/sales',accessUser:{ID:'test-user'},body:{items:['part'],amount:10}};
  try{const task=async()=>{writes++;return {id:'saved'};};const service=require('../src/services/idempotency');assert.deepEqual(await service.run(req,task),{id:'saved'});assert.deepEqual(await service.run(req,task),{id:'saved'});assert.equal(writes,1);await assert.rejects(service.run({...req,body:{amount:20}},task),/nội dung khác/);}finally{db.transaction=original;}
});
test('warranty requires real ordered dates and non-negative costs',()=>{
  const {validate}=require('../src/services/warranty');const body={NGAYBATDAU:'2026-10-01',NGAYKETTHUC:'2027-10-01'};assert.doesNotThrow(()=>validate(body));
  for(const override of [{NGAYKETTHUC:'2026-09-01'},{NGAYKETTHUC:'2026-02-30'},{CHIPHI:-1},{TRANGTHAI:99}])assert.throws(()=>validate({...body,...override}));
});
test('handover checks warehouse stock, binds SQL correctly and records authenticated actor',async()=>{
  const original=db.transaction,route=require('../src/routes/workflow').stack.find(layer=>layer.route?.path==='/transition').route.stack[0].handle;
  let status=200,error,stockChecked=false,actorWritten=false;
  const check=(sql,args)=>assert.equal((sql.match(/\?/g)||[]).length,args.length,sql);
  db.transaction=async fn=>fn(async(sql,args=[])=>{
    check(sql,args);
    if(sql.includes('SELECT FIRST 1 ID, TRANGTHAI'))return [{ID:'flow',TRANGTHAI:2,TLENHSUACHUAID:'repair'}];
    if(sql.startsWith('SELECT TRANGTHAI'))return [{TRANGTHAI:2}];
    if(sql.includes('GROUP BY CT.DMATHANGID'))return [{DMATHANGID:'p',DKHOHANGID:'w',SOLUONG:1}];
    if(sql.includes('AS TON_KHO')){stockChecked=true;return [{TON_KHO:2}];}
    return [];
  },async(sql,args=[])=>{check(sql,args);if(sql.includes('USERMODIFIEDID=?')){assert.equal(args[0],'actor');actorWritten=true;}},()=> 'test');
  try{await route({body:{DXEID:'vehicle',TRANGTHAI:3,DNHANVIENID:'spoofed'},accessUser:{ID:'actor',DNHANVIENID:'staff',ISADMIN:1}},{status(n){status=n;return this;},json(value){error=value.error;}});assert.equal(status,200,error);assert.equal(stockChecked,true);assert.equal(actorWritten,true);}finally{db.transaction=original;}
});
