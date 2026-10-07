export const employeeRoles = ['Nhân viên', 'Kỹ thuật viên', 'Cố vấn dịch vụ', 'Thủ kho', 'Thu ngân'];
const number = value => Number(value || 0);
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function currentSalaryMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
}
export function salaryMonthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, index] = month.split('-').map(Number);
  return { from: `${month}-01`, to: `${month}-${String(new Date(Date.UTC(year, index, 0)).getUTCDate()).padStart(2, '0')}` };
}
export function employeeCompensation(employee, report = {}) {
  const work = (report.data || []).filter(row => row.DNHANVIENID === employee.ID);
  const slips = (report.payroll || []).filter(row => row.DNHANVIENID === employee.ID);
  const sum = (rows, field) => round(rows.reduce((total, row) => total + number(row[field]), 0));
  const allocated = sum(work, 'HOAHONG');
  const eligible = sum(work.filter(row => row.ELIGIBLE), 'HOAHONG');
  const shiftSalary = Number(employee.CACHTINHLUONG) === 1;
  const inactive = Number(employee.STATUS) !== 1;
  const base = slips.length ? sum(slips, 'LUONGCOBAN') : shiftSalary || inactive ? null : number(employee.LUONGTHANG);
  const commission = slips.length ? sum(slips, 'HOAHONG') : eligible;
  const total = slips.length ? sum(slips, 'TONGCONG') : base == null ? null : round(base + commission);
  return { work, slips, allocated, eligible, pending: round(allocated - eligible),
    jobs: new Set(work.map(row => row.TLENHSUACHUAID)).size,
    running: new Set(work.filter(row => Number(row.TRANGTHAI) === 2).map(row => row.TLENHSUACHUAID)).size,
    base, commission, bonus: sum(slips, 'THUONG'), deduction: sum(slips, 'PHAT'), total,
    estimated: !slips.length, shiftSalary, inactive };
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
