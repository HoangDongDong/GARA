const VERSION = 1;

function prefix(storage) {
  const user = JSON.parse(storage.getItem('garage_user') || '{}');
  return `garage_repair_draft:${encodeURIComponent(user.ID || user.USERNAME || 'anonymous')}:`;
}

export function lastDraftVehicle(storage) {
  try { return storage.getItem(`${prefix(storage)}lastVehicle`) || ''; }
  catch { return ''; }
}

export function readRepairDraft(storage, vehicleId, customerId, workflowId = null) {
  const draft = JSON.parse(storage.getItem(`${prefix(storage)}${vehicleId}`) || 'null');
  if (!draft || draft.version !== VERSION || String(draft.vehicleId) !== String(vehicleId)
    || String(draft.customerId) !== String(customerId) || (draft.workflowId || null) !== (workflowId || null)
    || !Array.isArray(draft.items)) return null;
  return draft;
}

export function saveRepairDraft(storage, draft) {
  const saved = { ...draft, version: VERSION, savedAt: new Date().toISOString() };
  storage.setItem(`${prefix(storage)}${draft.vehicleId}`, JSON.stringify(saved));
  // The draft itself is already saved even if the navigation hint cannot be written.
  try { storage.setItem(`${prefix(storage)}lastVehicle`, String(draft.vehicleId)); } catch {}
  return saved;
}

export function removeRepairDraft(storage, vehicleId) {
  const keyPrefix = prefix(storage);
  storage.removeItem(`${keyPrefix}${vehicleId}`);
  if (storage.getItem(`${keyPrefix}lastVehicle`) === String(vehicleId)) storage.removeItem(`${keyPrefix}lastVehicle`);
}

export function restoreDraftItems(catalog, draft) {
  const items = new Map(draft.items.map(item => [item.id, item]));
  return catalog.map(({ TILETHUE, TILEGIAMGIA, ...item }) => {
    const saved = items.get(item.id);
    return saved ? { ...item, checked: true, quantity: saved.quantity, price: saved.price,
      note: saved.note || '', TILETHUE: saved.TILETHUE, TILEGIAMGIA: saved.TILEGIAMGIA }
      : { ...item, checked: false, quantity: 1, note: '' };
  });
}
