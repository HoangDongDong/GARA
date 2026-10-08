const db = require('./src/db');

async function migrate() {
  let added = 0;
  for (const [name, type] of [['TILECHIETKHAU', 'NUMERIC(5,2)'], ['TIENCHIETKHAU', 'NUMERIC(18,2)']]) {
    const rows = await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', ['TLENHSUACHUACHITIET', name]);
    if (!rows.length) {
      await db.execute(`ALTER TABLE TLENHSUACHUACHITIET ADD ${name} ${type}`);
      added++;
    }
  }
  console.log(`Repair line discounts ready (${added} new columns).`);
}

if (require.main === module) migrate().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = migrate;
