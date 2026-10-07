// Read-only verification using saved documents and the configured defaults.
const fs=require('fs');
const path=require('path');
const print=require('./src/services/documentPrint');
const {keys}=require('./src/services/documentReceipt80');
const {idFor}=require('./migrate_document_receipt80');
async function verify(){
 const root=path.join(__dirname,'print-verification','receipt80');fs.mkdirSync(root,{recursive:true});
 for(const key of keys){
  const type=print.typeByKey(key),info=await print.info(type);
  if(info.defaultId!==idFor(key))throw Error(`Mẫu mặc định chưa cập nhật: ${key}`);
  const records=await print.records(type);if(!records.length)throw Error(`Chưa có chứng từ để kiểm tra: ${key}`);
  const result=await print.render(type,records[0].ID,{},'admin');
  if(!result.pdf.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error(`PDF không hợp lệ: ${key}`);
  fs.writeFileSync(path.join(root,key+'.pdf'),result.pdf);console.log(key,'OK',result.pdf.length);
 }
}
if(require.main===module)verify().catch(e=>{console.error(e);process.exitCode=1;});
module.exports=verify;
