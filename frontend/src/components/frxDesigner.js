// Edit the original XML tree: dictionary, scripts, expressions and unknown nodes
// are never reconstructed from the visual representation.
export const MM = 3.78;
export const number = (node, key, fallback = 0) => {
  const value = Number(node.getAttribute(key));
  return node.hasAttribute(key) && Number.isFinite(value) ? value : fallback;
};
export function parseFrx(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Mẫu có khai báo DTD không được hỗ trợ.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.tagName !== 'Report') throw new Error('Mẫu FRX không phải XML Report hợp lệ.');
  return doc;
}
export function serialize(doc) {
  const xml = new XMLSerializer().serializeToString(doc);
  return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;
}
export function pathOf(node) {
  const parts = [];
  while (node.parentElement) {
    parts.unshift(Array.from(node.parentElement.children).indexOf(node));
    node = node.parentElement;
  }
  return parts.join('/');
}
export function findNode(doc, path) {
  return path === '' ? doc.documentElement : path.split('/').reduce((node, index) => node?.children[Number(index)], doc.documentElement);
}
export function editFrx(xml, path, attributes) {
  const doc = parseFrx(xml), node = findNode(doc, path);
  if (!node) throw new Error('Không tìm thấy đối tượng trong mẫu.');
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return serialize(doc);
}
export function groupMoveAttributes(items, dx, dy, snap = true) {
  const movable = items.filter(item => !item.locked);
  if (!movable.length) return {};
  const round = value => snap ? Math.round(value / MM) * MM : Math.round(value * 100) / 100;
  // Clamp the shared delta, not each object, to keep the group's spacing.
  dx = Math.max(round(dx), -Math.min(...movable.map(item => number(item.node, 'Left'))));
  dy = Math.max(round(dy), -Math.min(...movable.map(item => number(item.node, 'Top'))));
  return Object.fromEntries(movable.map(item => [item.path, {
    Left: number(item.node, 'Left') + dx, Top: number(item.node, 'Top') + dy,
  }]));
}
export function reportMoveAttributes(model, items, dx, dy, snap = true) {
  const bandPaths = new Set(items.map(item => item.band.path));
  if (bandPaths.size <= 1) return groupMoveAttributes(items, dx, dy, snap);
  // A band is repeated independently by FastReport: adding Top to its cells
  // introduces padding on EVERY printed row. Translate the entire page using
  // its margin instead when all movable objects are selected.
  const updates = groupMoveAttributes(items, dx, 0, snap);
  const selectedPaths = new Set(items.map(item => item.path));
  if (model.objects.filter(item => !item.locked).every(item => selectedPaths.has(item.path))) {
    const delta = snap ? Math.round(dy / MM) : dy / MM;
    updates[pathOf(model.page)] = { TopMargin: Math.max(0, number(model.page, 'TopMargin', 10) + delta) };
  }
  return updates;
}
export function resizeObjectAttributes(item, handle, dx, dy, snap = true) {
  const round = value => snap ? Math.round(value / MM) * MM : Math.round(value * 100) / 100;
  dx = round(dx); dy = round(dy);
  const left = number(item.node, 'Left'), top = number(item.node, 'Top');
  const attrs = {};
  if (handle.includes('e')) attrs.Width = Math.max(MM, item.width + dx);
  if (handle.includes('w')) {
    attrs.Left = Math.max(0, Math.min(left + dx, left + item.width - MM));
    attrs.Width = left + item.width - attrs.Left;
  }
  if (item.type !== 'LineObject') {
    if (handle.includes('s')) attrs.Height = Math.max(MM, item.height + dy);
    if (handle.includes('n')) {
      attrs.Top = Math.max(0, Math.min(top + dy, top + item.height - MM));
      attrs.Height = top + item.height - attrs.Top;
    }
  }
  return attrs;
}
export function editObjects(xml, updates) {
  const doc = parseFrx(xml);
  for (const [path, attrs] of Object.entries(updates)) {
    const node = findNode(doc, path);
    if (!node) throw new Error('Không tìm thấy đối tượng trong mẫu.');
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  }
  return serialize(doc);
}
export function fontOf(node) {
  const font = node.getAttribute('Font') || 'Arial, 10pt';
  return { family: font.split(',')[0], size: Number(font.match(/([\d.]+)pt/)?.[1]) || 10, bold: /Bold/i.test(font), italic: /Italic/i.test(font), underline: /Underline/i.test(font) };
}
export function layoutFrx(xml, pageIndex = 0) {
  const doc = parseFrx(xml), pages = Array.from(doc.getElementsByTagName('ReportPage'));
  const page = pages[pageIndex];
  if (!page) throw new Error('Mẫu chưa có trang ReportPage.');
  const bands = [], objects = [];
  let y = 0;
  function visitObject(node, band, x = 0, top = 0, locked = false) {
    if (node.tagName.endsWith('Band')) return;
    const type = node.tagName;
    const left = x + number(node, 'Left'), objTop = top + number(node, 'Top');
    const width = number(node, 'Width', 80), height = number(node, 'Height', 20);
    const supported = ['TextObject', 'PictureObject', 'LineObject', 'ShapeObject', 'TableCell'].includes(type);
    if (type === 'TableObject') {
      const columns = Array.from(node.children).filter(n => n.tagName === 'TableColumn');
      const rows = Array.from(node.children).filter(n => n.tagName === 'TableRow');
      objects.push({ node, path: pathOf(node), band, type, left, top: objTop, width: columns.reduce((sum, col) => sum + number(col, 'Width', 80), 0), height: rows.reduce((sum, row) => sum + number(row, 'Height', 20), 0), locked });
      let rowTop = objTop;
      rows.forEach((row, rowIndex) => {
        let colLeft = left;
        Array.from(row.children).filter(n => n.tagName === 'TableCell').forEach((cell, colIndex) => {
          const colWidth = number(columns[colIndex] || cell, 'Width', 80);
          const span = Math.max(1, number(cell, 'ColSpan', 1));
          const cellWidth = columns.slice(colIndex, colIndex + span).reduce((sum, col) => sum + number(col, 'Width', 80), 0) || colWidth;
          const cellHeight = rows.slice(rowIndex, rowIndex + Math.max(1, number(cell, 'RowSpan', 1))).reduce((sum, r) => sum + number(r, 'Height', 20), 0);
          objects.push({ node: cell, path: pathOf(cell), band, type: 'TableCell', left: colLeft, top: rowTop, width: cellWidth, height: cellHeight, locked: true, column: columns[colIndex], row, tablePath: pathOf(node) });
          colLeft += colWidth;
        });
        rowTop += number(row, 'Height', 20);
      });
      return;
    }
    objects.push({ node, path: pathOf(node), band, type, left, top: objTop, width, height, locked: locked || !supported });
    // Nested report containers keep their relative coordinate system.
    Array.from(node.children).filter(n => /Object$/.test(n.tagName)).forEach(child => visitObject(child, band, left, objTop, true));
  }
  function visitBand(node) {
    const nested = Array.from(node.children).filter(n => n.tagName.endsWith('Band'));
    nested.filter(n => /HeaderBand$/.test(n.tagName)).forEach(visitBand);
    const band = { node, path: pathOf(node), top: y, height: Math.max(12, number(node, 'Height', 24)), name: node.getAttribute('Name') || node.tagName, type: node.tagName };
    bands.push(band);
    Array.from(node.children).filter(n => !n.tagName.endsWith('Band')).forEach(child => {
      if (/Object$/.test(child.tagName)) visitObject(child, band);
    });
    y += band.height;
    nested.filter(n => !/HeaderBand$/.test(n.tagName)).forEach(visitBand);
  }
  Array.from(page.children).filter(n => n.tagName.endsWith('Band')).forEach(visitBand);
  const fields = Array.from(doc.getElementsByTagName('Parameter')).map(n => n.getAttribute('Name'));
  Array.from(doc.getElementsByTagName('TableDataSource')).forEach(table => {
    Array.from(table.children).filter(n => n.tagName === 'Column').forEach(col => fields.push(`${table.getAttribute('Name')}.${col.getAttribute('Name')}`));
  });
  Array.from(doc.getElementsByTagName('*')).forEach(node => {
    for (const match of (node.getAttribute('Text') || '').matchAll(/\[([^\[\]\r\n]+)\]/g)) {
      const name = match[1].trim();
      if (name && !/[=<>!+\-*/|&()"]/.test(name)) fields.push(name);
    }
  });
  return { doc, page, pages, bands, objects, fields: [...new Set(fields.filter(Boolean))], contentHeight: y, paperWidth: number(page, 'PaperWidth', 210), paperHeight: number(page, 'PaperHeight', 297) };
}
export function addObject(xml, bandPath, type, text = 'Nội dung mới', image = '') {
  const doc = parseFrx(xml), band = findNode(doc, bandPath);
  if (!band?.tagName.endsWith('Band')) throw new Error('Chọn vùng đầu phiếu, dòng hàng hoặc cuối phiếu để thêm.');
  const names = new Set(Array.from(doc.getElementsByTagName('*')).map(n => n.getAttribute('Name')));
  let index = 1;
  while (names.has(`Web${type}${index}`)) index++;
  const node = doc.createElement(type);
  const attrs = { Name: `Web${type}${index}`, Left: 0, Top: 0, Width: Math.min(120, number(band, 'Width', 120)), Height: type === 'LineObject' ? 0 : 24 };
  if (type === 'TextObject') Object.assign(attrs, { Text: text, Font: 'Arial, 10pt' });
  if (type === 'PictureObject') Object.assign(attrs, { Image: image, SizeMode: 'Zoom', Width: 80, Height: 60 });
  if (type === 'ShapeObject') Object.assign(attrs, { Shape: 'Rectangle', 'Border.Lines': 'All' });
  if (type === 'TableObject') Object.assign(attrs, { Width: Math.min(240, number(band, 'Width', 240)), Height: 28 });
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (type === 'TableObject') {
    for (let columnIndex = 0; columnIndex < 3; columnIndex++) {
      const column = doc.createElement('TableColumn'); column.setAttribute('Name', `${attrs.Name}Column${columnIndex + 1}`); column.setAttribute('Width', String(attrs.Width / 3)); node.appendChild(column);
    }
    const row = doc.createElement('TableRow'); row.setAttribute('Name', `${attrs.Name}Row1`); row.setAttribute('Height', '28');
    for (let columnIndex = 0; columnIndex < 3; columnIndex++) {
      const cell = doc.createElement('TableCell');
      Object.entries({ Name: `${attrs.Name}Cell${columnIndex + 1}`, Text: `Cột ${columnIndex + 1}`, Font: 'Arial, 10pt', 'Border.Lines': 'All' }).forEach(([key, value]) => cell.setAttribute(key, value)); row.appendChild(cell);
    }
    node.appendChild(row);
  }
  band.appendChild(node);
  if (number(band, 'Height') < Number(attrs.Height)) band.setAttribute('Height', attrs.Height);
  return { xml: serialize(doc), path: pathOf(node) };
}
export function removeObject(xml, path) {
  const doc = parseFrx(xml), node = findNode(doc, path);
  if (!node || !['TextObject', 'PictureObject', 'LineObject', 'ShapeObject'].includes(node.tagName)) throw new Error('Đối tượng này được giữ nguyên cấu trúc.');
  node.remove();
  return serialize(doc);
}
export function removeTablePart(xml, cellPath, kind) {
  if (!['row', 'column'].includes(kind)) throw new Error('Chọn hàng hoặc cột cần xóa.');
  const doc = parseFrx(xml), cell = findNode(doc, cellPath);
  const row = cell?.parentElement, table = row?.parentElement;
  if (cell?.tagName !== 'TableCell' || table?.tagName !== 'TableObject') throw new Error('Chọn một ô trong bảng để xóa hàng hoặc cột.');
  const rows = Array.from(table.children).filter(n => n.tagName === 'TableRow');
  const columns = Array.from(table.children).filter(n => n.tagName === 'TableColumn');
  const cellsOf = r => Array.from(r.children).filter(n => n.tagName === 'TableCell');
  const index = kind === 'row' ? rows.indexOf(row) : cellsOf(row).indexOf(cell);
  const parts = kind === 'row' ? rows : columns;
  if (parts.length <= 1) throw new Error('Bảng cần giữ ít nhất một hàng và một cột.');
  if (index < 0 || index >= parts.length) throw new Error('Không tìm thấy hàng hoặc cột.');
  // FastReport keeps a physical cell for each column, including placeholders
  // covered by a merged cell. Shorten merges and move a deleted anchor into
  // the surviving placeholder so its content and formatting are retained.
  rows.forEach((r, ri) => cellsOf(r).forEach((c, ci) => {
    const start = kind === 'row' ? ri : ci;
    const key = kind === 'row' ? 'RowSpan' : 'ColSpan';
    const span = Math.max(1, number(c, key, 1));
    if (span <= 1 || start > index || start + span <= index) return;
    c.setAttribute(key, String(span - 1));
    if (start === index) {
      const next = kind === 'row' ? cellsOf(rows[ri + 1] || r)[ci] : cellsOf(r)[ci + 1];
      if (next) next.parentNode.replaceChild(c.cloneNode(true), next);
    }
  }));
  if (kind === 'column') rows.forEach(r => cellsOf(r)[index]?.remove());
  parts[index].remove();
  table.setAttribute('Width', String(Array.from(table.children).filter(n => n.tagName === 'TableColumn').reduce((sum, n) => sum + number(n, 'Width', 80), 0)));
  table.setAttribute('Height', String(Array.from(table.children).filter(n => n.tagName === 'TableRow').reduce((sum, n) => sum + number(n, 'Height', 20), 0)));
  return { xml: serialize(doc), tablePath: pathOf(table) };
}
export function copyObjects(xml, paths, pageIndex = 0) {
  const model = layoutFrx(xml, pageIndex);
  const selected = new Set(paths);
  const serializer = new XMLSerializer();
  return model.objects.filter(item => selected.has(item.path) && (!item.locked || item.type === 'TableCell') && !selected.has(item.tablePath))
    .map(item => {
      const clone = item.node.cloneNode(true);
      if (item.type === 'TableCell') {
        const text = model.doc.createElement('TextObject');
        Array.from(clone.attributes).filter(a => !['ColSpan', 'RowSpan'].includes(a.name)).forEach(a => text.setAttribute(a.name, a.value));
        Array.from(clone.childNodes).forEach(child => text.appendChild(child.cloneNode(true)));
        Object.entries({ Left: item.left, Top: item.top, Width: item.width, Height: item.height }).forEach(([key, value]) => text.setAttribute(key, value));
        return { xml: serializer.serializeToString(text), bandPath: item.band.path };
      }
      return { xml: serializer.serializeToString(clone), bandPath: item.band.path };
    });
}
export function pasteObjects(xml, copies, targetBandPath) {
  const doc = parseFrx(xml), names = new Set(Array.from(doc.getElementsByTagName('*')).map(n => n.getAttribute('Name')));
  const pending = [], renamed = new Map();
  for (const item of copies) {
    const source = parseFrx(`<Report>${item.xml}</Report>`).documentElement.children[0];
    if (!source || !['TextObject', 'PictureObject', 'ShapeObject', 'LineObject', 'TableObject'].includes(source.tagName)) continue;
    const band = findNode(doc, targetBandPath ?? item.bandPath);
    if (!band?.tagName.endsWith('Band')) throw new Error('Chọn vùng in để dán đối tượng.');
    const clone = doc.importNode(source, true);
    for (const node of [clone, ...Array.from(clone.getElementsByTagName('*'))]) {
      const old = node.getAttribute('Name');
      if (!old) continue;
      let index = 1, name = `${old}_Copy${index}`;
      while (names.has(name)) name = `${old}_Copy${++index}`;
      names.add(name); renamed.set(old, name); node.setAttribute('Name', name);
    }
    clone.setAttribute('Left', number(clone, 'Left') + MM * 2);
    clone.setAttribute('Top', number(clone, 'Top') + MM * 2);
    pending.push({ clone, band });
  }
  const paths = [];
  for (const { clone, band } of pending) {
    for (const node of [clone, ...Array.from(clone.getElementsByTagName('*'))]) {
      for (const attribute of Array.from(node.attributes)) {
        if (attribute.name === 'Name') continue;
        let value = attribute.value;
        // Only references to copied report objects are renamed; field bindings
        // and the original report's dictionary remain untouched.
        if (['Hyperlink.Value', 'Text', 'VisibleExpression', 'PrintableExpression'].includes(attribute.name)) {
          value = value.replace(/\[([A-Za-z_][\w]*)(\.[\w]+)?\]/g, (match, name, suffix = '') => renamed.has(name) ? `[${renamed.get(name)}${suffix}]` : match);
        } else if (['Parent', 'AnchorObject', 'PrintOn', 'LinkToPage'].includes(attribute.name) && renamed.has(value)) value = renamed.get(value);
        node.setAttribute(attribute.name, value);
      }
    }
    band.appendChild(clone); paths.push(pathOf(clone));
    const bottom = number(clone, 'Top') + number(clone, 'Height', 20);
    if (bottom > number(band, 'Height', 24)) band.setAttribute('Height', bottom);
  }
  return { xml: pending.length ? serialize(doc) : xml, paths };
}
export function samplePayload(xml) {
  const doc = parseFrx(xml), parameters = {}, tables = {};
  const computed = new Set(['Date', 'Page', 'PageN', 'TotalPages', 'PageNofM', 'Row#', 'AbsRow#', 'CopyName#', 'HierarchyLevel', 'HierarchyRow#', 'Page#', 'TotalPages#', ...Array.from(doc.getElementsByTagName('Total')).map(n => n.getAttribute('Name'))]);
  const value = node => /Boolean/i.test(node.getAttribute('DataType')) ? true : /Int|Decimal|Double|Single/i.test(node.getAttribute('DataType')) ? 100 : /DateTime/i.test(node.getAttribute('DataType')) ? '2026-10-08T10:00:00' : 'Dữ liệu mẫu';
  Array.from(doc.getElementsByTagName('Parameter')).forEach(n => { parameters[n.getAttribute('Name')] = value(n); });
  Array.from(doc.getElementsByTagName('TableDataSource')).forEach(table => {
    const row = {};
    Array.from(table.children).filter(n => n.tagName === 'Column').forEach(n => { row[n.getAttribute('Name')] = value(n); });
    tables[table.getAttribute('Name')] = [row, { ...row }, { ...row }];
  });
  // Legacy templates also use undeclared header parameters.
  Array.from(doc.getElementsByTagName('*')).forEach(n => {
    for (const match of (n.getAttribute('Text') || '').matchAll(/\[([^\[\]\r\n]+)\]/g)) {
      const name = match[1].trim();
      if (!computed.has(name) && !/[.=<>!+\-*/|&()"]/.test(name) && !(name in parameters)) parameters[name] = /TONG|TIEN|SL|Discount|Amount|TILE/i.test(name) ? 100 : 'Dữ liệu mẫu';
    }
  });
  return { parameters, tables };
}
