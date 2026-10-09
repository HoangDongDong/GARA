const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
function dateRange(input = {}) {
  const result = {};
  for (const key of ['from', 'to']) if (input[key]) {
    const value = String(input[key]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Khoảng ngày không hợp lệ.');
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('Khoảng ngày không hợp lệ.');
    result[key] = value;
  }
  if (result.from && result.to && result.from > result.to) fail('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  return result;
}
async function load(query, input = {}, access = { commissions: true, payroll: true }) {
  const range = dateRange(input), params = [];
  const monthParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const month = String(input.month || `${monthParts.find(part => part.type === 'year').value}-${monthParts.find(part => part.type === 'month').value}`);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('Tháng lương không hợp lệ.');
  let where = 'P.STATUS=1 AND P.TILECHIA IS NOT NULL AND L.STATUS=1';
  if (range.from) { where += ' AND P.TIMECREATED>=CAST(? AS DATE)'; params.push(range.from); }
  if (range.to) { where += ' AND P.TIMECREATED<DATEADD(1 DAY TO CAST(? AS DATE))'; params.push(range.to); }
  const rows = access.commissions ? await query(`SELECT P.ID,P.DNHANVIENID,P.TLENHSUACHUAID,P.TILECHIA,P.PHUTRACHCHINH,P.HOAHONG,P.TIMECREATED AS NGAYPHANCONG,
      N.NAME AS TEN_NV,N.CODE,N.STATUS AS NV_STATUS,L.NAME AS SO_PHIEU,L.NGAY,V.ID AS DXEID,V.BIENSO,K.NAME AS TEN_KH,
      (SELECT FIRST 1 T.TRANGTHAI FROM TTRANGTHAIXE T WHERE T.TLENHSUACHUAID=L.ID AND T.STATUS=1 ORDER BY T.NGAY_TRANGTHAI DESC,T.TIMECREATED DESC) AS TRANGTHAI,
      CASE WHEN EXISTS (SELECT 1 FROM THOADONSUACHUA H WHERE H.TLENHSUACHUAID=L.ID AND H.STATUS=1 AND H.DATHANHTOAN=1) THEN 1 ELSE 0 END AS DATHANHTOAN
    FROM TPHANCONGNHANVIEN P
    JOIN DNHANVIEN N ON N.ID=P.DNHANVIENID
    JOIN TLENHSUACHUA L ON L.ID=P.TLENHSUACHUAID
    LEFT JOIN DXE V ON V.ID=L.DXEID LEFT JOIN DKHACHHANG K ON K.ID=L.DKHACHHANGID
    WHERE ${where} ORDER BY P.TIMECREATED DESC,L.NAME,N.NAME`, params) : [];
  const payroll = access.payroll ? await query(`SELECT C.ID,C.DNHANVIENID,C.LUONGCOBAN,C.HOAHONG,C.THUONG,C.PHAT,C.TONGCONG,C.NOTE,
      B.ID AS TBANGLUONGID,B.NAME AS TEN_BANG_LUONG,B.THANG,B.NAM,B.TIMECREATED
    FROM TBANGLUONGCHITIET C JOIN TBANGLUONG B ON B.ID=C.TBANGLUONGID
    WHERE B.STATUS=1 AND C.STATUS=1 AND B.NAM=? AND B.THANG=? ORDER BY B.TIMECREATED DESC,B.NAME`, [Number(month.slice(0,4)), Number(month.slice(5))]) : [];
  return { range, month, payroll, data: rows.map(row => ({ ...row, HOAHONG: Number(row.HOAHONG || 0), TILECHIA: Number(row.TILECHIA || 0),
    ELIGIBLE: Number(row.TRANGTHAI) === 4 && Number(row.DATHANHTOAN) === 1 })) };
}
module.exports = { dateRange, load };
