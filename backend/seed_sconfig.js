/**
 * Seed SCONFIG + SCONFIGGROUP cho dự án KAZUKO AUTO Garage Management.
 * Chạy: node backend/seed_sconfig.js
 *
 * - Xóa toàn bộ dữ liệu cũ (từ DATA.fdb, không liên quan gara ô tô)
 * - Insert nhóm mới
 * - Insert cấu hình mới phù hợp với nghiệp vụ: sửa chữa xe, bán phụ tùng, kho, in ấn
 */
const Firebird = require('node-firebird');

const opt = {
  host: '127.0.0.1', port: 3050,
  database: 'D:\\Garage\\GARAGE.FDB',
  user: 'SYSDBA', password: 'masterkey', lowercase_keys: false,
};

function attach(o) { return new Promise((res,rej) => Firebird.attach(o,(e,db) => e?rej(e):res(db))); }
function q(db, sql, p=[]) { return new Promise((res,rej) => db.query(sql, p, (e,r) => e?rej(e):res(r))); }
function x(db, sql, p=[]) { return new Promise((res,rej) => db.execute(sql, p, (e) => e?rej(e):res())); }

// UUID v4 simple
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
});

/* ========================= NHÓM CẤU HÌNH ========================= */
const GROUPS = [
  { name: 'Thông tin công ty',  sort: 'ZZZ001' },
  { name: 'In ấn & Mẫu',       sort: 'ZZZ002' },
  { name: 'Bán hàng & POS',    sort: 'ZZZ003' },
  { name: 'Thanh toán',        sort: 'ZZZ004' },
  { name: 'Kho & Phụ tùng',    sort: 'ZZZ005' },
  { name: 'Sửa chữa',         sort: 'ZZZ006' },
  { name: 'Khách hàng',        sort: 'ZZZ007' },
  { name: 'Bảo mật & Phân quyền', sort: 'ZZZ008' },
  { name: 'Hệ thống',          sort: 'ZZZ009' },
  { name: 'Thuế & phí dịch vụ', sort: 'ZZZ004A' },
];

/* ========================= HẰNG KIỂU DỮ LIỆU ========================= */
// DATATYPE: 1=TEXT, 3=INT, 4=DECIMAL
// CONTROLTYPE: 5=textbox, 6=textarea, 7=checkbox(30=true,0=false), 8=combobox, 9=number

/* ========================= CẤU HÌNH ========================= */
// [name, caption, textValue, datatype, controltype, groupIndex (0-based), sortorder]
const CONFIGS = [
  ['MacDinhThueSuat', 'Mặc định thuế suất (%)', '20', 4, 9, 9, 1],
  ['MacDinhPhiDichVu', 'Mặc định phí dịch vụ (%)', '10', 4, 9, 9, 2],
  ['BanHangTinhThue', 'Áp dụng thuế khi bán hàng', '30', 3, 7, 9, 3],
  ['BanHangTinhPhiDichVu', 'Áp dụng phí dịch vụ khi bán hàng', '30', 3, 7, 9, 4],
  /* ---- Thông tin công ty (0) ---- */
  ['CompanyName',    'Tên công ty',          'CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM', 1, 5, 0, 1],
  ['CompanyAddress', 'Địa chỉ',              '925/15 Âu Cơ - P. Tân Sơn Nhì - TP.HCM',  1, 6, 0, 2],
  ['CompanyPhone',   'Số điện thoại',        '0917 66 4444 - 0967 04 1111',               1, 5, 0, 3],
  ['CompanyZalo',    'Zalo',                 '0917664444',                                1, 5, 0, 4],
  ['CompanyEmail',   'Email',                'kazukovietnamcompany@gmail.com',             1, 5, 0, 5],
  ['CompanyWebsite', 'Website',              'https://kazukovietnam.com',                 1, 5, 0, 6],
  ['CompanyFacebook','Facebook',             'kazukovietnam',                             1, 5, 0, 7],
  ['CompanyTaxCode', 'Mã số thuế',           '',                                          1, 5, 0, 8],
  ['LoiCamOn',       'Lời cảm ơn trên hóa đơn', 'Cảm ơn quý khách và hẹn gặp lại!',     1, 6, 0, 9],
  ['PaymentBankAccountId', 'Tài khoản nhận thanh toán', '', 1, 8, 0, 11],

  /* ---- In ấn & Mẫu (1) ---- */
  ['MauHoaDonBanHang',    'Mẫu in hóa đơn bán hàng (ID)',   '190263eb-bc79-4ad2-9cee-ecd5d0470426', 1, 5, 1, 1],
  ['MauPhieuSuaChua',     'Mẫu in phiếu sửa chữa (ID)',     '', 1, 5, 1, 2],
  ['MauPhieuNhapKho',     'Mẫu in phiếu nhập kho (ID)',     '', 1, 5, 1, 3],
  ['MauPhieuXuatKho',     'Mẫu in phiếu xuất kho (ID)',     '', 1, 5, 1, 4],
  ['InTuDongSauThanhToan','In tự động sau khi thanh toán',  '0', 3, 7, 1, 5],
  ['SoLanIn',             'Số lần in mặc định',             null, 3, 9, 1, 6],
  ['KhoGiayBillPOS',      'Khổ giấy mặc định (80mm/54mm)', '80mm', 1, 8, 1, 7],

  /* ---- Bán hàng & POS (2) ---- */
  ['ChoPhepNhapGiamGia',          'Cho phép nhập giảm giá',                            '30', 3, 7, 2, 1],
  ['BatBuocNhapKhachHang',        'Bắt buộc chọn khách hàng khi bán',                 '0',  3, 7, 2, 2],
  ['HienThiAnhSanPham',           'Hiển thị ảnh sản phẩm trong POS',                  '30', 3, 7, 2, 3],
  ['BanHangDungDauDocMaVach',     'Bán hàng dùng đầu đọc mã vạch',                    '30', 3, 7, 2, 4],
  ['LamTronTien',                 'Làm tròn tiền (0=không, 500, 1000)',                null, 3, 9, 2, 5],
  ['MacDinhGiamGia',              'Giảm giá mặc định (%)',                             null, 4, 9, 2, 6],
  ['ChoPhepInTamTinh',            'Cho phép in tạm tính',                              '0',  3, 7, 2, 11],

  /* ---- Thanh toán (3) ---- */
  ['PaymentAllowDebt',           'Cho phép khách nợ',                   '30', 3, 7, 3, 1],
  ['TenTaiKhoanNganHang',         'Tên tài khoản ngân hàng',             '',   1, 5, 3, 5],
  ['SoTaiKhoanNganHang',         'Số tài khoản ngân hàng',             '',   1, 5, 3, 6],
  ['NganHang',                    'Ngân hàng',                          '',   1, 5, 3, 7],
  ['MaQRThanhToan',               'Mã QR thanh toán (URL hoặc base64)',  '',   1, 6, 3, 8],
  ['QuyDoi1DiemSangTien',         'Quy đổi 1 điểm = tiền (đ)',          '1000',3,9, 3, 9],

  /* ---- Kho & Phụ tùng (4) ---- */
  ['NhapKhoBangDauDocMaVach',      'Nhập kho bằng đầu đọc mã vạch',      '30', 3, 7, 4, 1],
  ['BatBuocChonNhaCungCapTrongNhapKho', 'Bắt buộc chọn nhà cung cấp khi nhập kho', '0', 3, 7, 4, 2],
  ['TuDongTinhGiaVon',             'Tự động tính giá vốn (trung bình)',   '30', 3, 7, 4, 3],
  ['SuDung2DonViTinh',             'Sử dụng 2 đơn vị tính',              '0',  3, 7, 4, 4],
  ['SuDungMaHang',                 'Sử dụng mã hàng',                    '30', 3, 7, 4, 5],
  ['HangCoBaoHanh',                'Phụ tùng có bảo hành',               '30', 3, 7, 4, 6],
  ['ChoPhepTrungTenMatHang',       'Cho phép trùng tên mặt hàng',        '0',  3, 7, 4, 7],
  ['TuDongSinhMaVach',             'Tự động sinh mã vạch',               '30', 3, 7, 4, 8],
  ['CanhBaoHangDuoiMuocAnToan',    'Cảnh báo hàng dưới mức an toàn',     '30', 3, 7, 4, 9],
  ['SuDungGiaTheoKhach',           'Sử dụng giá theo từng khách hàng',   '0',  3, 7, 4, 10],

  /* ---- Sửa chữa (5) ---- */
  ['BatBuocNhapBienSo',          'Bắt buộc nhập biển số khi tạo phiếu',  '0',  3, 7, 5, 1],
  ['InPhieuKhiTiepNhan',         'In phiếu khi tiếp nhận xe',            '0',  3, 7, 5, 2],
  ['YeuCauDuyetLenhSuaChua',     'Yêu cầu duyệt lệnh sửa chữa',         '0',  3, 7, 5, 3],
  ['TuDongTinhCongSuaChua',      'Tự động tính tiền công theo dịch vụ',  '30', 3, 7, 5, 4],
  ['ChoPhepTiepNhanXeKhongCoKhach','Tiếp nhận xe không cần khách hàng',  '30', 3, 7, 5, 5],
  ['SuDungOCRBienSo',            'Sử dụng OCR nhận dạng biển số',        '30', 3, 7, 5, 6],
  ['OCRServiceUrl',              'URL OCR Service',                       'http://localhost:8000', 1, 5, 5, 7],

  /* ---- Khách hàng (6) ---- */
  ['ChoPhepTrungTenKhachHang',   'Cho phép trùng tên khách hàng',       '0',  3, 7, 6, 1],
  ['SuDungDiemTichLuy',          'Sử dụng điểm tích lũy',               '0',  3, 7, 6, 2],
  ['DoanhSoTuongUngVoi1Diem',    'Doanh số tương ứng 1 điểm (đ)',       '50000', 3, 9, 6, 3],
  ['HienThiDiemTrenHoaDon',      'Hiển thị điểm trên hóa đơn',          '0',  3, 7, 6, 4],
  ['ThongBaoSinhNhat',           'Thông báo khách hàng sinh nhật',       '0',  3, 7, 6, 5],

  /* ---- Bảo mật & Phân quyền (7) ---- */
  ['NhapMatKhauKhiXoaDon',       'Nhập mật khẩu khi xóa đơn hàng',     '0',  3, 7, 7, 1],
  ['NhapMatKhauKhiGiamGia',      'Nhập mật khẩu khi giảm giá > X%',    '0',  3, 7, 7, 2],
  ['NguongMatKhauGiamGia',       'Ngưỡng % giảm giá cần mật khẩu',      null, 3, 9, 7, 3],
  ['KichHoatLuuVetHoatDong',     'Kích hoạt lưu vết hoạt động',         '30', 3, 7, 7, 4],
  ['SoNgayLuuVet',               'Số ngày lưu vết lịch sử',             null, 3, 9, 7, 5],

  /* ---- Hệ thống (8) ---- */
  ['DatabaseVersion',            'Phiên bản CSDL',                      '2.0.0', 1, 5, 8, 1],
  ['TuDongSaoLuuDuLieu',         'Tự động sao lưu dữ liệu',            '30', 3, 7, 8, 2],
  ['DuongDanSaoLuu',             'Đường dẫn sao lưu',                   'D:\\Backup\\Garage', 1, 5, 8, 3],
  ['SoFileSaoLuu',               'Số file sao lưu giữ lại',             null, 3, 9, 8, 4],
  ['HeThongChayNhieuMayTram',    'Hệ thống chạy nhiều máy trạm',        '0',  3, 7, 8, 5],
  ['TuDongTaiLai',               'Tự động tải lại dữ liệu khi chuyển tab', '30', 3, 7, 8, 6],
  ['GiaoDienNenToi',             'Giao diện nền tối (Dark mode)',        '0',  3, 7, 8, 7],
];

/* ========================= MAIN ========================= */
(async () => {
  const db = await attach(opt);

  console.log('Xóa dữ liệu cũ...');
  await x(db, 'DELETE FROM SCONFIG');
  await x(db, 'DELETE FROM SCONFIGGROUP');

  // Insert groups, lưu ID
  console.log('Tạo nhóm cấu hình...');
  const groupIds = [];
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    const id = uuid();
    groupIds.push(id);
    await x(db, `INSERT INTO SCONFIGGROUP (ID, NAME, STATUS, SORTORDER, AUTOID, USERCREATEDID, TIMECREATED) VALUES (?,?,30,?,?,?,CURRENT_TIMESTAMP)`,
      [id, g.name, g.sort, i + 1, 'SYSTEM']);
    console.log(`  [${i+1}] ${g.name}`);
  }

  // Insert configs
  console.log('\nTạo cấu hình...');
  let count = 0;
  for (const [name, caption, textVal, datatype, controltype, groupIdx, sortorder] of CONFIGS) {
    const id = uuid();
    const gid = groupIds[groupIdx];
    const iv = datatype === 3 && textVal !== null ? parseInt(textVal||0)||0 : null;
    const dv = datatype === 4 && textVal !== null ? parseFloat(textVal||0)||0 : null;
    const tv = datatype === 1 ? (textVal || '') : (datatype === 3 || datatype === 4 ? null : (textVal || ''));
    await x(db, `INSERT INTO SCONFIG (ID, NAME, CAPTION, STATUS, TEXTVALUE, INTVALUE, DECIMALVALUE, DATATYPE, CONTROLTYPE, SCONFIGGROUPID, SORTORDER, USERCREATEDID, TIMECREATED) VALUES (?,?,?,30,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
      [id, name, caption, tv, iv, dv, datatype, String(controltype), gid, sortorder, 'SYSTEM']);
    count++;
  }
  console.log(`Đã tạo ${count} cấu hình.`);

  // Verify
  const total = await q(db, 'SELECT COUNT(*) N FROM SCONFIG');
  const totalG = await q(db, 'SELECT COUNT(*) N FROM SCONFIGGROUP');
  console.log(`\n✓ SCONFIGGROUP: ${totalG[0].N}  SCONFIG: ${total[0].N}`);
  db.detach();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
