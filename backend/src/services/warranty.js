const db=require('../db');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function validate(body){
  for(const key of ['NGAYBATDAU','NGAYKETTHUC']){
    const value=body[key];
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw fail('Ngày bảo hành không hợp lệ.');
  }
  if(body.NGAYBATDAU>body.NGAYKETTHUC)throw fail('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  if(String(body.NOTE||'').length>2000 || String(body.KETQUAXULY||'').length>2000)throw fail('Nội dung quá dài.');
  if(body.TRANGTHAI!=null && ![0,1,2,3].includes(Number(body.TRANGTHAI)))throw fail('Trạng thái bảo hành không hợp lệ.');
  if(body.CHIPHI!=null && (!Number.isFinite(Number(body.CHIPHI))||Number(body.CHIPHI)<0))throw fail('Chi phí bảo hành không hợp lệ.');
}
async function save(body,actor,id=null){
  validate(body);
  return db.transaction(async(query,execute,uuid)=>{
    if(id){
      const [row]=await query('SELECT ID,NGAYKETTHUC FROM TBAOHANH WHERE ID=? AND STATUS=1 WITH LOCK',[id]);
      if(!row)throw fail('Không tìm thấy phiếu bảo hành.',404);
      await execute('UPDATE TBAOHANH SET NGAYBATDAU=?,NGAYKETTHUC=?,NOTE=?,TRANGTHAI=?,KETQUAXULY=?,CHIPHI=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?',
        [body.NGAYBATDAU,body.NGAYKETTHUC,body.NOTE||null,Number(body.TRANGTHAI??1),body.KETQUAXULY||null,Number(body.CHIPHI||0),actor,id]);
      return {id};
    }
    let vehicle;
    if(body.DXEID)[vehicle]=await query('SELECT ID,BIENSO,DKHACHHANGID FROM DXE WHERE ID=? AND STATUS=1',[body.DXEID]);
    else if(body.BIENSO)[vehicle]=await query("SELECT FIRST 1 ID,BIENSO,DKHACHHANGID FROM DXE WHERE STATUS=1 AND UPPER(REPLACE(REPLACE(REPLACE(BIENSO,'-',''),'.',''),' ',''))=?",[String(body.BIENSO).toUpperCase().replace(/[-. ]/g,'')]);
    if(!vehicle)throw fail('Vui lòng chọn xe còn hoạt động trong hồ sơ.');
    for(const [key,table] of [['DMATHANGID','DMATHANG'],['DDICHVUID','DDICHVU'],['TLENHSUACHUAID','TLENHSUACHUA']])if(body[key] && !(await query(`SELECT ID FROM ${table} WHERE ID=? AND STATUS=1`,[body[key]])).length)throw fail('Hạng mục hoặc lệnh sửa chữa không hợp lệ.');
    const name=await require('./documentNumbers').nextInTransaction('BaoHanh',query,execute),newId=uuid();
    await execute(`INSERT INTO TBAOHANH (ID,NAME,NOTE,STATUS,USERCREATEDID,TIMECREATED,DXEID,DKHACHHANGID,DMATHANGID,DDICHVUID,TLENHSUACHUAID,NGAYBATDAU,NGAYKETTHUC,LOAI,TRANGTHAI,CHIPHI)
      VALUES (?,?,?,1,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,0,1,0)`,[newId,name,body.NOTE||null,actor,vehicle.ID,vehicle.DKHACHHANGID||null,body.DMATHANGID||null,body.DDICHVUID||null,body.TLENHSUACHUAID||null,body.NGAYBATDAU,body.NGAYKETTHUC]);
    return {id:newId,name,bienSo:vehicle.BIENSO};
  });
}
module.exports={validate,save};
