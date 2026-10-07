const db = require('./src/db');
async function migrate() {
  await db.execute(`UPDATE SCONFIG SET STATUS=-1
    WHERE NAME IN ('CoThanhToanChuyenKhoan','CoThanhToanThe','CoThanhToanViDienTu')`);
}
if (require.main === module) migrate().then(() => {
  console.log('Đã bỏ 3 tùy chọn phương thức thanh toán chưa áp dụng.');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
