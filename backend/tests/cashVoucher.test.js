const test=require('node:test'),assert=require('node:assert/strict');
const db=require('../src/db'),voucher=require('../src/services/cashVoucher'),debts=require('../src/services/debts'),banks=require('../src/services/bankBalances');
test('voucher validates before creating a transaction',async()=>{
  const base={type:0,amount:100,date:'2026-10-05',reason:'Thu',partnerName:'Test',address:'',originalDocument:'',note:'',categoryId:'c',storeId:'s',partnerType:'other'};
  for(const bad of [{amount:0},{amount:-1},{date:'2026-02-30'},{reason:''},{transfer:true},{partnerType:'bad'}])await assert.rejects(voucher.create({...base,...bad},'TEST',()=>{throw new Error('Unexpected transaction');}),e=>e.statusCode===400);
});
test('Firebird vouchers update cashbook and selected bank, respect no-debt checkbox; rows roll back',{skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const opts=await voucher.options();
  assert.ok(opts.customers.length&&opts.stores.length&&opts.accounts.length);
  const customer=opts.customers[0],store=opts.stores[0],bank=opts.accounts[0];
  const stop=new Error('ROLLBACK_VOUCHER_TEST');let id;
  await assert.rejects(db.transaction(async(query,execute,uuid)=>{
    const before=await debts.ledger(query),balance=before.receivable.find(r=>r.id===customer.ID).amount;
    const beforeBank=(await banks.load(query)).find(r=>r.ID===bank.ID).BALANCE;
    const base={type:0,amount:100,date:'2026-10-05',reason:'Test thu',partnerName:customer.NAME,address:'Test address',originalDocument:'TEST-ORIGINAL',note:'Test note',categoryId:opts.categories.find(r=>Number(r.LOAI)===0).ID,storeId:store.ID,partnerType:'customer',partnerId:customer.ID,noDebtChange:true};
    const tx=callback=>callback(query,execute,uuid);
    const unchanged=await voucher.create(base,'TEST',tx);id=unchanged.id;
    assert.equal((await debts.ledger(query)).receivable.find(r=>r.id===customer.ID).amount,balance);
    await voucher.create({...base,noDebtChange:false,amount:200},'TEST',tx);
    assert.equal((await debts.ledger(query)).receivable.find(r=>r.id===customer.ID).amount,balance-200);
    const expense=await voucher.create({...base,type:1,partnerType:'other',partnerId:'',amount:50,transfer:true,accountId:bank.ID,categoryId:opts.categories.find(r=>Number(r.LOAI)===1).ID},'TEST',tx);
    const [row]=await query('SELECT * FROM TTHUCHI WHERE ID=?',[expense.id]);
    assert.equal(row.DTAIKHOANNGANHANGID,bank.ID);assert.equal(row.DCUAHANGID,store.ID);assert.equal(row.CHUNGTUGOC,'TEST-ORIGINAL');assert.equal(row.GHICHU,'Test note');
    const afterBank=(await banks.load(query)).find(r=>r.ID===bank.ID).BALANCE;
    assert.equal(Number(afterBank),Number(beforeBank)-50);
    const cash=await require('../src/services/cashbook').load(query);
    const entry=cash.find(r=>r.id===`cash-${expense.id}-transfer`);assert.equal(entry.expense,50);assert.equal(entry.partner,customer.NAME);
    const originalQuery=db.query;
    db.query=query;
    try{
      const printing=require('../src/services/documentPrint');
      for(const [kind,record] of [['MauPhieuThu',unchanged],['MauPhieuChi',expense]]){
        const payload=await printing.payload(printing.typeByKey(kind),record.id,{},'TEST');
        assert.equal(payload.parameters.CustomerName,customer.NAME);
        assert.match(payload.parameters.Extra,/TEST-ORIGINAL/);
        const template=await printing.resolve(printing.typeByKey(kind));
        printing.validateBindings(template.content.toString('utf8'),payload);
      }
    }finally{db.query=originalQuery;}
    throw stop;
  }),e=>e===stop);
  assert.equal((await db.query('SELECT ID FROM TTHUCHI WHERE ID=?',[id])).length,0);
});
