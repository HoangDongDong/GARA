const test = require('node:test');
const assert = require('node:assert/strict');
const { dateRange } = require('../src/services/employeeCommissions');
test('salary months and report dates validate calendar boundaries', async () => {
  const { currentSalaryMonth, salaryMonthRange } = await import('../../frontend/src/utils/employeeCompensation.js');
  assert.equal(currentSalaryMonth(new Date('2026-09-30T18:00:00Z')), '2026-10');
  assert.deepEqual(salaryMonthRange('2024-02'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(salaryMonthRange('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  assert.equal(salaryMonthRange('2026-13'), null);
  for (const input of [{from:'2026-02-30'},{from:'bad'},{from:'2026-10-02',to:'2026-10-01'}]) assert.throws(() => dateRange(input));
});
test('allocated commissions, eligibility and saved payroll remain separate', async () => {
  const { employeeCompensation } = await import('../../frontend/src/utils/employeeCompensation.js');
  const employee = { ID: 'a', STATUS: 1, LUONGTHANG: 10000000 };
  const report = { data: [
    { DNHANVIENID:'a',TLENHSUACHUAID:'r1',TRANGTHAI:2,HOAHONG:300000,ELIGIBLE:false },
    { DNHANVIENID:'a',TLENHSUACHUAID:'r2',TRANGTHAI:4,HOAHONG:200000,ELIGIBLE:true },
    { DNHANVIENID:'b',TLENHSUACHUAID:'r1',TRANGTHAI:2,HOAHONG:100000,ELIGIBLE:false },
  ] };
  const estimated = employeeCompensation(employee, report);
  assert.equal(estimated.allocated,500000); assert.equal(estimated.eligible,200000); assert.equal(estimated.pending,300000);
  assert.equal(estimated.jobs,2); assert.equal(estimated.running,1); assert.equal(estimated.total,10200000); assert.equal(estimated.estimated,true);
  const official = employeeCompensation(employee, { ...report, payroll:[{DNHANVIENID:'a',LUONGCOBAN:9000000,HOAHONG:150000,THUONG:50000,PHAT:20000,TONGCONG:9180000}] });
  assert.equal(official.estimated,false); assert.equal(official.total,9180000); assert.equal(official.commission,150000);
  assert.equal(official.allocated,500000, 'Payroll commission does not replace allocated commission');
  assert.equal(employeeCompensation({...employee,CACHTINHLUONG:1,LUONGCA:300000},report).total,null);
  const inactive = employeeCompensation({...employee, STATUS:0},report);
  assert.equal(inactive.total,null); assert.equal(inactive.eligible,200000);
  assert.equal(employeeCompensation({...employee, STATUS:0}, {...report, payroll:[{DNHANVIENID:'a',TONGCONG:1500000}]}).total,1500000);
});
test('CSV escapes formula-like names and quoted content', async () => {
  const { csvCell } = await import('../../frontend/src/utils/employeeCompensation.js');
  assert.equal(csvCell('=1+1'), '"\'=1+1"'); assert.equal(csvCell('A "B"'), '"A ""B"""');
});
