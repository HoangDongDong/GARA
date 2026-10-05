/**
 * Renders a sales invoice (TDONHANG) with the default FastReport template of the
 * GARA sales configuration (SCONFIG.TEXTVALUE -> STEMPLATE.TEMPLATE).
 *
 * Mapping follows the naming convention used by the legacy templates:
 *   - header fields  : TDONHANG columns as-is ([NAME], [NGAY], [TONGCONG], ...)
 *   - joined tables  : <TABLE>_<COLUMN> ([DKHACHHANG_NAME], [DKHACHHANG_DIACHI], ...)
 *   - detail rows    : Table0 = TDONHANGCHITIET columns + DMATHANG_* / DDONVITINH_* joins
 *   - company info   : [CompanyName], [CompanyAddress], [CompanyPhone]
 * Any other bracket variable the template references is detected from the XML and
 * filled with a neutral default so the report always compiles.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const db = require('../db');
const { templateFilter } = require('./systemConfigOptions');

const SALES_FORM_NAME = 'Hóa đơn bán hàng';
const rendererExecutable = process.env.FASTREPORT_RENDERER_EXE || path.resolve(
  __dirname, '..', '..', 'tools', 'fastreport-renderer', 'bin', 'Renderer', 'Garage.FastReportRenderer.exe'
);
const SYSTEM_VARIABLES = new Set(['Date', 'Page', 'PageN', 'TotalPages', 'PageNofM', 'Row#', 'AbsRow#', 'CopyName#', 'HierarchyLevel', 'HierarchyRow#','Page#','TotalPages#']);

const COMPANY_KEY_MAP = {
  CompanyName: 'CompanyName',
  CompanyAddress: 'CompanyAddress',
  CompanyPhone: 'CompanyPhone',
};

let _companyCache = null;
let _companyCacheAt = 0;

async function company() {
  const now = Date.now();
  if (_companyCache && now - _companyCacheAt < 60000) return _companyCache;
  try {
    const rows = await db.query(
      `SELECT NAME, TEXTVALUE FROM SCONFIG WHERE NAME IN ('CompanyName','CompanyAddress','CompanyPhone','LoiCamOn') AND STATUS=30`
    );
    const map = Object.fromEntries(rows.map((r) => [r.NAME, r.TEXTVALUE || '']));
    _companyCache = {
      CompanyName:    map.CompanyName    || process.env.COMPANY_NAME    || 'CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM',
      CompanyAddress: map.CompanyAddress || process.env.COMPANY_ADDRESS || '925/15 Âu Cơ - P. Tân Sơn Nhì - TP.HCM',
      CompanyPhone:   map.CompanyPhone   || process.env.COMPANY_PHONE   || '0917 66 4444 - 0967 04 1111',
      LoiCamOn:       map.LoiCamOn       || process.env.INVOICE_THANKS  || 'Cảm ơn quý khách và hẹn gặp lại!',
    };
    _companyCacheAt = now;
  } catch {
    _companyCache = {
      CompanyName:    process.env.COMPANY_NAME    || 'CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM',
      CompanyAddress: process.env.COMPANY_ADDRESS || '925/15 Âu Cơ - P. Tân Sơn Nhì - TP.HCM',
      CompanyPhone:   process.env.COMPANY_PHONE   || '0917 66 4444 - 0967 04 1111',
      LoiCamOn:       process.env.INVOICE_THANKS  || 'Cảm ơn quý khách và hẹn gặp lại!',
    };
    _companyCacheAt = now;
  }
  return _companyCache;
}


const prefixed = (prefix, row) => Object.fromEntries(
  Object.entries(row || {}).filter(([, v]) => !Buffer.isBuffer(v) && typeof v !== 'function').map(([k, v]) => [`${prefix}_${k}`, v])
);
const clean = (row) => Object.fromEntries(
  Object.entries(row || {}).filter(([, v]) => !Buffer.isBuffer(v) && typeof v !== 'function')
);

async function resolveTemplate(templateId) {
  const settings = await db.query("SELECT TEXTVALUE, OTHERCONFIG FROM SCONFIG WHERE NAME='MauHoaDonBanHang' AND STATUS=30");
  const id = templateId || settings[0]?.TEXTVALUE;
  if (!id) throw new Error(`Chưa đặt mẫu in mặc định cho biểu mẫu "${SALES_FORM_NAME}".`);
  const ids = templateFilter(settings[0]?.OTHERCONFIG)?.ids || [];
  if (!ids.includes(String(id).toLowerCase())) throw new Error('Mẫu in chưa được gắn vào hóa đơn bán phụ tùng của GARA.');
  const rows = await db.query('SELECT ID, NAME FROM STEMPLATE WHERE ID=? AND STATUS IN (0,30)', [id]);
  if (!rows.length) throw new Error('Không tìm thấy mẫu in mặc định trong STEMPLATE.');
  const content = await db.queryBlob('SELECT TEMPLATE FROM STEMPLATE WHERE ID=?', [id], 'TEMPLATE');
  if (!content) throw new Error(`Mẫu "${rows[0].NAME}" chưa có nội dung FastReport.`);
  return { id, name: rows[0].NAME, content };
}

async function buildSalesPayload(orderId, user) {
  const headers = await db.query('SELECT * FROM TDONHANG WHERE ID=?', [orderId]);
  if (!headers.length) throw new Error('Không tìm thấy phiếu bán hàng.');
  const header = clean(headers[0]);

  const customer = header.DKHACHHANGID
    ? (await db.query('SELECT * FROM DKHACHHANG WHERE ID=?', [header.DKHACHHANGID]))[0] : null;
  const warehouse = header.DKHOXUATID
    ? (await db.query('SELECT * FROM DKHOHANG WHERE ID=?', [header.DKHOXUATID]).catch(() => []))[0] : null;

  const details = await db.query(`
    SELECT CT.*, M.NAME AS M_NAME, M.CODE AS M_CODE, DV.NAME AS DV_NAME
      FROM TDONHANGCHITIET CT
      LEFT JOIN DMATHANG M ON M.ID = CT.DMATHANGID
      LEFT JOIN DDONVITINH DV ON DV.ID = COALESCE(CT.DDONVITINHID, M.DDONVITINHID)
     WHERE CT.TDONHANGID=? AND CT.STATUS=1
     ORDER BY CT.TIMECREATED`, [orderId]);

  const table0 = details.map((row) => {
    const { M_NAME, M_CODE, DV_NAME, ...rest } = clean(row);
    return {
      ...rest,
      DMATHANG_NAME: rest.TENHANG || M_NAME || '',
      DMATHANG_CODE: M_CODE || '',
      DDONVITINH_NAME: DV_NAME || '',
      // Templates show quantities "before unit conversion"; sales have no conversion yet.
      SLXUATCHUAQUYDOI: Number(rest.SLXUAT || 0),
      SLNHAPCHUAQUYDOI: Number(rest.SLNHAP || 0),
    };
  });

  const total = Number(header.TONGCONG || 0);
  const parameters = {
    ...(await company()),
    ...prefixed('DKHACHHANG', customer),
    ...prefixed('DKHOHANG', warehouse),
    ...header,
    DKHACHHANG_NAME: customer?.NAME || 'Khách lẻ',
    DKHACHHANG_DIACHI: customer?.DIACHI || '',
    DKHACHHANG_DIENTHOAI: customer?.DIENTHOAI || '',
    SUSER_NAME: user || '',
    // Optional legacy payment/loyalty sections remain hidden when unused.
    NOCU: Number(header.NOCU || 0),
    'Đặt trước': Number(header.DATTRUOC || 0),
    VOUCHER: Number(header.VOUCHER || 0),
    THETRATRUOC: Number(header.THETRATRUOC || 0),
    TRUTICHLUY: Number(header.TRUTICHLUY || 0),
    'Nợ mới': Number(header.CONLAI ?? header.CONGNO ?? 0),
    DIEM: Number(header.DIEM || 0),
    'Điểm tích lũy': Number(header.DIEMTICHLUY || 0),
    GIAOHANG: header.GIAOHANG || '',
    KHACHDUA: header.KHACHDUA ?? total,
    TRALAI: header.TRALAI ?? 0,
    'In bởi': user || header.USERCREATEDID || '',
    HienThiDiemCuaKhachHangTrenHoaDon: false,
  };
  return { parameters, tables: { Table0: table0 } };
}

/** Fill every bracket variable referenced by the template but not provided. */
function fillMissingVariables(xml, payload) {
  const names = new Set();
  for (const match of xml.matchAll(/\[([^\[\]\r\n]+)\]/g)) {
    const name = match[1].trim();
    if (!name || name.includes('.') || SYSTEM_VARIABLES.has(name) || /[=<>!+\-*/|&()"]/.test(name)) continue;
    names.add(name);
  }
  // Names declared as report totals are computed by FastReport itself.
  for (const match of xml.matchAll(/<Total Name="([^"]+)"/g)) names.delete(match[1]);
  for (const name of names) {
    if (!(name in payload.parameters)) payload.parameters[name] = 0;
    else if (payload.parameters[name] === null || payload.parameters[name] === undefined) payload.parameters[name] = '';
  }
  return payload;
}

function runRenderer(templatePath, dataPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(rendererExecutable)) {
      reject(new Error('Chưa build FastReport Open Source renderer (backend/tools/fastreport-renderer/bin/Renderer).'));
      return;
    }
    const child = spawn(rendererExecutable, ['--render', templatePath, dataPath, outputPath], { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Tạo bản in quá thời gian.')); }, 60000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(outputPath)) return resolve(fs.readFileSync(outputPath));
      const errorPath = `${outputPath}.error.txt`;
      const detail = fs.existsSync(errorPath) ? fs.readFileSync(errorPath, 'utf8').split(/\r?\n/)[0] : `mã lỗi ${code}`;
      reject(new Error(`FastReport: ${detail}`));
    });
  });
}

async function renderSalesInvoice(orderId, { templateId, user } = {}) {
  const printing = require('./documentPrint');
  const result = await printing.render(printing.typeByKey('MauHoaDonBanHang'),orderId,{templateId},user);
  return { pdf: result.pdf, template: { id: result.template.ID, name: result.template.NAME }, orderName: result.name };
}

module.exports = { renderSalesInvoice, buildSalesPayload, resolveTemplate, fillMissingVariables,
  company, clean, prefixed, runRenderer };
