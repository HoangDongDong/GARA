const db = require('../../backend/src/db.js');
const {initializeFuelCatalog} = require('../../backend/src/services/fuelOptions.js');
async function main() {
  const tenancy = require('../../backend/src/tenancy.js');
  if (!tenancy.enabled()) return initializeFuelCatalog(db);
  const platform = require('../../backend/src/services/platform.js');
  const fs = require('fs');
  const rows = await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS');
  for (const row of rows.filter(row => row.DBPATH && fs.existsSync(row.DBPATH))) {
    const tenant = platform.map(row);
    await tenancy.run(tenant, () => initializeFuelCatalog(db));
    console.log(`Đã khởi tạo danh mục nhiên liệu: ${tenant.code}`);
  }
}
if (require.main === module) main().catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = main;
