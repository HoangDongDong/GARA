const field = (key, label, extra = {}) => ({ key, label, ...extra });
const tax = field('THUESUATRIENG', 'Thuế', { type: 'ratePolicy' });
const discount = field('GIAMGIARIENG', 'Giảm giá', { type: 'ratePolicy' });
const note = field('NOTE', 'Ghi chú', { type: 'textarea' });
const name = (label = 'Tên') => field('NAME', label, { required: true });
const code = (label = 'Mã') => field('CODE', label);
const standard = (nameText, resource, fields, columns = ['Tên', 'Ghi chú', 'Trạng thái'], columnFields = ['NAME', 'NOTE', 'STATUS']) => ({ name: nameText, resource, simple: true, fields, columns, columnFields });
export const catalogDefinitions = {
  customers: { name: 'Khách hàng', resource: 'customers', editor: 'customer', group: 'Nhóm khách hàng', groupField: 'DNHOMKHACHHANGID', columns: ['Mã khách', 'Tên khách hàng', 'Điện thoại', 'Địa chỉ', 'Nhóm khách hàng'], columnFields: ['MAKHACH', 'NAME', 'DIENTHOAI', 'DIACHI', 'GROUP_NAME'], fields: [name('Tên khách hàng'), field('MAKHACH','Mã khách hàng'), field('DIENTHOAI','Số điện thoại'),field('EMAIL','Email'),field('DIACHI','Địa chỉ'),field('MASOTHUE','CCCD / Mã số thuế'),field('DNHOMKHACHHANGID','Nhóm khách hàng'),discount] },
  suppliers: { name: 'Nhà cung cấp', resource: 'suppliers', editor: 'supplier', group: 'Nhóm nhà cung cấp', groupField: 'DNHOMNHACUNGCAPID', columns: ['Mã NCC', 'Tên nhà cung cấp', 'Điện thoại', 'Nhóm nhà cung cấp'], columnFields: ['MANHACUNGCAP','NAME','DIENTHOAI','GROUP_NAME'], fields: [name('Tên nhà cung cấp'),field('MANHACUNGCAP','Mã nhà cung cấp',{required:true}),field('DIENTHOAI','Số điện thoại'),field('EMAIL','Email'),field('DIACHI','Địa chỉ'),field('WEBSITE','Website'),note,field('DNHOMNHACUNGCAPID','Nhóm nhà cung cấp')] },
  parts: { name: 'Mặt hàng / Phụ tùng',resource:'parts',editor:'part',group:'Nhóm mặt hàng',groupField:'DNHOMMATHANGID',columns:['Mã hàng','Tên mặt hàng','ĐVT','Nhóm mặt hàng','Giá bán'],columnFields:['CODE','NAME','UNIT_NAME','GROUP_NAME','GIABAN'],fields:[name('Tên mặt hàng'),field('CODE','Mã mặt hàng',{required:true}),field('BARCODE','Mã vạch'),field('MAOEM','Mã OEM'),field('GIANHAP','Giá nhập',{type:'number'}),field('GIABAN','Giá bán',{type:'number'}),field('GIABAN2','Giá bán 2',{type:'number'}),field('GIABAN3','Giá bán 3',{type:'number'}),field('BAOHANH','Bảo hành (tháng)'),field('TONTOITHIEU','Tồn tối thiểu',{type:'number'}),field('TONTOIDA','Tồn tối đa',{type:'number'}),field('MASANCO','Mã sẵn có'),field('DNHOMMATHANGID','Nhóm mặt hàng'),field('DDONVITINHID','Đơn vị tính'),field('DHANGSANXUATID','Hãng sản xuất'),field('DVITRIKHOID','Vị trí kho'),tax] },
  services:{name:'Dịch vụ',resource:'services',group:'Nhóm dịch vụ',groupField:'DLOAIDICHVUID',columns:['Mã DV','Tên dịch vụ','Giá dịch vụ','Nhóm dịch vụ'],columnFields:['CODE','NAME','GIA','GROUP_NAME'],fields:[name('Tên dịch vụ'),code('Mã dịch vụ'),field('DLOAIDICHVUID','Nhóm dịch vụ',{lookup:'service_categories'}),field('GIA','Giá dịch vụ',{type:'number'}),field('THOIGIAN','Thời gian (phút)',{type:'number'}),tax,note]},
  models:{name:'Hãng xe & Dòng xe',resource:'models',group:'Hãng xe',groupField:'DHANGXEID',listTitle:'Dòng xe',columns:['Mã dòng','Tên dòng xe','Hãng xe','Ghi chú'],columnFields:['CODE','NAME','GROUP_NAME','NOTE'],fields:[name('Tên dòng xe'),code('Mã dòng xe'),field('DHANGXEID','Hãng xe',{lookup:'brands'}),note]},
  vehicles:{name:'Xe / Hồ sơ xe',resource:'vehicles',editor:'vehicle',group:'Hãng xe',groupField:'DHANGXEID',columns:['Biển số','Khách hàng','Hãng xe','Dòng xe','Năm SX'],columnFields:['BIENSO','CUSTOMER_NAME','GROUP_NAME','MODEL_NAME','NAMSANXUAT'],statusReadonly:true,fields:[]},
  warehouses:{name:'Kho hàng & Vị trí kho',resource:'locations',group:'Kho hàng',groupField:'DKHOHANGID',listTitle:'Vị trí kho',columns:['Tên vị trí','Kho hàng','Ghi chú','Trạng thái'],columnFields:['NAME','GROUP_NAME','NOTE','STATUS'],fields:[name('Tên vị trí'),field('DKHOHANGID','Kho hàng',{lookup:'warehouses',required:true}),note]},
  stock:{name:'Tồn kho',resource:'stock',group:'Kho hàng',readonly:true,columns:['Mã hàng','Tên mặt hàng','Kho hàng','Vị trí','ĐVT','Tồn kho'],columnFields:['CODE','NAME','GROUP_NAME','LOCATION_NAME','UNIT_NAME','TON_KHO'],fields:[]},
  manufacturers:standard('Hãng sản xuất','manufacturers',[name('Tên hãng sản xuất'),note]),
  units:standard('Đơn vị tính','units',[name('Tên đơn vị tính'),code('Mã đơn vị'),note],['Mã ĐVT','Tên đơn vị','Ghi chú','Trạng thái'],['CODE','NAME','NOTE','STATUS']),
  departments:standard('Phòng ban','departments',[name('Tên phòng ban'),code('Mã phòng ban'),note]),
  positions:standard('Chức vụ','positions',[name('Tên chức vụ'),code('Mã chức vụ'),note]),
  shifts:standard('Ca làm việc','shifts',[name('Tên ca'),field('GIOBATDAU','Giờ bắt đầu',{type:'time'}),field('GIOKETTHUC','Giờ kết thúc',{type:'time'}),note],['Tên ca','Giờ bắt đầu','Giờ kết thúc','Trạng thái'],['NAME','GIOBATDAU','GIOKETTHUC','STATUS']),
  fuels:standard('Loại nhiên liệu','fuels',[name('Tên nhiên liệu'),code('Mã nhiên liệu'),note]),
  cashReasons:{name:'Lý do thu / chi',resource:'cashReasons',group:'Loại giao dịch',columns:['Tên lý do','Loại','Ghi chú','Trạng thái'],columnFields:['NAME','GROUP_NAME','NOTE','STATUS'],fields:[name('Tên lý do'),field('LOAI','Loại giao dịch',{options:[{ID:'0',NAME:'Thu'},{ID:'1',NAME:'Chi'}],required:true}),note]},
  stores:standard('Chi nhánh / Cửa hàng','stores',[name('Tên chi nhánh / cửa hàng'),code('Mã cửa hàng'),field('DIACHI','Địa chỉ'),field('DIENTHOAI','Số điện thoại'),field('EMAIL','Email'),note],['Mã','Tên cửa hàng','Địa chỉ','Điện thoại','Trạng thái'],['CODE','NAME','DIACHI','DIENTHOAI','STATUS']),
  banks:{name:'Tài khoản ngân hàng',resource:'banks',group:'Ngân hàng',columns:['Số tài khoản','Chủ tài khoản','Ngân hàng','Chi nhánh','Số dư đầu kỳ'],columnFields:['SOTAIKHOAN','NAME','TENNGANHANG','CHINHANH','SODUDAU'],fields:[name('Chủ tài khoản'),field('SOTAIKHOAN','Số tài khoản',{required:true}),field('TENNGANHANG','Ngân hàng',{required:true}),field('CHINHANH','Chi nhánh'),field('SODUDAU','Số dư đầu kỳ (đ)',{type:'number'}),note]},
  funds:standard('Quỹ tiền mặt','funds',[name('Tên quỹ'),code('Mã quỹ'),note]),
};
for (const key of ['parts', 'services']) {
  catalogDefinitions[key].fields.push(field('HHKIEU', 'Cách tính hoa hồng', { type: 'commission' }), field('HHGIATRI', 'Mức hoa hồng', { type: 'hidden' }));
  catalogDefinitions[key].columns.push('Hoa hồng');
  catalogDefinitions[key].columnFields.push('HH_LABEL');
}
export const masterFormDefinitions = {
  customer_groups:{name:'Nhóm khách hàng',fields:[name('Tên nhóm khách hàng'),discount,note]},
  supplier_groups:{name:'Nhóm nhà cung cấp',fields:[name('Tên nhóm nhà cung cấp'),note]},
  categories:{name:'Nhóm mặt hàng',fields:[name('Tên nhóm mặt hàng'),tax,note]},
  service_categories:{name:'Nhóm dịch vụ',fields:[name('Tên nhóm dịch vụ'),tax,note]},
  brands:{name:'Hãng xe',fields:[name('Tên hãng xe'),code('Mã hãng'),note]},
  warehouses:{name:'Kho hàng',fields:[name('Tên kho'),field('CHOPHEPAMKHO','Cho phép âm kho',{options:[{ID:'0',NAME:'Không'},{ID:'1',NAME:'Có'}]}),note]},
  units:catalogDefinitions.units,
  manufacturers:catalogDefinitions.manufacturers,
  locations:{name:'Vị trí kho',fields:catalogDefinitions.warehouses.fields},
};
export function displayCatalogValue(row, key) {
  if (key === 'HH_LABEL') return Number(row.HHKIEU) === 1 ? `${Number(row.HHGIATRI || 0)}%` : Number(row.HHKIEU) === 2 ? `${Number(row.HHGIATRI || 0).toLocaleString('vi-VN')} đ / đơn vị` : 'Không tính';
  if (key==='STATUS') return Number(row.STATUS)===1?'Đang sử dụng':'Ngừng sử dụng';
  if (key==='GIOBATDAU'||key==='GIOKETTHUC') return row[key] ? new Date(row[key]).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '';
  if (key==='GIABAN'||key==='GIA') return row[key] == null ? '' : Number(row[key]).toLocaleString('vi-VN')+' đ';
  if(key==='TON_KHO')return Number(row[key]||0).toLocaleString('vi-VN');
  return row[key] == null ? '' : String(row[key]);
}
