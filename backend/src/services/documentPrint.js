const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../db');
const { applyCompanyLogo } = require('./companyLogo');
const { decodeConfigImage } = require('./configImageStorage');
const { mapLegacyMoneyWords } = require('./legacyPrintExpressions');
const { documentTypes } = require('./garagePrintCatalog');
const { templateFilter, templateOptions } = require('./systemConfigOptions');
const { company, clean, prefixed, runRenderer, fillMissingVariables, buildSalesPayload } = require('./salesPrint');
const permissionCodes = {
  MauPhieuTiepNhan:['REPAIR'], MauPhieuSuaChua:['REPAIR'], MauBaoGia:['REPAIR'], MauPhieuBanGiao:['REPAIR'],
  MauHoaDonSuaChua:['REPAIR','FINANCE'], MauPhieuBaoHanh:['WARRANTY'], MauHoaDonBanHang:['SALES'],
  MauPhieuNhapKho:['INVENTORY'], MauPhieuXuatKho:['INVENTORY','REPAIR'], MauPhieuThu:['FINANCE'], MauPhieuChi:['FINANCE'],
  MauMaVachPhuTung:['INVENTORY'], MauBangLuong:['EMPLOYEES'], MauBaoCao:['REPORTS'],
  MauHoSoXe:['VEHICLES'], MauLichSuSuaChua:['VEHICLES','REPAIR'], MauCongNoKhachHang:['FINANCE'], MauCongNoNhaCungCap:['FINANCE'],
};
const textTypes = new Set(['MauPhieuTiepNhan','MauPhieuBanGiao','MauPhieuBaoHanh','MauHoSoXe','MauLichSuSuaChua']);
const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'}) : '';
const fail = (message,status=400) => Object.assign(new Error(message),{status});
const types = documentTypes.map(type => ({ ...type, codes: permissionCodes[type.key], layout: textTypes.has(type.key) ? 'text' : type.key==='MauMaVachPhuTung' ? 'barcode' : 'money' }));
function permitted(user,type) { return Number(user?.ISADMIN)===1 || type.codes.some(code => (Number(user?.permissions?.[code]||0)&17)===17); }
function typeByKey(key) { const type=types.find(item=>item.key===key); if(!type)throw fail('Loại bản in không hợp lệ.');return type; }
function range(from,to) {
  for(const value of [from,to]) if(value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value))throw fail('Khoảng ngày không hợp lệ.');
  if(from&&to&&from>to)throw fail('Ngày bắt đầu phải trước ngày kết thúc.');
  return [from||'2000-01-01',to||'2100-12-31'];
}
function sourceFor(type) {
  if(['MauPhieuBanGiao','MauPhieuXuatKho'].includes(type.key))return 'TLENHSUACHUA';
  if(['MauHoSoXe','MauLichSuSuaChua'].includes(type.key))return 'DXE';
  return type.table;
}
async function records(type,search='') {
  if(type.key==='MauBaoCao')return [{ID:'summary',NAME:'Tổng hợp doanh thu sửa chữa và bán phụ tùng'}];
  const table=sourceFor(type);const name=table==='DXE'?'BIENSO':'NAME';
  const restriction=type.key==='MauPhieuThu'?' AND LOAI=0':type.key==='MauPhieuChi'?' AND LOAI=1':type.key==='MauPhieuBanGiao'?' AND TRANGTHAI IN (3,4,5)':type.key==='MauPhieuXuatKho'?' AND EXISTS (SELECT 1 FROM TXUATPHUTUNG xp WHERE xp.TLENHSUACHUAID=TLENHSUACHUA.ID AND COALESCE(xp.STATUS,0)>=0)':'';
  const searchWhere=search ? ` AND (UPPER(${name}) CONTAINING UPPER(?) OR ID=?)` : '';
  const rows=await db.query(`SELECT FIRST 100 ID,${name} AS NAME FROM ${table} WHERE COALESCE(STATUS,0)>=0${restriction}${searchWhere} ORDER BY TIMECREATED DESC`,search?[search,search]:[]);
  return rows;
}
const related = async(table,id)=>id?(await db.query(`SELECT * FROM ${table} WHERE ID=?`,[id]))[0]||null:null;
async function details(table,foreign,id) {
  const rows=await db.query(`SELECT ct.*,m.NAME AS PART_NAME,m.CODE AS PART_CODE,d.NAME AS SERVICE_NAME,u.NAME AS UNIT_NAME
    FROM ${table} ct LEFT JOIN DMATHANG m ON m.ID=ct.DMATHANGID LEFT JOIN DDICHVU d ON d.ID=ct.DDICHVUID
    LEFT JOIN DDONVITINH u ON u.ID=ct.DDONVITINHID WHERE ct.${foreign}=? AND COALESCE(ct.STATUS,0)>=0 ORDER BY ct.TIMECREATED`,[id]);
  return rows.map(row=>({...clean(row),ItemName:row.PART_NAME||row.SERVICE_NAME||row.NOTE||'Hạng mục chưa khai báo tên',ItemCode:row.PART_CODE||'',Unit:row.UNIT_NAME||'',
    Quantity:Number(row.SOLUONG||0),UnitPrice:Number(row.DONGIA||0),Amount:Number(row.THANHTIEN||0),Note:row.NOTE||''}));
}
function monetaryRows(rows) {
 return rows.map((row,index)=>({...row,Index:String(index+1),ItemName:row.ItemName||row.NAME||'',ItemCode:row.ItemCode||'',Unit:row.Unit||'',
 QuantityText:row.Quantity==null?'':String(row.Quantity),UnitPriceText:row.UnitPrice==null?'':money(row.UnitPrice),AmountText:row.Amount==null?'':money(row.Amount),
 ValueText:row.ValueText||'',Note:row.Note||row.NOTE||'',
 DMATHANG_NAME:row.ItemName||row.NAME||'',DMATHANG_CODE:row.ItemCode||'',DDICHVU_NAME:row.SERVICE_NAME||'',DDONVITINH_NAME:row.Unit||'',
 SOLUONG:row.Quantity??row.SOLUONG??0,SLNHAPCHUAQUYDOI:row.Quantity??0,SLXUATCHUAQUYDOI:row.Quantity??0,DONGIA:row.UnitPrice??0,THANHTIEN:row.Amount??0}));
}
async function payload(type,id,filters,user) {
 const [from,to]=range(filters.from,filters.to);
 let header={},rows=[],customer=null,vehicle=null,supplier=null,employee=null,warehouse=null,extra='',reception={};
 if(type.key==='MauHoaDonBanHang'){
  const result=await buildSalesPayload(id,user);header=result.parameters;if(Number(header.STATUS)<0)throw fail('Phiếu bán hàng không còn sử dụng.',404);rows=result.tables.Table0.map(row=>({...row,ItemName:row.DMATHANG_NAME,Unit:row.DDONVITINH_NAME,Quantity:row.SLXUAT,UnitPrice:row.DONGIA,Amount:row.THANHTIEN}));
 }else if(type.key==='MauBaoCao'){
  if(id!=='summary')throw fail('Chọn báo cáo tổng hợp hợp lệ.');
  const sales=await db.query(`SELECT NAME,NGAY,TONGCONG,TIENGIAMGIA FROM TDONHANG WHERE STATUS=1 AND CAST(NGAY AS DATE) BETWEEN ? AND ? ORDER BY NGAY`,[from,to]);
  const repairs=await db.query(`SELECT NAME,NGAY,TONGCONG,CONLAI,DATHANHTOAN FROM THOADONSUACHUA WHERE STATUS=1 AND CAST(NGAY AS DATE) BETWEEN ? AND ? ORDER BY NGAY`,[from,to]);
  rows=[...repairs.map(row=>({ItemName:`Sửa chữa - ${row.NAME}`,Amount:Number(row.TONGCONG||0),Note:`${date(row.NGAY)}; còn lại: ${money(row.CONLAI)}`})),...sales.map(row=>({ItemName:`Bán phụ tùng - ${row.NAME}`,Amount:Number(row.TONGCONG||0),Note:date(row.NGAY)}))];
  header={NAME:'BC-DOANHTHU',NGAY:new Date().toISOString(),NOTE:`Từ ${from} đến ${to}`,TONGCONG:rows.reduce((sum,row)=>sum+row.Amount,0)};
 }else{
  const table=sourceFor(type);header=clean(await related(table,id)||{});if(!header.ID||Number(header.STATUS)<0)throw fail('Không tìm thấy bản ghi đã lưu để in.',404);
  if(type.key==='MauPhieuThu'&&Number(header.LOAI)!==0||type.key==='MauPhieuChi'&&Number(header.LOAI)!==1)throw fail('Phiếu không đúng loại thu/chi.',404);
  if(type.key==='MauHoSoXe'||type.key==='MauLichSuSuaChua'){vehicle=header;customer=await related('DKHACHHANG',header.DKHACHHANGID);}
  else{vehicle=await related('DXE',header.DXEID);customer=await related('DKHACHHANG',header.DKHACHHANGID||vehicle?.DKHACHHANGID);}
  supplier=await related('DNHACUNGCAP',header.DNHACUNGCAPID);employee=await related('DNHANVIEN',header.DNHANVIENID);warehouse=await related('DKHOHANG',header.DKHOHANGID);
  switch(type.key){
   case 'MauPhieuTiepNhan': {
    const advisor=await related('DNHANVIEN',header.DNHANVIENCOOVANID);const technician=await related('DNHANVIEN',header.DNHANVIENKTVID);
    const brand=await related('DHANGXE',vehicle?.DHANGXEID);const model=await related('DDONGXE',vehicle?.DDONGXEID);
    const [email]=await db.query("SELECT TEXTVALUE FROM SCONFIG WHERE NAME='CompanyEmail' AND STATUS=30");
    reception={CompanyEmail:email?.TEXTVALUE||'',CustomerAddress:customer?.DIACHI||'',
     VehicleDescription:[brand?.NAME,model?.NAME,vehicle?.PHIENBAN,vehicle?.NAMSANXUAT].filter(Boolean).join(' '),
     VehicleVin:vehicle?.SOKHUNG||'',VehicleEngine:vehicle?.SOMAY||'',VehicleOdo:String(header.ODO??vehicle?.ODO??''),
     VehicleFuel:String(header.MUCNHIENLIEU??vehicle?.MUCNHIENLIEU??''),AdvisorName:advisor?.NAME||'',TechnicianName:technician?.NAME||'',
     ReceptionTime:header.NGAY?new Date(header.NGAY).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):''};
    rows=[{ItemName:'Tình trạng xe',ValueText:header.TINHTRANGXE||''},{ItemName:'Yêu cầu khách hàng',ValueText:header.YEUCAUKHACH||''},{ItemName:'Phụ kiện trên xe',ValueText:header.PHUKIENDETRENKXE||''},{ItemName:'Số km / nhiên liệu',ValueText:`${reception.VehicleOdo} / ${reception.VehicleFuel}`},{ItemName:'Cố vấn / kỹ thuật viên',ValueText:[advisor?.NAME,technician?.NAME].filter(Boolean).join(' / ')}];break;
   }
   case 'MauPhieuSuaChua':case 'MauPhieuBanGiao':
    rows=await details('TLENHSUACHUACHITIET','TLENHSUACHUAID',id);
    if(type.key==='MauPhieuBanGiao'){
     if(![3,4,5].includes(Number(header.TRANGTHAI)))throw fail('Lệnh sửa chữa chưa hoàn thành để in biên bản bàn giao.',409);
     rows=rows.map(row=>({...row,ValueText:`${row.Quantity} ${row.Unit}`,Note:row.Note}));extra=`Ngày hoàn thành: ${date(header.KETTHUC)}; QC: ${header.NGUOIQC||''}`;
    }break;
   case 'MauBaoGia':rows=await details('TBAOGIACHITIET','TBAOGIAID',id);break;
   case 'MauHoaDonSuaChua':rows=header.TLENHSUACHUAID?await details('TLENHSUACHUACHITIET','TLENHSUACHUAID',header.TLENHSUACHUAID):[{ItemName:'Phụ tùng',Amount:Number(header.TIENPHUTUNG||0)},{ItemName:'Tiền công',Amount:Number(header.TIENCONG||0)},{ItemName:'Dịch vụ',Amount:Number(header.TIENDICHVU||0)}];extra=`Đã thu: ${money(Number(header.TIENMAT||0)+Number(header.CHUYENKHOAN||0)+Number(header.THE||0))}; còn lại: ${money(header.CONLAI)}`;break;
   case 'MauPhieuNhapKho': {
    const items=await db.query(`SELECT ct.*,m.NAME AS PART_NAME,m.CODE AS PART_CODE,u.NAME AS UNIT_NAME FROM TNHAPKHOCHITIET ct LEFT JOIN DMATHANG m ON m.ID=ct.DMATHANGID LEFT JOIN DDONVITINH u ON u.ID=ct.DDONVITINHID WHERE ct.TNHAPKHOID=? ORDER BY ct.TIMECREATED`,[id]);
    rows=items.map(row=>({...clean(row),ItemName:row.PART_NAME||'',ItemCode:row.PART_CODE||'',Unit:row.UNIT_NAME||'',Quantity:Number(row.SOLUONG||0),UnitPrice:Number(row.DONGIA||0),Amount:Number(row.THANHTIEN||0)}));break;
   }
   case 'MauPhieuXuatKho': {
    const items=await db.query(`SELECT xp.*,m.NAME AS PART_NAME,m.CODE AS PART_CODE,u.NAME AS UNIT_NAME,nv.NAME AS STAFF_NAME,k.NAME AS WAREHOUSE_NAME FROM TXUATPHUTUNG xp LEFT JOIN DMATHANG m ON m.ID=xp.DMATHANGID LEFT JOIN DDONVITINH u ON u.ID=m.DDONVITINHID LEFT JOIN DNHANVIEN nv ON nv.ID=xp.DNHANVIENID LEFT JOIN DKHOHANG k ON k.ID=xp.DKHOHANGID WHERE xp.TLENHSUACHUAID=? AND COALESCE(xp.STATUS,0)>=0 ORDER BY xp.NGAYXUAT`,[id]);
    rows=items.map(row=>({...clean(row),ItemName:row.PART_NAME||'',ItemCode:row.PART_CODE||'',Unit:row.UNIT_NAME||'',Quantity:Number(row.SOLUONG||0),UnitPrice:Number(row.DONGIA||0),Amount:Number(row.THANHTIEN||0)}));
    const names=key=>[...new Set(items.map(row=>row[key]).filter(Boolean))].join(', ');
    employee={NAME:names('STAFF_NAME')};warehouse={NAME:names('WAREHOUSE_NAME')};
    header={...header,NGAY:items[0]?.NGAYXUAT||header.NGAY,DIENGIAI:items.map(row=>row.NOTE).filter(Boolean).join('; ')||header.NOTE||'',TILEGIAMGIA:0,TILETHUE:0,TIENGIAMGIA:0,TIENTHUE:0,TONGCONG:rows.reduce((sum,row)=>sum+row.Amount,0)};break;
   }
   case 'MauPhieuBaoHanh': {
    const part=await related('DMATHANG',header.DMATHANGID);const service=await related('DDICHVU',header.DDICHVUID);
    rows=[{ItemName:'Hạng mục bảo hành',ValueText:part?.NAME||service?.NAME||header.NOTE||''},{ItemName:'Thời hạn',ValueText:`${date(header.NGAYBATDAU)} - ${date(header.NGAYKETTHUC)}`},{ItemName:'Kết quả xử lý',ValueText:header.KETQUAXULY||''}];break;
   }
   case 'MauPhieuThu':case 'MauPhieuChi': {
    const reason=await related('DLYDOTHUCHI',header.DLYDOTHUCHID);rows=[{ItemName:reason?.NAME||header.NOTE||type.label,Amount:Number(header.SOTIEN||0)}];header.TONGCONG=Number(header.SOTIEN||0);break;
   }
   case 'MauMaVachPhuTung':rows=[{ItemName:header.NAME,ItemCode:header.CODE||'',BARCODE:header.BARCODE||header.CODE||header.ID,Amount:Number(header.GIABAN||0)}];break;
   case 'MauBangLuong': {
    const items=await db.query('SELECT ct.*,nv.NAME AS STAFF_NAME FROM TBANGLUONGCHITIET ct LEFT JOIN DNHANVIEN nv ON nv.ID=ct.DNHANVIENID WHERE ct.TBANGLUONGID=? AND COALESCE(ct.STATUS,0)>=0',[id]);
    rows=items.map(row=>({...clean(row),ItemName:row.STAFF_NAME||'',Amount:Number(row.TONGCONG||0),DNHANVIEN_NAME:row.STAFF_NAME||'',Note:`Cơ bản ${money(row.LUONGCOBAN)}, hoa hồng ${money(row.HOAHONG)}, thưởng ${money(row.THUONG)}, phạt ${money(row.PHAT)}`}));header.TONGCONG=header.TONGLUONG;break;
   }
   case 'MauHoSoXe': rows=[{ItemName:'Biển số',ValueText:header.BIENSO||''},{ItemName:'Số khung / VIN',ValueText:header.SOKHUNG||''},{ItemName:'Số máy',ValueText:header.SOMAY||''},{ItemName:'Năm sản xuất / màu',ValueText:`${header.NAMSANXUAT||''} / ${header.MAUXE||''}`},{ItemName:'Số km',ValueText:String(header.ODO??'')}];break;
   case 'MauLichSuSuaChua': {
    const items=await db.query('SELECT NAME,NGAY,KETTHUC,NOTE,TONGCONG FROM TLENHSUACHUA WHERE DXEID=? AND COALESCE(STATUS,0)>=0 AND CAST(NGAY AS DATE) BETWEEN ? AND ? ORDER BY NGAY DESC',[id,from,to]);
    rows=items.map(row=>({ItemName:row.NAME,ValueText:`${date(row.NGAY)} - ${date(row.KETTHUC)}; ${money(row.TONGCONG)}`,Note:row.NOTE||''}));break;
   }
   case 'MauCongNoKhachHang': {
    customer=header;const items=await db.query('SELECT NAME,NGAY,TONGCONG,CONLAI FROM THOADONSUACHUA WHERE DKHACHHANGID=? AND STATUS=1 AND CAST(NGAY AS DATE) BETWEEN ? AND ? ORDER BY NGAY',[id,from,to]);
    const sales=await db.query('SELECT NAME,NGAY,TONGCONG,TIENTHANHTOAN,CONLAI,CONGNO,DATHANHTOAN FROM TDONHANG WHERE DKHACHHANGID=? AND STATUS=1 AND CAST(NGAY AS DATE) BETWEEN ? AND ? ORDER BY NGAY',[id,from,to]);
    rows=[...items.map(row=>({ItemName:row.NAME,Amount:Number(row.CONLAI||0),Note:`Ngày ${date(row.NGAY)}; hóa đơn ${money(row.TONGCONG)}`})),...sales.map(row=>({ItemName:row.NAME,Amount:Math.max(0,Number(row.CONLAI??row.CONGNO??(Number(row.DATHANHTOAN)===1?0:Number(row.TONGCONG||0)-Number(row.TIENTHANHTOAN||0)))),Note:`Ngày ${date(row.NGAY)}; bán phụ tùng ${money(row.TONGCONG)}`}))];header={...header,TONGCONG:rows.reduce((sum,row)=>sum+row.Amount,0)};break;
   }
   case 'MauCongNoNhaCungCap': {
    supplier=header;const items=await db.query('SELECT NAME,NGAY,TONGCONG,CONGNO FROM TNHAPKHO WHERE DNHACUNGCAPID=? AND STATUS=1 AND CAST(NGAY AS DATE) BETWEEN ? AND ? ORDER BY NGAY',[id,from,to]);
    rows=items.map(row=>({ItemName:row.NAME,Amount:Number(row.CONGNO||0),Note:`Ngày ${date(row.NGAY)}; tổng phiếu ${money(row.TONGCONG)}`}));header={...header,TONGCONG:rows.reduce((sum,row)=>sum+row.Amount,0)};break;
   }
  }
 }
 const [companyEmail]=await db.query("SELECT TEXTVALUE FROM SCONFIG WHERE NAME='CompanyEmail' AND STATUS=30");
 const subtotal=rows.reduce((sum,row)=>sum+Number(row.Amount||0),0);
 const total=header.TONGCONG??(subtotal-Number(header.TIENGIAMGIA||0)+Number(header.TIENTHUE||0)+Number(header.PHIVANCHUYEN||0));
 const parameters={...(await company()),CompanyEmail:companyEmail?.TEXTVALUE||'',...prefixed('DXE',vehicle),...prefixed('DKHACHHANG',customer),...prefixed('DNHACUNGCAP',supplier),...prefixed('DNHANVIEN',employee),...prefixed('DNHANVIEN2',employee),...prefixed('DKHOHANG',warehouse),...prefixed('DKHOHANG2',warehouse),...header,...reception,
 'In bởi':user||'',DocTitle:type.label.toLocaleUpperCase('vi'),DocNumber:type.key==='MauMaVachPhuTung'?(header.CODE||header.NAME||''):header.NAME||header.BIENSO||'',DocDate:date(header.NGAY||header.NGAYBATDAU||header.TIMECREATED),
 CustomerName:customer?.NAME||supplier?.NAME||header.DKHACHHANG_NAME||'',Contact:customer?.DIENTHOAI||supplier?.DIENTHOAI||'',VehiclePlate:vehicle?.BIENSO||'',
 Description:header.NOTE||'',Extra:extra,TotalText:money(total),TONGCONG:total,
 FooterNote:['MauHoSoXe','MauLichSuSuaChua','MauBaoCao','MauMaVachPhuTung'].includes(type.key)?'': 'Khách hàng / người giao nhận                         Nhân viên GARA',
 TIENTHUE:Number(header.TIENTHUE||0),TIENGIAMGIA:Number(header.TIENGIAMGIA||0),TIENHANG:header.TIENHANG??rows.reduce((sum,row)=>sum+Number(row.Amount||0),0),
 SummaryText:type.layout!=='money'?'':`Tổng cộng: ${money(total)}${header.TIENGIAMGIA?`; giảm giá: ${money(header.TIENGIAMGIA)}`:''}${header.TIENTHUE?`; thuế: ${money(header.TIENTHUE)}`:''}`,
 };
 const table0=monetaryRows(rows);
 Object.assign(parameters,{
  DocDateTime:header.NGAY&&!Number.isNaN(new Date(header.NGAY).getTime())?new Date(header.NGAY).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):date(header.NGAY),
  SubtotalText:Number(parameters.TIENHANG||0).toLocaleString('vi-VN'),DiscountText:Number(parameters.TIENGIAMGIA||0).toLocaleString('vi-VN'),
  TotalNumberText:Number(total||0).toLocaleString('vi-VN'),
  AdditionalChargesText:[Number(header.TIENTHUE)?'Thuế: '+money(header.TIENTHUE):'',Number(header.PHIVANCHUYEN)?'Vận chuyển: '+money(header.PHIVANCHUYEN):''].filter(Boolean).join('\n'),
 });
 if(type.key==='MauHoaDonBanHang'){
  Object.assign(parameters,await require('./salesPrintVisibility').load());
  parameters.PrintShow_additionalCharges=parameters.PrintShow_tax||parameters.PrintShow_shipping;
  parameters.SummaryText=`Tổng cộng: ${money(total)}${parameters.PrintShow_discount&&header.TIENGIAMGIA?`; giảm giá: ${money(header.TIENGIAMGIA)}`:''}${parameters.PrintShow_tax&&header.TIENTHUE?`; thuế: ${money(header.TIENTHUE)}`:''}`;
  parameters.AdditionalChargesText=[parameters.PrintShow_tax&&Number(header.TIENTHUE)?'Thuế: '+money(header.TIENTHUE):'',parameters.PrintShow_shipping&&Number(header.PHIVANCHUYEN)?'Vận chuyển: '+money(header.PHIVANCHUYEN):''].filter(Boolean).join('\n');
 }
 return {parameters,tables:{Table0:table0}};
}
async function resolve(type,templateId) {
 const [setting]=await db.query('SELECT TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30',[type.key]);
 const id=templateId||setting?.TEXTVALUE;const filter=templateFilter(setting?.OTHERCONFIG);
 if(!id)throw fail(`Chưa đặt mẫu mặc định cho ${type.label.toLowerCase()}.`,409);
 if(!filter?.ids.includes(String(id).toLowerCase()))throw fail('Mẫu in không thuộc loại phiếu đang chọn.');
 const [row]=await db.query('SELECT ID,NAME FROM STEMPLATE WHERE ID=? AND STATUS IN (0,30)',[id]);if(!row)throw fail('Mẫu in không còn sử dụng.',404);
 const content=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[id],'TEMPLATE');if(!content)throw fail('Mẫu in chưa có nội dung.',409);
 return {...row,content};
}
function validateBindings(xml,data) {
 const missing=new Set();const rows=data.tables.Table0||[];
 for(const match of xml.matchAll(/\[Table0\.([^\]\r\n]+)\]/g)) {
  const field=match[1];if(rows.length && !rows.some(row=>Object.hasOwn(row,field)))missing.add('Table0.'+field);
 }
 const computed=new Set([...xml.matchAll(/<Total Name="([^"]+)"/g)].map(match=>match[1]));
 const system=new Set(['Date','Page','PageN','TotalPages','PageNofM','Row#','AbsRow#','CopyName#','HierarchyLevel','HierarchyRow#','Page#','TotalPages#']);
 for(const match of xml.matchAll(/\[([^\[\]\r\n]+)\]/g)) {
  const key=match[1].trim();if(!key||key.includes('.')||system.has(key)||computed.has(key)||/[=<>!+\-*/|&()"]/.test(key))continue;
  if(!(key in data.parameters))missing.add(key);
 }
 if(missing.size)throw fail('Mẫu này chưa được ánh xạ đủ dữ liệu GARA ('+[...missing].slice(0,5).join(', ')+'). Hãy chọn mẫu GARA hoặc chỉnh mẫu trong Quản lý mẫu in.',409);
}
async function render(type,id,filters,user) {
 const template=await resolve(type,filters.templateId);const data=await payload(type,id,filters,user);
 const logo=decodeConfigImage(await db.queryBlob("SELECT BLOBVALUE FROM SCONFIG WHERE NAME='CompanyLogo' AND STATUS=30",[],'BLOBVALUE'));
 const xml=mapLegacyMoneyWords(applyCompanyLogo(template.content.toString('utf8'),logo,{insertMissing:false}),data);validateBindings(xml,data);fillMissingVariables(xml,data);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'garage-document-print-'));
 try{const templatePath=path.join(dir,'template.frx'),dataPath=path.join(dir,'data.json'),pdfPath=path.join(dir,'output.pdf');fs.writeFileSync(templatePath,xml);fs.writeFileSync(dataPath,JSON.stringify(data));const pdf=await runRenderer(templatePath,dataPath,pdfPath);return {pdf,name:data.parameters.DocNumber||type.label,template};}
 finally{const safeRoot=path.resolve(os.tmpdir())+path.sep;if(path.resolve(dir).startsWith(safeRoot))fs.rmSync(dir,{recursive:true,force:true});}
}
async function info(type) {
 const [setting]=await db.query('SELECT TEXTVALUE,OTHERCONFIG FROM SCONFIG WHERE NAME=? AND STATUS=30',[type.key]);
 const filter=templateFilter(setting?.OTHERCONFIG);return {key:type.key,label:type.label,defaultId:setting?.TEXTVALUE||'',templates:filter?await templateOptions(db.query,filter):[]};
}
module.exports={types,typeByKey,permitted,records,payload,render,info,resolve,range,validateBindings};
