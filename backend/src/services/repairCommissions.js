const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode, status: statusCode }); };
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

// 0: no commission, 1: percent of discounted pre-tax amount, 2: fixed per unit.
function validateConfig(body) {
  if (!('HHKIEU' in body) && !('HHGIATRI' in body)) return;
  if (!('HHKIEU' in body) || !('HHGIATRI' in body)) fail('Cần nhập cách tính và mức hoa hồng.');
  const kind = Number(body.HHKIEU ?? 0), value = Number(body.HHGIATRI ?? 0);
  if (![0, 1, 2].includes(kind) || !Number.isFinite(value) || value < 0 || value > 1000000000 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6 || (kind === 1 && value > 100)) fail('Mức hoa hồng không hợp lệ; tỷ lệ từ 0 đến 100%, số tiền tối đa 2 chữ số thập phân.');
  body.HHKIEU = kind;
  body.HHGIATRI = kind === 0 ? 0 : value;
}
function calculateLine(row) {
  const kind = Number(row.HHKIEU || 0), value = Number(row.HHGIATRI || 0);
  validateConfig({ HHKIEU: kind, HHGIATRI: value });
  const base = round(Math.max(0, Number(row.THANHTIEN || 0) - Number(row.TIENGIAMGIA || 0)));
  const amount = round(kind === 1 ? base * value / 100 : kind === 2 ? Number(row.SOLUONG) * value : 0);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000000) fail('Tổng hoa hồng hạng mục vượt giới hạn.');
  return { ID: row.ID, TEN: row.TEN, HHKIEU: kind, HHGIATRI: value, SOLUONG: Number(row.SOLUONG), COTINH: base, HOAHONG: amount };
}
function validateAssignments(input) {
  if (!Array.isArray(input) || !input.length || input.length > 100) fail('Vui lòng chọn ít nhất một nhân viên thực hiện.');
  const seen = new Set();
  const rows = input.map(row => {
    const id = row.employeeId, share = Number(row.share);
    if (typeof id !== 'string' || !id || id.length > 36 || seen.has(id)) fail('Nhân viên phân công không hợp lệ hoặc bị trùng.');
    seen.add(id);
    if (!Number.isFinite(share) || share <= 0 || share > 100 || Math.abs(share * 100 - Math.round(share * 100)) > 1e-6) fail('Tỷ lệ chia phải lớn hơn 0, tối đa 2 chữ số thập phân.');
    return { employeeId: id, share, primary: row.primary === true };
  });
  if (rows.reduce((sum, row) => sum + Math.round(row.share * 100), 0) !== 10000) fail('Tổng tỷ lệ chia phải bằng 100%.');
  if (rows.filter(row => row.primary).length !== 1) fail('Chọn đúng một nhân viên phụ trách chính.');
  return rows;
}
function distribute(total, assignments) {
  const cents = Math.round(total * 100);
  const parts = assignments.map(row => {
    const exact = cents * Math.round(row.share * 100) / 10000;
    return { ...row, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = cents - parts.reduce((sum, row) => sum + row.cents, 0);
  for (const row of [...parts].sort((a, b) => b.remainder - a.remainder)) if (remaining > 0) { row.cents++; remaining--; }
  return parts.map(({ cents: amount, remainder, ...row }) => ({ ...row, amount: amount / 100 }));
}
async function preview(query, repairId) {
  const [repair] = await query('SELECT ID FROM TLENHSUACHUA WHERE ID=? AND STATUS=1', [repairId]);
  if (!repair) fail('Không tìm thấy lệnh sửa chữa.', 404);
  const rows = await query(`SELECT C.ID,C.SOLUONG,C.THANHTIEN,C.TIENGIAMGIA,
      COALESCE(S.TEN,M.NAME,D.NAME,C.NOTE) AS TEN,
      COALESCE(S.HHKIEU,CASE WHEN C.LOAI=0 THEN M.HHKIEU ELSE D.HHKIEU END,0) AS HHKIEU,
      COALESCE(S.HHGIATRI,CASE WHEN C.LOAI=0 THEN M.HHGIATRI ELSE D.HHGIATRI END,0) AS HHGIATRI,
      S.HOAHONG AS SAVED_AMOUNT,S.COTINH AS SAVED_BASE
    FROM TLENHSUACHUACHITIET C
    LEFT JOIN DMATHANG M ON M.ID=C.DMATHANGID
    LEFT JOIN DDICHVU D ON D.ID=C.DDICHVUID
    LEFT JOIN THOAHONGSUACHUA S ON S.CHITIETID=C.ID
    WHERE C.TLENHSUACHUAID=? AND COALESCE(C.STATUS,1)=1 ORDER BY C.TIMECREATED,C.ID`, [repairId]);
  const details = rows.map(row => row.SAVED_AMOUNT != null
    ? { ID: row.ID, TEN: row.TEN, HHKIEU: Number(row.HHKIEU), HHGIATRI: Number(row.HHGIATRI), SOLUONG: Number(row.SOLUONG), COTINH: Number(row.SAVED_BASE), HOAHONG: Number(row.SAVED_AMOUNT) }
    : calculateLine(row));
  const assignments = await query(`SELECT P.DNHANVIENID AS EMPLOYEEID,N.NAME,P.TILECHIA,P.PHUTRACHCHINH,P.HOAHONG
    FROM TPHANCONGNHANVIEN P LEFT JOIN DNHANVIEN N ON N.ID=P.DNHANVIENID
    WHERE P.TLENHSUACHUAID=? AND P.STATUS=1 AND P.TILECHIA IS NOT NULL ORDER BY P.PHUTRACHCHINH DESC,N.NAME`, [repairId]);
  return { details, total: round(details.reduce((sum, row) => sum + row.HOAHONG, 0)), assignments,
    captured: rows.some(row => row.SAVED_AMOUNT != null),
    employees: await query('SELECT ID,NAME,CHUYENMON FROM DNHANVIEN WHERE STATUS=1 ORDER BY NAME') };
}
async function capture(query, execute, uuid, repairId, input, actor) {
  const assignments = validateAssignments(input);
  const employees = await query(`SELECT ID FROM DNHANVIEN WHERE STATUS=1 AND ID IN (${assignments.map(() => '?').join(',')})`, assignments.map(row => row.employeeId));
  if (employees.length !== assignments.length) fail('Nhân viên không tồn tại hoặc đã ngừng làm việc.');
  const data = await preview(query, repairId);
  if (data.captured || data.assignments.length) fail('Phân công và hoa hồng đã được chốt.', 409);
  if (!data.details.length) fail('Phiếu chưa có hạng mục báo giá.');
  for (const row of data.details) await execute(`INSERT INTO THOAHONGSUACHUA
    (ID,TLENHSUACHUAID,CHITIETID,TEN,HHKIEU,HHGIATRI,SOLUONG,COTINH,HOAHONG,USERCREATEDID)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [uuid(), repairId, row.ID, row.TEN, row.HHKIEU, row.HHGIATRI, row.SOLUONG, row.COTINH, row.HOAHONG, actor]);
  for (const row of distribute(data.total, assignments)) await execute(`INSERT INTO TPHANCONGNHANVIEN
    (ID,TLENHSUACHUAID,DNHANVIENID,VAITRO,BATDAU,TRANGTHAI,TIENCONG,HOAHONG,TILECHIA,PHUTRACHCHINH,STATUS,USERCREATEDID,TIMECREATED)
    VALUES (?,?,?, ?,CURRENT_TIMESTAMP,0,0,?,?,?,1,?,CURRENT_TIMESTAMP)`,
    [uuid(), repairId, row.employeeId, row.primary ? 'Phu trach chinh' : 'Thuc hien', row.amount, row.share, row.primary ? 1 : 0, actor]);
  return assignments.find(row => row.primary).employeeId;
}
// Approved additional items use their current catalog rate; existing snapshots stay fixed.
async function captureAdditional(query, execute, uuid, repairId, actor) {
  const assigned = await query('SELECT FIRST 1 ID FROM TPHANCONGNHANVIEN WHERE TLENHSUACHUAID=? AND STATUS=1 AND TILECHIA IS NOT NULL', [repairId]);
  if (!assigned.length) return;
  const data = await preview(query, repairId);
  if (!data.captured || !data.assignments.length) return; // Legacy repairs have no commission plan.
  const captured = await query('SELECT CHITIETID FROM THOAHONGSUACHUA WHERE TLENHSUACHUAID=?', [repairId]);
  const ids = new Set(captured.map(row => row.CHITIETID));
  const added = data.details.filter(row => !ids.has(row.ID));
  if (!added.length) return;
  for (const row of added) await execute(`INSERT INTO THOAHONGSUACHUA
    (ID,TLENHSUACHUAID,CHITIETID,TEN,HHKIEU,HHGIATRI,SOLUONG,COTINH,HOAHONG,USERCREATEDID)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [uuid(), repairId, row.ID, row.TEN, row.HHKIEU, row.HHGIATRI, row.SOLUONG, row.COTINH, row.HOAHONG, actor]);
  const shares = validateAssignments(data.assignments.map(row => ({ employeeId: row.EMPLOYEEID, share: Number(row.TILECHIA), primary: Number(row.PHUTRACHCHINH) === 1 })));
  for (const row of distribute(data.total, shares)) await execute('UPDATE TPHANCONGNHANVIEN SET HOAHONG=?,USERMODIFIEDID=?,TIMEMODIFIED=CURRENT_TIMESTAMP WHERE TLENHSUACHUAID=? AND DNHANVIENID=? AND STATUS=1 AND TILECHIA IS NOT NULL', [row.amount, actor, repairId, row.employeeId]);
}
module.exports = { validateConfig, calculateLine, validateAssignments, distribute, preview, capture, captureAdditional };
