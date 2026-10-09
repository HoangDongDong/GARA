const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../src/services/pricingPolicy');
const { applyTaxBreakdown } = require('../src/services/chargePrint');

test('frontend and backend apply line discounts before the additional bill discount', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/utils/pricingPolicy.js'), 'utf8');
  const frontend = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const lines = [
    { amount: 120000, taxRate: 10, discountRate: 10 },
    { amount: 100000, taxRate: 8, discountRate: 0 },
    { amount: 50000, taxRate: 10, discountRate: null },
    { amount: 20000, taxRate: 10, discountRate: 100 },
  ];
  const rates = { taxRate: 10, serviceRate: 0 };
  const actual = policy.calculate(lines, rates, 5);
  assert.deepEqual(frontend.calculate(lines, rates, 5), actual);
  assert.equal(actual.lineDiscount, 32000);
  assert.equal(actual.billDiscount, 12900);
  assert.equal(actual.discount, 44900);
  assert.deepEqual(actual.details.map(line => line.net), [102600, 95000, 47500, 0]);
  for (const calculate of [policy.calculate, frontend.calculate]) {
    const example = calculate([{ amount: 100000, discountRate: 90, taxRate: 0 }], { taxRate: 0, serviceRate: 0 }, 10);
    assert.equal(example.details[0].lineNet, 10000);
    assert.equal(example.billDiscount, 1000);
    assert.equal(example.total, 9000);
  }
});

test('item overrides group; explicit zero differs from inherited null; POS toggle prevails', () => {
  const defaults = { taxRate: 20 };
  assert.equal(policy.taxPolicy({THUESUATRIENG:null,THUENHOM:10},defaults).taxRate,10);
  assert.equal(policy.taxPolicy({THUESUATRIENG:8,THUENHOM:10},defaults).taxRate,8);
  assert.equal(policy.taxPolicy({THUESUATRIENG:0,THUENHOM:10},defaults).taxRate,0);
  assert.equal(policy.taxPolicy({},defaults).taxRate,20);
  assert.equal(policy.taxPolicy({THUESUATRIENG:8},defaults,0).taxRate,0);
  assert.equal(policy.taxPolicy({THUESUATRIENG:8},{...defaults,taxEnabled:false},10).taxRate,0);
});
test('customer override replaces group discount, including zero and document overrides', () => {
  assert.equal(policy.discountPolicy({GIAMGIARIENG:null,GIAMGIANHOM:5}).discountRate,5);
  assert.equal(policy.discountPolicy({GIAMGIARIENG:7,GIAMGIANHOM:5}).discountRate,7);
  assert.equal(policy.discountPolicy({GIAMGIARIENG:0,GIAMGIANHOM:5}).discountRate,0);
  assert.equal(policy.discountPolicy({GIAMGIARIENG:7},0).discountRate,0);
  assert.equal(policy.discountPolicy(null).discountRate,0);
  for (const invalid of [-1,101,'bad',Infinity,true,{},1.001,' ']) assert.throws(()=>policy.rate(invalid));
});
test('disabled repair VAT overrides item, group and manual rates in frontend and backend', async () => {
  const front = await import('../../frontend/src/utils/pricingPolicy.js');
  const defaults = {taxRate:0,serviceRate:0,taxEnabled:false,serviceEnabled:false};
  for (const implementation of [front,policy]) {
    const lines = [600000,500000].map(amount => ({amount,...implementation.taxPolicy({THUESUATRIENG:20,THUENHOM:10},defaults,15)}));
    const totals = implementation.calculate(lines,defaults);
    assert.equal(totals.tax,0);
    assert.equal(totals.serviceFee,0);
    assert.equal(totals.total,1100000);
  }
});

test('mixed VAT after discount and separately taxed service fee agree across frontend and backend', async () => {
  const front = await import('../../frontend/src/utils/pricingPolicy.js');
  const lines = [{amount:1000000,taxRate:8},{amount:1000000,taxRate:10}];
  const totals = policy.calculate(lines,{taxRate:20,serviceRate:10},5);
  assert.equal(totals.discount,100000);
  assert.equal(totals.serviceFee,190000);
  assert.equal(totals.tax,209000);
  assert.equal(totals.total,2299000);
  assert.deepEqual(totals.taxGroups,[{rate:8,base:950000,amount:76000},{rate:10,base:950000,amount:95000},{rate:20,base:190000,amount:38000}]);
  assert.deepEqual(front.calculate(lines,{taxRate:20,serviceRate:10},5),totals);
});
test('fixed discounts allocate exactly, including fractional prices, zero lines and full discounts', () => {
  const lines=[{amount:10.01,taxRate:8},{amount:0,taxRate:0},{amount:12.03,taxRate:10}];
  for(const discount of [0,0.01,3.57,22.04]) {
    const result=policy.calculate(lines,{taxRate:20,serviceRate:0},0,discount);
    assert.equal(policy.round(result.details.reduce((sum,line)=>sum+line.discount,0)),discount);
    assert.ok(result.details.every(line=>line.net>=0));
  }
  assert.throws(()=>policy.calculate(lines,{taxRate:0,serviceRate:0},0,23));
});
test('VAT receipt expands each nonzero group without changing grand total or saved template', () => {
  const xml='<TableRow Name="VAT" VisibleExpression="[PrintShow_tax]"><TableCell Name="Label" Text="VAT ([TILETHUE]%):"/><TableCell Name="Amount" Text="[TIENTHUE]"/></TableRow><TextObject Name="Total" Text="[TONGCONG]"/>';
  const parameters={TAXSUMMARY:JSON.stringify([{rate:8,amount:76000},{rate:10,amount:95000},{rate:0,amount:0}])};
  const changed=applyTaxBreakdown(xml,parameters);
  assert.match(changed,/TaxGroupRate0/);assert.match(changed,/TaxGroupRate1/);
  assert.equal((changed.match(/<TableRow/g)||[]).length,2);
  assert.match(changed,/Text="\[TONGCONG\]"/);
  assert.equal(parameters.TaxGroupAmount1,95000);
  assert.equal(applyTaxBreakdown(xml,{...parameters,PrintShow_tax:false}),xml);
});
test('VAT visibility retains numeric amounts while display cells use formatted text', () => {
  const xml='<TableRow Name="Row26" VisibleExpression="[TIENTHUE] != 0"><TableCell Name="VAT" Text="[TIENTHUE]" VisibleExpression="[TIENTHUE] != 0" Format="Number" Format.DecimalDigits="0"/></TableRow>';
  const parameters={TAXSUMMARY:JSON.stringify([{rate:8,amount:80000},{rate:10,amount:110000}])};
  const changed=applyTaxBreakdown(xml,parameters);
  for (const index of [0,1]) {
    assert.equal((changed.match(new RegExp(`VisibleExpression="\\[TaxGroupAmount${index}\\] != 0"`,'g'))||[]).length,2);
    assert.ok(changed.includes(`Text="[TaxGroupAmountText${index}]"`));
    assert.equal(typeof parameters[`TaxGroupAmount${index}`],'number');
  }
  assert.ok(!changed.includes('Format='));
  assert.equal(parameters.TaxGroupAmountText1,'110,000');
});

test('document overrides require the dedicated pricing permission', () => {
  const req={body:{items:[{TILETHUE:0}]},accessUser:{ISADMIN:0,permissions:{SALES:3}}};
  assert.throws(()=>policy.assertOverride(req,'SALES'),error=>error.status===403);
  req.accessUser.permissions.PRICING=4;policy.assertOverride(req,'SALES');
  req.accessUser.permissions.PRICING=0;req.body={items:[{TILETHUE:null}],TILEGIAMGIA:null};policy.assertOverride(req,'SALES');
});
