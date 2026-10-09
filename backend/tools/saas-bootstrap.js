// Creates a separate control database. Never copies business rows into a template.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const config = require('../src/config');
const platform = require('../src/services/platform');
const db = require('../src/db');
const tenancy = require('../src/tenancy');
const backupTool = require('./database-backup');
const seed = require('../src/services/tenantSeed');
const schema = [
  `CREATE TABLE SAAS_TENANTS (ID VARCHAR(36) NOT NULL PRIMARY KEY, SLUG VARCHAR(40) NOT NULL UNIQUE, NAME VARCHAR(120) NOT NULL, DBPATH VARCHAR(500) NOT NULL, STATE VARCHAR(20) NOT NULL, EMAIL VARCHAR(255) NOT NULL, EMAILKEY VARCHAR(64) NOT NULL UNIQUE, OWNERNAME VARCHAR(120), PASSWORDHASH VARCHAR(255), VERIFYHASH VARCHAR(64), VERIFYUNTIL TIMESTAMP, VERIFIED SMALLINT DEFAULT 0, STARTSAT TIMESTAMP, ENDSAT TIMESTAMP, CREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP, SCHEMAVERSION INTEGER DEFAULT 1)`,
  `CREATE TABLE SAAS_JOBS (ID VARCHAR(36) NOT NULL PRIMARY KEY, TENANTID VARCHAR(36) NOT NULL UNIQUE, STATE VARCHAR(20) NOT NULL, ATTEMPTS INTEGER DEFAULT 0, LEASEUNTIL TIMESTAMP, ERROR VARCHAR(500), CREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FINISHED TIMESTAMP, LEASEID VARCHAR(36))`,
  `CREATE TABLE SAAS_AUDIT (ID VARCHAR(36) NOT NULL PRIMARY KEY, ACTOR VARCHAR(120), TENANTID VARCHAR(36), ACTION VARCHAR(40), DETAIL VARCHAR(500), CREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE SAAS_BACKUPS (ID VARCHAR(36) NOT NULL PRIMARY KEY, TENANTID VARCHAR(36), FILEPATH VARCHAR(500), STATE VARCHAR(20), CREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP, VERIFIED TIMESTAMP)`,
  `CREATE TABLE SAAS_LOGINS (LOGINKEY VARCHAR(64) NOT NULL PRIMARY KEY, LOGINNAME VARCHAR(120) NOT NULL, TENANTID VARCHAR(36) NOT NULL, USERID VARCHAR(36) NOT NULL, LOCALNAME VARCHAR(120) NOT NULL, UNIQUE (TENANTID,USERID))`,
];
async function bootstrap() {
  fs.mkdirSync(platform.root(), { recursive: true });
  fs.mkdirSync(path.join(platform.root(), 'tenants'), { recursive: true });
  const file = platform.database();
  if (!fs.existsSync(file)) {
    // isql creates an explicit dialect-3 database on the legacy Firebird server.
    const executable = [process.env.FB_ISQL, 'C:/Program Files/Firebird/Firebird_2_5/bin/isql.exe', 'C:/Program Files (x86)/Firebird/Firebird_2_5/bin/isql.exe'].filter(Boolean).find(fs.existsSync);
    if (!executable) throw Error('Cần cấu hình FB_ISQL để tạo database nền tảng.');
    await new Promise((resolve, reject) => {
      const child = spawn(executable, ['-bail','-user',config.firebird.user,'-password',config.firebird.password,'-sql_dialect','3'], { windowsHide:true, stdio:['pipe','ignore','pipe'] });
      child.stderr.on('data', () => {});
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(Error('Không tạo được database nền tảng bằng isql.')));
      const location = `${config.firebird.host}/${config.firebird.port}:${file}`.replace(/'/g,"''");
      child.stdin.end(`CREATE DATABASE '${location}' PAGE_SIZE 8192 DEFAULT CHARACTER SET UTF8;\nCOMMIT;\nQUIT;\n`);
    });
  }
  for (const statement of schema) {
    const table = statement.match(/CREATE TABLE (\w+)/)[1];
    if (!(await platform.query('SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', [table])).length) await platform.query(statement);
  }
  for(const [column,type] of [['PHONE','VARCHAR(20)'],['PHONEKEY','VARCHAR(64)'],['OWNERLOGIN','VARCHAR(60)']]) {
    if(!(await platform.query("SELECT 1 FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME='SAAS_TENANTS' AND RDB$FIELD_NAME=?",[column])).length)await platform.query(`ALTER TABLE SAAS_TENANTS ADD ${column} ${type}`);
  }
  if(!(await platform.query("SELECT 1 FROM RDB$INDICES WHERE RDB$INDEX_NAME='UX_SAAS_PHONEKEY'")).length)await platform.query('CREATE UNIQUE INDEX UX_SAAS_PHONEKEY ON SAAS_TENANTS (PHONEKEY)');
  await platform.transaction(async q => {
    if (!(await q('SELECT ID FROM SAAS_TENANTS WHERE ID=?', ['legacy'])).length) {
      await q("INSERT INTO SAAS_TENANTS (ID,SLUG,NAME,DBPATH,STATE,EMAIL,EMAILKEY,VERIFIED) VALUES ('legacy',?,?,?,'active',?,?,1)", [process.env.SAAS_LEGACY_CODE || 'kazuko', 'Cửa hàng hiện tại', config.firebird.database, 'legacy@internal.invalid',crypto.createHash('sha256').update('legacy@internal.invalid').digest('hex')]);
      await platform.audit(q, 'bootstrap', 'legacy', 'legacy.register', 'Ánh xạ database hiện tại; không thay đổi dữ liệu nghiệp vụ.');
    }
  });
  console.log('Platform database ready. Legacy store mapped.');
}
async function template() {
  const target = path.join(platform.root(), 'template-seed3.fdb');
  if (fs.existsSync(target) && process.argv[3] !== '--resume-empty') throw Error('Template đã tồn tại. Không ghi đè; dùng --resume-empty chỉ khi seed trước đã rollback.');
  if (!fs.existsSync(target)) {
    const metadata = await backupTool.backup(config.firebird, path.join(platform.root(), 'templates'), true);
    await backupTool.restore(metadata, target);
  } else {
    await tenancy.run({ id:'template-check',database:target }, async () => {
      const tables = await db.query('SELECT TRIM(RDB$RELATION_NAME) AS NAME FROM RDB$RELATIONS WHERE COALESCE(RDB$SYSTEM_FLAG,0)=0 AND RDB$VIEW_BLR IS NULL');
      for (const row of tables) { if (!/^[A-Z0-9_]+$/.test(row.NAME) || (await db.query(`SELECT FIRST 1 1 AS FOUND FROM ${row.NAME}`)).length) throw Error('Chỉ tiếp tục seed database mẫu hoàn toàn trống.'); }
    });
  }
  await tenancy.run({ id: 'template-build', database: target }, () => seed.initialize(db));
  const clean = await backupTool.backup({ ...config.firebird, database: target }, path.join(platform.root(), 'templates'));
  const manifest = { version: 1, backup: clean, sha256: crypto.createHash('sha256').update(fs.readFileSync(clean)).digest('hex'), created: new Date().toISOString(), seedVersion: 3 };
  const manifestFile=path.join(platform.root(),'template-current.json');
  if(fs.existsSync(manifestFile))fs.copyFileSync(manifestFile,path.join(platform.root(),'template-manifest-'+crypto.randomUUID()+'.json'));
  fs.writeFileSync(manifestFile+'.tmp',JSON.stringify(manifest,null,2));fs.renameSync(manifestFile+'.tmp',manifestFile);
  console.log('Clean schema template and manifest created. No source business rows copied.');
}
if (require.main === module) (process.argv[2] === 'template' ? template() : process.argv[2] === 'init' ? bootstrap() : Promise.reject(Error('Dùng: node tools/saas-bootstrap.js init | template'))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { bootstrap, template, schema };
