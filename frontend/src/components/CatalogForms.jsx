import CustomerFormModal from './CustomerFormModal';
import SupplierFormModal from './SupplierFormModal';
import PartFormModal from './PartFormModal';
import VehicleProfileModal from './VehicleProfileModal';
import MasterDataFormModal from './MasterDataFormModal';
import { parts } from '../services';

export default function CatalogForms({ controller: c }) {
  const e = c.editor;
  const groups = c.definition.groups.filter((row) => Number(row.STATUS) === 1 || row.ID === e?.record[c.definition.groupField]);
  const mode = !e?.isGroup ? c.definition.editor : null;
  const common = e ? { formMode:e.mode, form:e.record, setForm:c.setForm, saving:c.saving, formError:c.formError, closeForm:c.closeEditor } : {};
  return <>
    {e && mode === 'customer' && <CustomerFormModal {...common} customerGroups={c.options.customer_groups || groups} handleFormSubmit={c.saveEditor} openGroupForm={() => c.openQuickMaster('customer_groups','DNHOMKHACHHANGID')}/>}
    {e && mode === 'supplier' && <SupplierFormModal {...common} groupList={c.options.supplier_groups || groups} handleSubmit={c.saveEditor} openGroupForm={() => c.openQuickMaster('supplier_groups','DNHOMNHACUNGCAPID')}/>}
    {e && mode === 'part' && <PartFormModal formMode={e.mode} partForm={e.record} setPartForm={c.setForm} savingPart={c.saving} partFormError={c.formError} partMeta={{nhom:c.options.categories || groups,dvt:c.options.units||[],hangsx:c.options.manufacturers||[],vitri:c.options.locations||[]}} imagePreview={e.raw?.CO_ANH ? parts.imageUrl(e.id) : ''} setShowAddPartModal={c.closeEditor} handleCreatePart={c.saveEditor} openAddPartOption={(key)=>{const map={group:['categories','DNHOMMATHANGID'],unit:['units','DDONVITINHID'],manufacturer:['manufacturers','DHANGSANXUATID'],location:['locations','DVITRIKHOID']};c.openQuickMaster(...map[key]);}}/>}
    {e && mode === 'vehicle' && <VehicleProfileModal open onClose={c.closeEditor} editingVehicle={e.mode==='edit'?e.raw:null} onCreated={(row)=>{c.closeEditor();c.load(c.type,row?.ID||row?.id);}} onUpdated={(row)=>{c.closeEditor();c.load(c.type,row?.ID||row?.id);}} notify={()=>{}}/>}
    {e && !mode && <MasterDataFormModal definition={e.definition} mode={e.mode} form={e.record} setForm={c.setForm} options={c.options} saving={c.saving} error={c.formError} unavailable={e.unavailable} onSubmit={c.saveEditor} onClose={c.closeEditor}/>}
    {c.subEditor && <MasterDataFormModal definition={c.subEditor.definition} mode="add" form={c.subEditor.record} setForm={(value)=>c.setSubEditor((existing)=>({...existing,record:typeof value==='function'?value(existing.record):value}))} options={c.options} saving={c.saving} error={c.subError} unavailable={c.subEditor.unavailable} onSubmit={c.saveQuickMaster} onClose={()=>!c.saving&&c.setSubEditor(null)}/>}
  </>;
}
