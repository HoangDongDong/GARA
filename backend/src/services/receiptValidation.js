const fail = message => Object.assign(new Error(message),{status:400,statusCode:400});
const round = n => Math.round(n*100)/100;
function number(value, label) {
  if (!['number','string'].includes(typeof value) || String(value).trim()==='') throw fail(`${label} không hợp lệ.`);
  const n=Number(value);
  if (!Number.isFinite(n) || n<0 || n>Number.MAX_SAFE_INTEGER || Math.abs(n*100-Math.round(n*100))>1e-6) throw fail(`${label} phải là số không âm, tối đa 2 chữ số thập phân.`);
  return n;
}
function normalize(body) {
  if (!Array.isArray(body.items) || !body.items.length || body.items.length>500) throw fail('Phiếu nhập phải có 1–500 mặt hàng.');
  const items=body.items.map(item=>{
    const quantity=number(item.SOLUONG,'Số lượng'),price=number(item.DONGIA,'Đơn giá');
    if (!item.DMATHANGID || !quantity) throw fail('Mặt hàng hoặc số lượng không hợp lệ.');
    const amount=round(quantity*price);
    if (!Number.isSafeInteger(Math.round(amount*100))) throw fail('Thành tiền quá lớn.');
    if (item.THANHTIEN!=null && number(item.THANHTIEN,'Thành tiền')!==amount) throw fail('Thành tiền không khớp số lượng × đơn giá.');
    return {...item,SOLUONG:quantity,DONGIA:price,THANHTIEN:amount};
  });
  const goods=round(items.reduce((sum,item)=>sum+item.THANHTIEN,0));
  const discount=number(body.TIENGIAMGIA??0,'Giảm giá');
  if (discount>goods) throw fail('Giảm giá vượt tiền hàng.');
  const total=round(goods-discount);
  for (const [key,value] of [['TIENHANG',goods],['TONGCONG',total]]) if (body[key]!=null && number(body[key],key)!==value) throw fail('Tổng tiền phiếu nhập không khớp chi tiết.');
  if (body.NGAY && (!/^\d{4}-\d{2}-\d{2}$/.test(body.NGAY) || !Number.isFinite(Date.parse(body.NGAY)) || new Date(body.NGAY).toISOString().slice(0,10)!==body.NGAY)) throw fail('Ngày nhập không hợp lệ.');
  return {items,goods,discount,total};
}
async function references(query,body,items) {
  for (const [table,key] of [['DNHACUNGCAP','DNHACUNGCAPID'],['DKHOHANG','DKHOHANGID'],['DNHANVIEN','DNHANVIENID']]) {
    if (!(await query(`SELECT ID FROM ${table} WHERE ID=? AND STATUS=1`,[body[key]])).length) throw fail('Nhà cung cấp, kho hoặc nhân viên không còn hoạt động.');
  }
  for (const item of items) {
    const [part]=await query('SELECT ID,DDONVITINHID FROM DMATHANG WHERE ID=? AND STATUS=1',[item.DMATHANGID]);
    if (!part) throw fail('Mặt hàng không còn hoạt động.');
    if (item.DDONVITINHID && item.DDONVITINHID!==part.DDONVITINHID) throw fail('Đơn vị nhập phải là đơn vị cơ sở của mặt hàng.');
    item.DDONVITINHID=part.DDONVITINHID || null;
  }
}
module.exports={normalize,references,number};
