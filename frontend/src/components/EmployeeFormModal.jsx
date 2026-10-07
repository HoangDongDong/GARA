import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, UserPlus, X } from 'lucide-react';
import { catalog, employees } from '../services';
import MasterDataFormModal from './MasterDataFormModal';
import { catalogDefinitions } from '../pages/catalogDefinitions';
import './EmployeeFormModal.css';
import EmployeePhoto from './EmployeePhoto';

const EMPTY = { NAME: '', CODE: '', DIENTHOAI: '', EMAIL: '', DIACHI: '', CHUNGCHI: '', CHUYENMON: '', NOTE: '', DPHONGBANID: '', LOAINHANVIEN: 1, CACHTINHLUONG: 0, LUONGTHANG: 0, LUONGCA: 0 };
const roles = ['Nhân viên', 'Kỹ thuật viên', 'Cố vấn dịch vụ', 'Thủ kho', 'Thu ngân'];
const errorText = error => error.response?.data?.error || error.message || 'Không lưu được hồ sơ nhân viên.';

export default function EmployeeFormModal({ open, onClose, onCreated, onUpdated, editingEmployee, notify = () => {} }) {
  const [form, setForm] = useState(EMPTY);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photo,setPhoto] = useState(undefined);
  const [readingPhoto,setReadingPhoto] = useState(false);
  const photoReadVersion = useRef(0);
  const photoInput = useRef(null);
  const [departmentForm, setDepartmentForm] = useState(null);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const pending = useRef(false);
  const firstInput = useRef(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setForm(Object.fromEntries(Object.entries(EMPTY).map(([key, value]) => [key, editingEmployee?.[key] ?? value])));
    setError(''); setDepartmentForm(null); setDepartments([]);
    setPhoto(undefined); setReadingPhoto(false); photoReadVersion.current += 1;
    employees.meta().then(data => { if (!cancelled) setDepartments(data.departments || []); }).catch(exception => { if (!cancelled) setError(errorText(exception)); });
    firstInput.current?.focus();
    return () => { cancelled = true; photoReadVersion.current += 1; };
  }, [open, editingEmployee]);
  if (!open) return null;
  const update = (key, value) => { setForm(current => ({ ...current, [key]: value })); setError(''); };
  const choosePhoto = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) return setError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 3 MB.');
    const version = ++photoReadVersion.current;
    setReadingPhoto(true); setError('');
    try {
      const result = await new Promise((resolve,reject) => {const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file);});
      // Decode locally before saving so malformed files cannot replace a working photo.
      await new Promise((resolve,reject) => {const image = new Image(); image.onload = resolve; image.onerror = () => reject(new Error('Ảnh không hợp lệ hoặc không mở được.')); image.src = result;});
      if (version === photoReadVersion.current) setPhoto(result);
    } catch(exception) {if (version === photoReadVersion.current) setError(exception.message);}
    finally {if (version === photoReadVersion.current) setReadingPhoto(false);}
  };
  const submit = async event => {
    event.preventDefault();
    if (pending.current || readingPhoto) return;
    if (!form.NAME.trim()) return setError('Vui lòng nhập họ và tên nhân viên.');
    pending.current = true; setSaving(true); setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, ['LOAINHANVIEN','CACHTINHLUONG','LUONGTHANG','LUONGCA'].includes(key) ? Number(value || 0) : String(value || '').trim()]));
      if (photo !== undefined) payload.PHOTO = photo;
      const result = editingEmployee ? await employees.update(editingEmployee.ID, payload) : await employees.create(payload);
      const rows = await employees.list();
      await (editingEmployee ? onUpdated || onCreated : onCreated)?.(editingEmployee?.ID || result.id, rows);
      onClose();
      notify(`Đã ${editingEmployee ? 'cập nhật' : 'thêm'} hồ sơ nhân viên ${payload.NAME}.`);
    } catch (exception) { setError(errorText(exception)); }
    finally { pending.current = false; setSaving(false); }
  };
  const saveDepartment = async event => {
    event.preventDefault();
    if (departmentBusy) return;
    setDepartmentBusy(true); setDepartmentError('');
    try {
      const result = await catalog.create('departments', departmentForm);
      setDepartments(current => [...current, { ...departmentForm, ID: result.id, STATUS: 1 }]);
      update('DPHONGBANID', result.id); setDepartmentForm(null);
    } catch (exception) { setDepartmentError(errorText(exception)); }
    finally { setDepartmentBusy(false); }
  };
  const field = (key, label, props = {}) => <label className={props.full ? 'employee-form-full' : ''}>
    <span>{label}{props.required && ' *'}</span><input ref={key === 'NAME' ? firstInput : undefined} required={props.required} disabled={saving} maxLength={255} type={props.type || 'text'} value={form[key]} onChange={event => update(key, event.target.value)} placeholder={props.placeholder}/>
  </label>;
  return createPortal(<>
    <div className="employee-form-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form className="employee-form-card" onSubmit={submit} role="dialog" aria-modal="true" aria-label={editingEmployee ? 'Sửa hồ sơ nhân viên' : 'Thêm hồ sơ nhân viên'}>
        <header><b><UserPlus size={18}/> {editingEmployee ? 'Sửa hồ sơ nhân viên' : 'Thêm nhân viên'}</b><button type="button" disabled={saving} onClick={onClose} aria-label="Đóng"><X size={20}/></button></header>
        <div className="employee-form-body">
          <div className="employee-photo-editor"><EmployeePhoto employee={editingEmployee} src={photo === null ? '' : photo}/><div><b>Ảnh nhân viên</b><p>JPG, PNG hoặc WebP · tối đa 3 MB</p><input ref={photoInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={choosePhoto}/><div><button type="button" disabled={saving || readingPhoto} onClick={() => photoInput.current?.click()}>{readingPhoto ? 'Đang đọc ảnh…' : 'Chọn ảnh'}</button>{(photo || (photo === undefined && Number(editingEmployee?.CO_ANHNV) === 1)) && <button type="button" disabled={saving || readingPhoto} onClick={() => setPhoto(null)}>Bỏ ảnh</button>}</div></div></div>
          <h3>Thông tin nhân viên</h3><div className="employee-form-grid">
            {field('NAME', 'Họ và tên', { required: true, full: true })}{field('CODE', 'Mã nhân viên', { placeholder: 'Để trống để tự tạo mã' })}
            <label><span>Vai trò công việc</span><select value={form.LOAINHANVIEN} disabled={saving} onChange={event => update('LOAINHANVIEN', event.target.value)}>{roles.map((role, index) => <option key={role} value={index}>{role}</option>)}</select></label>
            <label className="employee-form-full"><span>Phòng ban</span><div className="employee-form-select-add"><select disabled={saving} value={form.DPHONGBANID} onChange={event => update('DPHONGBANID', event.target.value)}><option value="">Chưa phân phòng ban</option>{departments.filter(row => Number(row.STATUS) === 1 || row.ID === form.DPHONGBANID).map(row => <option key={row.ID} value={row.ID}>{row.NAME}{Number(row.STATUS) !== 1 ? ' (ngừng sử dụng)' : ''}</option>)}</select><button type="button" disabled={saving} onClick={() => { setDepartmentError(''); setDepartmentForm({ NAME: '', CODE: '', NOTE: '' }); }}><Plus size={14}/> Thêm</button></div></label>
            {field('DIENTHOAI', 'Số điện thoại')}{field('EMAIL', 'Email', { type: 'email' })}{field('DIACHI', 'Địa chỉ', { full: true })}{field('CHUYENMON', 'Chuyên môn', { placeholder: 'Máy, điện, gầm, đồng sơn…', full: true })}{field('CHUNGCHI', 'Chứng chỉ', { full: true })}
          </div>
          <h3>Lương cơ bản</h3><div className="employee-form-grid">
            <label><span>Cách tính lương</span><select value={form.CACHTINHLUONG} disabled={saving} onChange={event => update('CACHTINHLUONG', event.target.value)}><option value="0">Theo tháng</option><option value="1">Theo ca</option></select></label>
            <label><span>{Number(form.CACHTINHLUONG) === 1 ? 'Lương mỗi ca (đ)' : 'Lương cơ bản mỗi tháng (đ)'}</span><input type="number" min="0" max="1000000000" step="0.01" disabled={saving} value={Number(form.CACHTINHLUONG) === 1 ? form.LUONGCA : form.LUONGTHANG} onChange={event => update(Number(form.CACHTINHLUONG) === 1 ? 'LUONGCA' : 'LUONGTHANG', event.target.value)}/></label>
          </div>
          <p className="employee-form-note">Hoa hồng được cấu hình theo dịch vụ / phụ tùng và chia khi xác nhận sửa chữa. Tài khoản, nhóm quyền được quản lý tại Quản trị - Phân quyền.</p>
          <label><span>Ghi chú</span><textarea rows={2} maxLength={255} disabled={saving} value={form.NOTE} onChange={event => update('NOTE', event.target.value)}/></label>
          {error && <p className="employee-form-error" role="alert">{error}</p>}
        </div>
        <footer><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" className="employee-form-primary" disabled={saving || readingPhoto}>{saving ? 'Đang lưu…' : 'Lưu nhân viên'}</button></footer>
      </form>
    </div>
    {departmentForm && <MasterDataFormModal definition={catalogDefinitions.departments} mode="add" form={departmentForm} setForm={setDepartmentForm} saving={departmentBusy} error={departmentError} onSubmit={saveDepartment} onClose={() => { if (!departmentBusy) setDepartmentForm(null); }}/>}
  </>, document.body);
}
