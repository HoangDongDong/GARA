const db = require('./src/db');
async function migrate() {
  for (const [table, columns] of Object.entries({
    DDICHVU: { HHKIEU: 'SMALLINT DEFAULT 0', HHGIATRI: 'NUMERIC(18,2) DEFAULT 0' },
    DMATHANG: { HHKIEU: 'SMALLINT DEFAULT 0', HHGIATRI: 'NUMERIC(18,2) DEFAULT 0' },
    TPHANCONGNHANVIEN: { TILECHIA: 'NUMERIC(9,2)', PHUTRACHCHINH: 'SMALLINT DEFAULT 0' },
  })) for (const [column, definition] of Object.entries(columns)) {
    const rows = await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', [table, column]);
    if (!rows.length) await db.execute(`ALTER TABLE ${table} ADD ${column} ${definition}`);
  }
  if (!(await db.query('SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', ['THOAHONGSUACHUA'])).length) {
    await db.execute(`CREATE TABLE THOAHONGSUACHUA (
      ID VARCHAR(36) NOT NULL PRIMARY KEY,
      TLENHSUACHUAID VARCHAR(36) NOT NULL REFERENCES TLENHSUACHUA(ID),
      CHITIETID VARCHAR(36) NOT NULL UNIQUE REFERENCES TLENHSUACHUACHITIET(ID),
      TEN VARCHAR(255) CHARACTER SET UTF8,
      HHKIEU SMALLINT NOT NULL, HHGIATRI NUMERIC(18,2) NOT NULL,
      SOLUONG NUMERIC(18,3) NOT NULL, COTINH NUMERIC(18,2) NOT NULL,
      HOAHONG NUMERIC(18,2) NOT NULL,
      USERCREATEDID VARCHAR(36), TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute('CREATE INDEX IX_HH_REPAIR ON THOAHONGSUACHUA(TLENHSUACHUAID)');
  }
  console.log('Repair assignment and commission schema ready.');
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = migrate;
