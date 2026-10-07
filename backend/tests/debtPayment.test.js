const test = require('node:test');
const assert = require('node:assert/strict');
const payments = require('../src/services/debtPayment');
const debts = require('../src/services/debts');

test('rejects invalid amount, precision, kind and dates before opening a transaction', async () => {
  const valid={kind:'payable',partnerId:'supplier',amount:10,date:'2026-10-05'};
  for (const override of [{amount:0},{amount:-1},{amount:'bad'},{amount:1.001},{kind:'other'},{date:'2026-02-30'},{note:'x'.repeat(256)}]) {
    await assert.rejects(payments.create({...valid,...override},'actor',()=>assert.fail('Unexpected transaction')),error=>error.statusCode===400);
  }
});

test('creates the correct cash direction and partner link, reducing ledger debt exactly once', async () => {
  for (const kind of ['receivable','payable']) {
    let inserted;
    const query=async sql=>{
      if (sql.startsWith('SELECT ID FROM')) return [{ID:'partner'}];
      if (sql.includes('FROM SCONFIG')) return [];
      if (sql.includes('FROM SNUMBERCOUNTER')) return [{PERIODKEY:'2026',SEQ:0}];
      if (sql.includes('SELECT FIRST 1')) return [];
      if (sql.includes(kind==='payable'?'FROM DNHACUNGCAP NCC':'FROM DKHACHHANG KH')) return [{ID:'partner',NAME:'Partner'}];
      if (sql.includes(kind==='payable'?'FROM TNHAPKHO':'FROM TDONHANG')) return [{ID:'document',PARTNER_ID:'partner',TOTAL:100,REMAINING:100}];
      return [];
    };
    const result=await payments.create({kind,partnerId:'partner',amount:40,date:'2026-10-05'},'actor',async fn=>fn(query,async (sql,args)=>{if(sql.includes('INSERT INTO TTHUCHI')) inserted=args;},()=> 'payment'));
    assert.equal(result.amount,40);
    assert.equal(inserted[3],'actor');
    assert.equal(inserted[5],kind==='receivable'?'partner':null);
    assert.equal(inserted[6],kind==='payable'?'partner':null);
    assert.equal(inserted[8],kind==='payable'?1:0);
    const [row]=debts.buildLedger([{ID:'partner'}],[{ID:'document',PARTNER_ID:'partner',TOTAL:100,REMAINING:100}],
      [{ID:'payment',PARTNER_ID:'partner',SOTIEN:inserted[7],LOAI:inserted[8]}],kind);
    assert.equal(row.amount,60);
  }
});

test('rejects payments exceeding current debt without inserting a cash entry', async () => {
  await assert.rejects(payments.create({kind:'payable',partnerId:'partner',amount:40,date:'2026-10-05'},'actor',async fn=>fn(
    async sql=>sql.startsWith('SELECT ID FROM')?[{ID:'partner'}]:[],
    async sql=>assert.ok(!sql.includes('INSERT INTO')),()=> 'payment')),/vượt quá/);
});
