const db = require('../db');
const { loadFuelOptions } = require('./fuelOptions');

const fields = (text) => text.split(' ');
const master = (table, extra = '') => ({ table, fields: fields(`NAME NOTE ${extra}`.trim()), required: ['NAME'], uniqueName: true });
// Explicit resources: request input never supplies table/column names.
const resources = {
  customers: { table: 'DKHACHHANG', fields: fields('NAME MAKHACH DIENTHOAI EMAIL DIACHI MASOTHUE DNHOMKHACHHANGID'), required: ['NAME'], code: 'MAKHACH', links: { DNHOMKHACHHANGID: 'DNHOMKHACHHANG' } },
  suppliers: { table: 'DNHACUNGCAP', fields: fields('NAME MANHACUNGCAP DIENTHOAI EMAIL DIACHI WEBSITE NOTE DNHOMNHACUNGCAPID'), required: ['NAME', 'MANHACUNGCAP'], code: 'MANHACUNGCAP', links: { DNHOMNHACUNGCAPID: 'DNHOMNHACUNGCAP' } },
  parts: { table: 'DMATHANG', fields: fields('NAME CODE BARCODE MAOEM GIANHAP GIABAN GIABAN2 GIABAN3 BAOHANH TONTOITHIEU TONTOIDA MASANCO DNHOMMATHANGID DHANGSANXUATID DDONVITINHID DVITRIKHOID'), required: ['NAME', 'CODE'], code: 'CODE' },
  services: { ...master('DDICHVU', 'CODE GIA THOIGIAN DLOAIDICHVUID'), code: 'CODE', links: { DLOAIDICHVUID: 'DLOAIDICHVU' } },
  models: { ...master('DDONGXE', 'CODE DHANGXEID'), code: 'CODE', scope: 'DHANGXEID', links: { DHANGXEID: 'DHANGXE' } },
  vehicles: { table: 'DXE', fields: fields('BIENSO NAME PHIENBAN NAMSANXUAT MAUXE SOKHUNG SOMAY ODO NHIENLIEU MUCNHIENLIEU GHICHU DHANGXEID DDONGXEID DKHACHHANGID'), readonly: true },
  warehouses: master('DKHOHANG', 'CHOPHEPAMKHO'),
  locations: { ...master('DVITRIKHO', 'DKHOHANGID'), scope: 'DKHOHANGID', links: { DKHOHANGID: 'DKHOHANG' } },
  manufacturers: master('DHANGSANXUAT'),
  units: { ...master('DDONVITINH', 'CODE'), code: 'CODE' },
  departments: master('DPHONGBAN', 'CODE'),
  positions: master('DCHUCVU', 'CODE'),
  shifts: master('DCALAMVIEC', 'GIOBATDAU GIOKETTHUC'),
  fuels: master('DNHIENLIEU', 'CODE'),
  cashReasons: master('DLYDOTHUCHI', 'LOAI'),
  banks: { ...master('DTAIKHOANNGANHANG', 'SOTAIKHOAN TENNGANHANG CHINHANH'), required: ['NAME', 'SOTAIKHOAN', 'TENNGANHANG'], code: 'SOTAIKHOAN', uniqueName: false },
  funds: master('DQUYTIENMAT', 'CODE'),
  customer_groups: master('DNHOMKHACHHANG'),
  supplier_groups: master('DNHOMNHACUNGCAP'),
  categories: master('DNHOMMATHANG'),
  service_categories: master('DLOAIDICHVU'),
  brands: { ...master('DHANGXE', 'CODE'), code: 'CODE' },
};
const layouts = {
  customers: { groupResource: 'customer_groups', groupField: 'DNHOMKHACHHANGID' },
  suppliers: { groupResource: 'supplier_groups', groupField: 'DNHOMNHACUNGCAPID' },
  parts: { groupResource: 'categories', groupField: 'DNHOMMATHANGID' },
  services: { groupResource: 'service_categories', groupField: 'DLOAIDICHVUID' },
  models: { resource: 'models', groupResource: 'brands', groupField: 'DHANGXEID' },
  vehicles: { groupResource: 'brands', groupField: 'DHANGXEID' },
  warehouses: { resource: 'locations', groupResource: 'warehouses', groupField: 'DKHOHANGID' },
  stock: { groupResource: 'warehouses', readonly: true },
};
function failure(message, status = 400, code) { return Object.assign(new Error(message), { status, code }); }
async function tableExists(table, query = db.query) {
  return (await query('SELECT FIRST 1 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME=?', [table])).length > 0;
}
async function read(resource) {
  if (resource === 'fuels') return loadFuelOptions();
  const def = resources[resource];
  if (!def) throw failure('Danh mục không tồn tại.', 404);
  if (!await tableExists(def.table)) return { data: [], available: false, table: def.table, message: 'Danh mục này chưa có bảng trong database hiện tại.' };
  const photo = resource === 'parts' ? ', CASE WHEN ANH IS NULL THEN 0 ELSE 1 END AS CO_ANH' : resource === 'vehicles' ? ', CASE WHEN ANHXE IS NULL THEN 0 ELSE 1 END AS CO_ANHXE' : '';
  const data = await db.query(`SELECT ID, STATUS, ${def.fields.join(', ')}${photo} FROM ${def.table} ORDER BY ${resource === 'vehicles' ? 'BIENSO' : 'NAME'}`);
  return { data, available: true, table: def.table };
}
// Stock is grouped by the warehouse on each movement, rather than the part's current storage location.
const stockSql = `
 SELECT M.ID AS PART_ID, M.CODE, M.NAME, M.STATUS, M.DVITRIKHOID,
        U.NAME AS UNIT_NAME, V.NAME AS LOCATION_NAME, S.DKHOHANGID,
        SUM(S.QUANTITY) AS TON_KHO
 FROM (
   SELECT C.DMATHANGID, COALESCE(C.DKHOHANGID,N.DKHOHANGID) AS DKHOHANGID, COALESCE(C.SOLUONG,0) AS QUANTITY
   FROM TNHAPKHOCHITIET C JOIN TNHAPKHO N ON N.ID=C.TNHAPKHOID WHERE C.STATUS=1 AND N.STATUS=1
   UNION ALL
   SELECT X.DMATHANGID, X.DKHOHANGID, -(COALESCE(X.SOLUONG,0)-COALESCE(X.SLHOAN,0))
   FROM TXUATPHUTUNG X WHERE X.STATUS=1
   UNION ALL
   SELECT C.DMATHANGID, C.DKHOHANGID, COALESCE(C.SLNHAP,0)-COALESCE(C.SLXUAT,0)
   FROM TDONHANGCHITIET C JOIN TDONHANG H ON H.ID=C.TDONHANGID WHERE C.STATUS=1 AND H.STATUS=1
   UNION ALL
   SELECT M.ID, V.DKHOHANGID, CAST(0 AS DOUBLE PRECISION) FROM DMATHANG M LEFT JOIN DVITRIKHO V ON V.ID=M.DVITRIKHOID
 ) S JOIN DMATHANG M ON M.ID=S.DMATHANGID
 LEFT JOIN DDONVITINH U ON U.ID=M.DDONVITINHID
 LEFT JOIN DVITRIKHO V ON V.ID=M.DVITRIKHOID AND V.DKHOHANGID=S.DKHOHANGID
 GROUP BY M.ID, M.CODE, M.NAME, M.STATUS, M.DVITRIKHOID, U.NAME, V.NAME, S.DKHOHANGID
 ORDER BY M.NAME`;
async function load(type) {
  const layout = layouts[type] || {};
  const resource = layout.resource || type;
  const [records, groupResult] = await Promise.all([
    type === 'stock' ? db.query(stockSql).then((data) => ({ data: data.map((row) => ({ ...row, ID: `${row.PART_ID}:${row.DKHOHANGID || ''}` })), available: true })) : read(resource),
    layout.groupResource ? read(layout.groupResource) : Promise.resolve({ data: [], available: true }),
  ]);
  let groups = groupResult.data;
  if (type === 'banks') groups = [...new Set(records.data.map((row) => row.TENNGANHANG).filter(Boolean))].sort().map((name) => ({ ID: name, NAME: name, STATUS: 1 }));
  if (type === 'cashReasons') groups = [{ ID: '0', NAME: 'Thu', STATUS: 1 }, { ID: '1', NAME: 'Chi', STATUS: 1 }];
  const groupIds = new Set(groups.map((group) => String(group.ID)));
  const lookupKeys = type === 'parts' ? ['units', 'manufacturers', 'locations'] : type === 'vehicles' ? ['models', 'customers'] : [];
  const lookupResults = await Promise.all(lookupKeys.map((key) => read(key)));
  const lookups = Object.fromEntries(lookupKeys.map((key, index) => [key, lookupResults[index].data]));
  return { ...records, resource, groupResource: layout.groupResource || null, groupsAvailable: groupResult.available,
    groups, lookups, data: records.data.map((row) => {
      const value = type === 'banks' ? row.TENNGANHANG : type === 'cashReasons' ? row.LOAI : type === 'stock' ? row.DKHOHANGID : row[layout.groupField];
      return { ...row, GROUP_ID: value != null && value !== '' && groupIds.has(String(value)) ? String(value) : '',
        GROUP_NAME: groups.find((group) => String(group.ID) === String(value))?.NAME || '',
        ...(type === 'parts' ? { UNIT_NAME: lookups.units.find((unit) => unit.ID === row.DDONVITINHID)?.NAME || '', MANUFACTURER_NAME: lookups.manufacturers.find((item) => item.ID === row.DHANGSANXUATID)?.NAME || '' } : {}),
        ...(type === 'vehicles' ? { MODEL_NAME: lookups.models.find((model) => model.ID === row.DDONGXEID)?.NAME || '', CUSTOMER_NAME: lookups.customers.find((customer) => customer.ID === row.DKHACHHANGID)?.NAME || '' } : {}),
      };
    }) };
}
async function save(resource, id, body, actor) {
  const def = resources[resource];
  if (!def) throw failure('Danh mục không tồn tại.', 404);
  if (def.readonly) throw failure('Danh mục này sử dụng form nghiệp vụ riêng.', 405);
  if (!await tableExists(def.table)) throw failure('Danh mục này chưa có bảng trong database hiện tại.', 409, 'CATALOG_UNAVAILABLE');
  const allowed = new Set(def.fields);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw failure('Dữ liệu có trường không thuộc danh mục.');
  const payload = {};
  for (const [key, value] of Object.entries(body)) {
    if (value != null && typeof value !== 'string' && typeof value !== 'number') throw failure('Giá trị không hợp lệ.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw failure('Giá trị số không hợp lệ.');
    if (typeof value === 'string' && value.length > 255) throw failure('Nội dung không được vượt quá 255 ký tự.');
    payload[key] = typeof value === 'string' ? value.trim() || null : value;
  }
  return db.transaction(async (query, execute, uuid) => {
    const current = id ? (await query(`SELECT ${def.fields.join(', ')} FROM ${def.table} WHERE ID=?`, [id]))[0] : null;
    if (id && !current) throw failure('Bản ghi không còn tồn tại.', 404);
    const combined = { ...current, ...payload };
    if ((def.required || ['NAME']).some((field) => !String(combined[field] ?? '').trim())) throw failure('Vui lòng điền đầy đủ các trường bắt buộc.');
    const numericFields = ['GIA', 'THOIGIAN', 'CHOPHEPAMKHO', 'LOAI'];
    for (const field of numericFields) if (payload[field] != null) {
      payload[field] = Number(payload[field]);
      if (!Number.isFinite(payload[field]) || payload[field] < 0 || (['LOAI', 'CHOPHEPAMKHO'].includes(field) && ![0, 1].includes(payload[field]))) throw failure('Giá trị số không hợp lệ.');
    }
    for (const field of ['GIOBATDAU', 'GIOKETTHUC']) if (payload[field]) {
      payload[field] = new Date(payload[field]);
      if (Number.isNaN(payload[field].getTime())) throw failure('Giờ làm việc không hợp lệ.');
    }
    for (const [field, table] of Object.entries(def.links || {})) if (combined[field] && !(await query(`SELECT FIRST 1 ID FROM ${table} WHERE ID=?`, [combined[field]])).length) throw failure('Nhóm được chọn không còn tồn tại.');
    for (const field of [def.code, def.uniqueName ? 'NAME' : null].filter(Boolean)) {
      if (!combined[field]) continue;
      let sql = `SELECT FIRST 1 ID FROM ${def.table} WHERE UPPER(TRIM(${field}))=?`;
      const params = [String(combined[field]).trim().toUpperCase()];
      if (id) { sql += ' AND ID<>?'; params.push(id); }
      if (def.scope && field === 'NAME') {
        sql += combined[def.scope] ? ` AND ${def.scope}=?` : ` AND ${def.scope} IS NULL`;
        if (combined[def.scope]) params.push(combined[def.scope]);
      }
      if ((await query(sql, params)).length) throw failure(field === 'NAME' ? 'Tên danh mục đã tồn tại.' : 'Mã đã tồn tại.', 409);
    }
    const columns = Object.keys(payload);
    if (id) {
      if (columns.length) await execute(`UPDATE ${def.table} SET ${columns.map((key) => `${key}=?`).join(', ')}, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [...columns.map((key) => payload[key]), actor, id]);
      return { ok: true, id };
    }
    const newId = uuid();
    await execute(`INSERT INTO ${def.table} (ID, STATUS, USERCREATEDID, TIMECREATED, ${columns.join(', ')}) VALUES (?, 1, ?, CURRENT_TIMESTAMP, ${columns.map(() => '?').join(', ')})`, [newId, actor, ...columns.map((key) => payload[key])]);
    return { ok: true, id: newId };
  });
}
async function setStatus(resource, id, status, actor) {
  const def = resources[resource];
  if (!def) throw failure('Danh mục không tồn tại.', 404);
  if (def.readonly) throw failure('Hãy thay đổi trạng thái trong màn hình nghiệp vụ.', 405);
  if (![0, 1].includes(status)) throw failure('Trạng thái không hợp lệ.');
  if (!await tableExists(def.table)) throw failure('Danh mục này chưa có bảng trong database hiện tại.', 409, 'CATALOG_UNAVAILABLE');
  if (!(await db.query(`SELECT FIRST 1 ID FROM ${def.table} WHERE ID=?`, [id])).length) throw failure('Bản ghi không còn tồn tại.', 404);
  await db.execute(`UPDATE ${def.table} SET STATUS=?, USERMODIFIEDID=?, TIMEMODIFIED=CURRENT_TIMESTAMP WHERE ID=?`, [status, actor, id]);
  return { ok: true };
}
module.exports = { resources, layouts, read, load, save, setStatus, stockSql };
