import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const dom = require('@xmldom/xmldom');
// Browser DOM compatibility for the XML-only model tests.
const probe = new dom.DOMParser().parseFromString('<Report/>', 'application/xml');
const elementProto = Object.getPrototypeOf(probe.documentElement);
if (!('children' in probe.documentElement)) Object.defineProperty(elementProto, 'children', { get() { return Array.from(this.childNodes).filter(n => n.nodeType === 1); } });
if (!('parentElement' in probe.documentElement)) Object.defineProperty(elementProto, 'parentElement', { get() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; } });
elementProto.remove = function () { this.parentNode.removeChild(this); };
Object.getPrototypeOf(probe).querySelector = function () { return null; };
globalThis.DOMParser = class extends dom.DOMParser { constructor() { super({ onError: () => { throw new Error('Invalid XML'); } }); } };
globalThis.XMLSerializer = dom.XMLSerializer;
const { layoutFrx, editFrx, addObject, removeObject, removeTablePart, serialize, samplePayload, parseFrx, copyObjects, pasteObjects, groupMoveAttributes, reportMoveAttributes, resizeObjectAttributes, editObjects } = await import('../src/components/frxDesigner.js');
const receipt = fs.readFileSync(new URL('../../backend/templates/gara/MauHoaDonBanHang-80mm-gon.frx', import.meta.url), 'utf8');

const grid = '<Report><Dictionary/><ReportPage><DataBand Height="100"><TableObject Name="Grid"><TableColumn Width="20"/><TableColumn Width="30"/><TableColumn Width="40"/><TableRow Height="15"><TableCell Name="A" Text="[Table0.Name]"/><TableCell Name="B"/><TableCell Name="C"/></TableRow><TableRow Height="25"><TableCell Name="D"/><TableCell Name="E"/><TableCell Name="F"/></TableRow></TableObject><TextObject Name="Outside" Text="Giữ nguyên"/></DataBand></ReportPage></Report>';
test('resize one object from edges or corners without changing its neighbours', () => {
  const xml = '<Report><ReportPage><ReportTitleBand><TextObject Name="A" Left="10" Top="20" Width="80" Height="30" Text="[LoiCamOn]"/><TextObject Name="B" Left="100" Top="20"/></ReportTitleBand></ReportPage></Report>';
  const model = layoutFrx(xml), item = model.objects[0];
  assert.deepEqual(resizeObjectAttributes(item, 'e', 15, 100, false), {Width:95});
  assert.deepEqual(resizeObjectAttributes(item, 's', 100, 10, false), {Height:40});
  const attrs = resizeObjectAttributes(item, 'nw', -100, 10, false);
  assert.deepEqual(attrs, {Left:0, Width:90, Top:30, Height:20});
  const after = layoutFrx(editObjects(xml, {[item.path]:attrs}));
  assert.equal(after.objects[0].left + after.objects[0].width, 90);
  assert.equal(after.objects[0].top + after.objects[0].height, 50);
  assert.equal(after.objects[1].left, 100);
  assert.equal(after.objects[0].node.getAttribute('Text'), '[LoiCamOn]');
  assert.ok(resizeObjectAttributes(item, 'se', -1000, -1000, false).Width > 0);
});
test('dragging all objects across repeating bands changes margin, never row padding', () => {
  const xml = '<Report><ReportPage TopMargin="5"><ReportTitleBand Height="40"><TextObject Name="Title" Top="2"/></ReportTitleBand><DataBand Height="24"><TableObject Name="Detail"><TableColumn Width="100"/><TableRow Height="24"><TableCell Text="[Table0.Name]"/></TableRow></TableObject><DataHeaderBand Height="24"><TextObject Name="Header"/></DataHeaderBand></DataBand></ReportPage></Report>';
  const model = layoutFrx(xml), items = model.objects.filter(o => !o.locked);
  const after = layoutFrx(editObjects(xml, reportMoveAttributes(model, items, 0, 11.34)));
  assert.equal(after.page.getAttribute('TopMargin'), '8');
  assert.deepEqual(after.objects.map(o => o.top), model.objects.map(o => o.top));
  assert.deepEqual(after.bands.map(o => o.height), model.bands.map(o => o.height));
  const partial = reportMoveAttributes(model, items.filter(o => o.node.getAttribute('Name') !== 'Title'), 0, 11.34);
  assert.ok(Object.values(partial).every(attrs => attrs.TopMargin === undefined));
});
test('delete a whole column across rows and preserve surviving bindings', () => {
  const model = layoutFrx(grid);
  const result = removeTablePart(grid, model.objects.find(o => o.node.getAttribute('Name') === 'E').path, 'column');
  const doc = parseFrx(result.xml);
  assert.equal(doc.getElementsByTagName('TableColumn').length, 2);
  assert.deepEqual(Array.from(doc.getElementsByTagName('TableCell')).map(n => n.getAttribute('Name')), ['A', 'C', 'D', 'F']);
  assert.equal(doc.getElementsByTagName('TableObject')[0].getAttribute('Width'), '60');
  assert.equal(doc.getElementsByTagName('TableCell')[0].getAttribute('Text'), '[Table0.Name]');
  assert.equal(doc.getElementsByTagName('TextObject')[0].getAttribute('Text'), 'Giữ nguyên');
});
test('delete a row, retain minimum dimensions, and reject non-table selection', () => {
  const first = layoutFrx(grid).objects.find(o => o.node.getAttribute('Name') === 'A');
  const result = removeTablePart(grid, first.path, 'row');
  const model = layoutFrx(result.xml);
  assert.equal(model.objects.find(o => o.type === 'TableObject').height, 25);
  assert.deepEqual(model.objects.filter(o => o.type === 'TableCell').map(o => o.node.getAttribute('Name')), ['D', 'E', 'F']);
  assert.throws(() => removeTablePart(result.xml, model.objects.find(o => o.type === 'TableCell').path, 'row'), /ít nhất/);
  assert.throws(() => removeTablePart(grid, layoutFrx(grid).objects.find(o => o.type === 'TextObject').path, 'column'), /Chọn một ô/);
});
test('deleting a merged anchor keeps its content in the surviving cell', () => {
  for (const kind of ['row', 'column']) {
    const xml = grid.replace('Name="A"', `Name="A" ${kind === 'row' ? 'RowSpan' : 'ColSpan'}="2"`);
    const model = layoutFrx(xml);
    const result = removeTablePart(xml, model.objects.find(o => o.node.getAttribute('Name') === 'A').path, kind);
    const doc = parseFrx(result.xml), cells = Array.from(doc.getElementsByTagName('TableCell'));
    assert.equal(cells.filter(n => n.getAttribute('Name') === 'A').length, 1);
    assert.equal(cells[0].getAttribute('Text'), '[Table0.Name]');
    assert.equal(cells[0].getAttribute(kind === 'row' ? 'RowSpan' : 'ColSpan'), '1');
  }
});

test('group drag shares one delta across bands and clamps without collapsing spacing', () => {
  const xml = '<Report><Dictionary/><ReportPage><ReportTitleBand Height="50"><TextObject Name="A" Left="5" Top="4" Text="[CompanyName]"/><TextObject Name="B" Left="25" Top="14"/></ReportTitleBand><DataBand Height="50"><TextObject Name="C" Left="15" Top="8"/></DataBand></ReportPage></Report>';
  const before = layoutFrx(xml);
  const updates = groupMoveAttributes(before.objects, -20, -30, false);
  const after = layoutFrx(editObjects(xml, updates));
  assert.deepEqual(after.objects.map(o => [o.left, o.top]), [[0, 0], [20, 10], [10, 4]]);
  assert.equal(after.objects[0].node.getAttribute('Text'), '[CompanyName]');
  assert.equal(after.objects[2].band.path, before.objects[2].band.path);
  const snapped = groupMoveAttributes(before.objects, 4, 8, true);
  assert.equal(snapped[before.objects[0].path].Left, 8.78);
});

test('copy/paste a table once, uniquely rename children, and move only its parent', () => {
  const xml = '<Report><ReportPage><DataBand Height="80"><TableObject Name="Grid" Left="10" Top="5"><TableColumn Name="Col" Width="40"/><TableRow Name="Row" Height="25"><TableCell Name="Cell" Text="[Table0.Name]"/></TableRow></TableObject></DataBand></ReportPage></Report>';
  const model = layoutFrx(xml);
  const copies = copyObjects(xml, model.objects.map(o => o.path));
  assert.equal(copies.length, 1);
  const pasted = pasteObjects(xml, copies);
  const twice = pasteObjects(pasted.xml, copies);
  const doc = parseFrx(twice.xml);
  const names = Array.from(doc.getElementsByTagName('*')).map(n => n.getAttribute('Name')).filter(Boolean);
  assert.equal(new Set(names).size, names.length);
  const updates = groupMoveAttributes(model.objects, 10, 20, false);
  assert.equal(Object.keys(updates).length, 1);
  const moved = layoutFrx(editObjects(xml, updates));
  assert.equal(moved.objects[1].left, 20);
  assert.equal(moved.objects[1].top, 25);
  assert.equal(moved.objects[1].node.getAttribute('Text'), '[Table0.Name]');
  assert.equal(moved.objects[1].node.hasAttribute('Left'), false);
});

test('moving text preserves dictionary, expressions, formatting and unrelated objects', () => {
  const before = layoutFrx(receipt);
  const item = before.objects.find(o => o.node.getAttribute('Name') === 'Text7');
  const changed = editFrx(receipt, item.path, { Left: 3.78, Top: 7.56 });
  const after = layoutFrx(changed);
  const text = after.objects.find(o => o.node.getAttribute('Name') === 'Text7');
  assert.equal(text.node.getAttribute('Left'), '3.78');
  assert.equal(text.node.getAttribute('Text'), '[Table0.ItemName]');
  const serializer = new dom.XMLSerializer();
  assert.equal(serializer.serializeToString(before.doc.getElementsByTagName('Dictionary')[0]), serializer.serializeToString(after.doc.getElementsByTagName('Dictionary')[0]));
  assert.equal(after.objects.find(o => o.node.getAttribute('Name') === 'Text8').node.getAttribute('Format.GroupSeparator'), '.');
});
test('nested data headers precede detail rows without changing XML parenting', () => {
  const model = layoutFrx(receipt);
  assert.ok(model.bands.findIndex(b => b.name === 'Columns') < model.bands.findIndex(b => b.name === 'Items'));
  assert.equal(model.bands.find(b => b.name === 'Columns').node.parentElement.tagName, 'DataBand');
});
test('add, remove and serialize round trip retain scripts and unknown nodes', () => {
  const xml = '<Report><ScriptText><![CDATA[x < 2 && y > 1]]></ScriptText><Dictionary/><ReportPage Name="P"><ReportTitleBand Name="B" Width="100" Height="25"><BarcodeObject Name="Barcode" Text="[ID]"/></ReportTitleBand></ReportPage></Report>';
  const model = layoutFrx(xml);
  const result = addObject(xml, model.bands[0].path, 'TextObject', 'A & B < C');
  assert.equal(layoutFrx(result.xml).objects.length, 2);
  const restored = removeObject(result.xml, result.path);
  assert.equal(layoutFrx(restored).objects.length, 1);
  assert.equal(parseFrx(restored).getElementsByTagName('ScriptText')[0].textContent, 'x < 2 && y > 1');
  assert.ok(serialize(parseFrx(restored)).startsWith('<?xml'));
  assert.throws(() => removeObject(restored, layoutFrx(restored).objects[0].path));
});
test('table cells keep column/row geometry and cannot be deleted as loose objects', () => {
  const xml = '<Report><ReportPage><DataBand Height="50"><TableObject Left="10" Top="5"><TableColumn Width="40"/><TableColumn Width="60"/><TableRow Height="25"><TableCell Name="C1" Text="A"/><TableCell Name="C2" Text="[Table0.Name]"/></TableRow></TableObject></DataBand></ReportPage></Report>';
  const model = layoutFrx(xml), cell = model.objects.find(o => o.node.getAttribute('Name') === 'C2');
  assert.equal(cell.left, 50); assert.equal(cell.top, 5); assert.equal(cell.width, 60); assert.equal(cell.locked, true);
  const changed = layoutFrx(editFrx(xml, cell.path, { Text: 'Tên mới' }));
  assert.equal(changed.objects.find(o => o.node.getAttribute('Name') === 'C2').node.getAttribute('Text'), 'Tên mới');
  assert.throws(() => removeObject(xml, cell.path));
});
test('sample preview data is typed and includes table rows and declared fields', () => {
  const data = samplePayload(receipt);
  assert.equal(data.parameters.PrintShow_thanks, true);
  assert.equal(data.tables.Table0.length, 3);
  assert.equal(data.tables.Table0[0].DONGIA, 100);
  assert.ok(layoutFrx(receipt).fields.includes('Table0.ItemName'));
  const old = samplePayload('<Report><Dictionary><Total Name="Total SLX"/></Dictionary><ReportPage><ReportTitleBand><TextObject Text="[In bởi] [Date] [Total SLX]"/></ReportTitleBand></ReportPage></Report>');
  assert.equal(old.parameters['In bởi'], 'Dữ liệu mẫu');
  assert.ok(!('Date' in old.parameters)); assert.ok(!('Total SLX' in old.parameters));
});
test('new tables have named columns and cells; moving the table moves cells without rewriting their text', () => {
  const original = layoutFrx(receipt), added = addObject(receipt, original.bands[0].path, 'TableObject');
  const model = layoutFrx(added.xml), table = model.objects.find(o => o.path === added.path);
  const moved = layoutFrx(editFrx(added.xml, table.path, { Left: 12, Top: 20 }));
  const cells = moved.objects.filter(o => o.tablePath === table.path);
  assert.equal(cells.length, 3); assert.equal(cells[0].left, 12); assert.equal(cells[0].top, 20);
  assert.equal(cells[0].node.getAttribute('Text'), 'Cột 1');
});
test('every shipped report can be displayed and edited without losing dictionary or script text', () => {
  let count = 0;
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.frx')) {
      const source = fs.readFileSync(full, 'utf8'), model = layoutFrx(source);
      assert.ok(model.pages.length > 0, full);
      for (let i = 0; i < model.pages.length; i++) layoutFrx(source, i);
      const item = model.objects.find(o => o.type === 'TextObject');
      if (item) {
        const result = layoutFrx(editFrx(source, item.path, { Left: 7.56 }));
        assert.equal(result.doc.getElementsByTagName('Dictionary')[0]?.textContent, model.doc.getElementsByTagName('Dictionary')[0]?.textContent);
        assert.equal(result.doc.getElementsByTagName('ScriptText')[0]?.textContent, model.doc.getElementsByTagName('ScriptText')[0]?.textContent);
      }
      count++;
    }
  } }
  walk(new URL('../../backend/templates', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
  assert.ok(count >= 60);
});
test('invalid XML and DTD cannot enter the model', () => {
  assert.throws(() => layoutFrx('<Report><ReportPage></Report>'));
  assert.throws(() => parseFrx('<!DOCTYPE Report><Report/>'));
});
