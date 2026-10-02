import { useEffect, useState } from 'react';
import { UserPlus, XCircle } from 'lucide-react';
import { employees } from '../services';

const EMPTY = { NAME: '', DIENTHOAI: '', EMAIL: '', CHUNGCHI: '', CHUYENMON: '' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#525252' };
const inputStyle = { height: 38, border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 10px', fontSize: 12, outlineColor: '#E65100' };

export default function EmployeeFormModal({ open, onClose, onCreated, notify = () => {} }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(EMPTY); }, [open]);
  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.NAME.trim()) return notify('Vui lòng nhập họ tên nhân viên.');
    setSaving(true);
    try {
      const result = await employees.create(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])));
      const rows = await employees.list();
      await onCreated?.(result.id, Array.isArray(rows) ? rows : []);
      onClose();
      notify(`Đã thêm hồ sơ nhân viên ${form.NAME.trim()}. Tài khoản và chức vụ được cấp tại Quản trị - Phân quyền.`);
    } catch (error) { notify(error?.response?.data?.error || error.message || 'Không thể thêm nhân viên.'); }
    finally { setSaving(false); }
  };

  const field = (key, label, placeholder, props = {}) => (
    <label style={{ ...labelStyle, ...(props.full ? { gridColumn: '1/-1' } : {}) }}>
      {label}{props.required && <span style={{ color: '#D32F2F' }}> *</span>}
      <input type={props.type || 'text'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} style={inputStyle} autoFocus={key === 'NAME'} />
    </label>
  );

  return <div onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <form onSubmit={submit} style={{ width: 'min(680px,96vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.3)' }}>
      <div style={{ background: '#E65100', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}><UserPlus size={17}/> THÊM HỒ SƠ NHÂN VIÊN</b>
        <button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer' }}><XCircle size={19}/></button>
      </div>
      <div style={{ padding: 18, background: '#fff7ed', borderBottom: '1px solid #fed7aa', color: '#9a3412', fontSize: 11.5 }}>
        Chức vụ, nhóm quyền và tài khoản đăng nhập sẽ được thiết lập riêng trong <b>Quản trị - Phân quyền</b>.
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
        {field('NAME', 'Họ và tên', 'Nhập họ và tên...', { required: true, full: true })}
        {field('DIENTHOAI', 'Số điện thoại', '09xx xxx xxx')}
        {field('EMAIL', 'Email', 'email@congty.vn', { type: 'email' })}
        {field('CHUNGCHI', 'Chứng chỉ', 'Chứng chỉ kỹ thuật ô tô...', { full: true })}
        {field('CHUYENMON', 'Kỹ năng chuyên môn', 'Động cơ, gầm, điện ô tô...', { full: true })}
      </div>
      <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
        <button type="button" onClick={onClose} style={{ height: 36, padding: '0 18px' }}>Hủy</button>
        <button type="submit" disabled={saving} style={{ height: 36, padding: '0 20px', background: '#E65100', color: '#fff', border: 0, borderRadius: 4, fontWeight: 700 }}>{saving ? 'Đang lưu...' : 'Lưu nhân viên'}</button>
      </div>
    </form>
  </div>;
}
