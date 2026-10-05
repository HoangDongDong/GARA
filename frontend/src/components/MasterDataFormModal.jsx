import { useEffect, useRef } from 'react';
import RatePolicyField from './RatePolicyField';
import { X } from 'lucide-react';
import './MasterDataFormModal.css';

export default function MasterDataFormModal({ definition, mode, form, setForm, options = {}, onSubmit, onClose, saving, error, unavailable }) {
  const firstField = useRef(null);
  const modal = useRef(null);
  useEffect(() => {
    firstField.current?.focus();
    const keyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
      if (event.key === 'Tab') {
        const controls = [...modal.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keyDown);
    return () => document.removeEventListener('keydown', keyDown);
  }, [saving]);
  return <div className="master-form-backdrop"><form ref={modal} className="master-form-modal" role="dialog" aria-modal="true" aria-labelledby="master-form-title" onSubmit={onSubmit}>
    <header><h2 id="master-form-title">{mode === 'add' ? 'Thêm' : 'Sửa'} {definition.name.toLowerCase()}</h2><button type="button" aria-label="Đóng form" disabled={saving} onClick={onClose}><X size={19}/></button></header>
    <div className="master-form-fields">{unavailable && <p className="master-form-unavailable">Danh mục chưa có bảng trong database. Form đã được chuẩn bị; chưa thể lưu.</p>}
      {definition.fields.map((field, index) => {
        if(field.type === 'ratePolicy') {
          const group = options.service_categories?.find(row => row.ID === form.DLOAIDICHVUID);
          return <RatePolicyField key={field.key} label={field.label} value={form[field.key]} disabled={saving} onChange={value => setForm(current => ({...current,[field.key]:value}))}
            inheritLabel={field.key === 'GIAMGIARIENG' ? 'Mặc định 0%' : form.DLOAIDICHVUID ? 'Theo nhóm dịch vụ' : 'Theo cấu hình'} inheritedRate={field.key === 'GIAMGIARIENG' ? 0 : group?.THUESUATRIENG} inheritedSource={group?.NAME} />;
        }
        const props = { ref: index===0?firstField:undefined, id:`master-field-${field.key}`,value:form[field.key]??'',required:field.required,disabled:saving,onChange:(event)=>setForm((current)=>({...current,[field.key]:event.target.value})) };
        const values=field.options||options[field.lookup];
        return <label key={field.key} htmlFor={props.id}>{field.label}{field.required && <span> *</span>}{field.type==='textarea'?<textarea {...props} rows={3} maxLength={255}/>:values?<select {...props}><option value="">-- Chọn --</option>{values.map((item)=><option key={item.ID} value={item.ID}>{item.NAME}{Number(item.STATUS)===0?' (ngừng sử dụng)':''}</option>)}</select>:<input {...props} type={field.type||'text'} min={field.type==='number'?0:undefined} step={field.type==='number'?'any':undefined} maxLength={255}/>}</label>;
      })}
      {error && <p role="alert" className="master-form-error">{error}</p>}
    </div>
    <footer><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" disabled={saving||unavailable}>{saving?'Đang lưu…':'Lưu thông tin'}</button></footer>
  </form></div>;
}
