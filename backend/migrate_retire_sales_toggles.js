const db = require('./src/db');
async function migrate() {
  await db.execute(`UPDATE SCONFIG SET STATUS=-1
    WHERE NAME IN ('CoPhiVanChuyen','CoThueSuat','CoGiaoHang')`);
}
if (require.main === module) migrate().then(() => {
  console.log('Đã bỏ 3 cấu hình bán hàng chưa áp dụng.');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
