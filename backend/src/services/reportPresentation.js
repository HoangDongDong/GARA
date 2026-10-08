const db = require('../db');
const { decodeConfigImage } = require('./configImageStorage');
const { validateLogo } = require('./companyLogo');

async function companyPresentation() {
  const rows = await db.query("SELECT NAME,TEXTVALUE FROM SCONFIG WHERE NAME IN ('CompanyName','CompanyAddress','CompanyPhone','CompanyEmail') AND STATUS=30");
  const config = Object.fromEntries(rows.map(row => [row.NAME, row.TEXTVALUE || '']));
  const result = {
    name: config.CompanyName || process.env.COMPANY_NAME || 'GARA',
    address: config.CompanyAddress || '',
    phone: config.CompanyPhone || '',
    email: config.CompanyEmail || '',
    logo: null,
  };
  const logo = decodeConfigImage(await db.queryBlob("SELECT BLOBVALUE FROM SCONFIG WHERE NAME='CompanyLogo' AND STATUS=30", [], 'BLOBVALUE'));
  if (logo?.length) {
    try {
      validateLogo(logo);
      result.logo = `data:image/${logo[0] === 137 ? 'png' : 'jpeg'};base64,${logo.toString('base64')}`;
    } catch { /* Old unsupported logos are omitted; report data remains printable. */ }
  }
  return result;
}

const filterLabels = {q:'Tìm kiếm',partner:'Khách hàng / NCC',plate:'Biển số',employee:'Nhân viên',warehouse:'Kho',status:'Trạng thái',account:'Tài khoản',method:'Phương thức',days:'Số ngày'};
function periodCaption(result) {
  const date = value => value?.split('-').reverse().join('/');
  if (result.report.period === false) return 'Danh mục tại thời điểm lập báo cáo';
  return `Từ ngày ${date(result.filters.from) || 'đầu dữ liệu'} đến ngày ${date(result.filters.to) || 'hiện tại'}`;
}
function filterCaption(result) {
  return Object.entries(filterLabels).filter(([key]) => result.filters[key] && (key !== 'days' || result.report.expiring || result.report.id === 'stock-slow')).map(([key, label]) => `${label}: ${result.filters[key]}`).join(' · ');
}
function signatureDate(createdAt) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(createdAt));
  const p = Object.fromEntries(parts.map(part => [part.type,part.value]));
  return `Ngày ${p.day} tháng ${p.month} năm ${p.year}`;
}
module.exports = {companyPresentation,periodCaption,filterCaption,signatureDate};
