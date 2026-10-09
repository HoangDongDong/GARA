import { can, canQuickCreate, workflowPermission } from '../utils/permissions';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import api from '../api';
import EmployeeFormModal from './EmployeeFormModal';
import './RepairAssignmentPanel.css';

const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const equalShares = rows => rows.map((row, index) => ({ ...row, share: (Math.floor(10000 / rows.length) + (index < 10000 % rows.length ? 1 : 0)) / 100 }));
function split(total, rows) {
  const cents = Math.round(total * 100);
  const parts = rows.map(row => { const exact = cents * Number(row.share) / 100; return { ...row, cents: Math.floor(exact), remainder: exact - Math.floor(exact) }; });
  let remainder = cents - parts.reduce((sum, row) => sum + row.cents, 0);
  for (const row of [...parts].sort((a, b) => b.remainder - a.remainder)) if (remainder > 0) { row.cents++; remainder--; }
  return parts.map(row => ({ ...row, amount: row.cents / 100 }));
}
export default function RepairAssignmentPanel({ repairId, onChange, disabled, readOnly = false }) {
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setData(null); setRows([]); setError('');
    api.get(`/repair-orders/${encodeURIComponent(repairId)}/assignments`).then(result => {
      if (cancelled) return;
      setData(result.data.data);
      setRows(result.data.data.assignments.map(row => ({ employeeId: row.EMPLOYEEID, share: Number(row.TILECHIA), primary: Number(row.PHUTRACHCHINH) === 1, name: row.NAME, savedAmount: Number(row.HOAHONG) })));
    }).catch(error => { if (!cancelled) setError(error.response?.data?.error || 'Không tải được phân công và hoa hồng.'); });
    return () => { cancelled = true; };
  }, [repairId, version]);
  const totalShare = rows.reduce((sum, row) => sum + Math.round(Number(row.share) * 100), 0) / 100;
  const valid = !!data && !error && rows.length > 0 && rows.every(row => Number.isFinite(Number(row.share)) && Number(row.share) > 0 && Number(row.share) <= 100 && Math.abs(Number(row.share) * 100 - Math.round(Number(row.share) * 100)) < 1e-6) && totalShare === 100 && rows.filter(row => row.primary).length === 1;
  useEffect(() => { onChange?.({ valid, assignments: rows.map(({ employeeId, share, primary }) => ({ employeeId, share: Number(share), primary })) }); }, [rows, valid, onChange]);
  const locked = disabled || readOnly || data?.captured || !can('ASSIGN_REPAIR',4);
  const canCommission = can('COMMISSIONS');
  const employees = useMemo(() => (data?.employees || []).filter(row => normalize(`${row.NAME} ${row.CHUYENMON || ''}`).includes(normalize(search))), [data, search]);
  const amounts = valid ? split(data.total, rows) : rows;
  const addEmployee = employee => setRows(current => {
    if (current.some(row => row.employeeId === employee.ID)) return current;
    return equalShares([...current, { employeeId: employee.ID, name: employee.NAME, primary: current.length === 0 }]);
  });
  return <section className="repair-assignment-panel">
    <div className="repair-assignment-heading"><b>Nhân viên thực hiện & Hoa hồng</b>{data && canCommission && <b>{money(data.total)}</b>}</div>
    {error ? <div role="alert" className="repair-assignment-error">{error} <button type="button" onClick={() => setVersion(value => value + 1)}>Tải lại</button></div> : !data ? <p role="status">Đang tải hoa hồng…</p> : <>
      <p className="repair-assignment-hint">{data.captured ? 'Mức hoa hồng và tỷ lệ chia đã được lưu theo phiếu.' : 'Chọn nhân viên cùng thực hiện cả phiếu. Mặc định chia đều; có thể chỉnh tỷ lệ trước khi xác nhận.'}</p>
      {!readOnly && !data.captured && <>
        <div className="repair-assignment-search"><Search size={15}/><input placeholder="Tìm tên, chuyên môn nhân viên…" value={search} onChange={event => setSearch(event.target.value)} disabled={disabled}/><button type="button" disabled={disabled || !can('EMPLOYEES',2)} onClick={() => setAdding(true)}><Plus size={14}/> Thêm</button></div>
        <div className="repair-assignment-options">{employees.map(employee => <label key={employee.ID}>
          <input type="checkbox" checked={rows.some(row => row.employeeId === employee.ID)} disabled={locked} onChange={event => {
            if (event.target.checked) addEmployee(employee);
            else setRows(current => { const next = current.filter(row => row.employeeId !== employee.ID); return equalShares(next.map((row, index) => ({ ...row, primary: next.some(item => item.primary) ? row.primary : index === 0 }))); });
          }}/><span>{employee.NAME}{employee.CHUYENMON && <small>{employee.CHUYENMON}</small>}</span>
        </label>)}{!employees.length && <span>Không tìm thấy nhân viên.</span>}</div>
      </>}
      <div className="repair-assignment-table-wrap"><table><thead><tr><th>Nhân viên</th><th>Phụ trách chính</th><th>Tỷ lệ (%)</th><th>Hoa hồng</th></tr></thead><tbody>
        {amounts.map(row => <tr key={row.employeeId}><td>{row.name}</td><td><input type="radio" name="primary-assignment" checked={row.primary} disabled={locked} aria-label={`Phụ trách chính: ${row.name}`} onChange={() => setRows(current => current.map(item => ({ ...item, primary: item.employeeId === row.employeeId })))}/></td>
          <td><input type="number" min="0.01" max="100" step="0.01" value={row.share} disabled={locked} aria-label={`Tỷ lệ chia: ${row.name}`} onChange={event => setRows(current => current.map(item => item.employeeId === row.employeeId ? { ...item, share: event.target.value } : item))}/></td>
          <td>{canCommission ? money(data.captured ? row.savedAmount : valid ? row.amount : 0) : '—'}</td></tr>)}
      </tbody></table></div>
      {!rows.length && <p className="repair-assignment-hint">{readOnly ? 'Phiếu cũ chưa có phân công và hoa hồng đã chốt.' : 'Chưa chọn nhân viên thực hiện.'}</p>}
      {!locked && rows.length > 0 && <div className={valid ? 'repair-assignment-hint' : 'repair-assignment-error'}>Tổng tỷ lệ: {totalShare}%{!valid && ' — cần đủ 100% và một người phụ trách chính.'}<button type="button" onClick={() => setRows(equalShares(rows))}>Chia đều</button></div>}
      {canCommission && <details className="repair-assignment-breakdown"><summary>Hoa hồng từng dịch vụ / phụ tùng</summary><table><thead><tr><th>Hạng mục</th><th>Mức áp dụng</th><th>Hoa hồng</th></tr></thead><tbody>{data.details.map(row => <tr key={row.ID}><td>{row.TEN}</td><td>{row.HHKIEU === 1 ? `${row.HHGIATRI}%` : row.HHKIEU === 2 ? `${money(row.HHGIATRI)} / đơn vị` : 'Không tính'}</td><td>{money(row.HOAHONG)}</td></tr>)}</tbody></table></details>}
    </>}
    <EmployeeFormModal open={adding} onClose={() => setAdding(false)} onCreated={(id, employees) => {
      setError('');
      setData(current => ({ ...current, employees })); const employee = employees.find(row => row.ID === id); if (employee) addEmployee(employee);
    }} notify={message => { if (!message.startsWith('Đã thêm')) setError(message); }}/>
  </section>;
}
