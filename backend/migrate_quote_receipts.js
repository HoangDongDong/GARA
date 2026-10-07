const db=require('./src/db'),fs=require('fs'),path=require('path');
const {idFor}=require('./migrate_document_receipt80');
const {templateFilter}=require('./src/services/systemConfigOptions');
const targets=[{id:'57284fc5-cfc9-4035-9d72-f892dcf08177',width:54},{id:'3f8b7a34-b36d-429f-8088-835a0c1f97d7',width:80}];
const legacy2='15e9dd1b-bef3-49df-beb5-0fc34524d249';
function repairLegacyLayout(xml){
 return xml.replace(/<TextObject\b[^>]*>/g,tag=>{
  if(tag.includes('Name="Text30"'))return tag.replace('Font="Arial, 14pt"','Font="Arial, 10pt"');
  for(const [name,top] of [['Text8','236.25'],['Text12','255.15'],['Text14','274.05']])if(tag.includes(`Name="${name}"`))return tag.replace(/Top="[^"]*"/,`Top="${top}"`);
  return tag;
 }).replace(/<TableCell\b[^>]*>/g,tag=>/Text="\[(?:TIENHANG|TIENTHUE|PHIVANCHUYEN|TONGCONG)\]"/.test(tag)&&!tag.includes('Format=')?tag.replace(/\/>$/,' Format="Custom" Format.Format="n0"/>'):tag);
}
async function migrate(){
 const [config]=await db.query("SELECT OTHERCONFIG FROM SCONFIG WHERE NAME='MauBaoGia' AND STATUS=30");
 const allowed=templateFilter(config?.OTHERCONFIG)?.ids||[];
 const source=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[idFor('MauBaoGia')],'TEMPLATE');
 if(!source)throw Error('Thiếu mẫu bill báo giá 80mm nguồn.');
 const backup=[];
 for(const target of targets){if(!allowed.includes(target.id))throw Error('Mẫu chưa gắn vào báo giá.');const content=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[target.id],'TEMPLATE');backup.push({id:target.id,content:content?.toString('utf8')||null});}
 const legacyContent=allowed.includes(legacy2)?await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[legacy2],'TEMPLATE'):null;
 if(legacyContent)backup.push({id:legacy2,content:legacyContent.toString('utf8')});
 fs.writeFileSync(path.join(__dirname,`quote-receipts-backup-${Date.now()}.json`),JSON.stringify(backup,null,2));
 await db.transaction(async(query,execute)=>{for(const target of targets){
  const content=await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?',[target.id],'TEMPLATE');
  if(content?.length)continue;
  const xml=target.width===80?source.toString('utf8'):require('./src/services/quoteReceipt54').template();
  await execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[Buffer.from(xml),target.id]);
  console.log('Đã bổ sung mẫu báo giá',target.width+'mm');
 }
 if(legacyContent){const before=legacyContent.toString('utf8'),after=repairLegacyLayout(before);if(after!==before)await execute('UPDATE STEMPLATE SET TEMPLATE=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',[Buffer.from(after),legacy2]);}
 });
}
if(require.main===module)migrate().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={migrate,repairLegacyLayout};
