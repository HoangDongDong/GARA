const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const amount = (value) => Math.round(value * 100) / 100;
function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${label} là bắt buộc, tối đa ${max} ký tự.`);
  return value.trim();
}
function validateItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) fail('Cần từ 1 đến 100 hạng mục phát sinh.');
  return items.map(it => {
    const type = Number(it.LOAI), quantity = Number(it.SOLUONG), price = Number(it.DONGIA);
    if (![0, 1].includes(type) || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 ||
      !Number.isFinite(price) || price < 0 || price > 100000000000 ||
      Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.0001 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.0001) fail('Loại, số lượng hoặc đơn giá phát sinh không hợp lệ.');
    const source = type === 0 ? it.DMATHANGID : it.DDICHVUID;
    if (typeof source !== 'string' || !source || source.length > 36) fail('Phải chọn dịch vụ hoặc phụ tùng trong danh mục.');
    if (quantity * price > 1000000000000) fail('Thành tiền phát sinh vượt giới hạn.');
    return { type, quantity, price, source, total: amount(quantity * price) };
  });
}

// All mutations serialize on the repair order. Approval and insertion commit together.
async function lockRepair(query, execute, repairId) {
  await execute('UPDATE TLENHSUACHUA SET ID=ID WHERE ID=? AND STATUS=1', [repairId]);
  const repair = await query('SELECT ID FROM TLENHSUACHUA WHERE ID=? AND STATUS=1', [repairId]);
  if (!repair.length) fail('Không tìm thấy lệnh sửa chữa.', 404);
  const flows = await query('SELECT ID, TRANGTHAI FROM TTRANGTHAIXE WHERE TLENHSUACHUAID=? AND STATUS=1', [repairId]);
  if (!flows.length || flows.some(row => Number(row.TRANGTHAI) !== 2)) fail('Chỉ xử lý phát sinh khi xe đang sửa.', 409);
  if ((await query('SELECT ID FROM THOADONSUACHUA WHERE TLENHSUACHUAID=? AND STATUS=1', [repairId])).length) fail('Lệnh đã có hóa đơn, không thể bổ sung.', 409);
  return flows[0];
}

async function create(query, execute, uuid, repairId, body, actor) {
  const reason = text(body.LYDO, 1000, 'Lý do phát sinh');
  const items = validateItems(body.items);
  const state = body.TRANGTHAI || 'pending';
  if (!['draft', 'pending'].includes(state)) fail('Trạng thái đề xuất không hợp lệ.');
  await lockRepair(query, execute, repairId);
  const snapshots = [];
  for (const item of items) {
    const rows = await query(`SELECT ID, NAME${item.type === 0 ? ', DDONVITINHID' : ''} FROM ${item.type === 0 ? 'DMATHANG' : 'DDICHVU'} WHERE ID=? AND STATUS=1`, [item.source]);
    if (!rows.length) fail('Hạng mục không tồn tại hoặc đã ngừng sử dụng.');
    snapshots.push({ ...item, name: rows[0].NAME, unit: rows[0].DDONVITINHID || null });
  }
  const id = uuid();
  await execute(`INSERT INTO TPHATSINHSUACHUA (ID, TLENHSUACHUAID, LYDO, TRANGTHAI, USERCREATEDID, TIMECREATED)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [id, repairId, reason, state, actor]);
  for (const it of snapshots) await execute(`INSERT INTO TPHATSINHSUACHUACT
    (ID, TPHATSINHSUACHUAID, LOAI, DMATHANGID, DDICHVUID, DDONVITINHID, TEN, SOLUONG, DONGIA, THANHTIEN, TRANGTHAI)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [uuid(), id, it.type, it.type === 0 ? it.source : null, it.type === 1 ? it.source : null, it.unit, it.name, it.quantity, it.price, it.total]);
  return { id };
}

async function decide(query, execute, uuid, repairId, id, body, actor) {
  const flow = await lockRepair(query, execute, repairId);
  const rows = await query('SELECT * FROM TPHATSINHSUACHUA WHERE ID=? AND TLENHSUACHUAID=?', [id, repairId]);
  if (!rows.length) fail('Không tìm thấy đề xuất.', 404);
  const head = rows[0];
  if (!['pending', 'draft'].includes(head.TRANGTHAI)) fail('Đề xuất đã được xử lý; không thể duyệt lại.', 409);
  const action = body.action;
  if (!['submit', 'cancel', 'decide'].includes(action)) fail('Thao tác không hợp lệ.');
  const items = await query('SELECT * FROM TPHATSINHSUACHUACT WHERE TPHATSINHSUACHUAID=?', [id]);
  if (action === 'submit') {
    if (head.TRANGTHAI !== 'draft') fail('Chỉ gửi báo giá từ bản nháp.', 409);
    await execute("UPDATE TPHATSINHSUACHUA SET TRANGTHAI='pending', USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?", [actor, id]);
    return { state: 'pending' };
  }
  if (action === 'cancel') {
    await execute("UPDATE TPHATSINHSUACHUA SET TRANGTHAI='cancelled', USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?", [actor, id]);
    await execute("UPDATE TPHATSINHSUACHUACT SET TRANGTHAI='cancelled' WHERE TPHATSINHSUACHUAID=?", [id]);
    return { state: 'cancelled' };
  }
  if (head.TRANGTHAI !== 'pending') fail('Phải gửi báo giá trước khi ghi nhận xác nhận.', 409);
  const customer = text(body.NGUOIXACNHAN, 200, 'Tên khách xác nhận');
  const evidence = text(body.BANGCHUNG, 2000, 'Bằng chứng / nội dung xác nhận');
  const approved = body.approvedItemIds;
  if (!Array.isArray(approved) || new Set(approved).size !== approved.length || approved.some(key => !items.some(it => it.ID === key))) fail('Danh sách hạng mục được duyệt không hợp lệ.');
  const state = approved.length === 0 ? 'rejected' : approved.length === items.length ? 'approved' : 'partially_approved';
  const policy = require('./pricingPolicy');
  const chargeRates = require('./defaultChargeRates');
  const currentRates = await chargeRates.loadForRepairs(query);
  const [policyOrder] = await query('SELECT CHARGEVERSION, TILEGIAMGIA, TIENGIAMGIAPHIEU, TILETHUE, TILEPHIDICHVU FROM TLENHSUACHUA WHERE ID=?', [repairId]);
  for (const it of items) {
    const accepted = approved.includes(it.ID);
    await execute('UPDATE TPHATSINHSUACHUACT SET TRANGTHAI=? WHERE ID=?', [accepted ? 'approved' : 'rejected', it.ID]);
    if (accepted) {
      const detailId = uuid();
      await execute(`INSERT INTO TLENHSUACHUACHITIET
      (ID, TLENHSUACHUAID, DMATHANGID, DDICHVUID, DDONVITINHID, SOLUONG, DONGIA, THANHTIEN, LOAI,
       TRANGTHAI, NOTE, STATUS, USERCREATEDID, TIMECREATED, PHATSINHCTID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, CURRENT_TIMESTAMP, ?)`,
      [detailId, repairId, it.DMATHANGID, it.DDICHVUID, it.DDONVITINHID, it.SOLUONG, it.DONGIA, it.THANHTIEN, it.LOAI, head.LYDO.slice(0,255), actor, it.ID]);
      if (Number(policyOrder?.CHARGEVERSION) === 1) {
        const tax = policy.taxPolicy(await policy.item(query, it.LOAI, Number(it.LOAI) === 0 ? it.DMATHANGID : it.DDICHVUID), {taxRate:Number(policyOrder.TILETHUE || 0),taxEnabled:currentRates.taxEnabled});
        await execute('UPDATE TLENHSUACHUACHITIET SET TILETHUE=?, NGUONTHUE=? WHERE ID=?', [tax.taxRate, tax.taxSource, detailId]);
      }
    }
  }
  await execute(`UPDATE TPHATSINHSUACHUA SET TRANGTHAI=?, NGUOIXACNHAN=?, BANGCHUNG=?, NGAYXACNHAN=CURRENT_TIMESTAMP,
    USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [state, customer, evidence, actor, id]);
  const totals = await query(`SELECT COALESCE(SUM(CASE WHEN LOAI=0 THEN THANHTIEN ELSE 0 END),0) AS PT,
    COALESCE(SUM(CASE WHEN LOAI=1 THEN THANHTIEN ELSE 0 END),0) AS CONG
    FROM TLENHSUACHUACHITIET WHERE TLENHSUACHUAID=? AND COALESCE(STATUS,1)=1`, [repairId]);
  const [orderRates] = await query('SELECT TILETHUE, TILEPHIDICHVU FROM TLENHSUACHUA WHERE ID=?', [repairId]);
  const rates = chargeRates.resolve(orderRates || {}, await chargeRates.load(query));
  const amounts = chargeRates.calculate(Number(totals[0].PT) + Number(totals[0].CONG), rates);
  if (Number(policyOrder?.CHARGEVERSION) === 1) {
    const details = await query('SELECT ID, THANHTIEN, TILETHUE, TILECHIETKHAU FROM TLENHSUACHUACHITIET WHERE TLENHSUACHUAID=? AND COALESCE(STATUS,1)=1 ORDER BY ID', [repairId]);
    const lines = details.map(row => ({id:row.ID,amount:Number(row.THANHTIEN),discountRate:Number(row.TILECHIETKHAU || 0),taxRate:Number(row.TILETHUE ?? rates.taxRate)}));
    const billReduction = policy.billDiscount(lines, Number(policyOrder.TILEGIAMGIA || 0), policyOrder.TIENGIAMGIAPHIEU);
    const calculated = policy.calculate(lines, rates, billReduction.percent, billReduction.fixed);
    Object.assign(amounts, calculated);
    for (const line of calculated.details) await execute('UPDATE TLENHSUACHUACHITIET SET TILEGIAMGIA=?, TIENGIAMGIA=?, TIENTHUE=?, TIENCHIETKHAU=? WHERE ID=?', [billReduction.percent, line.discount, line.tax, line.lineDiscount, line.id]);
    await execute('UPDATE TLENHSUACHUA SET TIENGIAMGIA=?, TAXSUMMARY=? WHERE ID=?', [calculated.discount, JSON.stringify(calculated.taxGroups), repairId]);
    if (billReduction.fixed != null) await execute('UPDATE TLENHSUACHUA SET TILEGIAMGIA=? WHERE ID=?', [billReduction.percent, repairId]);
  }
  await execute(`UPDATE TLENHSUACHUA SET TONGTIENPHUTUNG=?, TONGTIENCONG=?, TONGCONG=?,
    TILETHUE=?, TIENTHUE=?, TILEPHIDICHVU=?, PHIDICHVU=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`,
    [totals[0].PT, totals[0].CONG, amounts.total, rates.taxRate, amounts.tax, rates.serviceRate, amounts.serviceFee, actor, repairId]);
  await execute(`INSERT INTO TLICHSUTRANGTHAI (ID, TTRANGTHAIXEID, DXEID, TRANGTHAI_CU, TRANGTHAI_MOI, NGAY,
    LYDO, GHICHU, STT, STATUS, USERCREATEDID, TIMECREATED)
    SELECT ?, ID, DXEID, 2, 2, CURRENT_TIMESTAMP, ?, ?, 0, 1, ?, CURRENT_TIMESTAMP FROM TTRANGTHAIXE WHERE ID=?`,
    [uuid(), 'Khách xác nhận phát sinh sửa chữa', `${id}: ${state}; ${customer}; ${evidence}`.slice(0, 1000), actor, flow.ID]);
  await require('./repairCommissions').captureAdditional(query, execute, uuid, repairId, actor);
  return { state };
}
async function assertResolved(query, repairId) {
  const open = await query("SELECT FIRST 1 ID FROM TPHATSINHSUACHUA WHERE TLENHSUACHUAID=? AND TRANGTHAI IN ('draft','pending')", [repairId]);
  if (open.length) fail('Còn đề xuất phát sinh chưa xử lý. Hãy ghi nhận khách đồng ý, từ chối hoặc hủy trước khi giao xe.', 409);
}
async function listQueue(query) {
  return query(`SELECT H.ID, H.TLENHSUACHUAID, H.LYDO, H.TRANGTHAI, H.TIMECREATED,
    LS.NAME AS SO_LENH, LS.DXEID, LS.DKHACHHANGID, V.BIENSO, KH.NAME AS TEN_KH, KH.DIENTHOAI,
    U.NAME AS NGUOILAP,
    (SELECT COUNT(*) FROM TPHATSINHSUACHUACT CT WHERE CT.TPHATSINHSUACHUAID=H.ID) AS SO_HANGMUC,
    (SELECT COALESCE(SUM(CT.THANHTIEN),0) FROM TPHATSINHSUACHUACT CT WHERE CT.TPHATSINHSUACHUAID=H.ID) AS TONGPHATSINH,
    (SELECT FIRST 1 TT.TRANGTHAI FROM TTRANGTHAIXE TT WHERE TT.TLENHSUACHUAID=LS.ID AND TT.STATUS=1 ORDER BY TT.NGAY_TRANGTHAI DESC) AS WORKFLOW_STATE,
    (SELECT FIRST 1 CV.NAME FROM TTRANGTHAIXE TT LEFT JOIN DNHANVIEN CV ON CV.ID=TT.DNHANVIENCOOVANID WHERE TT.TLENHSUACHUAID=LS.ID AND TT.STATUS=1 ORDER BY TT.NGAY_TRANGTHAI DESC) AS TEN_CV
    FROM TPHATSINHSUACHUA H
    JOIN TLENHSUACHUA LS ON LS.ID=H.TLENHSUACHUAID AND LS.STATUS=1
    LEFT JOIN DXE V ON V.ID=LS.DXEID
    LEFT JOIN DKHACHHANG KH ON KH.ID=LS.DKHACHHANGID
    LEFT JOIN SUSER U ON U.ID=H.USERCREATEDID
    ORDER BY CASE WHEN H.TRANGTHAI='pending' THEN 0 WHEN H.TRANGTHAI='draft' THEN 1 ELSE 2 END, H.TIMECREATED DESC, H.ID`);
}
module.exports = { create, decide, validateItems, lockRepair, assertResolved, listQueue };
