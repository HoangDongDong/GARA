const db = require('./src/db');
async function migrate() {
  if (!(await db.query('SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', ['DPHONGBAN'])).length) {
    await db.execute(`CREATE TABLE DPHONGBAN (
      ID VARCHAR(36) NOT NULL PRIMARY KEY,NAME VARCHAR(255) CHARACTER SET UTF8 NOT NULL,
      CODE VARCHAR(255),NOTE VARCHAR(255) CHARACTER SET UTF8,STATUS INTEGER DEFAULT 1 NOT NULL,
      USERCREATEDID VARCHAR(36) NOT NULL,TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      USERMODIFIEDID VARCHAR(36),TIMEMODIFIED TIMESTAMP
    )`);
  }
  if (!(await db.query('SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME=? AND RDB$FIELD_NAME=?', ['DNHANVIEN', 'DPHONGBANID'])).length) {
    await db.execute('ALTER TABLE DNHANVIEN ADD DPHONGBANID VARCHAR(36) REFERENCES DPHONGBAN(ID)');
  }
  console.log('Employee department schema ready.');
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = migrate;
