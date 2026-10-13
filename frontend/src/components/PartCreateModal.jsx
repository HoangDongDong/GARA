import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { catalog, parts } from '../services';
import { can } from '../utils/permissions.js';
import { masterFormDefinitions } from '../pages/catalogDefinitions.js';
import PartFormModal from './PartFormModal';
import MasterDataFormModal from './MasterDataFormModal';

const empty = {NAME:'',CODE:'',BARCODE:'',MAOEM:'',DNHOMMATHANGID:'',DDONVITINHID:'',DHANGSANXUATID:'',DVITRIKHOID:'',GIANHAP:'',GIABAN:'',BAOHANH:'',TONTOITHIEU:'',TONTOIDA:'',MASANCO:'',THUESUATRIENG:'',HHKIEU:0,HHGIATRI:0,ANH:''};
const optionTypes = {
  group:{resource:'categories',metaKey:'nhom',field:'DNHOMMATHANGID'},
  unit:{resource:'units',metaKey:'dvt',field:'DDONVITINHID'},
  manufacturer:{resource:'manufacturers',metaKey:'hangsx',field:'DHANGSANXUATID'},
  location:{resource:'locations',metaKey:'vitri',field:'DVITRIKHOID'},
};
const message = error => error.response?.data?.error || error.message;

export default function PartCreateModal({onClose,onCreated,groupId='',warehouseId=''}) {
  const [form,setForm] = useState({...empty,DNHOMMATHANGID:groupId});
  const [meta,setMeta] = useState({nhom:[],dvt:[],hangsx:[],vitri:[]});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [option,setOption] = useState(null);
  const [optionError,setOptionError] = useState('');
  const [optionSaving,setOptionSaving] = useState(false);
  const pending = useRef(false);
  const optionPending = useRef(false);
  useEffect(() => {
    let active=true;
    parts.meta().then(data => {if(active)setMeta(data);})
      .catch(exception => {if(active)setError(message(exception));})
      .finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  },[]);
  const save = async event => {
    event.preventDefault(); event.stopPropagation();
    if(pending.current || loading) return;
    if(!can('CATALOG',2)) return setError('Bạn chưa có quyền thêm mặt hàng.');
    if(!form.NAME.trim()) return setError('Vui lòng nhập tên mặt hàng.');
    pending.current=true;setSaving(true);setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key,value]) => [key,typeof value === 'string' ? value.trim() : value]));
      for(const key of ['GIANHAP','GIABAN','BAOHANH','TONTOITHIEU','TONTOIDA','HHKIEU','HHGIATRI']) payload[key]=Number(payload[key] || 0);
      payload.THUESUATRIENG = payload.THUESUATRIENG === '' ? null : Number(payload.THUESUATRIENG);
      if(!can('COST')) delete payload.GIANHAP;
      if(!can('COMMISSIONS',4)) {delete payload.HHKIEU;delete payload.HHGIATRI;}
      const result = await parts.create(payload);
      onCreated?.({...payload,CODE:result.code,BARCODE:result.code,ID:result.id,STATUS:1,CO_ANH:payload.ANH ? 1 : 0,TON_KHO:0});
      onClose();
    } catch(exception) {setError(message(exception));}
    finally {pending.current=false;setSaving(false);}
  };
  const openOption = async type => {
    if(loading || saving) return;
    const config=optionTypes[type], definition=masterFormDefinitions[config.resource];
    setOptionError('');
    setOption({config,definition,options:{},form:{...Object.fromEntries(definition.fields.map(field => [field.key,''])),...(type === 'location' ? {DKHOHANGID:warehouseId} : {})}});
    if(type === 'location') {
      try {
        const result=await catalog.resource('warehouses');
        setOption(current => current && {...current,options:{warehouses:result.data}});
      } catch(exception) {setOptionError(message(exception));}
    }
  };
  const saveOption = async event => {
    event.preventDefault();event.stopPropagation();
    if(optionPending.current) return;
    optionPending.current=true;setOptionSaving(true);setOptionError('');
    try {
      const payload=Object.fromEntries(Object.entries(option.form).map(([key,value]) => [key,typeof value === 'string' ? value.trim() || null : value]));
      const result=await catalog.create(option.config.resource,payload);
      setMeta(current => ({...current,[option.config.metaKey]:[...current[option.config.metaKey],{...payload,ID:result.id,STATUS:1}]}));
      setForm(current => ({...current,[option.config.field]:result.id}));
      setOption(null);
    } catch(exception) {setOptionError(message(exception));}
    finally {optionPending.current=false;setOptionSaving(false);}
  };
  return createPortal(<>
    <PartFormModal partForm={form} setPartForm={setForm} savingPart={loading || saving} partFormError={error} partMeta={meta}
      setShowAddPartModal={() => {if(!saving && !loading)onClose();}} handleCreatePart={save} openAddPartOption={openOption}/>
    {option && <MasterDataFormModal definition={option.definition} mode="add" form={option.form}
      setForm={value => setOption(current => ({...current,form:typeof value === 'function' ? value(current.form) : value}))}
      options={option.options} saving={optionSaving} error={optionError} onSubmit={saveOption} onClose={() => !optionSaving && setOption(null)}/>}
  </>,document.body);
}
