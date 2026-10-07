const test = require('node:test');
const assert = require('node:assert/strict');
const debts = require('../src/services/debts');
const db = require('../src/db');

test('ledger keeps zero balances, negative advances and chronological running totals for each partner', () => {
  const result = debts.buildLedger([{ID:'supplier',NAME:'Supplier',CODE:'NCC01',GROUP_ID:'g',GROUP_NAME:'Group'}, {ID:'empty',NAME:'Empty'}], [
    {ID:'receipt',PARTNER_ID:'supplier',NAME:'PN01',NGAY:'2026-09-01',TOTAL:320000,REMAINING:320000,DESCRIPTION:'Nhập mua hàng'},
  ], [
    {ID:'payment2',PARTNER_ID:'supplier',NAME:'PC02',NGAY:'2026-09-03',SOTIEN:32,LOAI:1},
    {ID:'payment1',PARTNER_ID:'supplier',NAME:'PC01',NGAY:'2026-09-02',SOTIEN:320000,LOAI:1},
  ],'payable');
  const supplier=result.find(row=>row.id==='supplier');
  assert.deepEqual(supplier.history.map(row=>row.balance),[320000,0,-32]);
  assert.equal(supplier.amount,-32);
  assert.equal(supplier.groupName,'Group');
  assert.equal(result.find(row=>row.id==='empty').amount,0);
});

test('groups balances by identity, combines sources, excludes zero/credit balances and does not invent due dates', () => {
  const result = debts.group([
    {PARTNER_ID:'a',PARTNER_NAME:'Same name',AMOUNT:100},
    {PARTNER_ID:'a',PARTNER_NAME:'Same name',AMOUNT:50},
    {PARTNER_ID:'b',PARTNER_NAME:'Same name',AMOUNT:200},
    {PARTNER_ID:'c',AMOUNT:0}, {PARTNER_ID:'d',AMOUNT:-30},
  ], 'Unknown');
  assert.equal(result.length,2);
  assert.equal(result.find(row=>row.id==='a').amount,150);
  assert.equal(result.find(row=>row.id==='a').documents,2);
  assert.ok(result.every(row=>row.dueDate===null));
});

test('Firebird debt balances combine sales and repairs, exclude paid/cancelled records, and reflect supplier settlement', {skip:process.env.TEST_FIREBIRD!=='1'}, async () => {
  const rollback = new Error('DEBT_TEST_ROLLBACK');
  await assert.rejects(db.transaction(async (query,execute,uuid) => {
    const customer=uuid(),supplier=uuid();
    await execute("INSERT INTO DKHACHHANG (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'DEBT TEST',1,'TEST')",[customer]);
    await execute("INSERT INTO DNHACUNGCAP (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'DEBT TEST',1,'TEST')",[supplier]);
    for (const [status,paid,remaining] of [[1,0,700],[1,1,900],[0,0,800]]) {
      await execute("INSERT INTO TDONHANG (ID,DKHACHHANGID,STATUS,DATHANHTOAN,CONLAI,TONGCONG,USERCREATEDID,NAME) VALUES (?,?,?,?,?,1000,'TEST','DEBT TEST')",[uuid(),customer,status,paid,remaining]);
    }
    await execute("INSERT INTO THOADONSUACHUA (ID,DKHACHHANGID,STATUS,DATHANHTOAN,CONLAI,TONGCONG,USERCREATEDID,NAME) VALUES (?,?,1,0,300,500,'TEST','DEBT TEST')",[uuid(),customer]);
    const receipt=uuid();
    await execute("INSERT INTO TNHAPKHO (ID,DNHACUNGCAPID,STATUS,DATHANHTOAN,CONGNO,TONGCONG,USERCREATEDID,NAME) VALUES (?,?,1,0,600,1000,'TEST','DEBT TEST')",[receipt,supplier]);
    await execute("INSERT INTO TNHAPKHO (ID,DNHACUNGCAPID,STATUS,DATHANHTOAN,CONGNO,TONGCONG,USERCREATEDID,NAME) VALUES (?,?,0,0,900,900,'TEST','DEBT TEST')",[uuid(),supplier]);
    let result=await debts.load(query);
    assert.equal(result.receivable.find(row=>row.id===customer).amount,1000);
    assert.equal(result.payable.find(row=>row.id===supplier).amount,600);
    await execute('UPDATE TNHAPKHO SET DATHANHTOAN=1,CONGNO=0 WHERE ID=?',[receipt]);
    result=await debts.load(query);
    assert.ok(!result.payable.some(row=>row.id===supplier));
    assert.equal(result.receivableTotal,result.receivable.reduce((sum,row)=>sum+row.amount,0));
    const detailed=await debts.ledger(query);
    const ledgerCustomer=detailed.receivable.find(row=>row.id===customer);
    assert.equal(ledgerCustomer.amount,1000);
    assert.equal(ledgerCustomer.history.length,3);
    assert.equal(ledgerCustomer.history.at(-1).balance,1000);
    assert.equal(detailed.payable.find(row=>row.id===supplier).amount,0);
    throw rollback;
  }), error=>error===rollback);
});
