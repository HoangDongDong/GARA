const test=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../src/services/cashbook');
test('cashbook splits cash and bank payments, keeps direction, and counts detailed payments once',()=>{
  const rows=build([
    {ID:'cash',NAME:'PC1',NGAY:'2026-10-05',SOTIEN:50,LOAI:1},
    {ID:'bank',NAME:'PT1',NGAY:'2026-10-04',SOTIEN:80,LOAI:0,DTAIKHOANNGANHANGID:'account'},
  ],[{ID:'sale',NAME:'BH1',NGAY:'2026-10-03',SOURCE:'sale',TIENMAT:100,CHUYENKHOAN:200}],
  [{ID:'detail',NAME:'BH1',SOURCE:'sale',DOCUMENT_ID:'sale',NGAY:'2026-10-03',LOAI:1,SOTIEN:200}],
  [{ID:'receipt',NAME:'PN1',NGAY:'2026-10-02',TONGCONG:500,CONGNO:400,DATHANHTOAN:0}]);
  assert.equal(rows.length,5);
  assert.equal(rows.filter(row=>row.code==='BH1').reduce((sum,row)=>sum+row.income,0),300);
  assert.equal(rows.find(row=>row.code==='PT1').method,'transfer');
  assert.equal(rows.find(row=>row.code==='PC1').expense,50);
  assert.equal(rows.find(row=>row.code==='PN1').expense,100);
  assert.equal(rows[0].code,'PC1');
});
test('unpaid and zero receipts do not create invented cash movements',()=>{
  assert.deepEqual(build([],[],[],[{ID:'unpaid',TONGCONG:100,CONGNO:100,DATHANHTOAN:0}]),[]);
  assert.equal(build([],[],[],[{ID:'paid',TONGCONG:100,CONGNO:100,DATHANHTOAN:1}])[0].expense,100);
});
