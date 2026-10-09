const fs=require('fs'),path=require('path'),crypto=require('crypto');
const config=require('../src/config'),platform=require('../src/services/platform'),tenancy=require('../src/tenancy'),db=require('../src/db'),backup=require('./database-backup');
const requested=['DDICHVU','DHANGSANXUAT','DKHOHANG','DLOAIDICHVU','DMATHANG','DNHACUNGCAP','DNHANVIEN','DNHOMMATHANG','DNHOMNHACUNGCAP','DTAIKHOANNGANHANG','DVITRIKHO','DXE'];
const privateTables=['DKHACHHANG','DCUAHANG','SUSER','SIMAGE','SQUICKNOTE','APP_REQUESTS'];
const personalSettings=['CompanyName','CompanyAddress','CompanyPhone','CompanyEmail','CompanyTaxCode','CompanyFacebook','CompanyWebsite','CompanyZalo','CompanyLogo','MaQRThanhToan','NganHang','SoTaiKhoanNganHang','TenTaiKhoanNganHang','PaymentBankAccountId','DuongDanSaoLuu','OCRServiceUrl'];
const vietnameseReasons={'thu tu khach hang':'Thu từ khách hàng','thu no ncc':'Thu nợ nhà cung cấp','thu khac':'Thu khác','chi nhap hang':'Chi nhập hàng','chi luong nhan vien':'Chi lương nhân viên','chi dien nuoc':'Chi điện nước','chi phi khac':'Chi phí khác'};
function deletionOrder(tables,edges){
  const pending=new Set(tables),order=[];
  while(pending.size){const ready=[...pending].filter(parent=>!edges.some(edge=>edge.PARENT===parent && edge.CHILD!==parent && pending.has(edge.CHILD)));
    if(!ready.length)throw Error('Khóa ngoại tạo chu trình; cần kiểm tra trước khi xóa dữ liệu.');
    for(const name of ready){pending.delete(name);order.push(name);}
  }return order;
}
const tableSql='SELECT TRIM(RDB$RELATION_NAME) AS NAME FROM RDB$RELATIONS WHERE COALESCE(RDB$SYSTEM_FLAG,0)=0 AND RDB$VIEW_BLR IS NULL ORDER BY RDB$RELATION_NAME';
async function inventory(){const rows=await db.query(tableSql),counts={};for(const row of rows){if(!/^[A-Z0-9_]+$/.test(row.NAME))throw Error('Tên bảng chưa được kiểm tra.');counts[row.NAME]=Number((await db.query(`SELECT COUNT(*) AS N FROM ${row.NAME}`))[0].N);}return counts;}
async function structure(){
  const queries=[
    'SELECT TRIM(RDB$RELATION_NAME) AS TBL,TRIM(RDB$FIELD_NAME) AS FIELD,TRIM(RDB$FIELD_SOURCE) AS SRC,RDB$FIELD_POSITION AS POS,RDB$NULL_FLAG AS REQUIRED FROM RDB$RELATION_FIELDS ORDER BY RDB$RELATION_NAME,RDB$FIELD_POSITION',
    'SELECT TRIM(RDB$INDEX_NAME) AS NAME,TRIM(RDB$RELATION_NAME) AS TBL,COALESCE(RDB$UNIQUE_FLAG,0) AS U,COALESCE(RDB$INDEX_INACTIVE,0) AS INACTIVE FROM RDB$INDICES ORDER BY RDB$INDEX_NAME',
    'SELECT TRIM(RDB$CONSTRAINT_NAME) AS NAME,TRIM(RDB$RELATION_NAME) AS TBL,TRIM(RDB$CONSTRAINT_TYPE) AS TYPE FROM RDB$RELATION_CONSTRAINTS ORDER BY RDB$CONSTRAINT_NAME',
    'SELECT TRIM(RDB$TRIGGER_NAME) AS NAME,RDB$TRIGGER_TYPE AS TYPE,COALESCE(RDB$TRIGGER_INACTIVE,0) AS INACTIVE FROM RDB$TRIGGERS ORDER BY RDB$TRIGGER_NAME',
  ];return crypto.createHash('sha256').update(JSON.stringify(await Promise.all(queries.map(sql=>db.query(sql))))).digest('hex');
}
async function build(source=config.firebird.database){
  source=path.resolve(source);if(!fs.existsSync(source))throw Error('Không tìm thấy database nguồn.');
  const root=platform.root(),id=crypto.randomUUID(),target=path.join(root,'template-source-'+id+'.fdb');
  if(target.toLowerCase()===source.toLowerCase() || fs.existsSync(target))throw Error('Đích phải là database mẫu mới.');
  const original=await tenancy.run({id:'template-source-read',database:source},async()=>({counts:await inventory(),structure:await structure()}));
  // gbak takes a consistent online snapshot; never copy an open .fdb file.
  const raw=await backup.backup({...config.firebird,database:source},path.join(root,'source-backups'));
  await backup.restore(raw,target);
  const result=await tenancy.run({id:'template-source-build',database:target},async()=>{
    const before=await inventory(),names=Object.keys(before);
    for(const name of requested)if(!names.includes(name))throw Error('Thiếu bảng cần làm sạch: '+name);
    const clear=names.filter(name=>requested.includes(name)||privateTables.includes(name)||name.startsWith('PRINT_')||(name.startsWith('T')&&name!=='TWORKFLOWMAP'));
    const edges=await db.query("SELECT TRIM(c.RDB$RELATION_NAME) AS CHILD,TRIM(p.RDB$RELATION_NAME) AS PARENT FROM RDB$RELATION_CONSTRAINTS c JOIN RDB$REF_CONSTRAINTS r ON r.RDB$CONSTRAINT_NAME=c.RDB$CONSTRAINT_NAME JOIN RDB$RELATION_CONSTRAINTS p ON p.RDB$CONSTRAINT_NAME=r.RDB$CONST_NAME_UQ WHERE c.RDB$CONSTRAINT_TYPE='FOREIGN KEY'");
    const blocked=edges.filter(edge=>clear.includes(edge.PARENT)&&!clear.includes(edge.CHILD));if(blocked.length)throw Error('Bảng giữ lại còn tham chiếu dữ liệu cần xóa: '+JSON.stringify(blocked));
    const corrected=[];
    await db.transaction(async(q,x)=>{
      for(const name of deletionOrder(clear,edges))await x(`DELETE FROM ${name}`);
      // Preserve numbering definitions while restarting document sequences for a new store.
      await x("UPDATE SNUMBERCOUNTER SET SEQ=0,PERIODKEY='ALL'");
      for(const name of personalSettings)await x('UPDATE SCONFIG SET TEXTVALUE=NULL,OTHERCONFIG=NULL,BLOBVALUE=NULL,INTVALUE=NULL,DECIMALVALUE=NULL,DATETIMEVALUE=NULL WHERE NAME=?',[name]);
      for(const row of await q('SELECT ID,NAME FROM DLYDOTHUCHI')){
        const name=vietnameseReasons[String(row.NAME||'').trim().toLowerCase()];
        if(name){await x('UPDATE DLYDOTHUCHI SET NAME=? WHERE ID=?',[name,row.ID]);corrected.push({id:row.ID,from:row.NAME,to:name});}
      }
    });
    const after=await inventory();
    for(const name of clear)if(after[name]!==0)throw Error('Bảng chưa được làm trống: '+name);
    for(const name of names.filter(name=>!clear.includes(name)))if(before[name]!==after[name])throw Error('Số dòng bảng giữ lại thay đổi: '+name);
    if(await structure()!==original.structure)throw Error('Cấu trúc database mẫu không khớp nguồn.');
    for(const name of personalSettings){const rows=await db.query('SELECT TEXTVALUE,OTHERCONFIG,INTVALUE,DECIMALVALUE,DATETIMEVALUE,CASE WHEN BLOBVALUE IS NULL THEN 0 ELSE 1 END AS HASBLOB FROM SCONFIG WHERE NAME=?',[name]);if(rows.some(row=>row.TEXTVALUE||row.OTHERCONFIG||row.INTVALUE!=null||row.DECIMALVALUE!=null||row.DATETIMEVALUE!=null||row.HASBLOB))throw Error('Cấu hình riêng chưa được xóa: '+name);}
    return {before,after,cleared:clear,retained:names.filter(name=>!clear.includes(name)),corrected,structure:original.structure};
  });
  const clean=await backup.backup({...config.firebird,database:target},path.join(root,'templates'));
  // Restore the sanitized backup again and check it, before publishing it for registrations.
  const verified=path.join(root,'template-verify-'+id+'.fdb');await backup.restore(clean,verified);
  await tenancy.run({id:'template-source-verify',database:verified},async()=>{if(JSON.stringify(await inventory())!==JSON.stringify(result.after)||await structure()!==result.structure)throw Error('Bản sao lưu mẫu không khớp sau restore.');});
  const manifest={version:1,backup:clean,sha256:crypto.createHash('sha256').update(fs.readFileSync(clean)).digest('hex'),created:new Date().toISOString(),seedVersion:4,source,template:target,policy:'source-data-only-clean',clearedTables:result.cleared};
  const report=path.join(root,'template-source-audit-'+id+'.json');fs.writeFileSync(report,JSON.stringify({source,target,backup:clean,verified,...result},null,2));
  const file=path.join(root,'template-current.json');if(fs.existsSync(file))fs.copyFileSync(file,path.join(root,'template-manifest-'+id+'.json'));fs.writeFileSync(file+'.tmp',JSON.stringify(manifest,null,2));fs.renameSync(file+'.tmp',file);
  console.log(JSON.stringify({template:target,report,clearedTables:result.cleared.length,retainedTables:result.retained.length,correctedReasons:result.corrected.length}));return manifest;
}
if(require.main===module)build(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={build,deletionOrder,requested,personalSettings,vietnameseReasons};
