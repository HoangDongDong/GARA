// One definition for every screen and write path. Writers lock the same part
// rows, in a stable order, before reading or changing stock.
const movements = `
 SELECT C.DMATHANGID, COALESCE(C.DKHOHANGID,N.DKHOHANGID) AS DKHOHANGID, COALESCE(C.SOLUONG,0) AS QUANTITY
 FROM TNHAPKHOCHITIET C JOIN TNHAPKHO N ON N.ID=C.TNHAPKHOID WHERE C.STATUS=1 AND N.STATUS=1
 UNION ALL
 SELECT X.DMATHANGID,X.DKHOHANGID,-(COALESCE(X.SOLUONG,0)-COALESCE(X.SLHOAN,0))
 FROM TXUATPHUTUNG X WHERE X.STATUS=1
 UNION ALL
 SELECT C.DMATHANGID,C.DKHOHANGID,COALESCE(C.SLNHAP,0)-COALESCE(C.SLXUAT,0)
 FROM TDONHANGCHITIET C JOIN TDONHANG H ON H.ID=C.TDONHANGID WHERE C.STATUS=1 AND H.STATUS=1`;
function expression(part, warehouse) {
  return `COALESCE((SELECT SUM(S.QUANTITY) FROM (${movements}) S WHERE S.DMATHANGID=${part}${warehouse ? ` AND S.DKHOHANGID=${warehouse}` : ''}),0)`;
}
async function lock(execute, ids) {
  for (const id of [...new Set(ids)].sort()) await execute('UPDATE DMATHANG SET ID=ID WHERE ID=? AND STATUS=1',[id]);
}
async function requireAvailable(query, rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row.DKHOHANGID) throw Object.assign(new Error('Vui lòng xác nhận kho xuất cho phụ tùng.'),{status:400,statusCode:400});
    const key = JSON.stringify([row.DMATHANGID,row.DKHOHANGID]);
    const previous = grouped.get(key) || {...row,SOLUONG:0};
    previous.SOLUONG += Number(row.SOLUONG); grouped.set(key,previous);
  }
  for (const row of grouped.values()) {
    const [part] = await query(`SELECT M.NAME,${expression('M.ID','?')} AS TON_KHO FROM DMATHANG M WHERE M.ID=? AND M.STATUS=1`,[row.DKHOHANGID,row.DMATHANGID]);
    if (!part || row.SOLUONG > Number(part.TON_KHO || 0)) throw Object.assign(new Error(`${part?.NAME || 'Phụ tùng'} không đủ tồn tại kho xuất.`),{status:409,statusCode:409});
  }
}
module.exports={movements,expression,lock,requireAvailable};
