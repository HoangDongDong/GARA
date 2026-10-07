const db=require('../db');
const fail=message=>Object.assign(new Error(message),{statusCode:400});
async function options(){
  const entries=await Promise.all([
    db.query('SELECT ID,NAME,LOAI FROM DLYDOTHUCHI WHERE STATUS=1 ORDER BY NAME'),
    require('./bankBalances').load(),
    ...['DKHACHHANG','DNHACUNGCAP','DNHANVIEN','DCUAHANG'].map(table=>db.query(`SELECT ID,NAME,DIACHI FROM ${table} WHERE STATUS=1 ORDER BY NAME`)),
  ]);
  return Object.fromEntries(['categories','accounts','customers','suppliers','employees','stores'].map((key,i)=>[key,entries[i]]));
}
async function create(input,actor,transaction=db.transaction){
  const amount=Number(input.amount),type=Number(input.type);
  if(![0,1].includes(type))throw fail('Loại phiếu không hợp lệ.');
  if(!Number.isFinite(amount)||amount<=0||amount>Number.MAX_SAFE_INTEGER||Math.abs(amount*100-Math.round(amount*100))>1e-6)throw fail('Số tiền phải lớn hơn 0, tối đa 2 chữ số thập phân.');
  if(typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw fail('Ngày không hợp lệ.');
  for(const key of ['reason','partnerName','address','originalDocument','note'])if(typeof input[key]!=='string'||input[key].length>255)throw fail('Các trường văn bản tối đa 255 ký tự.');
  if(!input.reason.trim()||!input.categoryId||!input.storeId)throw fail('Vui lòng chọn phân loại, cửa hàng và nhập lý do.');
  if(!['other','customer','supplier','employee'].includes(input.partnerType))throw fail('Loại đối tượng không hợp lệ.');
  if(!input.partnerName.trim())throw fail('Vui lòng nhập tên đối tượng.');
  if(input.transfer && !input.accountId)throw fail('Vui lòng chọn tài khoản ngân hàng.');
  return transaction(async(query,execute,uuid)=>{
    const [category]=await query('SELECT ID FROM DLYDOTHUCHI WHERE ID=? AND STATUS=1 AND LOAI=?',[input.categoryId,type]);
    if(!category)throw fail('Phân loại không phù hợp loại phiếu.');
    if(!(await query('SELECT ID FROM DCUAHANG WHERE ID=? AND STATUS=1',[input.storeId])).length)throw fail('Cửa hàng không còn hoạt động.');
    const tables={customer:'DKHACHHANG',supplier:'DNHACUNGCAP',employee:'DNHANVIEN'};
    if(input.partnerType!=='other'){
      if(!input.partnerId)throw fail('Vui lòng chọn đối tượng trong danh sách.');
      await execute(`UPDATE ${tables[input.partnerType]} SET STATUS=STATUS WHERE ID=? AND STATUS=1`,[input.partnerId]);
      if(!(await query(`SELECT ID FROM ${tables[input.partnerType]} WHERE ID=? AND STATUS=1`,[input.partnerId])).length)throw fail('Đối tượng không còn hoạt động.');
    }
    const accountId=input.transfer?input.accountId:null;
    if(accountId){
      await execute('UPDATE DTAIKHOANNGANHANG SET STATUS=STATUS WHERE ID=? AND STATUS=1',[accountId]);
      if(!(await query('SELECT ID FROM DTAIKHOANNGANHANG WHERE ID=? AND STATUS=1',[accountId])).length)throw fail('Tài khoản không còn hoạt động.');
    }
    const id=uuid(),code=await require('./documentNumbers').nextInTransaction(type===0?'Thu':'Chi',query,execute,new Date(input.date));
    await execute(`INSERT INTO TTHUCHI (ID,NAME,NOTE,STATUS,USERCREATEDID,TIMECREATED,NGAY,DKHACHHANGID,DNHACUNGCAPID,DNHANVIENID,DCUAHANGID,SOTIEN,LOAI,DLYDOTHUCHID,DTAIKHOANNGANHANGID,TENDOITUONG,DIACHIDOITUONG,CHUNGTUGOC,GHICHU,KHONGDOICONGNO)
      VALUES (?,?,?,1,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,code,input.reason.trim(),actor,new Date(input.date),input.partnerType==='customer'?input.partnerId:null,input.partnerType==='supplier'?input.partnerId:null,input.partnerType==='employee'?input.partnerId:null,input.storeId,amount,type,input.categoryId,accountId,input.partnerName.trim(),input.address.trim(),input.originalDocument.trim(),input.note.trim(),input.noDebtChange?1:0]);
    return {id,code,amount,type};
  });
}
module.exports={options,create};
