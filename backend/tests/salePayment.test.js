const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate}=require('../src/services/salePayment');
test('cash change excludes the returned amount from recorded income',()=>{
  const payment=calculate(34000,{payments:{cashGiven:50000}});
  assert.equal(payment.change,16000);assert.equal(payment.cash,34000);assert.equal(payment.paid,34000);assert.equal(payment.debt,0);
});
test('mixed cash and transfer settle one invoice with the correct cash change',()=>{
  const payment=calculate(100000,{payments:{cashGiven:80000,transfer:50000},DTAIKHOANNGANHANGID:'bank'});
  assert.equal(payment.cash,50000);assert.equal(payment.transfer,50000);assert.equal(payment.change,30000);assert.equal(payment.method,4);
});
test('partial settlement requires consent and an identified customer',()=>{
  assert.throws(()=>calculate(100,{payments:{cashGiven:40}}),/chưa đủ/);
  assert.throws(()=>calculate(100,{payments:{cashGiven:40,allowDebt:true}}),/chọn khách hàng/);
  const payment=calculate(100,{payments:{cashGiven:40,allowDebt:true}},'customer');
  assert.equal(payment.debt,60);assert.equal(payment.paid,40);
});
test('rejects transfer without account, electronic overpayment and invalid amounts',()=>{
  assert.throws(()=>calculate(100,{payments:{transfer:100}}),/tài khoản/);
  assert.throws(()=>calculate(100,{payments:{transfer:110},DTAIKHOANNGANHANGID:'bank'}),/vượt/);
  for(const cashGiven of [-1,'bad',1.001])assert.throws(()=>calculate(100,{payments:{cashGiven}}),/không hợp lệ/);
});
