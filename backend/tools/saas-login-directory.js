// Import login routing only. Store passwords and business rows remain in each tenant DB.
const platform=require('../src/services/platform'),tenancy=require('../src/tenancy'),db=require('../src/db'),directory=require('../src/services/loginDirectory');
async function migrate(){
  const rows=await platform.query("SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS WHERE STATE IN ('active','suspended') ORDER BY ID");
  rows.sort((a,b)=>(a.ID==='legacy'?-1:b.ID==='legacy'?1:0));
  const imported=[];
  for(const row of rows){
    const tenant=platform.map(row);
    const users=await tenancy.run(tenant,()=>db.query('SELECT ID,USERNAME FROM SUSER WHERE STATUS=1 ORDER BY USERNAME'));
    for(const user of users){
      const [prior]=await platform.query('SELECT LOGINNAME FROM SAAS_LOGINS WHERE TENANTID=? AND USERID=?',[tenant.id,user.ID]);
      if(prior){imported.push({store:tenant.code,username:prior.LOGINNAME});continue;}
      let alias=user.ID==='SAAS_OWNER'?tenant.code:directory.normalize(user.USERNAME);
      for(let attempt=0;attempt<3;attempt++){
        try{await platform.transaction(q=>directory.reserve(q,alias,tenant.id,user.ID,user.USERNAME));break;}
        catch(error){if(error.status!==409 && !/unique/i.test(error.message))throw error;if(attempt===2)throw error;alias=(tenant.code+'.'+directory.normalize(user.USERNAME)).slice(0,110)+(attempt?'.'+user.ID.slice(0,8):'');}
      }
      imported.push({store:tenant.code,username:alias});
    }
  }
  return imported;
}
if(require.main===module)migrate().then(rows=>console.log(JSON.stringify(rows))).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports=migrate;
