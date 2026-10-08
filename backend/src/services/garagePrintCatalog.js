// GARA document types. SCONFIG owns the template ID list and selected default.
const documentTypes = [
  { key: 'MauPhieuTiepNhan', label: 'Tiếp nhận xe', table: 'TTIEPNHANXE', forms: [] },
  { key: 'MauPhieuSuaChua', label: 'Lệnh sửa chữa', table: 'TLENHSUACHUA', forms: [] },
  { key: 'MauPhieuTamTinh', label: 'Phiếu tạm tính', table: 'TLENHSUACHUA', forms: [] },
  { key: 'MauBaoGia', label: 'Báo giá sửa chữa', table: 'TBAOGIA', dataset: 'TBAOGIA', forms: [] },
  { key: 'MauPhieuBanGiao', label: 'Bàn giao xe', table: 'TLENHSUACHUA', forms: [] },
  { key: 'MauHoaDonSuaChua', label: 'Hóa đơn sửa chữa', table: 'THOADONSUACHUA', forms: [] },
  { key: 'MauPhieuBaoHanh', label: 'Bảo hành', table: 'TBAOHANH', forms: [] },
  { key: 'MauHoaDonBanHang', label: 'Hóa đơn bán phụ tùng', table: 'TDONHANG', forms: ['Hóa đơn bán hàng'] },
  { key: 'MauPhieuNhapKho', label: 'Nhập kho phụ tùng', table: 'TNHAPKHO', forms: ['Phiếu nhập kho'] },
  { key: 'MauPhieuXuatKho', label: 'Xuất kho phụ tùng', table: 'TXUATPHUTUNG', forms: ['Phiếu xuất kho'] },
  { key: 'MauPhieuThu', label: 'Phiếu thu', table: 'TTHUCHI', forms: ['Phiếu thu'] },
  { key: 'MauPhieuChi', label: 'Phiếu chi', table: 'TTHUCHI', forms: ['Phiếu chi'] },
  { key: 'MauMaVachPhuTung', label: 'Tem mã vạch phụ tùng', table: 'DMATHANG', dataset: 'DMATHANG', forms: [] },
  { key: 'MauBangLuong', label: 'Bảng lương nhân viên', table: 'TBANGLUONG', dataset: 'TBANGLUONG', forms: [] },
  { key: 'MauBaoCao', label: 'Tổng hợp hóa đơn GARA', table: 'TDONHANG', forms: ['Thống kê', 'Thống kê doanh thu', 'Thống kê mặt hàng bán'] },
  { key: 'MauHoSoXe', label: 'Hồ sơ xe', table: 'DXE', forms: [] },
  { key: 'MauLichSuSuaChua', label: 'Lịch sử sửa chữa xe', table: 'TLENHSUACHUA', forms: [] },
  { key: 'MauCongNoKhachHang', label: 'Công nợ khách hàng', table: 'DKHACHHANG', forms: [] },
  { key: 'MauCongNoNhaCungCap', label: 'Công nợ nhà cung cấp', table: 'DNHACUNGCAP', forms: [] },
];

const { templateFilter } = require('./systemConfigOptions');

function buildCatalog(rows, configs) {
  const assigned = new Set();
  const data = [];
  const categories = documentTypes.map(type => {
    const config = configs.find(item => item.NAME === type.key);
    const ids = templateFilter(config?.OTHERCONFIG)?.ids || [];
    const matching = rows.filter(row => ids.includes(row.ID.toLowerCase()));
    for (const row of matching) {
      assigned.add(row.ID);
      data.push({ ...row, CATEGORY_NAME: type.label, CONFIG_NAME: type.key,
        SOURCE_TABLE: type.table, IS_DEFAULT: config?.TEXTVALUE === row.ID ? 1 : 0,
        STATUS_LABEL: Number(row.STATUS) === 30 ? 'Đang sử dụng' : 'Ngừng sử dụng' });
    }
    return { name: type.label, configName: type.key, count: matching.length,
      defaultId: config?.TEXTVALUE || '', printConnected: true };
  });
  for (const row of rows.filter(item => !assigned.has(item.ID))) {
    data.push({ ...row, CATEGORY_NAME: Number(row.REPORTBASE) === 30 ? 'Mẫu dùng chung' : 'Mẫu chưa phân loại',
      CONFIG_NAME: null, SOURCE_TABLE: null, IS_DEFAULT: 0,
      STATUS_LABEL: Number(row.STATUS) === 30 ? 'Đang sử dụng' : 'Ngừng sử dụng' });
  }
  for (const name of ['Mẫu dùng chung', 'Mẫu chưa phân loại']) {
    const count = data.filter(row => row.CATEGORY_NAME === name).length;
    if (count) categories.push({ name, configName: null, count, printConnected: false });
  }
  return { data, categories };
}

module.exports = { documentTypes, buildCatalog };
