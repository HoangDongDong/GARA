import test from 'node:test';
import assert from 'node:assert/strict';
import { lastDraftVehicle, readRepairDraft, saveRepairDraft, removeRepairDraft, restoreDraftItems } from '../src/utils/repairDraft.js';

function storage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

const draft = {
  vehicleId: 'xe-2', customerId: 'kh-1', workflowId: null,
  fields: { date: '2026-10-08', staff: 'nv-1', currentKm: '12.000', note: 'Kiểm tra xe' },
  repairNotes: 'Khách yêu cầu thay dầu', discountOverride: 5,
  images: [{ name: 'xe.jpg', data: 'data:image/jpeg;base64,test' }],
  items: [{ id: 'PT-1', quantity: 2, price: 150000, note: 'Dầu máy', TILETHUE: 8, TILEGIAMGIA: 12 }],
};

test('saved draft survives a new read and restores all editable data after reload', () => {
  const store = storage();
  const saved = saveRepairDraft(store, draft);
  const reloaded = readRepairDraft(store, 'xe-2', 'kh-1');
  assert.deepEqual(reloaded, saved);
  assert.equal(lastDraftVehicle(store), 'xe-2');
  assert.ok(Date.parse(reloaded.savedAt));
  const catalog = [
    { id: 'PT-1', sourceId: '1', name: 'Dầu', price: 200000 },
    { id: 'DV-1', sourceId: '1', name: 'Thay dầu', checked: true, note: 'Xe khác', TILETHUE: 10 },
  ];
  const restored = restoreDraftItems(catalog, reloaded);
  assert.equal(restored[0].checked, true);
  assert.equal(restored[0].quantity, 2);
  assert.equal(restored[0].price, 150000);
  assert.equal(restored[0].TILETHUE, 8);
  assert.equal(restored[0].TILEGIAMGIA, 12);
  assert.equal(restored[0].note, 'Dầu máy');
  assert.equal(restored[1].checked, false);
  assert.equal(restored[1].note, '');
  assert.equal(restored[1].TILETHUE, undefined);
});

test('drafts are isolated by user, vehicle, customer and reception workflow', () => {
  const store = storage();
  store.setItem('garage_user', JSON.stringify({ USERNAME: 'admin' }));
  saveRepairDraft(store, draft);
  assert.equal(readRepairDraft(store, 'xe-1', 'kh-1'), null);
  assert.equal(readRepairDraft(store, 'xe-2', 'kh-2'), null);
  assert.equal(readRepairDraft(store, 'xe-2', 'kh-1', 'new-workflow'), null);
  store.setItem('garage_user', JSON.stringify({ USERNAME: 'other' }));
  assert.equal(readRepairDraft(store, 'xe-2', 'kh-1'), null);
  assert.equal(lastDraftVehicle(store), '');
});

test('saving again replaces selections and official save removes only that vehicle draft', () => {
  const store = storage();
  saveRepairDraft(store, { ...draft, vehicleId: 'xe-1' });
  saveRepairDraft(store, draft);
  saveRepairDraft(store, { ...draft, items: [] });
  assert.deepEqual(readRepairDraft(store, 'xe-2', 'kh-1').items, []);
  removeRepairDraft(store, 'xe-2');
  assert.equal(readRepairDraft(store, 'xe-2', 'kh-1'), null);
  assert.equal(lastDraftVehicle(store), '');
  assert.ok(readRepairDraft(store, 'xe-1', 'kh-1'));
});

test('storage errors reach the UI instead of reporting success', () => {
  const store = storage();
  store.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => saveRepairDraft(store, draft), /QuotaExceededError/);
  assert.equal(readRepairDraft(store, 'xe-2', 'kh-1'), null);
});

test('invalid versions are ignored and corrupt data can be reported by the UI', () => {
  const store = storage();
  store.setItem('garage_repair_draft:anonymous:xe-2', JSON.stringify({ ...draft, version: 0 }));
  assert.equal(readRepairDraft(store, 'xe-2', 'kh-1'), null);
  store.setItem('garage_repair_draft:anonymous:xe-2', '{');
  assert.throws(() => readRepairDraft(store, 'xe-2', 'kh-1'), SyntaxError);
});
