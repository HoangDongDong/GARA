import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { catalog, masterData } from '../services';
import { can, canQuickCreate } from '../utils/permissions.js';
import { catalogDefinitions, masterFormDefinitions } from '../pages/catalogDefinitions.js';
import MasterDataFormModal from './MasterDataFormModal';
import EmployeeFormModal from './EmployeeFormModal';
import VehicleProfileModal from './VehicleProfileModal';

export default function QuickCreateButton({ resource, title, label, disabled, onCreated, initialValues = {} }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const definition = masterFormDefinitions[resource] || catalogDefinitions[resource];
  const allowed = resource === 'employees' ? can('EMPLOYEES', 2) : resource === 'vehicles' ? can('VEHICLES', 2) || can('REPAIR', 2) : canQuickCreate(resource);
  if (!allowed) return null;
  const start = async () => {
    setError(''); setOpen(true);
    if (!definition) return;
    setForm({...Object.fromEntries(definition.fields.map(field => [field.key, ''])), ...initialValues});
    setOptions({});
    try {
      const keys = [...new Set(definition.fields.map(field => field.lookup).filter(Boolean))];
      const results = await Promise.all(keys.map(key => masterData.list(key).then(data => ({data}))));
      setOptions(Object.fromEntries(keys.map((key, index) => [key, results[index].data])));
    } catch (exception) { setError(exception.response?.data?.error || exception.message); }
  };
  const saved = async (id, rows) => {
    await onCreated?.(id, rows.find(row => row.ID === id), rows);
    setOpen(false);
  };
  const submit = async event => {
    event.preventDefault(); event.stopPropagation();
    if (saving) return;
    setSaving(true); setError('');
    try {
      const result = await (['brands','models','customer_groups','supplier_groups'].includes(resource) ? masterData.create(resource, form) : catalog.create(resource, form));
      await saved(result.id, [{...form, ID: result.id, STATUS: 1}]);
    } catch (exception) { setError(exception.response?.data?.error || exception.message); }
    finally { setSaving(false); }
  };
  return <><button type="button" className="quick-create-button" disabled={disabled} title={title} aria-label={title} onClick={start}><Plus size={16}/>{label && <span>{label}</span>}</button>
    {open && resource === 'employees' && <EmployeeFormModal open onClose={() => setOpen(false)} onCreated={saved}/>} 
    {open && resource === 'vehicles' && createPortal(<VehicleProfileModal open onClose={() => setOpen(false)} onCreated={saved}/>, document.body)}
    {open && definition && resource !== 'vehicles' && <MasterDataFormModal definition={definition} mode="add" form={form} setForm={setForm} options={options} saving={saving} error={error} onSubmit={submit} onClose={() => !saving && setOpen(false)}/>} 
  </>;
}
