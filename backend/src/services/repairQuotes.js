const policy = require('./pricingPolicy.js');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status, statusCode: status }); };

// Called inside the repair's transaction, after locking its header. The quote
// is immutable; customer approval changes only KHACHDUYET, never its amounts.
async function ensure(query, execute, uuid, repairId, actor) {
  const [order] = await query('SELECT * FROM TLENHSUACHUA WHERE ID=? AND STATUS=1', [repairId]);
  if (!order) fail('Không tìm thấy phiếu sửa chữa.', 404);
  if (order.TBAOGIAID) return order.TBAOGIAID;
  const rows = await query('SELECT * FROM TLENHSUACHUACHITIET WHERE TLENHSUACHUAID=? AND COALESCE(STATUS,1)=1 ORDER BY ID', [repairId]);
  const quoteId = uuid();
  const code = await require('./documentNumbers.js').nextInTransaction('BaoGia', query, execute);
  await execute(`INSERT INTO TBAOGIA
    (ID,NAME,NOTE,STATUS,USERCREATEDID,TIMECREATED,NGAY,DXEID,DKHACHHANGID,TTIEPNHANXEID,
     TIENHANG,TIENCONG,TIENPHUTUNG,TILETHUE,TIENTHUE,TILEGIAMGIA,TIENGIAMGIA,TONGCONG,PHIENBAN)
    VALUES (?,?,?,1,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [quoteId,code,order.NOTE,actor,order.NGAY,order.DXEID,order.DKHACHHANGID,order.TTIEPNHANXEID,
     Number(order.TONGTIENCONG || 0)+Number(order.TONGTIENPHUTUNG || 0),order.TONGTIENCONG,order.TONGTIENPHUTUNG,
     order.TILETHUE,order.TIENTHUE,order.TILEGIAMGIA,order.TIENGIAMGIA,order.TONGCONG]);
  for (const row of rows) await execute(`INSERT INTO TBAOGIACHITIET
    (ID,TBAOGIAID,DMATHANGID,DDICHVUID,DDONVITINHID,SOLUONG,DONGIA,THANHTIEN,LOAI,NOTE,TILEGIAMGIA,KHACHDUYET,STATUS,USERCREATEDID,TIMECREATED)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,1,?,CURRENT_TIMESTAMP)`,
    [row.ID,quoteId,row.DMATHANGID,row.DDICHVUID,row.DDONVITINHID,row.SOLUONG,row.DONGIA,row.THANHTIEN,row.LOAI,row.NOTE,row.TILECHIETKHAU || 0,actor]);
  await execute('UPDATE TLENHSUACHUA SET TBAOGIAID=? WHERE ID=?', [quoteId,repairId]);
  return quoteId;
}

function calculateAccepted(order, rows, acceptedIds) {
  if (!Array.isArray(acceptedIds) || !acceptedIds.length || new Set(acceptedIds).size !== acceptedIds.length
      || acceptedIds.some(id => !rows.some(row => row.ID === id))) fail('Chọn ít nhất một dịch vụ hoặc phụ tùng khách đồng ý; danh sách hạng mục phải thuộc phiếu hiện tại.');
  const accepted = rows.filter(row => acceptedIds.includes(row.ID));
  const rates = {taxRate:Number(order.TILETHUE || 0),serviceRate:Number(order.TILEPHIDICHVU || 0)};
  const lines = accepted.map(row => ({id:row.ID,amount:Number(row.THANHTIEN),discountRate:Number(row.TILECHIETKHAU || 0),taxRate:Number(row.TILETHUE ?? rates.taxRate)}));
  const reduction = policy.billDiscount(lines, Number(order.TILEGIAMGIA || 0), order.TIENGIAMGIAPHIEU);
  return {accepted,rates,reduction,totals:policy.calculate(lines,rates,reduction.percent,reduction.fixed)};
}

async function confirm(query, execute, uuid, repairId, acceptedIds, actor) {
  const [order] = await query('SELECT * FROM TLENHSUACHUA WHERE ID=? AND STATUS=1', [repairId]);
  if (!order || Number(order.TRANGTHAI) !== 0) fail('Chỉ xác nhận hạng mục trước khi bắt đầu sửa chữa.',409);
  const rows = await query('SELECT * FROM TLENHSUACHUACHITIET WHERE TLENHSUACHUAID=? AND COALESCE(STATUS,1)=1 ORDER BY ID', [repairId]);
  const result = calculateAccepted(order,rows,acceptedIds ?? rows.map(row => row.ID));
  const quoteId = await ensure(query,execute,uuid,repairId,actor);
  for (const row of rows) {
    const approved = result.accepted.some(line => line.ID === row.ID);
    await execute('UPDATE TBAOGIACHITIET SET KHACHDUYET=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=? AND TBAOGIAID=?', [approved?1:0,actor,row.ID,quoteId]);
    if (!approved) await execute('UPDATE TLENHSUACHUACHITIET SET STATUS=-1,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=? AND TLENHSUACHUAID=?', [actor,row.ID,repairId]);
  }
  for (const line of result.totals.details) await execute('UPDATE TLENHSUACHUACHITIET SET TILEGIAMGIA=?,TIENGIAMGIA=?,TIENTHUE=?,TIENCHIETKHAU=? WHERE ID=?', [result.reduction.percent,line.discount,line.tax,line.lineDiscount,line.id]);
  const sum = type => result.accepted.filter(row => Number(row.LOAI)===type).reduce((total,row)=>total+Number(row.THANHTIEN),0);
  await execute(`UPDATE TLENHSUACHUA SET TONGTIENCONG=?,TONGTIENPHUTUNG=?,TONGCONG=?,TIENTHUE=?,PHIDICHVU=?,
    TILEGIAMGIA=?,TIENGIAMGIA=?,TAXSUMMARY=?,CHARGEVERSION=1,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
    [sum(1),sum(0),result.totals.total,result.totals.tax,result.totals.serviceFee,result.reduction.percent,result.totals.discount,JSON.stringify(result.totals.taxGroups),actor,repairId]);
  return {quoteId,acceptedItemIds:result.accepted.map(row=>row.ID)};
}
module.exports = {ensure,confirm,calculateAccepted};
