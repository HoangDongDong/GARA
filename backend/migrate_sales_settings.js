const db = require('./src/db');
async function migrate() {
  await db.transaction(async (query, execute) => {
    await execute("UPDATE SCONFIG SET STATUS=-1 WHERE NAME IN ('SoNgayChoPhepDoiTra','HienThiCuaSoNhapSoLuongKhiQuetMaVach')");
    await execute('UPDATE SCONFIG SET MOREDETAIL=? WHERE NAME=?', ['Nhập 0 để không làm tròn; 500 hoặc 1000 để làm tròn tổng thanh toán đến bội số gần nhất.', 'LamTronTien']);
    await execute('UPDATE SCONFIG SET MOREDETAIL=? WHERE NAME=?', ['Áp dụng khi khách hàng và nhóm khách không có giảm giá riêng. Tỷ lệ 0–100%, tối đa 2 chữ số thập phân.', 'MacDinhGiamGia']);
  });
}
if(require.main===module)migrate().then(()=>console.log('Đã cập nhật cấu hình bán hàng.')).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports = {migrate};
