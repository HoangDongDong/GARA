import { useEffect, useState } from 'react';
import { UserPlus, XCircle } from 'lucide-react';
import { employees } from '../services';

const DEFAULT_ROLES = [
  { key: '1', label: 'Kỹ thuật viên' }, { key: '2', label: 'Cố vấn dịch vụ' },
  { key: '4', label: 'Thu ngân' }, { key: '0', label: 'Lễ tân' }, { key: '3', label: 'Thủ kho' },
];
const DEFAULT_DEPARTMENTS = ['Sửa chữa', 'Dịch vụ', 'Kế toán', 'Kho hàng', 'Văn phòng'];
const EMPTY = { NAME: '', DIENTHOAI: '', EMAIL: '', CERT: '', CHUYENMON: '', ROLEKEY: '1', ROLELABEL: 'Kỹ thuật viên', DEPARTMENT: 'Dịch vụ' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161' };
const inputStyle = { height: 36, border: '1px solid #ccc', borderRadius: 4, padding: '0 9px', fontSize: 11, outlineColor: '#E65100' };
const addButtonStyle = { height: 36, padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };

export default function EmployeeFormModal({ open, onClose, onCreated, notify = () => {} }) {
  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [saving, setSaving] = useState(false);
  const [optionType, setOptionType] = useState(null);
  const [optionName, setOptionName] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setOptionType(null);
    employees.list().then((rows) => {
      const customRoles = [];
      const customDepartments = [];
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        try {
          const note = JSON.parse(row.NOTE || '{}');
          if (note.chucVu) customRoles.push(note.chucVu);
          if (note.phongBan) customDepartments.push(note.phongBan);
        } catch {}
      });
      const roleLabels = new Set(DEFAULT_ROLES.map((item) => item.label.toLocaleLowerCase('vi')));
      setRoles([...DEFAULT_ROLES, ...[...new Set(customRoles)].filter((name) => !roleLabels.has(name.toLocaleLowerCase('vi'))).map((name) => ({ key: `custom:${name}`, label: name }))]);
      setDepartments([...new Set([...DEFAULT_DEPARTMENTS, ...customDepartments])]);
    }).catch(() => {});
  }, [open]);

  if (!open) return null;

  const openOption = (type) => { setOptionType(type); setOptionName(''); };
  const addOption = (event) => {
    event.preventDefault();
    const name = optionName.trim();
    if (!name) return notify(`Vui lòng nhập tên ${optionType === 'role' ? 'chức vụ' : 'phòng ban'}.`);
    if (optionType === 'role') {
      const existing = roles.find((item) => item.label.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
      const option = existing || { key: `custom:${name}`, label: name };
      if (!existing) setRoles((current) => [...current, option]);
      setForm((current) => ({ ...current, ROLEKEY: option.key, ROLELABEL: option.label }));
    } else {
      const existing = departments.find((item) => item.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
      const value = existing || name;
      if (!existing) setDepartments((current) => [...current, value]);
      setForm((current) => ({ ...current, DEPARTMENT: value }));
    }
    setOptionType(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.NAME.trim()) return notify('Vui lòng nhập họ tên nhân viên.');
    if (!form.DIENTHOAI.trim()) return notify('Vui lòng nhập số điện thoại nhân viên.');
    setSaving(true);
    try {
      const result = await employees.create({
        NAME: form.NAME.trim(), DIENTHOAI: form.DIENTHOAI.trim(), CHUYENMON: form.CHUYENMON.trim(),
        LOAINHANVIEN: form.ROLEKEY.startsWith('custom:') ? 0 : Number(form.ROLEKEY),
        NOTE: JSON.stringify({ chucVu: form.ROLELABEL, phongBan: form.DEPARTMENT, email: form.EMAIL.trim(), chungChi: form.CERT.trim() }),
      });
      const rows = await employees.list();
      await onCreated?.(result.id, Array.isArray(rows) ? rows : []);
      onClose(); notify(`Đã thêm nhân viên ${form.NAME.trim()}.`);
    } catch (error) { notify(error?.response?.data?.error || error.message || 'Không thể thêm nhân viên.'); }
    finally { setSaving(false); }
  };

  return <>
    <div onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ width: 'min(700px,96vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.3)' }}>
        <div style={{ background: '#E65100', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}><UserPlus size={17}/> ＋ THÊM NHÂN VIÊN MỚI</b><button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer' }}><XCircle size={18}/></button></div>
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ ...labelStyle, gridColumn: '1/-1' }}>Họ và tên <span style={{color:'#D32F2F'}}>*</span><input autoFocus value={form.NAME} onChange={(e)=>setForm({...form,NAME:e.target.value})} placeholder="Nhập họ và tên..." style={inputStyle}/></label>
          <label style={labelStyle}>Chức vụ<div style={{display:'flex',gap:6}}><select value={form.ROLEKEY} onChange={(e)=>{const option=roles.find(x=>x.key===e.target.value);setForm({...form,ROLEKEY:e.target.value,ROLELABEL:option?.label||''});}} style={{...inputStyle,background:'#fff',flex:1,minWidth:0}}>{roles.map(x=><option key={x.key} value={x.key}>{x.label}</option>)}</select><button type="button" onClick={()=>openOption('role')} style={addButtonStyle}>＋ Thêm</button></div></label>
          <label style={labelStyle}>Phòng ban<div style={{display:'flex',gap:6}}><select value={form.DEPARTMENT} onChange={(e)=>setForm({...form,DEPARTMENT:e.target.value})} style={{...inputStyle,background:'#fff',flex:1,minWidth:0}}>{departments.map(x=><option key={x}>{x}</option>)}</select><button type="button" onClick={()=>openOption('department')} style={addButtonStyle}>＋ Thêm</button></div></label>
          <label style={labelStyle}>Số điện thoại <span style={{color:'#D32F2F'}}>*</span><input value={form.DIENTHOAI} onChange={(e)=>setForm({...form,DIENTHOAI:e.target.value})} placeholder="09xx xxx xxx" style={inputStyle}/></label>
          <label style={labelStyle}>Email<input type="email" value={form.EMAIL} onChange={(e)=>setForm({...form,EMAIL:e.target.value})} placeholder="email@..." style={inputStyle}/></label>
          <label style={{...labelStyle,gridColumn:'1/-1'}}>Chứng chỉ<input value={form.CERT} onChange={(e)=>setForm({...form,CERT:e.target.value})} placeholder="Chứng chỉ kỹ thuật ô tô..." style={inputStyle}/></label>
          <label style={{...labelStyle,gridColumn:'1/-1'}}>Kỹ năng chuyên môn<input value={form.CHUYENMON} onChange={(e)=>setForm({...form,CHUYENMON:e.target.value})} placeholder="Động cơ, gầm hộp số, điện ô tô..." style={inputStyle}/></label>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 9 }}><button type="button" onClick={onClose} style={{height:36,padding:'0 18px'}}>Hủy</button><button type="submit" disabled={saving} style={{height:36,padding:'0 20px',background:'#E65100',color:'#fff',border:0,borderRadius:4,fontWeight:700}}>{saving?'Đang lưu...':'Lưu nhân viên'}</button></div>
      </form>
    </div>
    {optionType && <div style={{position:'fixed',inset:0,zIndex:10020,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><form onSubmit={addOption} style={{width:420,background:'#fff',borderRadius:7,overflow:'hidden'}}><div style={{background:'#E65100',color:'#fff',padding:11,fontWeight:700}}>＋ THÊM {optionType==='role'?'CHỨC VỤ':'PHÒNG BAN'} MỚI</div><div style={{padding:14}}><input autoFocus value={optionName} onChange={(e)=>setOptionName(e.target.value)} placeholder="Nhập tên..." style={{...inputStyle,width:'100%'}}/><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}><button type="button" onClick={()=>setOptionType(null)}>Hủy</button><button type="submit">Thêm mới</button></div></div></form></div>}
  </>;
}
