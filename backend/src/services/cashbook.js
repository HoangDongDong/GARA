const db=require('../db');
const round=value=>Math.round(Number(value || 0)*100)/100;
function build(cash,documents,details,receipts) {
  const rows=[];
  const push=(row,source,method,amount,expense=false)=>{
    amount=round(amount);
    if (!amount) return;
    rows.push({id:`${source}-${row.ID}-${method}`,code:row.NAME || '',date:row.NGAY || row.TIMECREATED,
      description:row.NOTE || (source==='receipt'?'Thanh toán nhập kho':source==='sale'?'Thanh toán bán hàng':source==='repair'?'Thanh toán sửa chữa':'Thu/chi'),
      partner:row.PARTNER_NAME || '',method,accountId:row.DTAIKHOANNGANHANGID || '',account:row.ACCOUNT_NAME || '',
      income:expense?0:amount,expense:expense?amount:0});
  };
  for(const row of cash)push(row,'cash',row.DTAIKHOANNGANHANGID?'transfer':'cash',row.SOTIEN,Number(row.LOAI)===1);
  const detailed=new Set(details.map(row=>`${row.SOURCE}-${row.DOCUMENT_ID}-${Number(row.LOAI)}`));
  for(const row of details)push(row,`detail-${row.SOURCE}`,['cash','transfer','card'][Number(row.LOAI)],row.SOTIEN);
  for(const row of documents)for(const [method,field,index] of [['cash','TIENMAT',0],['transfer','CHUYENKHOAN',1],['card','THE',2]]) {
    if(!detailed.has(`${row.SOURCE}-${row.ID}-${index}`))push(row,row.SOURCE,method,row[field]);
  }
  for(const row of receipts) {
    const remaining=Number(row.DATHANHTOAN)===1?Math.min(0,Number(row.CONGNO || 0)):Number(row.CONGNO ?? row.TONGCONG);
    push(row,'receipt','cash',Number(row.TONGCONG)-remaining,true);
  }
  return rows.sort((a,b)=>new Date(b.date || 0)-new Date(a.date || 0) || b.code.localeCompare(a.code));
}
async function load(query=db.query) {
  const [cash,documents,details,receipts]=await Promise.all([
    query(`SELECT C.ID,C.NAME,C.NGAY,C.TIMECREATED,C.NOTE,C.SOTIEN,C.LOAI,C.DTAIKHOANNGANHANGID,
      B.NAME AS ACCOUNT_NAME,COALESCE(C.TENDOITUONG,N.NAME,K.NAME) AS PARTNER_NAME FROM TTHUCHI C
      LEFT JOIN DTAIKHOANNGANHANG B ON B.ID=C.DTAIKHOANNGANHANGID
      LEFT JOIN DNHACUNGCAP N ON N.ID=C.DNHACUNGCAPID LEFT JOIN DKHACHHANG K ON K.ID=C.DKHACHHANGID WHERE C.STATUS=1`),
    query(`SELECT S.ID,S.NAME,S.NGAY,S.TIMECREATED,S.NOTE,S.TIENMAT,S.CHUYENKHOAN,S.THE,S.DTAIKHOANNGANHANGID,
      B.NAME AS ACCOUNT_NAME,K.NAME AS PARTNER_NAME,'sale' AS SOURCE FROM TDONHANG S
      LEFT JOIN DTAIKHOANNGANHANG B ON B.ID=S.DTAIKHOANNGANHANGID LEFT JOIN DKHACHHANG K ON K.ID=S.DKHACHHANGID WHERE S.STATUS=1
      UNION ALL
      SELECT R.ID,R.NAME,R.NGAY,R.TIMECREATED,R.NOTE,R.TIENMAT,R.CHUYENKHOAN,R.THE,R.DTAIKHOANNGANHANGID,
      B.NAME,K.NAME,'repair' FROM THOADONSUACHUA R
      LEFT JOIN DTAIKHOANNGANHANG B ON B.ID=R.DTAIKHOANNGANHANGID LEFT JOIN DKHACHHANG K ON K.ID=R.DKHACHHANGID WHERE R.STATUS=1`),
    query(`SELECT C.ID,COALESCE(S.NAME,R.NAME) AS NAME,COALESCE(C.NGAY,S.NGAY,R.NGAY) AS NGAY,C.TIMECREATED,
      COALESCE(C.NOTE,S.NOTE,R.NOTE) AS NOTE,C.SOTIEN,C.LOAI,C.DTAIKHOANNGANHANGID,B.NAME AS ACCOUNT_NAME,
      K.NAME AS PARTNER_NAME,COALESCE(S.ID,R.ID) AS DOCUMENT_ID,CASE WHEN S.ID IS NOT NULL THEN 'sale' ELSE 'repair' END AS SOURCE
      FROM TCHITIETTHANHTOAN C LEFT JOIN TDONHANG S ON S.ID=C.TDONHANGID AND S.STATUS=1
      LEFT JOIN THOADONSUACHUA R ON R.ID=C.THOADONSUACHUAID AND R.STATUS=1
      LEFT JOIN DKHACHHANG K ON K.ID=COALESCE(S.DKHACHHANGID,R.DKHACHHANGID)
      LEFT JOIN DTAIKHOANNGANHANG B ON B.ID=C.DTAIKHOANNGANHANGID
      WHERE C.STATUS=1 AND C.LOAI IN (0,1,2) AND (S.ID IS NOT NULL OR R.ID IS NOT NULL)`),
    query(`SELECT R.ID,R.NAME,R.NGAY,R.TIMECREATED,R.NOTE,R.TONGCONG,R.CONGNO,R.DATHANHTOAN,N.NAME AS PARTNER_NAME
      FROM TNHAPKHO R LEFT JOIN DNHACUNGCAP N ON N.ID=R.DNHACUNGCAPID WHERE R.STATUS=1`),
  ]);
  return build(cash,documents,details,receipts);
}
module.exports={build,load};
