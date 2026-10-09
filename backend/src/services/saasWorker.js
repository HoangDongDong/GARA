const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const platform = require('./platform');
const tenancy = require('../tenancy');
const db = require('../db');
const seed = require('./tenantSeed');
const backup = require('../../tools/database-backup');
const config = require('../config');
function manifest() {
  const value = JSON.parse(fs.readFileSync(path.join(platform.root(), 'template-current.json'), 'utf8'));
  const file = path.resolve(value.backup);
  const templateRoot = path.join(platform.root(), 'templates') + path.sep;
  if (!file.toLowerCase().startsWith(templateRoot.toLowerCase()) || ![3,4].includes(value.seedVersion) || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== value.sha256) throw Error('Template chưa được kiểm tra hoặc hash không khớp.');
  return value;
}
async function claim() {
  const lease = crypto.randomUUID();
  return platform.transaction(async q => {
    const [job] = await q("SELECT FIRST 1 ID,TENANTID FROM SAAS_JOBS WHERE ATTEMPTS<3 AND (STATE='queued' OR (STATE='running' AND LEASEUNTIL<CURRENT_TIMESTAMP)) ORDER BY CREATED WITH LOCK");
    if (!job) return null;
    await q("UPDATE SAAS_JOBS SET STATE='running',ATTEMPTS=ATTEMPTS+1,LEASEUNTIL=DATEADD(15 MINUTE TO CURRENT_TIMESTAMP),LEASEID=? WHERE ID=?", [lease,job.ID]);
    return { ...job, lease };
  });
}
async function processOne() {
  const job = await claim();
  if (!job) return false;
  try {
    const [row] = await platform.query("SELECT * FROM SAAS_TENANTS WHERE ID=? AND VERIFIED=1 AND STATE='provisioning'", [job.TENANTID]);
    if (!row) throw Error('Tenant không ở trạng thái khởi tạo.');
    const tenant = platform.map(row), baseline = manifest();
    fs.mkdirSync(path.dirname(tenant.database), { recursive: true });
    if (!fs.existsSync(tenant.database)) await backup.restore(baseline.backup, tenant.database);
    await tenancy.run(tenant, async () => {
      const [ready] = await db.query("SELECT COUNT(*) AS N FROM SNUMBERCOUNTER");
      if (Number(ready.N) !== require('./documentNumbers').definitions.length) throw Error('Database chưa khôi phục đầy đủ; cần kiểm tra riêng, không tự ghi đè.');
      await seed.owner(db, row);
      await db.ping();
    });
    const days = Math.max(1, Math.min(90, Number(process.env.SAAS_TRIAL_DAYS) || 14));
    await platform.transaction(async q => {
      const [lock] = await q("SELECT ID FROM SAAS_JOBS WHERE ID=? AND STATE='running' AND LEASEID=? WITH LOCK", [job.ID,job.lease]);
      if (!lock) throw Error('Lease khởi tạo không còn hiệu lực.');
      await q("UPDATE SAAS_TENANTS SET STATE='active',STARTSAT=CURRENT_TIMESTAMP,ENDSAT=DATEADD(? DAY TO CURRENT_TIMESTAMP),PASSWORDHASH=NULL,SCHEMAVERSION=? WHERE ID=? AND STATE='provisioning'", [days,baseline.version,job.TENANTID]);
      await q("UPDATE SAAS_JOBS SET STATE='done',FINISHED=CURRENT_TIMESTAMP,ERROR=NULL,LEASEUNTIL=NULL WHERE ID=?", [job.ID]);
      await platform.audit(q, 'worker', job.TENANTID, 'provisioning.done', 'Đã khởi tạo database riêng và kích hoạt dùng thử.');
    });
  } catch (error) {
    await platform.transaction(async q => {
      const [row] = await q("SELECT ATTEMPTS FROM SAAS_JOBS WHERE ID=? AND STATE='running' AND LEASEID=? WITH LOCK", [job.ID,job.lease]);
      if (!row) return;
      const state = Number(row.ATTEMPTS) >= 3 ? 'failed' : 'queued';
      await q('UPDATE SAAS_JOBS SET STATE=?,ERROR=?,LEASEUNTIL=NULL WHERE ID=?', [state,'Khởi tạo chưa hoàn thành. Kiểm tra log vận hành.',job.ID]);
      if (state === 'failed') await q("UPDATE SAAS_TENANTS SET STATE='failed' WHERE ID=? AND STATE='provisioning'", [job.TENANTID]);
      await platform.audit(q, 'worker', job.TENANTID, 'provisioning.error', 'Khởi tạo lỗi; chưa kích hoạt thời gian dùng thử.');
    });
    console.error('Provisioning job failed:', job.ID, error.message);
  }
  return true;
}
async function backupAll() {
  const rows = await platform.query("SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS WHERE STATE IN ('active','suspended')");
  const targets = [...rows.map(platform.map), { id:'platform', database:platform.database() }];
  let failed = 0;
  for (const tenant of targets) {
    const id = crypto.randomUUID();
    await platform.query("INSERT INTO SAAS_BACKUPS (ID,TENANTID,STATE) VALUES (?,?,'running')", [id,tenant.id]);
    try {
      const file = await backup.backup({ ...config.firebird, database:tenant.database }, path.join(platform.root(),'backups',tenant.id));
      await platform.query("UPDATE SAAS_BACKUPS SET STATE='done',FILEPATH=? WHERE ID=?", [file,id]);
    } catch (error) { failed++; await platform.query("UPDATE SAAS_BACKUPS SET STATE='failed' WHERE ID=?", [id]); console.error('Backup failed:', tenant.id); }
  }
  if (failed) throw Error(`${failed} database sao lưu thất bại.`);
}
module.exports = { processOne, claim, manifest, backupAll };
