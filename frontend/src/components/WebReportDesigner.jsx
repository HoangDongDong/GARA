import { compressImage, imagePolicies } from '../utils/compressImage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { printTemplates } from '../services';
import { MM, number, layoutFrx, editFrx, addObject, removeObject, removeTablePart, fontOf, pathOf, samplePayload, copyObjects, pasteObjects, reportMoveAttributes, resizeObjectAttributes, editObjects } from './frxDesigner';
import './WebReportDesigner.css';
import ReportPdfPreview from './ReportPdfPreview';

const errorText = error => error?.response?.data?.error || error.message || 'Không thực hiện được thao tác.';
const color = value => /^#[\da-f]{6}$/i.test(value || '') ? value : /^(Black|White|Red|Blue|Green|Gray|Orange|Yellow|Purple)$/i.test(value || '') ? value : undefined;
const mmValue = value => Math.round(value / MM * 100) / 100;

export default function WebReportDesigner({ template, onClose, onSaved }) {
  const [xml, setXml] = useState(''), [savedXml, setSavedXml] = useState(''), [version, setVersion] = useState('');
  const [selected, selectPrimary] = useState(''), [selection, setSelection] = useState([]), [activeBand, setActiveBand] = useState(''), [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1.5), [snap, setSnap] = useState(true), [busy, setBusy] = useState('Đang tải mẫu…');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [preview, setPreview] = useState('');
  const [gesture, setGesture] = useState(null), [historyTick, setHistoryTick] = useState(0), [backups, setBackups] = useState([]);
  const past = useRef([]), future = useRef([]), drag = useRef(null), fileInput = useRef(null), pdfUrl = useRef('');
  const clipboard = useRef([]);
  const [clipboardReady, setClipboardReady] = useState(false);
  function setSelected(path) { selectPrimary(path); setSelection([]); }
  const dirty = xml !== savedXml;
  const model = useMemo(() => { if (!xml) return null; try { return layoutFrx(xml, pageIndex); } catch { return null; } }, [xml, pageIndex]);
  const object = model?.objects.find(item => item.path === selected);
  const selectedBand = model?.bands.find(item => item.path === activeBand) || model?.bands[0];
  function selectAll() {
    if (!model || busy || preview) return;
    selectPrimary(''); setSelection(model.objects.filter(item => !item.locked).map(item => item.path));
    setNotice('Đã chọn tất cả đối tượng có thể sửa trên trang hiện tại.');
  }
  function copySelection() {
    if (!model || busy || preview) return;
    try {
      const copies = copyObjects(xml, selection.length ? selection : selected ? [selected] : [], pageIndex);
      if (!copies.length) { setNotice('Chọn chữ, hình, bảng hoặc đường kẻ để sao chép.'); return; }
      clipboard.current = { copies, pageIndex }; setClipboardReady(true);
      setNotice(`Đã sao chép ${copies.length} đối tượng. Ctrl+V để dán trong trình thiết kế.`);
    } catch (err) { setError(errorText(err)); }
  }
  function pasteSelection() {
    if (!clipboardReady || !model || busy || preview) return;
    try {
      const { copies, pageIndex: sourcePage } = clipboard.current;
      const result = pasteObjects(xml, copies, copies.length === 1 || sourcePage !== pageIndex ? selectedBand?.path : undefined);
      commit(result.xml); selectPrimary(''); setSelection(result.paths);
      setNotice(`Đã dán ${result.paths.length} đối tượng. Ctrl+Z để hoàn tác.`);
    } catch (err) { setError(errorText(err)); }
  }
  function keyDown(event) {
    if (event.isComposing || busy || preview || event.altKey) return;
    const target = event.target;
    // Keep native selection, clipboard and text undo inside property editors.
    if (target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]')) return;
    const key = event.key.toLowerCase();
    if (key === 'delete' && !event.ctrlKey && !event.metaKey && !event.shiftKey && object && ['TextObject', 'TableCell'].includes(object.type)) {
      event.preventDefault(); event.stopPropagation(); clearText(); return;
    }
    if (!(event.ctrlKey || event.metaKey)) return;
    if (!['a', 'c', 'v', 'z', 'y'].includes(key)) return;
    event.preventDefault(); event.stopPropagation();
    if (key === 'a') selectAll();
    if (key === 'c') copySelection();
    if (key === 'v') pasteSelection();
    if (key === 'z') undo(event.shiftKey);
    if (key === 'y') undo(true);
  }

  useEffect(() => {
    let alive = true;
    printTemplates.webContent(template.ID).then(data => {
      if (!alive) return;
      layoutFrx(data.content);
      setXml(data.content); setSavedXml(data.content); setVersion(data.version); setBackups(data.backups || []);
      setBusy('');
    }).catch(err => { if (alive) { setError(errorText(err)); setBusy(''); } });
    return () => { alive = false; if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current); };
  }, [template.ID]);
  useEffect(() => {
    const handler = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function commit(next) {
    if (next === xml || busy) return;
    past.current.push(xml); if (past.current.length > 50) past.current.shift();
    future.current = []; setXml(next); setError(''); setNotice(''); setHistoryTick(n => n + 1);
    if (preview) { URL.revokeObjectURL(pdfUrl.current); pdfUrl.current = ''; setPreview(''); }
  }
  function undo(redo = false) {
    const from = redo ? future.current : past.current, to = redo ? past.current : future.current;
    if (!from.length || busy) return;
    to.push(xml); setXml(from.pop()); setSelected(''); setGesture(null); setHistoryTick(n => n + 1); setPreview('');
  }
  function change(path, attrs) { try { commit(editFrx(xml, path, attrs)); } catch (err) { setError(errorText(err)); } }
  function clearText() {
    if (!object || !['TextObject', 'TableCell'].includes(object.type)) return;
    change(selected, { Text: '' });
    setNotice('Đã xóa nội dung chữ, giữ nguyên khung. Ctrl+Z để khôi phục.');
  }
  function deleteTablePart(kind) {
    try {
      const result = removeTablePart(xml, selected, kind);
      commit(result.xml); setSelected(result.tablePath);
      setNotice(`Đã xóa ${kind === 'row' ? 'hàng' : 'cột'}. Ctrl+Z để khôi phục.`);
    } catch (err) { setError(errorText(err)); }
  }
  function add(type, text, image) {
    try { const result = addObject(xml, selectedBand?.path, type, text, image); commit(result.xml); setSelected(result.path); } catch (err) { setError(errorText(err)); }
  }
  function close() { if (!dirty || window.confirm('Có thay đổi chưa lưu. Đóng trình thiết kế?')) onClose(); }
  function startDrag(event, item, resize = false) {
    if (!resize && item.tablePath && selection.includes(item.tablePath)) item = model.objects.find(o => o.path === item.tablePath);
    if (busy || item.locked || (event.button !== 0 && event.pointerType === 'mouse')) return;
    event.stopPropagation(); event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const grouped = !resize && selection.includes(item.path);
    if (!grouped) setSelected(item.path);
    setActiveBand(item.band.path);
    const items = grouped ? model.objects.filter(o => selection.includes(o.path) && !o.locked) : [item];
    drag.current = { item, items, resize, x: event.clientX, y: event.clientY, capture: event.currentTarget, pointer: event.pointerId };
  }
  function moveDrag(event) {
    const state = drag.current; if (!state) return;
    const dx = (event.clientX - state.x) / zoom, dy = (event.clientY - state.y) / zoom;
    const { item, resize } = state;
    state.updates = resize ? { [item.path]: resizeObjectAttributes(item, resize, dx, dy, snap) }
      : reportMoveAttributes(model, state.items, dx, dy, snap);
    setGesture(state.updates);
  }
  function endDrag(event, cancel = false) {
    const state = drag.current; if (!state) return;
    drag.current = null; setGesture(null);
    if (state.capture.hasPointerCapture?.(state.pointer)) state.capture.releasePointerCapture(state.pointer);
    if (!cancel && state.updates) {
      try { commit(editObjects(xml, state.updates)); } catch (err) { setError(errorText(err)); }
    }
  }
  async function save(copy = false) {
    let name;
    if (copy) { name = window.prompt('Tên mẫu mới', `${template.NAME} - bản sao`); if (!name?.trim()) return; }
    setBusy('Đang lưu mẫu…'); setError('');
    try {
      let result;
      if (copy) {
        if (!template.CONFIG_NAME) throw new Error('Mẫu chưa gắn loại phiếu. Hãy gắn loại phiếu trước khi lưu bản sao.');
        result = await printTemplates.create(name.trim(), xml, template.CONFIG_NAME);
        setNotice('Đã tạo mẫu mới. Bạn vẫn đang chỉnh mẫu gốc.');
      } else {
        result = await printTemplates.saveWebContent(template.ID, xml, version);
        setVersion(result.version); setSavedXml(xml); setBackups(result.backups || []); setNotice('Đã lưu mẫu. Bản in tiếp theo sẽ dùng thay đổi này.');
      }
      onSaved?.(result);
    } catch (err) { setError(errorText(err)); } finally { setBusy(''); }
  }
  async function showPreview() {
    setBusy('Đang tạo PDF với dữ liệu mẫu…'); setError('');
    try {
      const blob = await printTemplates.previewWeb(template.ID, xml, samplePayload(xml));
      if (!blob.type.includes('pdf')) { let detail; try { detail = JSON.parse(await blob.text()).error; } catch {} throw new Error(detail || 'Không nhận được PDF.'); }
      if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current);
      pdfUrl.current = URL.createObjectURL(blob); setPreview(pdfUrl.current);
    } catch (err) {
      if (err?.response?.data instanceof Blob) { try { setError(JSON.parse(await err.response.data.text()).error); } catch { setError('Không tạo được PDF cho mẫu này.'); } }
      else setError(errorText(err));
    } finally { setBusy(''); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${template.NAME.replace(/[\\/:*?"<>|]/g, '-')}.frx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function loadBackup(id) {
    if (dirty && !window.confirm('Thay nội dung đang sửa bằng bản sao lưu?')) return;
    setBusy('Đang tải bản sao lưu…'); setError('');
    try { const data = await printTemplates.webBackup(template.ID, id); layoutFrx(data.content); past.current.push(xml); future.current = []; setXml(data.content); setSelected(''); setPageIndex(0); setPreview(''); setHistoryTick(n => n + 1); setNotice('Đã nạp bản sao lưu để xem. Bấm Lưu để khôi phục vào cơ sở dữ liệu.'); }
    catch (err) { setError(errorText(err)); } finally { setBusy(''); }
  }
  async function imageFile(event) {
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 setBusy('Đang nén ảnh…');setError('');
 try{const result=await compressImage(file,imagePolicies.template);add('PictureObject','',result.base64);}catch(error){setError(error.message);}finally{setBusy('');}
  }
  const font = object ? fontOf(object.node) : null;
  const pageWidth = model?.paperWidth * MM || 794;
  const marginLeft = model ? number(model.page, 'LeftMargin', 10) * MM : 0;
  const marginTop = model ? (gesture?.[pathOf(model.page)]?.TopMargin ?? number(model.page, 'TopMargin', 10)) * MM : 0;
  const contentWidth = model ? pageWidth - marginLeft - number(model.page, 'RightMargin', 10) * MM : 794;
  const pageHeight = model ? Math.max(model.paperHeight * MM, model.contentHeight + marginTop + 40) : 1123;
  function fontChange(attrs) {
    const next = { ...font, ...attrs }, styles = ['bold', 'italic', 'underline'].filter(k => next[k]).map(k => k[0].toUpperCase() + k.slice(1));
    change(selected, { Font: `${next.family}, ${next.size}pt${styles.length ? `, style=${styles.join(', ')}` : ''}` });
  }
  return <div className="wrd-overlay" role="dialog" aria-modal="true" aria-label="Trình thiết kế mẫu in trên web" onKeyDown={keyDown}>
    <header className="wrd-header"><div><b>Thiết kế mẫu in trên web</b><small>{template.NAME} · {dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}</small></div><button onClick={close} disabled={!!busy}>Đóng ✕</button></header>
    <div className="wrd-toolbar">
      <button onClick={() => undo()} disabled={!!busy || !past.current.length}>↶ Hoàn tác</button><button onClick={() => undo(true)} disabled={!!busy || !future.current.length}>↷ Làm lại</button>
      <button onClick={selectAll} disabled={!model || !!busy} title="Ctrl+A">Chọn tất cả</button><button onClick={copySelection} disabled={!model || !!busy || (!selected && !selection.length)} title="Ctrl+C">Sao chép</button><button onClick={pasteSelection} disabled={!clipboardReady || !!busy} title="Ctrl+V">Dán</button>
      <label>Thu phóng <select value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[0.5, 0.75, 1, 1.5, 2, 3].map(z => <option key={z} value={z}>{z * 100}%</option>)}</select></label>
      <label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)}/> Bám lưới 1 mm</label>
      <button onClick={download} disabled={!model || !!busy}>Tải .frx</button><button onClick={showPreview} disabled={!model || !!busy}>Xem PDF mẫu</button>
      <button onClick={() => save(true)} disabled={!model || !!busy || !template.CONFIG_NAME}>Lưu thành mẫu mới</button><button className="wrd-save" onClick={() => save()} disabled={!dirty || !model || !!busy}>Lưu mẫu</button>
    </div>
    {(error || notice || busy) && <div role={error ? 'alert' : 'status'} className={`wrd-message ${error ? 'error' : ''}`}>{error || busy || notice}</div>}
    <div className="wrd-body" aria-busy={!!busy} data-history={historyTick}>
      <aside className="wrd-tools"><b>Thêm đối tượng</b><p>Chọn vùng bên dưới trước khi thêm.</p><div className="wrd-add">
        <button disabled={!model || !!busy} onClick={() => add('TextObject')}>T Chữ</button><button disabled={!model || !!busy} onClick={() => fileInput.current.click()}>▧ Hình ảnh</button>
        <button disabled={!model || !!busy} onClick={() => add('LineObject')}>― Đường kẻ</button><button disabled={!model || !!busy} onClick={() => add('ShapeObject')}>□ Khung</button>
        <button disabled={!model || !!busy} onClick={() => add('TableObject')}>▤ Bảng 3 cột</button>
        <input type="file" ref={fileInput} accept="image/png,image/jpeg" hidden onChange={imageFile}/>
      </div><b>Trang giấy</b><select aria-label="Trang mẫu" value={pageIndex} onChange={e => { setPageIndex(Number(e.target.value)); setSelected(''); setActiveBand(''); }}>{model?.pages.map((p, i) => <option key={i} value={i}>{p.getAttribute('Name') || `Trang ${i + 1}`}</option>)}</select>
      <b>Vùng in</b>{model?.bands.map(band => <button key={band.path} className={`wrd-band-choice ${selectedBand?.path === band.path ? 'active' : ''}`} onClick={() => { setActiveBand(band.path); setSelected(''); }}>{band.name}<small>{band.type}</small></button>)}
      <b>Trường dữ liệu</b><p>Bấm để thêm vào vùng đã chọn.</p><div className="wrd-fields">{model?.fields.map(field => <button key={field} disabled={!!busy} title={`Thêm [${field}]`} onClick={() => add('TextObject', `[${field}]`)}>{field}</button>)}</div>
      {!!backups.length && <><b>Bản sao lưu</b><select aria-label="Nạp bản sao lưu" disabled={!!busy} value="" onChange={e => e.target.value && loadBackup(e.target.value)}><option value="">Chọn bản để xem / khôi phục</option>{backups.map(b => <option key={b.id} value={b.id}>{new Date(b.createdAt).toLocaleString('vi-VN')}</option>)}</select></>}
      </aside>
      <main className="wrd-workspace" tabIndex={0} aria-label="Vùng thiết kế mẫu in" onPointerDown={event => { if (!event.target.closest('.wrd-object')) event.currentTarget.focus(); }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={e => endDrag(e, true)}>
        {model && <div className="wrd-page-holder" style={{ width: pageWidth * zoom + 120, height: pageHeight * zoom + 50 }}><div className="wrd-page" style={{ width: pageWidth, height: pageHeight, transform: `scale(${zoom})` }}>
          <div className="wrd-ruler">{Array.from({ length: Math.floor(model.paperWidth / 10) + 1 }, (_, i) => <span key={i} style={{ left: i * 10 * MM }}>{i * 10}</span>)}<small>mm</small></div>
          <div className="wrd-content" style={{ left: marginLeft, top: marginTop + 20, width: contentWidth }}>
            {model.bands.map(band => <div key={band.path} className={`wrd-band ${selectedBand?.path === band.path ? 'active' : ''}`} style={{ top: band.top, height: band.height, width: number(band.node, 'Width', contentWidth) }} onPointerDown={() => { setActiveBand(band.path); setSelected(''); }}><span className="wrd-band-label">{band.name}</span></div>)}
            {model.objects.map(item => {
              const n = item.node, f = fontOf(n), g = gesture?.[item.path] || {};
              const parentMove = gesture?.[item.tablePath];
              const parent = parentMove && model.objects.find(o => o.path === item.tablePath);
              const left = item.left + (g.Left === undefined ? 0 : g.Left - number(n, 'Left')) + (parent ? parentMove.Left - number(parent.node, 'Left') : 0);
              const top = item.top + item.band.top + (g.Top === undefined ? 0 : g.Top - number(n, 'Top')) + (parent ? parentMove.Top - number(parent.node, 'Top') : 0);
              const border = n.getAttribute('Border.Lines') || '';
              const style = { left, top, width: g.Width ?? item.width, height: Math.max(2, g.Height ?? item.height), fontFamily: f.family, fontSize: f.size * 96 / 72, fontWeight: f.bold ? 'bold' : 'normal', fontStyle: f.italic ? 'italic' : 'normal', textDecoration: f.underline ? 'underline' : 'none', textAlign: (n.getAttribute('HorzAlign') || 'Left').toLowerCase(), color: color(n.getAttribute('TextFill.Color')) || '#111', backgroundColor: color(n.getAttribute('Fill.Color')), borderTop: /All|Top/.test(border) ? '1px solid' : undefined, borderBottom: /All|Bottom/.test(border) || item.type === 'LineObject' ? '1px solid' : undefined, borderLeft: /All|Left/.test(border) ? '1px solid' : undefined, borderRight: /All|Right/.test(border) ? '1px solid' : undefined };
              const image = n.getAttribute('Image');
              return <div key={item.path} role="button" tabIndex={0} aria-label={`Đối tượng ${n.getAttribute('Name') || item.type}`} title={`${n.getAttribute('Name')} · ${item.type}${item.locked ? ' · Giữ cấu trúc' : ''}`} className={`wrd-object ${item.type === 'TableObject' ? 'wrd-table' : ''} ${selected === item.path || selection.includes(item.path) || selection.includes(item.tablePath) ? 'selected' : ''} ${item.locked ? 'locked' : ''}`} style={style} onClick={e => { e.currentTarget.focus(); if (!selection.includes(item.path) && !selection.includes(item.tablePath)) setSelected(item.path); setActiveBand(item.band.path); }} onKeyDown={e => { if (e.key === 'Enter') { setSelected(item.path); setActiveBand(item.band.path); } }} onPointerDown={e => { e.currentTarget.focus(); if (item.locked && !selection.includes(item.tablePath)) setSelected(item.path); setActiveBand(item.band.path); startDrag(e, item); }}>
                {item.type === 'PictureObject' ? image ? <img draggable={false} src={`data:image/${image.startsWith('/9j/') ? 'jpeg' : 'png'};base64,${image}`} alt="Hình trong mẫu"/> : <span className="wrd-placeholder">▧ {n.getAttribute('Name')}</span>
                  : ['TextObject', 'TableCell'].includes(item.type) ? <span className="wrd-text" style={{ alignSelf: ({ Center: 'center', Bottom: 'end' })[n.getAttribute('VertAlign')] || 'start' }}>{n.getAttribute('Text') || ' '}</span>
                  : ['ShapeObject', 'LineObject', 'TableObject'].includes(item.type) ? null : <span className="wrd-placeholder">{item.type} (giữ nguyên)</span>}
                {(selected === item.path || selection.includes(item.path)) && item.type === 'TableObject' && !item.locked && <span className="wrd-table-handle" onPointerDown={e => startDrag(e, item)}>↔ Kéo bảng</span>}
                {selected === item.path && !item.locked && item.type !== 'TableObject' && (item.type === 'LineObject' ? ['w', 'e'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']).map(handle => <span key={handle} className={`wrd-resize wrd-resize-${handle}`} aria-label={`Thay đổi kích thước ${handle}`} title="Kéo để đổi kích thước riêng đối tượng" onPointerDown={e => startDrag(e, item, handle)}/>)}
              </div>;
            })}
          </div>
        </div></div>}
      </main>
      <aside className="wrd-properties"><b>{selection.length ? `Đã chọn ${selection.length} đối tượng` : object ? object.node.getAttribute('Name') : 'Thuộc tính vùng / trang'}</b>
        {object ? <>
          <small>{object.type}</small>{object.locked && <p>Giữ cấu trúc đối tượng. Ô bảng có thể sửa chữ, font, cột và dòng.</p>}
          {['TextObject', 'TableCell'].includes(object.type) && <><label>Nội dung<textarea aria-label="Nội dung đối tượng" value={object.node.getAttribute('Text') || ''} disabled={!!busy} onChange={e => change(selected, { Text: e.target.value })}/></label>
            <button className="wrd-delete" disabled={!!busy || !object.node.getAttribute('Text')} onClick={clearText} title="Delete khi chọn đối tượng trên trang giấy">Xóa chữ</button>
            <label>Chèn dữ liệu<select value="" disabled={!!busy} onChange={e => e.target.value && change(selected, { Text: `${object.node.getAttribute('Text') || ''}[${e.target.value}]` })}><option value="">Chọn trường…</option>{model.fields.map(field => <option key={field}>{field}</option>)}</select></label>
            <label>Font<input value={font.family} disabled={!!busy} onChange={e => fontChange({ family: e.target.value })}/></label><label>Cỡ chữ (pt)<input type="number" min="1" max="200" value={font.size} disabled={!!busy} onChange={e => Number(e.target.value) > 0 && fontChange({ size: Number(e.target.value) })}/></label>
            <div className="wrd-font-buttons">{[['bold', 'Đậm'], ['italic', 'Nghiêng'], ['underline', 'Gạch chân']].map(([k, title]) => <button key={k} className={font[k] ? 'active' : ''} disabled={!!busy} onClick={() => fontChange({ [k]: !font[k] })}>{title}</button>)}</div>
            <label>Căn ngang<select value={object.node.getAttribute('HorzAlign') || 'Left'} disabled={!!busy} onChange={e => change(selected, { HorzAlign: e.target.value })}><option value="Left">Trái</option><option value="Center">Giữa</option><option value="Right">Phải</option><option value="Justify">Đều</option></select></label>
            <label>Màu chữ<input type="color" value={/^#/.test(object.node.getAttribute('TextFill.Color') || '') ? object.node.getAttribute('TextFill.Color') : '#000000'} disabled={!!busy} onChange={e => change(selected, { 'TextFill.Color': e.target.value })}/></label>
          </>}
          {!object.locked && (object.type === 'TableObject' ? ['Left', 'Top'] : ['Left', 'Top', 'Width', 'Height']).map((key, i) => <label key={key}>{['Trái', 'Trên', 'Rộng', 'Cao'][i]} (mm)<input type="number" step="0.1" value={mmValue(number(object.node, key, key === 'Width' ? 80 : key === 'Height' ? 20 : 0))} disabled={!!busy} onChange={e => e.target.value !== '' && change(selected, { [key]: Math.max(key === 'Width' ? 1 : 0, Number(e.target.value) * MM) })}/></label>)}
          {object.type === 'TableCell' && <><button disabled={!!busy} onClick={() => setSelected(object.tablePath)}>Chọn toàn bảng để di chuyển</button>{[['column', 'Width', 'Rộng cột'], ['row', 'Height', 'Cao dòng']].map(([kind, key, title]) => object[kind] && <label key={kind}>{title} (mm)<input type="number" min="1" step="0.1" value={mmValue(number(object[kind], key, 20))} disabled={!!busy} onChange={e => Number(e.target.value) > 0 && change(pathOf(object[kind]), { [key]: Number(e.target.value) * MM })}/></label>)}</>}
          {object.type === 'TableObject' && <p>Kéo nhãn “Kéo bảng” để di chuyển cả bảng. Bấm ô để chỉnh chữ, độ rộng cột và chiều cao dòng.</p>}
          {object.type === 'TableCell' && <div className="wrd-font-buttons"><button className="wrd-delete" disabled={!!busy} onClick={() => deleteTablePart('row')}>Xóa hàng</button><button className="wrd-delete" disabled={!!busy} onClick={() => deleteTablePart('column')}>Xóa cột</button></div>}
          {((!object.locked && object.type !== 'TableObject') || object.type === 'TableCell') && <><label>Viền<select value={object.node.getAttribute('Border.Lines') || 'None'} disabled={!!busy} onChange={e => change(selected, { 'Border.Lines': e.target.value })}>{['None', 'All', 'Top', 'Bottom', 'Left', 'Right'].map(v => <option key={v}>{v}</option>)}</select></label>{!object.locked && <button className="wrd-delete" disabled={!!busy} onClick={() => { commit(removeObject(xml, selected)); setSelected(''); }}>Xóa đối tượng</button>}</>}
        </> : model && <>
          <p>Chọn đối tượng để sửa. Kéo tay nắm ở cạnh để đổi chiều rộng hoặc chiều cao, kéo góc để đổi cả hai. Cỡ chữ chỉnh riêng trong thuộc tính.</p>
          {['PaperWidth', 'PaperHeight', 'LeftMargin', 'RightMargin', 'TopMargin', 'BottomMargin'].map((key, i) => <label key={key}>{['Rộng giấy', 'Cao giấy', 'Lề trái', 'Lề phải', 'Lề trên', 'Lề dưới'][i]} (mm)<input type="number" min={i < 2 ? 10 : 0} step="0.1" value={number(model.page, key, i === 0 ? 210 : i === 1 ? 297 : 10)} disabled={!!busy} onChange={e => e.target.value !== '' && Number(e.target.value) >= (i < 2 ? 10 : 0) && change(pathOf(model.page), { [key]: Number(e.target.value) })}/></label>)}
          {selectedBand && <label>Cao vùng {selectedBand.name} (mm)<input type="number" min="1" step="0.1" value={mmValue(number(selectedBand.node, 'Height', 24))} disabled={!!busy} onChange={e => Number(e.target.value) > 0 && change(selectedBand.path, { Height: Number(e.target.value) * MM })}/></label>}
        </>}
        <p className="wrd-help">Ctrl+A chọn tất cả, kéo một đối tượng đã chọn để di chuyển cả cụm · Ctrl+C sao chép · Ctrl+V dán · Ctrl+Z hoàn tác · Ctrl+Y làm lại. Bấm vào trang giấy để dùng phím tắt. Khi đang nhập chữ, các phím này thao tác trên chữ.</p>
        <p className="wrd-help">Màn hình là mô phỏng bố cục. Xem PDF mẫu để kiểm tra font, vùng lặp và ngắt trang thực tế.</p>
      </aside>
    </div>
    {preview && <div className="wrd-pdf"><header><b>PDF xem trước · dữ liệu mẫu</b><button onClick={() => setPreview('')}>Đóng ✕</button></header><ReportPdfPreview url={preview}/></div>}
  </div>;
}

