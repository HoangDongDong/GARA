const db = require('./src/db');
const columns = {
  TDONHANG: ['TILEPHIDICHVU', 'PHIDICHVU'],
  TLENHSUACHUA: ['TILETHUE', 'TIENTHUE', 'TILEPHIDICHVU', 'PHIDICHVU'],
  THOADONSUACHUA: ['TILETHUE', 'TILEPHIDICHVU', 'PHIDICHVU'],
};
async function migrate() {
  let added = 0;
  for (const [table, fields] of Object.entries(columns)) for (const field of fields) {
    const existing = await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', [table, field]);
    if (!existing.length) { await db.execute(`ALTER TABLE ${table} ADD ${field} NUMERIC(18,2)`); added++; }
  }
  console.log(`Applied charge schema ready (${added} new columns).`);
}
if (require.main === module) migrate().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = migrate;
