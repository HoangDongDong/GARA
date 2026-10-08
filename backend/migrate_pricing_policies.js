const db = require('./src/db');
async function migrate() {
  const columns = {};
  for (const table of ['DMATHANG', 'DNHOMMATHANG', 'DDICHVU', 'DLOAIDICHVU']) columns[table] = { THUESUATRIENG: 'NUMERIC(5,2)' };
  for (const table of ['DKHACHHANG', 'DNHOMKHACHHANG']) columns[table] = { GIAMGIARIENG: 'NUMERIC(5,2)' };
  for (const table of ['TDONHANG', 'TLENHSUACHUA', 'THOADONSUACHUA']) columns[table] = {
    CHARGEVERSION: 'INTEGER', NGUONGIAMGIA: 'VARCHAR(255)', TAXSUMMARY: 'VARCHAR(4000)',
    TILEGIAMGIA: 'NUMERIC(5,2)', TIENGIAMGIA: 'NUMERIC(18,2)',
  };
  for (const table of ['TDONHANGCHITIET', 'TLENHSUACHUACHITIET']) columns[table] = {
    TILETHUE: 'NUMERIC(5,2)', TIENTHUE: 'NUMERIC(18,2)', TILEGIAMGIA: 'NUMERIC(5,2)',
    TIENGIAMGIA: 'NUMERIC(18,2)', NGUONTHUE: 'VARCHAR(255)',
  };
  let added = 0;
  columns.TLENHSUACHUA.TIENGIAMGIAPHIEU = 'NUMERIC(18,2)';
  columns.TLENHSUACHUACHITIET.TILECHIETKHAU = 'NUMERIC(5,2)';
  columns.TLENHSUACHUACHITIET.TIENCHIETKHAU = 'NUMERIC(18,2)';
  for (const [table, fields] of Object.entries(columns)) for (const [field, type] of Object.entries(fields)) {
    const exists = await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', [table, field]);
    if (!exists.length) { await db.execute(`ALTER TABLE ${table} ADD ${field} ${type}`); added++; }
  }
  console.log(`Pricing policies ready (${added} new columns; existing documents unchanged).`);
}
if (require.main === module) migrate().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = migrate;
