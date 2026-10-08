const db = require('./src/db');
async function migrate() {
  const rows = await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', ['TLENHSUACHUA', 'TIENGIAMGIAPHIEU']);
  if (!rows.length) await db.execute('ALTER TABLE TLENHSUACHUA ADD TIENGIAMGIAPHIEU NUMERIC(18,2)');
  console.log('Bill discount amount ready.');
}
if (require.main === module) migrate().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = migrate;
