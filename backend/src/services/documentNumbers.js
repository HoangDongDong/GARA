const db = require('../db');
const definitions = [
  ['TiepNhan','Tiếp nhận xe','TTIEPNHANXE','TN',true],
  ['LenhSuaChua','Lệnh sửa chữa','TLENHSUACHUA','LSC',true],
  ['BaoGia','Báo giá sửa chữa','TBAOGIA','BG',false],
  ['HoaDonSuaChua','Hóa đơn sửa chữa','THOADONSUACHUA','HDSC',true],
  ['BanPhuTung','Hóa đơn bán phụ tùng','TDONHANG','BH',true],
  ['NhapKho','Phiếu nhập kho','TNHAPKHO','PN',true],
  ['BaoHanh','Phiếu bảo hành','TBAOHANH','PBH',true],
  ['Thu','Phiếu thu','TTHUCHI','PT',false],
  ['Chi','Phiếu chi','TTHUCHI','PC',false],
  ['BangLuong','Bảng lương','TBANGLUONG','BL',false],
].map(([key,label,table,prefix,active]) => ({key,label,table,active,name:`SoPhieu${key}`,pattern:`${prefix}(yy)/(*****)`}));
const fail = message => Object.assign(new Error(message), {status:400,statusCode:400});
function parsePattern(value) {
  const pattern = String(value ?? '').trim();
  const runs = [...pattern.matchAll(/\((?:'(\*{1,9})'|(\*{1,9}))\)/g)];
  if (runs.length !== 1 || pattern.length > 80) throw fail('Mẫu số phiếu cần đúng một nhóm (*) đến (*********), tối đa 80 ký tự.');
  const rest = pattern.replace(runs[0][0], '').replace(/\((yyyy|yy|MM|dd)\)/g, '');
  if (/[()*'\r\n<>]/.test(rest)) throw fail('Chỉ hỗ trợ (yyyy), (yy), (MM), (dd) và nhóm dấu * cho số tự tăng.');
  return {pattern,token:runs[0][0],digits:(runs[0][1]||runs[0][2]).length};
}
function formatNumber(pattern, sequence, date = new Date()) {
  const parsed = parsePattern(pattern);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10 ** parsed.digits - 1) throw fail('Đã hết số phiếu theo độ dài cấu hình. Hãy tăng số dấu *.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(date)).map(p=>[p.type,p.value]));
  if (!parts.year) throw fail('Ngày sinh số phiếu không hợp lệ.');
  return parsed.pattern.replace(/\((yyyy|yy|MM|dd)\)/g,(_,key)=>({yyyy:parts.year,yy:parts.year.slice(-2),MM:parts.month,dd:parts.day}[key])).replace(parsed.token,String(sequence).padStart(parsed.digits,'0'));
}
function periodFor(pattern,date=new Date()) {
  const full = formatNumber('(yyyy)(MM)(dd)(*)',1,date).slice(0,8);
  return pattern.includes('(dd)')?full:pattern.includes('(MM)')?full.slice(0,6):/\(yyyy\)|\(yy\)/.test(pattern)?full.slice(0,4):'ALL';
}
async function nextInTransaction(key,query,execute,date=new Date(),reserve=true) {
  const type = definitions.find(t=>t.key===key);
  if (!type) throw fail('Loại số phiếu không hợp lệ.');
  const [config] = await query('SELECT TEXTVALUE FROM SCONFIG WHERE NAME=? AND STATUS=30',[type.name]);
  const pattern = parsePattern(config?.TEXTVALUE || type.pattern).pattern;
  const period = periodFor(pattern,date);
  // Updating the existing row locks this document sequence across API processes.
  if (reserve) {
    if (type.table==='TTHUCHI') await execute("UPDATE SNUMBERCOUNTER SET SEQ=SEQ WHERE CODE IN ('Thu','Chi')");
    else await execute('UPDATE SNUMBERCOUNTER SET SEQ=SEQ WHERE CODE=?',[key]);
  }
  const [counter] = await query('SELECT PERIODKEY,SEQ FROM SNUMBERCOUNTER WHERE CODE=?',[key]);
  if (!counter) throw new Error('Chưa khởi tạo bộ đếm số phiếu. Chạy migrate:document-numbers.');
  let sequence = counter.PERIODKEY===period ? Number(counter.SEQ) : 0;
  let code;
  do {
    code = formatNumber(pattern,++sequence,date);
  } while ((await query(`SELECT FIRST 1 ID FROM ${type.table} WHERE NAME=?`,[code])).length);
  if (reserve) await execute('UPDATE SNUMBERCOUNTER SET PERIODKEY=?,SEQ=? WHERE CODE=?',[period,sequence,key]);
  return code;
}
async function nextNumber(key,date) {
  return db.transaction((query,execute)=>nextInTransaction(key,query,execute,date));
}
const previewNumber = (key,date) => nextInTransaction(key,db.query,null,date,false);
module.exports={definitions,parsePattern,formatNumber,periodFor,nextInTransaction,nextNumber,previewNumber};
