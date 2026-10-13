const db=require('../../backend/src/db.js');
const {initializeStoreProfiles}=require('../../backend/src/services/storeProfiles.js');
async function migrate() {
  await initializeStoreProfiles(db);
  const result=await require('../../backend/src/services/catalogData.js').load('stores');
  if(!result.available)throw new Error('Bảng cửa hàng chưa sẵn sàng.');
}
async function main() {
  const tenancy=require('../../backend/src/tenancy.js');
  if(!tenancy.enabled())return migrate();
  const platform=require('../../backend/src/services/platform.js'),fs=require('fs');
  const rows=await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS');
  for(const row of rows.filter(row=>row.DBPATH && fs.existsSync(row.DBPATH))) {
    const tenant=platform.map(row);
    await tenancy.run(tenant,migrate);
    console.log(`Đã bổ sung email và kiểm tra danh mục cửa hàng: ${tenant.code}`);
  }
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports=main;
