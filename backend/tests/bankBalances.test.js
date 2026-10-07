const test=require('node:test');
const assert=require('node:assert/strict');
const db=require('../src/db');
const banks=require('../src/services/bankBalances');
const payments=require('../src/services/debtPayment');
const debts=require('../src/services/debts');

test('account balances combine opening balance with signed transactions by account',async()=>{
  const rows=await banks.load(async sql=>sql.includes('SELECT ID,NAME')?
    [{ID:'a',OPENING:1000},{ID:'b',OPENING:2000}]:[{ACCOUNT_ID:'a',AMOUNT:-40}]);
  assert.equal(rows[0].BALANCE,960);
  assert.equal(rows[1].BALANCE,2000);
});

test('Firebird settlement stores category and reason, debits only selected bank, and cancellation restores balances', {skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const rollback=new Error('ROLLBACK_BANK_PAYMENT_TEST');
  await assert.rejects(db.transaction(async(query,execute,uuid)=>{
    const partner=uuid(),account=uuid(),other=uuid(),category=uuid();
    await execute("INSERT INTO DNHACUNGCAP (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'BANK TEST',1,'TEST')",[partner]);
    for(const id of [account,other]) await execute("INSERT INTO DTAIKHOANNGANHANG (ID,NAME,STATUS,USERCREATEDID,SODUDAU) VALUES (?,'BANK TEST',1,'TEST',1000)",[id]);
    await execute("INSERT INTO DLYDOTHUCHI (ID,NAME,STATUS,USERCREATEDID,LOAI) VALUES (?,'BANK TEST',1,'TEST',1)",[category]);
    await execute("INSERT INTO TNHAPKHO (ID,NAME,DNHACUNGCAPID,STATUS,USERCREATEDID,TONGCONG,CONGNO,DATHANHTOAN) VALUES (?,'BANK TEST',?,1,'TEST',100,100,0)",[uuid(),partner]);
    const input={kind:'payable',partnerId:partner,amount:40,date:'2026-10-05',note:'Lý do thử',categoryId:category,accountId:account};
    const transact=fn=>fn(query,execute,uuid);
    await assert.rejects(payments.create({...input,accountId:uuid()},'TEST',transact),/không còn hoạt động/);
    await assert.rejects(payments.create({...input,categoryId:uuid()},'TEST',transact),/không hợp lệ/);
    const saved=await payments.create(input,'TEST',transact);
    const [cash]=await query('SELECT NOTE,DLYDOTHUCHID,DTAIKHOANNGANHANGID FROM TTHUCHI WHERE ID=?',[saved.id]);
    assert.equal(cash.NOTE,input.note);assert.equal(cash.DLYDOTHUCHID,category);assert.equal(cash.DTAIKHOANNGANHANGID,account);
    let balances=await banks.load(query);
    assert.equal(balances.find(row=>row.ID===account).BALANCE,960);
    assert.equal(balances.find(row=>row.ID===other).BALANCE,1000);
    assert.equal((await debts.ledger(query)).payable.find(row=>row.id===partner).amount,60);
    await execute('UPDATE TTHUCHI SET STATUS=0 WHERE ID=?',[saved.id]);
    balances=await banks.load(query);
    assert.equal(balances.find(row=>row.ID===account).BALANCE,1000);
    assert.equal((await debts.ledger(query)).payable.find(row=>row.id===partner).amount,100);
    // Cash payments without an account must leave bank balances unchanged.
    await payments.create({...input,accountId:null},'TEST',transact);
    assert.equal((await banks.load(query)).find(row=>row.ID===account).BALANCE,1000);
    throw rollback;
  }),error=>error===rollback);
});
