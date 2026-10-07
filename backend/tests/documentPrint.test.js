const test=require('node:test');const assert=require('node:assert/strict');const db=require('../src/db');const p=require('../src/services/documentPrint');
const id='190263eb-bc79-4ad2-9cee-ecd5d0470426';
async function mockQuery(query,fn){const original=db.query;db.query=query;try{return await fn();}finally{db.query=original;}}
test('18 document types require view and print within the same business permission',()=>{
 assert.equal(p.types.length,18);for(const t of p.types){assert.ok(t.codes.length);for(const bit of [0,1,16])assert.equal(p.permitted({permissions:{[t.codes[0]]:bit}},t),false);assert.equal(p.permitted({permissions:{[t.codes[0]]:17}},t),true);assert.equal(p.permitted({ISADMIN:1},t),true);}assert.throws(()=>p.typeByKey('TDONHANG; DELETE'),/không hợp lệ/);
});
test('date range rejects impossible dates and reversed ranges',()=>{
 assert.throws(()=>p.range('2026-02-30','2026-03-01'));assert.throws(()=>p.range('2026-03-03','2026-03-01'));assert.deepEqual(p.range('2024-02-29','2024-03-01'),['2024-02-29','2024-03-01']);
});
test('saved records are required, cash types cannot be swapped, and handover requires completion',async()=>{
 await mockQuery(async()=>[],()=>assert.rejects(p.payload(p.typeByKey('MauPhieuThu'),id,{},'test'),/Không tìm thấy/));
 await mockQuery(async sql=>sql.includes('FROM TTHUCHI')?[{ID:id,STATUS:1,LOAI:1}]:[],()=>assert.rejects(p.payload(p.typeByKey('MauPhieuThu'),id,{},'test'),/không đúng loại/));
 await mockQuery(async sql=>sql.includes('FROM TLENHSUACHUA WHERE')?[{ID:id,STATUS:1,TRANGTHAI:1}]:[],()=>assert.rejects(p.payload(p.typeByKey('MauPhieuBanGiao'),id,{},'test'),/chưa hoàn thành/));
});
test('cash receipts and payroll map persisted values into GARA rows',async()=>{
 for(const [key,table,loai,amount] of [['MauPhieuThu','TTHUCHI',0,123000],['MauPhieuChi','TTHUCHI',1,45000],['MauBangLuong','TBANGLUONG',null,9000000]]){
  await mockQuery(async sql=>sql.includes('FROM TBANGLUONGCHITIET')?[{STAFF_NAME:'Nhân viên kiểm thử',TONGCONG:amount,LUONGCOBAN:8000000,HOAHONG:1000000}]:sql.includes(`FROM ${table} WHERE`)?[{ID:id,NAME:'TEST',STATUS:1,LOAI:loai,SOTIEN:amount,TONGLUONG:amount,NOTE:'Nội dung kiểm thử'}]:[],async()=>{const data=await p.payload(p.typeByKey(key),id,{},'test');assert.equal(data.parameters.TONGCONG,amount);assert.equal(data.tables.Table0[0].THANHTIEN,amount);assert.ok(data.parameters.DocTitle.includes(p.typeByKey(key).label.toLocaleUpperCase('vi')));});
 }
});
test('quote total includes taxes, discounts, and shipping when total is null',async()=>{
 await mockQuery(async sql=>sql.includes('FROM TBAOGIACHITIET')?[{SOLUONG:2,DONGIA:100000,THANHTIEN:200000,PART_NAME:'Phụ tùng'}]:sql.includes('FROM TBAOGIA WHERE')?[{ID:id,STATUS:0,TONGCONG:null,TIENTHUE:20000,TIENGIAMGIA:10000,PHIVANCHUYEN:5000}]:[],async()=>{const d=await p.payload(p.typeByKey('MauBaoGia'),id,{},'test');assert.equal(d.parameters.TONGCONG,215000);assert.equal(d.tables.Table0[0].QuantityText,'2');});
});
test('legacy cash voucher templates receive the saved amount, partner, address and reason',async()=>{
 const {mapLegacyMoneyWords,toVndWords}=require('../src/services/legacyPrintExpressions');
 for(const [key,loai,field] of [['MauPhieuThu',0,'THU'],['MauPhieuChi',1,'CHI']]){
  await mockQuery(async sql=>sql.includes('FROM TTHUCHI WHERE')?[{ID:id,NAME:'TEST',STATUS:1,LOAI:loai,SOTIEN:3211000,DKHACHHANGID:'customer',TENDOITUONG:null,DIACHIDOITUONG:null,NOTE:'Thanh toán công nợ',CHUNGTUGOC:null}]:sql.includes('FROM DKHACHHANG WHERE')?[{NAME:'Khách kiểm thử',DIACHI:'Địa chỉ đã lưu'}]:[],async()=>{
   const d=await p.payload(p.typeByKey(key),id,{},'test');
   assert.equal(d.parameters[field],3211000);assert.equal(d.parameters[loai?'THU':'CHI'],0);
   assert.equal(d.parameters.TENDOITUONG,'Khách kiểm thử');assert.equal(d.parameters.DIACHI,'Địa chỉ đã lưu');assert.equal(d.parameters.DIENGIAI,'Thanh toán công nợ');assert.equal(d.parameters.CHUNGTUGOC,'');
   const xml=mapLegacyMoneyWords(`<Text Text="[${field}] [ToVndWords([${field}])] [TENDOITUONG] [DIACHI] [DIENGIAI] [CHUNGTUGOC]"/>`,d);
   assert.doesNotThrow(()=>p.validateBindings(xml,d));assert.equal(d.parameters['VndWords_'+field],toVndWords(3211000));
  });
 }
});
test('legacy quote aliases use saved customer contact and company fax, while the 54mm receipt validates',async()=>{
 await mockQuery(async sql=>sql.includes('FROM TBAOGIA WHERE')?[{ID:id,STATUS:0,DKHACHHANGID:'customer',DIACHI:null,DIENTHOAI:null}]:sql.includes('FROM DKHACHHANG WHERE')?[{NAME:'Khách báo giá',DIACHI:'Địa chỉ khách',DIENTHOAI:'0901234567'}]:sql.includes("NAME='CompanyFax'")?[{TEXTVALUE:'0281234567'}]:[],async()=>{
  const d=await p.payload(p.typeByKey('MauBaoGia'),id,{},'test');
  assert.equal(d.parameters.TENKHACH,'Khách báo giá');assert.equal(d.parameters.DIACHI,'Địa chỉ khách');assert.equal(d.parameters.DIENTHOAI,'0901234567');assert.equal(d.parameters.CompanyFax,'0281234567');
  assert.doesNotThrow(()=>p.validateBindings('<Text Text="[TENKHACH] [DIACHI] [DIENTHOAI] [CompanyFax]"/>',d));
  assert.doesNotThrow(()=>p.validateBindings(require('../src/services/quoteReceipt54').template(),d));
 });
});
test('customer debt uses saved balance before incomplete payment fields',async()=>{
 await mockQuery(async sql=>sql.includes('FROM DKHACHHANG WHERE')?[{ID:id,STATUS:1,NAME:'Khách kiểm thử'}]:sql.includes('FROM TDONHANG WHERE')?[{NAME:'SALE',TONGCONG:1000000,TIENTHANHTOAN:0,CONLAI:0,DATHANHTOAN:1}]:sql.includes('FROM THOADONSUACHUA WHERE')?[{NAME:'REPAIR',TONGCONG:500000,CONLAI:150000}]:[],async()=>{const d=await p.payload(p.typeByKey('MauCongNoKhachHang'),id,{},'test');assert.equal(d.parameters.TONGCONG,150000);});
});
test('incompatible imported template bindings fail instead of printing fabricated zeros',()=>{
 const data={parameters:{DocTitle:'GARA'},tables:{Table0:[{ItemName:'Phụ tùng'}]}};
 assert.doesNotThrow(()=>p.validateBindings('<Text Text="[DocTitle] [Table0.ItemName] [Page]"/>',data));
 assert.throws(()=>p.validateBindings('<Text Text="[GymMember] [Table0.CardExpiry]"/>',data),/chưa được ánh xạ/);
});
test('warehouse export uses saved export rows for staff, warehouse, date and amounts',async()=>{
 const xp={STAFF_NAME:'Kỹ thuật viên A',WAREHOUSE_NAME:'Kho phụ tùng',PART_NAME:'Lọc dầu',PART_CODE:'LD01',UNIT_NAME:'Cái',SOLUONG:2,DONGIA:100000,THANHTIEN:200000,NGAYXUAT:'2026-10-03',NOTE:'Xuất cho lệnh sửa chữa'};
 await mockQuery(async sql=>sql.includes('FROM TLENHSUACHUA WHERE')?[{ID:id,NAME:'LSC-TEST',STATUS:1,NOTE:'Nội dung lệnh',TONGCONG:999999}]:sql.includes('FROM TXUATPHUTUNG xp')?[xp]:sql.includes("NAME='CompanyEmail'")?[{TEXTVALUE:'gara@example.test'}]:[],async()=>{
  const d=await p.payload(p.typeByKey('MauPhieuXuatKho'),id,{},'test');
  assert.equal(d.parameters.DNHANVIEN_NAME,xp.STAFF_NAME);assert.equal(d.parameters.DKHOHANG_NAME,xp.WAREHOUSE_NAME);assert.equal(d.parameters.CompanyEmail,'gara@example.test');assert.equal(d.parameters.DIENGIAI,xp.NOTE);assert.equal(d.parameters.TONGCONG,200000);assert.equal(d.parameters.TILEGIAMGIA,0);assert.equal(d.parameters.TILETHUE,0);assert.equal(d.tables.Table0[0].SLXUATCHUAQUYDOI,2);
 });
});
