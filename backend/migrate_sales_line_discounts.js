const db = require('./src/db');
async function migrate() {
  for (const name of ['TILECHIETKHAU', 'TIENCHIETKHAU']) {
    const rows = await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', ['TDONHANGCHITIET', name]);
    if (!rows.length) await db.execute(`ALTER TABLE TDONHANGCHITIET ADD ${name} NUMERIC(18,2)`);
  }
}
if (require.main === module) migrate().then(() => console.log('Đã thêm dữ liệu chiết khấu từng mặt hàng.')).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };
