const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../src/accessControl');
const policy = require('../src/permissionPolicy');
function request(path, method, permissions = {}, body = {}, ISADMIN = 0) {
  let allowed = false, status = 200, output;
  const req = { originalUrl: path, method, body, accessUser: { ISADMIN, permissions } };
  const res = { status(code) { status = code; return this; }, json(value) { output = value; return this; } };
  authorize(req, res, () => { allowed = true; });
  return { allowed, status, output, res };
}
test('repair and sales rights can read lookups but cannot edit or delete master records', () => {
  for (const code of ['REPAIR', 'SALES']) {
    assert.equal(request('/api/customers','GET',{[code]:31}).allowed,true);
    assert.equal(request('/api/parts','GET',{[code]:31}).allowed,true);
    for (const method of ['PUT','DELETE']) {
      assert.equal(request('/api/customers/id',method,{[code]:31}).status,403);
      assert.equal(request('/api/parts/id',method,{[code]:31}).status,403);
    }
  }
  assert.equal(request('/api/parts/id','DELETE',{CATALOG:9}).allowed,true);
  assert.equal(request('/api/customers/id','DELETE',{CUSTOMERS:9}).allowed,true);
  assert.equal(request('/api/customers/id','PUT',{CATALOG:5}).allowed,true);
  assert.equal(request('/api/suppliers','GET',{INVENTORY:1}).allowed,true);
  assert.equal(request('/api/vehicles/id','DELETE',{WARRANTY:31}).status,403);
});
test('editing part metadata without cost access preserves the hidden purchase price', async () => {
  const db=require('../src/db'),original=db.execute;
  const router=require('../src/routes/parts');
  const update=router.stack.find(layer=>layer.route?.path==='/:id'&&layer.route.methods.put).route.stack[0].handle;
  let write,status=200;
  db.execute=async(sql,params)=>{write={sql,params};};
  try {
    await update({params:{id:'part'},body:{NAME:'Part',CODE:'P',GIABAN:100},accessUser:{permissions:{CATALOG:4}}}, {status(code){status=code;return this;},json(){}});
    assert.equal(status,200);
    assert.match(write.sql,/GIANHAP=COALESCE\(\?,GIANHAP\)/);
    assert.equal(write.params[4],null);
  } finally {db.execute=original;}
});
test('master-data read has resource-specific rights; quick creation limits payload and methods', () => {
  assert.equal(request('/api/master-data/suppliers','GET').status,403);
  assert.equal(request('/api/master-data/services','GET',{REPAIR:1}).allowed,true);
  assert.equal(request('/api/master-data/bank_accounts','GET',{REPAIR:31}).status,403);
  assert.equal(request('/api/master-data/bank_accounts','GET',{PAYMENTS:1}).allowed,true);
  assert.equal(request('/api/master-data/customer_groups','POST',{SALES:3},{NAME:'VIP'}).allowed,true);
  assert.equal(request('/api/master-data/customer_groups','POST',{SALES:3},{NAME:'VIP',GIAMGIARIENG:100}).status,403);
  assert.equal(request('/api/master-data/customer_groups/id','PUT',{SALES:31},{NAME:'VIP'}).status,403);
  assert.equal(request('/api/master-data/bank_accounts','POST',{CATALOG:31},{NAME:'Bank'}).status,403);
});
test('employee lookup does not require personnel access and response redacts sensitive data', () => {
  assert.equal(request('/api/employees/lookup','GET',{REPAIR:1}).allowed,true);
  assert.equal(request('/api/employees','GET',{REPAIR:31}).status,403);
  const value = { data: [{ ID: 'e', NAME: 'Employee', LUONGTHANG:100, GIANHAP:20, HOAHONG:10, NGAY:new Date('2026-10-09') }] };
  const redacted = policy.redact({ permissions: { EMPLOYEES:1 } }, value);
  assert.equal(redacted.data[0].NAME,'Employee');
  for(const key of ['LUONGTHANG','GIANHAP','HOAHONG']) assert.equal(key in redacted.data[0],false);
  assert.ok(redacted.data[0].NGAY instanceof Date);
  assert.equal(value.data[0].LUONGTHANG,100);
  assert.equal(policy.redact({ISADMIN:1},value).data[0].LUONGTHANG,100);
});
test('each workflow stage requires its own permission in addition to edit repair', () => {
  for (const [state, code] of [[1,'APPROVE_QUOTE'],[2,'ASSIGN_REPAIR'],[3,'HANDOVER'],[4,'HANDOVER']]) {
    assert.equal(request('/api/workflow/transition','POST',{REPAIR:31},{TRANGTHAI:state}).status,403);
    assert.equal(request('/api/workflow/transition','POST',{REPAIR:5,[code]:4},{TRANGTHAI:state}).allowed,true);
    assert.equal(request('/api/workflow/transition','POST',{[code]:4},{TRANGTHAI:state}).status,403);
  }
  assert.equal(request('/api/repair-orders/id/status','PATCH',{REPAIR:31}).status,403);
  assert.equal(request('/api/repair-orders/id/supplements/s','PATCH',{REPAIR:31}).status,403);
  assert.equal(request('/api/repair-orders/id/supplements/s','PATCH',{REPAIR:5,APPROVE_SUPPLEMENT:4}).allowed,true);
});
test('repair invoice and financial payment require explicit payments privilege', () => {
  for(const code of ['REPAIR','SALES','FINANCE']) assert.equal(request('/api/invoices/id/pay','PATCH',{[code]:31}).status,403);
  assert.equal(request('/api/invoices/id/pay','PATCH',{PAYMENTS:5}).status,403);
  assert.equal(request('/api/invoices/id/pay','PATCH',{PAYMENTS:5,REPAIR:1}).allowed,true);
  assert.equal(request('/api/invoices','POST',{PAYMENTS:5,REPAIR:1}).allowed,true);
  assert.equal(request('/api/invoices','GET',{REPAIR:1}).allowed,true);
  assert.equal(request('/api/inventory-receipts/id/pay','PATCH',{INVENTORY:31}).status,403);
  assert.equal(request('/api/finance/debts/payments','POST',{FINANCE:31}).status,403);
  assert.equal(request('/api/finance/vouchers','POST',{FINANCE:3,PAYMENTS:4}).allowed,true);
  assert.equal(request('/api/secondary-payment','PUT',{SALES:3}).allowed,true);
  assert.equal(request('/api/secondary-payment','PUT',{REPAIR:31}).status,403);
});
test('unknown routes and misleading prefixes fail closed; self-authorizing routers remain available', () => {
  assert.equal(request('/api/new-feature','GET').status,403);
  assert.equal(request('/api/parts-extra','GET',{REPAIR:31}).status,403);
  assert.equal(request('/api/REPAIR-ORDERS/id/supplements/s/','PATCH',{REPAIR:31}).status,403);
  assert.equal(request('/api/repair-orders/id/supplements/%73','PATCH',{REPAIR:31}).status,403);
  for(const path of ['/api/printing/types','/api/print-control/jobs/id','/api/document-numbers/Thu/next']) assert.equal(request(path,'GET').allowed,true);
  for(const code of ['ADMIN','SETTINGS']) assert.equal(request(code==='ADMIN'?'/api/admin-access/overview':'/api/system-config','GET',{[code]:31}).status,403);
  assert.equal(request('/api/system-config','GET',{}, {},1).allowed,true);
});
test('price edit, payroll print, sensitive reports and Excel export have separate permissions', () => {
  const pricing = require('../src/services/pricingPolicy');
  const req={accessUser:{permissions:{SALES:31}},body:{TILEGIAMGIA:10}};
  assert.throws(()=>pricing.assertOverride(req,'SALES'),error=>error.status===403);
  req.accessUser.permissions.PRICING=4; assert.doesNotThrow(()=>pricing.assertOverride(req,'SALES'));
  const ratesReq={accessUser:{permissions:{SALES:31}},body:{TILETHUE:20,TILEPHIDICHVU:10}};
  assert.doesNotThrow(()=>pricing.assertRates(ratesReq,{taxRate:20,serviceRate:10}));
  ratesReq.body.TILETHUE=0;
  assert.throws(()=>pricing.assertRates(ratesReq,{taxRate:20,serviceRate:10}),error=>error.status===403);
  const printing=require('../src/services/documentPrint'), payroll=printing.typeByKey('MauBangLuong');
  assert.equal(printing.permitted({permissions:{EMPLOYEES:31}},payroll),false);
  assert.equal(printing.permitted({permissions:{EMPLOYEES:1,PAYROLL:17}},payroll),true);
  const reports=require('../src/services/reportCatalog'), r=reports.reports.find(row=>row.id==='payroll');
  assert.equal(reports.permitted({permissions:{REPORTS:31,EMPLOYEES:31}},r),false);
  assert.equal(reports.permitted({permissions:{REPORTS:17,EMPLOYEES:1,PAYROLL:1,COMMISSIONS:1}},r,true),true);
});
test('employee reports do not query payroll or commissions without the corresponding right', async () => {
  const service=require('../src/services/employeeCommissions');
  const queries=[];
  const query=async sql=>{queries.push(sql);return [];};
  await service.load(query,{month:'2026-10'},{commissions:true,payroll:false});
  assert.equal(queries.length,1); assert.match(queries[0],/TPHANCONGNHANVIEN/);
  queries.length=0;
  await service.load(query,{month:'2026-10'},{commissions:false,payroll:true});
  assert.equal(queries.length,1); assert.match(queries[0],/TBANGLUONGCHITIET/);
});
