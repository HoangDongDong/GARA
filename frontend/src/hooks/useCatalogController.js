import { useEffect, useMemo, useRef, useState } from 'react';
import { catalog, customers, suppliers, parts } from '../services';
import { catalogDefinitions, masterFormDefinitions, displayCatalogValue } from '../pages/catalogDefinitions';

export const ALL = '__all__';
export const UNGROUPED = '__ungrouped__';
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const message = (error) => error?.response?.data?.error || error.message || 'Không thể tải dữ liệu.';
const blankData = () => Object.fromEntries(Object.entries(catalogDefinitions).map(([key, definition]) => [key, { ...definition, rows: [], groups: [], lookups: {}, available: true, groupsAvailable: true }]));
const formatForm = (definition, row = {}) => Object.fromEntries(definition.fields.map((field) => {
  let value = row[field.key] ?? '';
  if (field.type === 'time' && value) {
    const date = new Date(value);
    value = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  }
  return [field.key, String(value)];
}));
export default function useCatalogController() {
  const [data, setData] = useState(blankData);
  const [type, setType] = useState('customers');
  const [group, setGroup] = useState(ALL);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [subEditor, setSubEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [subError, setSubError] = useState('');
  const [options, setOptions] = useState({});
  const request = useRef(0);
  const currentType = useRef(type);
  const mounted = useRef(true);
  const definition = data[type];
  const shownRows = useMemo(() => definition.rows.filter((row) =>
    (definition.simple || group === ALL || row.groupId === (group === UNGROUPED ? '' : group)) &&
    (status === 'all' || row.active === (status === 'active')) &&
    normalize(row.values.join(' ')).includes(normalize(search))
  ), [definition, group, search, status]);
  const selected = shownRows.find((row) => row.id === selectedId) || shownRows[0];
  async function load(key = currentType.current, preferredId) {
    const sequence = ++request.current;
    setLoading(true); setError('');
    try {
      const result = await catalog.load(key);
      if (!mounted.current || sequence !== request.current || key !== currentType.current) return;
      setData((existing) => ({ ...existing, [key]: {
        ...catalogDefinitions[key], ...result,
        rows: result.data.map((raw) => ({ id: raw.ID, raw, active: Number(raw.STATUS) === 1, groupId: raw.GROUP_ID || '', values: catalogDefinitions[key].columnFields.map((field) => displayCatalogValue(raw, field)) })),
      } }));
      if (preferredId) setSelectedId(preferredId);
    } catch (exception) { if (mounted.current && sequence === request.current) setError(message(exception)); }
    finally { if (mounted.current && sequence === request.current) setLoading(false); }
  }
  useEffect(() => { mounted.current = true; load(type); return () => { request.current++; }; }, [type]);
  useEffect(() => () => { mounted.current = false; }, []);
  function selectType(key) {
    if (saving) return;
    currentType.current = key;
    setType(key); setGroup(ALL); setSearch(''); setStatus('active'); setSelectedId(null); setNotice(''); setError(''); setEditor(null); setSubEditor(null);
  }
  function closeEditor() { if (!saving) { setEditor(null); setSubEditor(null); setFormError(''); } }
  async function prepareOptions(formDefinition) {
    const values = { ...definition.lookups };
    if (definition.groupResource) values[definition.groupResource] = definition.groups;
    await Promise.all([...new Set(formDefinition.fields.map((field) => field.lookup).filter(Boolean))].map(async (key) => {
      if (!values[key]) {
        const result = await catalog.resource(key);
        if (!result.available) throw new Error('Danh mục tham chiếu chưa có bảng trong database.');
        values[key] = result.data;
      }
    }));
    setOptions(values);
  }
  async function openEditor(mode) {
    if (loading || saving || error) return;
    setFormError('');
    const isGroup = mode.includes('group');
    const formDefinition = isGroup ? masterFormDefinitions[definition.groupResource] : catalogDefinitions[type];
    if (!formDefinition) return;
    const source = isGroup ? definition.groups.find((row) => String(row.ID) === group) : selected?.raw;
    const record = formatForm(formDefinition, mode.startsWith('edit') ? source : {});
    if (mode === 'add' && definition.groupField && ![ALL, UNGROUPED].includes(group)) record[definition.groupField] = group;
    if (mode === 'add' && type === 'banks' && ![ALL, UNGROUPED].includes(group)) record.TENNGANHANG = group;
    if (mode === 'add' && type === 'cashReasons') record.LOAI = [ALL, UNGROUPED].includes(group) ? '0' : group;
    if (!isGroup && type === 'parts') record.ANH = mode === 'edit' ? undefined : '';
    setEditor({ mode: mode.startsWith('edit') ? 'edit' : 'add', isGroup, definition: formDefinition, resource: isGroup ? definition.groupResource : definition.resource, id: mode.startsWith('edit') ? source?.ID : null, raw: mode === 'edit' ? source : null, record, unavailable: isGroup ? !definition.groupsAvailable : !definition.available });
    try { await prepareOptions(formDefinition); } catch (exception) { setFormError(message(exception)); }
  }
  function setForm(value) { setEditor((existing) => existing ? { ...existing, record: typeof value === 'function' ? value(existing.record) : value } : existing); }
  async function saveEditor(event) {
    event.preventDefault();
    if (!editor || saving || editor.unavailable) return;
    const payload = Object.fromEntries(editor.definition.fields.map((field) => {
      const value = editor.record[field.key];
      if (field.type === 'time') return [field.key, value ? `1970-01-01T${value}:00` : null];
      if (field.type === 'number') return [field.key, Number(value || 0)];
      return [field.key, typeof value === 'string' ? value.trim() || null : value];
    }));
    if (editor.definition.fields.some((field) => field.required && !String(payload[field.key] ?? '').trim())) { setFormError('Vui lòng điền các trường bắt buộc.'); return; }
    if (type === 'parts' && !editor.isGroup && editor.record.ANH !== undefined) payload.ANH = editor.record.ANH;
    const service = !editor.isGroup ? { customers, suppliers, parts }[type] || catalog : catalog;
    setSaving(true); setFormError('');
    try {
      const result = service === catalog
        ? await catalog[editor.mode === 'edit' ? 'update' : 'create'](...(editor.mode === 'edit' ? [editor.resource, editor.id, payload] : [editor.resource, payload]))
        : await service[editor.mode === 'edit' ? 'update' : 'create'](...(editor.mode === 'edit' ? [editor.id, payload] : [payload]));
      const id = editor.id || result.id;
      if (editor.isGroup) setGroup(id); else { setGroup(ALL); setSearch(''); setStatus('active'); }
      setEditor(null); setNotice('Đã lưu dữ liệu.'); await load(type, editor.isGroup ? null : id);
    } catch (exception) { setFormError(message(exception)); }
    finally { setSaving(false); }
  }
  async function toggleActive() {
    if (!selected || loading || saving) return;
    setSaving(true); setNotice(''); setError('');
    try { await catalog.setStatus(definition.resource, selected.id, selected.active ? 0 : 1); setNotice(selected.active ? 'Đã ngừng sử dụng bản ghi.' : 'Đã khôi phục bản ghi.'); await load(type); }
    catch (exception) { setError(message(exception)); }
    finally { setSaving(false); }
  }
  async function openQuickMaster(resource, targetField, nameText) {
    const formDefinition = masterFormDefinitions[resource];
    if (!formDefinition) return;
    setSubError('');
    setSubEditor({ resource, targetField, definition: formDefinition, record: formatForm(formDefinition), unavailable: false });
    try {
      const result = await catalog.resource(resource);
      setSubEditor((existing) => existing && { ...existing, unavailable: !result.available });
      await prepareOptions(formDefinition);
    } catch (exception) { setSubError(message(exception)); }
  }
  async function saveQuickMaster(event) {
    event.preventDefault();
    if (!subEditor || saving || subEditor.unavailable) return;
    setSaving(true); setSubError('');
    try {
      const payload = Object.fromEntries(subEditor.definition.fields.map((field) => [field.key, subEditor.record[field.key]?.trim() || null]));
      const result = await catalog.create(subEditor.resource, payload);
      setForm((existing) => ({ ...existing, [subEditor.targetField]: result.id }));
      const refresh = await catalog.resource(subEditor.resource);
      setOptions((existing) => ({ ...existing, [subEditor.resource]: refresh.data }));
      if (subEditor.resource === definition.groupResource) setData((existing) => ({ ...existing, [type]: { ...existing[type], groups: refresh.data } }));
      setSubEditor(null);
    } catch (exception) { setSubError(message(exception)); }
    finally { setSaving(false); }
  }
  const groupOptions = definition.simple ? [] : [ALL, UNGROUPED, ...definition.groups.map((item) => String(item.ID))];
  const groupName = group === ALL ? 'Tất cả' : group === UNGROUPED ? 'Chưa phân nhóm' : definition.groups.find((item) => String(item.ID) === group)?.NAME || '';
  const groupTitle = definition.group || '';
  const groupAddLabel = groupTitle === 'Kho hàng' ? 'Thêm kho' : groupTitle === 'Hãng xe' ? 'Thêm hãng' : 'Thêm nhóm';
  return { data, type, definition, group, setGroup, search, setSearch, status, setStatus, selectedId, setSelectedId, shownRows, selected, notice, loading, error, saving, editor, setEditor, subEditor, setSubEditor, formError, subError, options, groupOptions, groupName, groupTitle, groupAddLabel, listTitle:definition.listTitle || definition.name, selectType, closeEditor, openEditor, saveEditor, setForm, toggleActive, openQuickMaster, saveQuickMaster, load };
}
