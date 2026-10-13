import {useEffect,useRef,useState} from 'react';
import {customers,masterData} from '../services';
import {can,canQuickCreate} from '../utils/permissions.js';
import {masterFormDefinitions} from '../pages/catalogDefinitions.js';
import CustomerFormModal from './CustomerFormModal';
import MasterDataFormModal from './MasterDataFormModal';

const empty={NAME:'',MAKHACH:'',DIENTHOAI:'',EMAIL:'',MASOTHUE:'',DIACHI:'',DNHOMKHACHHANGID:'',GIAMGIARIENG:''};
const message=error=>error.response?.data?.error || error.message;

export default function CustomerCreateModal({onClose,onCreated,notify=()=>{}}) {
  const [form,setForm]=useState(empty);
  const [groups,setGroups]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [groupForm,setGroupForm]=useState(null);
  const [groupSaving,setGroupSaving]=useState(false);
  const [groupError,setGroupError]=useState('');
  const pending=useRef(false), groupPending=useRef(false);
  useEffect(()=>{
    let active=true;
    masterData.customerGroups().then(rows=>{
      if(!active)return;
      const available=rows.filter(row=>Number(row.STATUS ?? 1)===1);
      setGroups(available);
      const retail=available.find(row=>String(row.NAME).normalize('NFD').replace(/[\u0300-\u036f\s]/g,'').toLowerCase().includes('khachle'));
      if(retail)setForm(current=>current.DNHOMKHACHHANGID ? current : {...current,DNHOMKHACHHANGID:retail.ID});
    }).catch(exception=>{if(active)setError(message(exception));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  const save=async event=>{
    event.preventDefault();event.stopPropagation();
    if(pending.current || loading)return;
    if(!form.NAME.trim())return setError('Vui lòng nhập tên khách hàng.');
    pending.current=true;setSaving(true);setError('');
    try {
      const payload=Object.fromEntries(Object.entries(form).map(([key,value])=>[key,String(value ?? '').trim() || null]));
      if(payload.GIAMGIARIENG != null)payload.GIAMGIARIENG=Number(payload.GIAMGIARIENG);
      const result=await customers.create(payload);
      const created={...payload,ID:result.id,MAKHACH:result.code,STATUS:1};
      let rows;
      try {rows=await customers.list();} catch {rows=[created];}
      await onCreated?.(result.id,rows,created);
      onClose();notify(`Đã thêm khách hàng ${payload.NAME}.`);
    } catch(exception) {setError(message(exception));}
    finally {pending.current=false;setSaving(false);}
  };
  const openGroup=()=>{
    if(!canQuickCreate('customer_groups'))return;
    setGroupError('');setGroupForm({NAME:'',GIAMGIARIENG:'',NOTE:''});
  };
  const saveGroup=async event=>{
    event.preventDefault();event.stopPropagation();
    if(groupPending.current)return;
    const name=groupForm.NAME.trim();
    if(!name)return setGroupError('Vui lòng nhập tên nhóm khách hàng.');
    if(groups.some(row=>row.NAME.trim().toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi')))return setGroupError('Nhóm khách hàng đã tồn tại.');
    groupPending.current=true;setGroupSaving(true);setGroupError('');
    try {
      const payload=can('CATALOG',2) ? {NAME:name,NOTE:groupForm.NOTE.trim() || null,GIAMGIARIENG:groupForm.GIAMGIARIENG === '' ? null : Number(groupForm.GIAMGIARIENG)} : {NAME:name};
      const result=await masterData.create('customer_groups',payload);
      setGroups(current=>[...current,{...payload,ID:result.id,STATUS:1}]);
      setForm(current=>({...current,DNHOMKHACHHANGID:result.id}));setGroupForm(null);
    } catch(exception) {setGroupError(message(exception));}
    finally {groupPending.current=false;setGroupSaving(false);}
  };
  const groupDefinition=can('CATALOG',2) ? masterFormDefinitions.customer_groups : {...masterFormDefinitions.customer_groups,fields:masterFormDefinitions.customer_groups.fields.filter(field=>field.key==='NAME')};
  return <>
    <CustomerFormModal formMode="add" form={form} setForm={setForm} customerGroups={groups} saving={loading || saving}
      formError={error} closeForm={()=>{if(!saving && !groupSaving)onClose();}} handleFormSubmit={save} openGroupForm={openGroup}/>
    {groupForm && <MasterDataFormModal definition={groupDefinition} mode="add" form={groupForm} setForm={setGroupForm}
      saving={groupSaving} error={groupError} onSubmit={saveGroup} onClose={()=>!groupSaving && setGroupForm(null)}/>}
  </>;
}
