import { can, canQuickCreate, workflowPermission } from '../utils/permissions';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, RefreshCw, Download, Pencil, Wallet, Coins, Wrench, ArrowUpRight, Phone, Mail, ShieldCheck, Ban, RotateCcw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { employees } from '../services';
import EmployeeFormModal from '../components/EmployeeFormModal';
import EmployeePhoto from '../components/EmployeePhoto';
import { employeeCompensation, employeeRoles, currentSalaryMonth, salaryMonthRange, csvCell } from '../utils/employeeCompensation';
import './NhanVienPage.css';

const money = value => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} đ`;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const errorText = error => error.response?.data?.error || error.message || 'Không tải được dữ liệu.';
const dateText = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const stages = ['Chờ báo giá', 'Xác nhận sửa chữa', 'Đang sửa', 'Chờ giao xe', 'Hoàn thành'];
function access() {
  try { const user = JSON.parse(localStorage.getItem('garage_user') || '{}'); return Number(user.ISADMIN) === 1 ? 31 : Number(user.PERMISSIONS?.EMPLOYEES || 0); }
  catch { return 0; }
}
function initials(name) { return String(name || '').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase(); }
function Status({ employee }) { return <span className={`staff-status ${Number(employee.STATUS) === 1 ? 'active' : 'inactive'}`}>{Number(employee.STATUS) === 1 ? 'Đang làm việc' : 'Đã nghỉ việc'}</span>; }

export default function NhanVienPage() {
  const navigate = useNavigate();
  const permission = access();
  const canCommission = can('COMMISSIONS');
  const canIncome = can('PAYROLL') && canCommission;
  const [staff, setStaff] = useState([]);
  const [report, setReport] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('profiles');
  const [month, setMonth] = useState(currentSalaryMonth);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportError, setReportError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [changing, setChanging] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    employees.list({ includeInactive: 1 }).then(rows => { if (!cancelled) setStaff(rows); }).catch(exception => { if (!cancelled) setError(errorText(exception)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [version]);
  useEffect(() => {
    let cancelled = false;
    if (!can('PAYROLL') && !canCommission) { setReport(null); setReportLoading(false); setReportError(''); return; }
    setReport(null); setReportLoading(true); setReportError('');
    employees.commissions({ month, ...salaryMonthRange(month) }).then(data => { if (!cancelled) setReport(data); }).catch(exception => { if (!cancelled) setReportError(errorText(exception)); }).finally(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; };
  }, [month, version, canIncome]);
  const departmentOptions = useMemo(() => [...new Map(staff.filter(row => row.DPHONGBANID).map(row => [row.DPHONGBANID, row.PHONGBAN])).entries()], [staff]);
  const shown = useMemo(() => staff.filter(row => {
    const matches = normalize([row.NAME,row.CODE,row.DIENTHOAI,row.CHUYENMON,row.PHONGBAN].join(' ')).includes(normalize(search));
    return matches && (role === 'all' || Number(row.LOAINHANVIEN) === Number(role)) && (department === 'all' || (department === 'none' ? !row.DPHONGBANID : row.DPHONGBANID === department)) && (status === 'all' || Number(row.STATUS) === Number(status));
  }), [staff, search, role, department, status]);
  const selected = shown.find(row => row.ID === selectedId) || shown[0];
  const summaries = useMemo(() => new Map(staff.map(row => [row.ID, employeeCompensation(row, report || {})])), [staff, report]);
  const summary = selected ? summaries.get(selected.ID) : null;
  const totals = shown.reduce((sum, row) => {
    const data = summaries.get(row.ID);
    return { allocated: sum.allocated + data.allocated, eligible: sum.eligible + data.eligible, salary: sum.salary + (data.total || 0), active: sum.active + (Number(row.STATUS) === 1 ? 1 : 0) };
  }, { allocated: 0, eligible: 0, salary: 0, active: 0 });
  const shiftMonth = offset => {
    const [year, index] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, index - 1 + offset, 1));
    setMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const exportCsv = () => {
    if (!can('EXPORT')) return setNotice('Cần quyền Xuất dữ liệu.');
    let headers = ['Mã NV','Họ tên','Vai trò','Phòng ban','Trạng thái','Tháng','Số phiếu','Hoa hồng phân bổ','Hoa hồng đủ điều kiện','Lương cơ bản','Hoa hồng trong lương','Thưởng','Khấu trừ','Tổng thu nhập','Nguồn lương'];
    let lines = shown.map(row => { const data = summaries.get(row.ID); return [row.CODE || '',row.NAME,employeeRoles[Number(row.LOAINHANVIEN)] || 'Nhân viên',row.PHONGBAN || '',Number(row.STATUS) === 1 ? 'Đang làm việc' : 'Đã nghỉ việc',month,data.jobs,data.allocated,data.eligible,data.base ?? '',data.commission,data.bonus,data.deduction,data.total ?? '',data.estimated ? 'Dự kiến' : 'Bảng lương']; });
    if (!canIncome) { headers=['Mã NV','Họ tên','Vai trò','Phòng ban','Trạng thái']; lines=shown.map(row=>[row.CODE || '',row.NAME,employeeRoles[Number(row.LOAINHANVIEN)] || 'Nhân viên',row.PHONGBAN || '',Number(row.STATUS)===1?'Đang làm việc':'Đã nghỉ việc']); }
    const blob = new Blob(['\uFEFF', [headers, ...lines].map(line => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Nhan-vien-luong-hoa-hong-${month}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const updateStatus = async () => {
    if (!statusTarget || changing) return;
    setChanging(true);
    try { await employees.setStatus(statusTarget.ID, Number(statusTarget.STATUS) === 1 ? 0 : 1); setNotice('Đã cập nhật trạng thái nhân viên.'); setStatusTarget(null); setVersion(value => value + 1); }
    catch (exception) { setNotice(errorText(exception)); }
    finally { setChanging(false); }
  };
  const saved = id => { setSelectedId(id); setVersion(value => value + 1); };
  const openRepair = row => navigate(`/sua-chua?vehicleId=${encodeURIComponent(row.DXEID)}&repairId=${encodeURIComponent(row.TLENHSUACHUAID)}`);
  return <div className="staff-page">
    <header className="staff-header"><div className="staff-title"><div className="staff-title-icon"><Users size={23}/></div><div><h1>Nhân viên & Kỹ thuật viên</h1><p>Hồ sơ, công việc, hoa hồng và lương theo tháng</p></div></div><div className="staff-actions"><button type="button" onClick={() => setVersion(value => value + 1)} disabled={loading || reportLoading}><RefreshCw size={15}/> Làm mới</button><button type="button" onClick={exportCsv} disabled={!can('EXPORT') || loading || reportLoading || !!error || !!reportError || !shown.length}><Download size={15}/> Xuất CSV</button>{(permission & 2) === 2 && <button type="button" className="primary" onClick={() => setEditor({})}><Plus size={16}/> Thêm nhân viên</button>}</div></header>
    {notice && <div className="staff-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo"><X size={16}/></button></div>}
    {(error || reportError) && <div className="staff-error" role="alert">{error || reportError} <button type="button" onClick={() => setVersion(value => value + 1)}>Thử lại</button></div>}
    <div className="staff-kpis"><div><span>Nhân viên đang làm việc</span><strong>{loading ? '—' : totals.active}</strong><small>Trong danh sách đang lọc</small><Users size={20}/></div><div><span>Hoa hồng được phân bổ</span><strong>{!canIncome || reportLoading || reportError ? '—' : money(totals.allocated)}</strong><small>Theo ngày phân công trong tháng</small><Coins size={20}/></div><div><span>Hoa hồng đủ điều kiện chi</span><strong>{reportLoading || reportError ? '—' : money(totals.eligible)}</strong><small>Phiếu hoàn thành và thanh toán đủ</small><ShieldCheck size={20}/></div><div><span>Tổng thu nhập tháng</span><strong>{reportLoading || reportError ? '—' : money(totals.salary)}</strong><small>Bảng lương có sẵn hoặc mức dự kiến</small><Wallet size={20}/></div></div>
    <section className="staff-controls"><div className="staff-tabs" role="tablist" aria-label="Quản lý nhân viên">{[['profiles','Hồ sơ nhân viên',Users],['commissions','Hoa hồng',Coins],['salary','Lương',Wallet]].filter(([key]) => key === 'profiles' || (key === 'commissions' ? canCommission : canIncome)).map(([key,label,Icon]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'selected' : ''} key={key} onClick={() => setTab(key)}><Icon size={16}/>{label}</button>)}</div><div className="staff-month"><span>Tháng</span><button type="button" onClick={() => shiftMonth(-1)} aria-label="Tháng trước"><ChevronLeft size={16}/></button><input type="month" aria-label="Tháng lương và hoa hồng" value={month} onChange={event => setMonth(event.target.value || currentSalaryMonth())}/><button type="button" onClick={() => shiftMonth(1)} aria-label="Tháng sau"><ChevronRight size={16}/></button><button type="button" onClick={() => setMonth(currentSalaryMonth())}>Tháng này</button></div></section>
    <div className="staff-filters"><label className="staff-search"><Search size={16}/><input aria-label="Tìm nhân viên" placeholder="Tên, mã nhân viên, SĐT, chuyên môn…" value={search} onChange={event => setSearch(event.target.value)}/></label><select aria-label="Vai trò công việc" value={role} onChange={event => setRole(event.target.value)}><option value="all">Tất cả vai trò</option>{employeeRoles.map((name,index) => <option key={name} value={index}>{name}</option>)}</select><select aria-label="Phòng ban" value={department} onChange={event => setDepartment(event.target.value)}><option value="all">Tất cả phòng ban</option><option value="none">Chưa phân phòng ban</option>{departmentOptions.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select><select aria-label="Trạng thái nhân viên" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="1">Đang làm việc</option><option value="0">Đã nghỉ việc</option></select></div>
    <div className="staff-workspace"><section className="staff-list"><div className="staff-section-heading"><b>{tab === 'profiles' ? 'Danh sách nhân viên' : tab === 'commissions' ? 'Hoa hồng theo nhân viên' : `Lương tháng ${month.slice(5)}/${month.slice(0,4)}`}</b><span>{shown.length} nhân viên</span></div><div className="staff-table-wrap"><table><thead><tr><th>Nhân viên</th><th>Vai trò / Phòng ban</th>{tab === 'profiles' ? <><th>Liên hệ</th><th>Chuyên môn</th><th>Trạng thái</th></> : tab === 'commissions' ? <><th>Số phiếu</th><th>Được phân bổ</th><th>Đủ điều kiện chi</th></> : <><th>Lương cơ bản</th><th>Hoa hồng</th><th>Tổng thu nhập</th></>}<th></th></tr></thead><tbody>{!loading && shown.map(row => { const data = summaries.get(row.ID); return <tr key={row.ID} className={selected?.ID === row.ID ? 'selected' : ''} onClick={() => setSelectedId(row.ID)}><td><button type="button" className="staff-person" onClick={() => setSelectedId(row.ID)}><span className="staff-avatar small">{initials(row.NAME)}</span><span><b>{row.NAME}</b><small>{row.CODE || 'Chưa đặt mã'}</small></span></button></td><td><span>{employeeRoles[Number(row.LOAINHANVIEN)] || 'Nhân viên'}</span><small>{row.PHONGBAN || 'Chưa phân phòng ban'}</small></td>{tab === 'profiles' ? <><td>{row.DIENTHOAI || '—'}<small>{row.EMAIL || ''}</small></td><td>{row.CHUYENMON || 'Chưa cập nhật'}</td><td><Status employee={row}/></td></> : tab === 'commissions' ? <><td>{reportLoading || reportError ? '—' : data.jobs}</td><td className="staff-money">{reportLoading || reportError ? '—' : money(data.allocated)}</td><td className="staff-money eligible">{reportLoading || reportError ? '—' : money(data.eligible)}</td></> : <><td className="staff-money">{reportLoading || reportError ? '—' : data.shiftSalary && data.estimated ? `${money(row.LUONGCA)} / ca` : money(data.base)}</td><td className="staff-money">{reportLoading || reportError ? '—' : money(data.commission)}</td><td className="staff-money strong">{reportLoading || reportError ? '—' : money(data.total)}<small>{data.estimated ? 'Dự kiến' : 'Theo bảng lương'}</small></td></>}<td>{(permission & 4) === 4 && <button type="button" className="staff-icon-button" aria-label={`Sửa ${row.NAME}`} onClick={event => { event.stopPropagation(); setEditor(row); }}><Pencil size={14}/></button>}</td></tr>; })}</tbody></table>{loading ? <div className="staff-empty" role="status">Đang tải nhân viên…</div> : !shown.length && <div className="staff-empty">Không có nhân viên phù hợp.</div>}</div><div className="staff-list-footer">Chọn nhân viên để xem thông tin, công việc và thu nhập chi tiết.</div></section>
      <aside className="staff-detail">{selected && summary ? <>
        <section className="staff-profile-card"><div className="staff-profile-top"><span className="staff-avatar">{initials(selected.NAME)}</span><div><h2>{selected.NAME}</h2><span>{selected.CODE || 'Chưa đặt mã'} · {employeeRoles[Number(selected.LOAINHANVIEN)] || 'Nhân viên'}</span><Status employee={selected}/></div>{(permission & 4) === 4 && <button type="button" className="staff-icon-button" onClick={() => setEditor(selected)} aria-label="Sửa nhân viên đang chọn"><Pencil size={16}/></button>}</div><div className="staff-profile-body"><EmployeePhoto employee={selected}/><dl><div><dt>Phòng ban</dt><dd>{selected.PHONGBAN || 'Chưa phân phòng ban'}</dd></div><div><dt><Phone size={13}/> Điện thoại</dt><dd>{selected.DIENTHOAI || '—'}</dd></div><div><dt><Mail size={13}/> Email</dt><dd>{selected.EMAIL || '—'}</dd></div><div><dt>Chuyên môn</dt><dd>{selected.CHUYENMON || 'Chưa cập nhật'}</dd></div>{tab === 'profiles' && <><div><dt>Chứng chỉ</dt><dd>{selected.CHUNGCHI || 'Chưa cập nhật'}</dd></div><div><dt>Địa chỉ</dt><dd>{selected.DIACHI || '—'}</dd></div><div><dt>Tài khoản</dt><dd>{selected.USERNAME ? `${selected.USERNAME} · ${selected.CHUCVU || 'Chưa gán nhóm quyền'}` : 'Chưa cấp tài khoản'}</dd></div></>}</dl></div>{selected.NOTE && <p className="staff-help">{selected.NOTE}</p>}{(permission & 4) === 4 && <button type="button" className="staff-status-action" onClick={() => setStatusTarget(selected)}>{Number(selected.STATUS) === 1 ? <Ban size={14}/> : <RotateCcw size={14}/>} {Number(selected.STATUS) === 1 ? 'Ngừng làm việc' : 'Cho làm việc lại'}</button>}</section>
        {canIncome && <><section className="staff-income-card"><div className="staff-section-heading"><b><Wallet size={16}/> Thu nhập tháng {month.slice(5)}/{month.slice(0,4)}</b><span className="staff-source-badge">{summary.estimated ? 'Dự kiến' : 'Theo bảng lương'}</span></div>{reportLoading ? <div className="staff-empty">Đang tải thu nhập…</div> : reportError ? <p className="staff-help">Chưa tải được thu nhập.</p> : <><div className="staff-income-lines"><div><span>{summary.shiftSalary && summary.estimated ? 'Lương mỗi ca' : 'Lương cơ bản'}</span><b>{money(summary.shiftSalary && summary.estimated ? selected.LUONGCA : summary.base)}</b></div><div><span>Hoa hồng{summary.estimated ? ' đủ điều kiện' : ' trong bảng lương'}</span><b className="eligible">{money(summary.commission)}</b></div><div><span>Thưởng</span><b>{summary.estimated ? 'Chưa lập' : money(summary.bonus)}</b></div><div><span>Khấu trừ</span><b>{summary.estimated ? 'Chưa lập' : money(summary.deduction)}</b></div><div className="staff-income-total"><span>Tổng thu nhập</span><strong>{money(summary.total)}</strong></div></div><p className="staff-help">{summary.estimated ? summary.inactive ? 'Nhân viên đã nghỉ việc. Cần bảng lương đã lưu để xác định thu nhập tháng.' : summary.shiftSalary ? 'Chưa có bảng lương tháng. Cần số ca làm việc để tính tổng lương.' : 'Ước tính từ lương cơ bản đã cấu hình và hoa hồng đủ điều kiện. Chưa tính ngày công, thưởng và khấu trừ.' : 'Số tiền lấy từ bảng lương đã lưu. Tổng thu nhập không thể hiện việc đã trả lương.'}</p>{summary.slips.length > 0 && <details className="staff-payroll-sources"><summary>Xem bảng lương nguồn ({summary.slips.length})</summary>{summary.slips.map(row => <div key={row.ID}><b>{row.TEN_BANG_LUONG}</b><span>{money(row.TONGCONG)}</span>{row.NOTE && <small>{row.NOTE}</small>}</div>)}</details>}</>}</section></> }
        {canCommission && <section className="staff-commission-card"><div className="staff-section-heading"><b><Coins size={16}/> Hoa hồng & Công việc</b><span>{summary.jobs} phiếu</span></div><div className="staff-commission-mini"><div><span>Được phân bổ</span><b>{reportLoading || reportError ? '—' : money(summary.allocated)}</b></div><div><span>Chưa đủ điều kiện</span><b>{reportLoading || reportError ? '—' : money(summary.pending)}</b></div></div><p className="staff-help">Theo ngày phân công trong tháng. Đủ điều kiện chi khi phiếu hoàn thành và khách đã thanh toán đủ; chưa thể hiện đã chi cho nhân viên.</p><div className="staff-job-list">{!reportLoading && !reportError && summary.work.map(row => <button type="button" className="staff-job" key={row.ID} onClick={() => openRepair(row)}><div><b>{row.BIENSO || 'Chưa có biển số'}</b><span>{row.SO_PHIEU}</span><ArrowUpRight size={15}/></div><small>{row.TEN_KH || '—'} · Phân công {dateText(row.NGAYPHANCONG)}</small><div><span className={`staff-stage stage-${row.TRANGTHAI}`}>{stages[Number(row.TRANGTHAI)] || 'Chưa có trạng thái'}</span><b>{money(row.HOAHONG)}</b></div><small>{Number(row.PHUTRACHCHINH) === 1 ? 'Phụ trách chính' : 'Cùng thực hiện'} · Tỷ lệ {Number(row.TILECHIA)}% · {row.ELIGIBLE ? 'Đủ điều kiện chi' : 'Chưa đủ điều kiện'}</small></button>)}{!reportLoading && !reportError && !summary.work.length && <div className="staff-empty"><Wrench size={22}/><span>Chưa có phân công và hoa hồng trong tháng này.</span></div>}</div></section>}
      </> : <div className="staff-empty"><Users size={28}/><span>Chọn một nhân viên để xem chi tiết.</span></div>}</aside>
    </div>
    <EmployeeFormModal open={!!editor} editingEmployee={editor?.ID ? editor : undefined} onClose={() => setEditor(null)} onCreated={saved} onUpdated={saved} notify={setNotice}/>
    {statusTarget && <div className="staff-confirm-overlay"><section role="dialog" aria-modal="true" aria-label="Thay đổi trạng thái nhân viên"><h3>{Number(statusTarget.STATUS) === 1 ? 'Ngừng làm việc' : 'Cho làm việc lại'}?</h3><p>{statusTarget.NAME}</p><p>{Number(statusTarget.STATUS) === 1 ? 'Hồ sơ và lịch sử hoa hồng vẫn được giữ lại. Tài khoản đăng nhập liên kết sẽ ngừng hoạt động.' : 'Khôi phục hồ sơ làm việc. Tài khoản đăng nhập được quản lý riêng tại Quản trị - Phân quyền.'}</p><div><button type="button" disabled={changing} onClick={() => setStatusTarget(null)}>Hủy</button><button type="button" className="primary" disabled={changing} onClick={updateStatus}>{changing ? 'Đang lưu…' : 'Xác nhận'}</button></div></section></div>}
  </div>;
}
