import Time24Field from './Time24Field';
import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { catalog, masterData } from '../services';
import { masterFormDefinitions } from '../pages/catalogDefinitions.js';
import { canQuickCreate } from '../utils/permissions.js';
import RatePolicyField from './RatePolicyField';
import CommissionConfig from './CommissionConfig';
import { Plus, X } from 'lucide-react';
import './MasterDataFormModal.css';

export default function MasterDataFormModal({ definition, mode, form, setForm, options = {}, onSubmit, onClose, saving, error, unavailable }) {
  const modalId = useId();
  const [quickOptions, setQuickOptions] = useState({});
  const [quick, setQuick] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [addedOptions, setAddedOptions] = useState({});
  const openQuick = async field => {
    setQuickError('');
    const definition = masterFormDefinitions[field.lookup];
    setQuick({ field, definition, form: Object.fromEntries(definition.fields.map(item => [item.key, ''])) });
    setQuickOptions({});
    try {
      const keys = [...new Set(definition.fields.map(item => item.lookup).filter(Boolean))];
      const results = await Promise.all(keys.map(key => ['brands','models','customer_groups','supplier_groups'].includes(key) ? masterData.list(key).then(data => ({data})) : catalog.resource(key)));
      setQuickOptions(Object.fromEntries(keys.map((key, index) => [key, results[index].data])));
    } catch (exception) { setQuickError(exception.response?.data?.error || exception.message); }
  };
  const saveQuick = async event => {
    event.preventDefault(); event.stopPropagation();
    if (quickSaving) return;
    setQuickSaving(true); setQuickError('');
    try {
      const resource = quick.field.lookup;
      const result = await (['brands','models','customer_groups','supplier_groups'].includes(resource) ? masterData.create(resource, quick.form) : catalog.create(resource, quick.form));
      const row = {...quick.form, ID: result.id, STATUS: 1};
      setAddedOptions(current => ({...current, [quick.field.lookup]: [...(current[quick.field.lookup] || []), row]}));
      setForm(current => ({...current, [quick.field.key]: result.id}));
      setQuick(null);
    } catch (exception) { setQuickError(exception.response?.data?.error || exception.message); }
    finally { setQuickSaving(false); }
  };
  const firstField = useRef(null);
  const modal = useRef(null);
  useEffect(() => {
    firstField.current?.focus();
    const keyDown = (event) => {
      if (modal.current?.closest('.master-form-backdrop') !== [...document.querySelectorAll('.master-form-backdrop')].at(-1)) return;
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
  return createPortal(<><div className="master-form-backdrop"><form ref={modal} className="master-form-modal" role="dialog" aria-modal="true" aria-labelledby={`${modalId}-title`} onSubmit={event => { event.stopPropagation(); onSubmit(event); }}>
    <header><h2 id={`${modalId}-title`}>{mode === 'add' ? 'Thêm' : 'Sửa'} {definition.name.toLowerCase()}</h2><button type="button" aria-label="Đóng form" disabled={saving} onClick={onClose}><X size={19}/></button></header>
    <div className="master-form-fields">{unavailable && <p className="master-form-unavailable">Danh mục chưa có bảng trong database. Form đã được chuẩn bị; chưa thể lưu.</p>}
      {definition.fields.map((field, index) => {
        if (field.type === 'hidden') return null;
        if (field.type === 'commission') return <CommissionConfig key={field.key} form={form} setForm={setForm} disabled={saving} />;
        if(field.type === 'ratePolicy') {
          const group = [...(options.service_categories || []), ...(addedOptions.service_categories || [])].find(row => row.ID === form.DLOAIDICHVUID);
          return <RatePolicyField key={field.key} label={field.label} value={form[field.key]} disabled={saving} onChange={value => setForm(current => ({...current,[field.key]:value}))}
            inheritLabel={field.key === 'GIAMGIARIENG' ? 'Mặc định 0%' : form.DLOAIDICHVUID ? 'Theo nhóm dịch vụ' : 'Theo cấu hình'} inheritedRate={field.key === 'GIAMGIARIENG' ? 0 : group?.THUESUATRIENG} inheritedSource={group?.NAME} />;
        }
        const props = { ref: index===0?firstField:undefined, id:`${modalId}-field-${field.key}`,value:form[field.key]??'',required:field.required,disabled:saving,onChange:(event)=>setForm((current)=>({...current,[field.key]:event.target.value})) };
        if(field.type === 'time') return <label key={field.key} htmlFor={props.id}>{field.label}{field.required && <span> *</span>}
          <Time24Field id={props.id} label={field.label} value={form[field.key] ?? ''} required={field.required} disabled={saving}
            onChange={value=>setForm(current=>({...current,[field.key]:value}))}/></label>;
        const values=field.options || (field.lookup ? [...(options[field.lookup] || []), ...(addedOptions[field.lookup] || [])].filter((item, index, all) => all.findIndex(row => row.ID === item.ID) === index && (Number(item.STATUS ?? 1) === 1 || item.ID === form[field.key])) : null);
        return <label key={field.key} htmlFor={props.id}>{field.label}{field.required && <span> *</span>}{field.type==='textarea'?<textarea {...props} rows={3} maxLength={255}/>:values?<div className="master-select-add"><select {...props}><option value="">-- Chọn --</option>{values.map((item)=><option key={item.ID} value={item.ID}>{item.NAME}{Number(item.STATUS)===0?' (ngừng sử dụng)':''}</option>)}</select>{field.lookup && masterFormDefinitions[field.lookup] && canQuickCreate(field.lookup) && <button type="button" disabled={saving} title={`Thêm ${field.label.toLowerCase()}`} aria-label={`Thêm ${field.label.toLowerCase()}`} onClick={() => openQuick(field)}><Plus size={14}/> Thêm</button>}</div>:<input {...props} type={field.type||'text'} min={field.type==='number'?0:undefined} step={field.type==='number'?'any':undefined} placeholder={mode === 'add' ? field.placeholder : undefined} maxLength={255}/>}</label>;
      })}
      {error && <p role="alert" className="master-form-error">{error}</p>}
    </div>
    <footer><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button type="submit" disabled={saving||unavailable}>{saving?'Đang lưu…':'Lưu thông tin'}</button></footer>
  </form></div>{quick && <MasterDataFormModal definition={quick.definition} mode="add" form={quick.form} setForm={value => setQuick(current => ({...current,form:typeof value === 'function' ? value(current.form) : value}))} options={{...options, ...quickOptions, ...Object.fromEntries(Object.entries(addedOptions).map(([key, rows]) => [key, [...(options[key] || []), ...rows]]))}} saving={quickSaving} error={quickError} onSubmit={saveQuick} onClose={() => !quickSaving && setQuick(null)}/>}</>, document.body);
}
