const db = require('../../backend/src/db.js');
const roles = require('../../backend/src/services/employeeRoles.js');
async function main() {
  const tenancy = require('../../backend/src/tenancy.js');
  if (!tenancy.enabled()) return roles.initialize(db);
  const platform = require('../../backend/src/services/platform.js');
  const fs = require('fs');
  const rows = await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS');
  for (const row of rows.filter(row => row.DBPATH && fs.existsSync(row.DBPATH))) {
    const tenant = platform.map(row);
    await tenancy.run(tenant, () => roles.initialize(db));
    console.log(`Đã khởi tạo danh mục vai trò: ${tenant.code}`);
  }
}
if (require.main === module) main().catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = main;
