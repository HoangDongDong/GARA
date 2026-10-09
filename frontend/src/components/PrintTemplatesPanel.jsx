import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Check, ChevronRight, Code2, Database, Download, Edit3,
  ExternalLink, FileText, Folder, FolderOpen, Loader2, RefreshCw, Save,
  Search, Star, Upload, X
} from 'lucide-react';
import { printTemplates } from '../services';
import './PrintTemplatesPanel.css';
import WebReportDesigner from './WebReportDesigner';

const normalize = (value) => String(value || '').toLocaleLowerCase('vi');

export default function PrintTemplatesPanel({ onToast, onConfigChanged }) {
  const [templates, setTemplates] = useState([]);
  const [meta, setMeta] = useState(null);
  const [categoryDefinitions, setCategoryDefinitions] = useState([]);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [assignmentType, setAssignmentType] = useState('');
  const [applying, setApplying] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Hóa đơn bán phụ tùng');
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [designerSession, setDesignerSession] = useState(null);
  const [designerLaunching, setDesignerLaunching] = useState(false);
  const [webDesigner, setWebDesigner] = useState(null);
  const fileInputRef = useRef(null);
  const designerUrl = String(import.meta.env.VITE_FASTREPORT_DESIGNER_URL || '').trim();

  const loadTemplates = async (preserveSelection = true) => {
    setLoading(true);
    setError('');
    try {
      const response = await printTemplates.list();
      const rows = response?.data || [];
      setTemplates(rows);
      setMeta(response?.meta || null);
      setCategoryDefinitions(response?.categories || []);
      const categories = (response?.categories || []).map(item => item.name);
      if (!preserveSelection || !categories.includes(selectedCategory)) {
        setSelectedCategory(categories.includes('Hóa đơn bán phụ tùng') ? 'Hóa đơn bán phụ tùng' : (categories[0] || ''));
      }
      if (selectedId && !rows.some((item) => item.ID === selectedId)) setSelectedId('');
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Không tải được danh sách mẫu in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(false); }, []);

  useEffect(() => {
    if (!designerSession?.id || !['opening', 'editing'].includes(designerSession.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const session = await printTemplates.designerStatus(designerSession.id);
        setDesignerSession(session);
        if (session.status === 'saved') {
          onToast?.(session.message);
          loadTemplates(true);
        }
        if (session.status === 'error') setError(session.message);
      } catch (requestError) {
        setError(requestError?.response?.data?.error || 'Mất kết nối với phiên FastReport Designer.');
        clearInterval(timer);
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [designerSession?.id, designerSession?.status]);

  const grouped = useMemo(() => {
    const result = new Map();
    templates.forEach((item) => {
      const key = item.CATEGORY_NAME || 'Mẫu khác';
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(item);
    });
    return result;
  }, [templates]);

  const categories = categoryDefinitions.filter(item => showUnassigned || item.name !== 'Mẫu chưa phân loại').map(item => item.name);

  const visibleTemplates = useMemo(() => {
    const query = normalize(search).trim();
    const source = query ? templates : (grouped.get(selectedCategory) || []);
    return source.filter((item) => (showUnassigned || item.CATEGORY_NAME !== 'Mẫu chưa phân loại') && (!query || [item.NAME, item.CATEGORY_NAME]
      .some((value) => normalize(value).includes(query))));
  }, [grouped, search, selectedCategory, templates, showUnassigned]);

  const selected = visibleTemplates.find((item) => item.ID === selectedId) || visibleTemplates[0] || null;

  useEffect(() => {
    if (!selectedId && visibleTemplates[0]) setSelectedId(visibleTemplates[0].ID);
    if (selectedId && !visibleTemplates.some((item) => item.ID === selectedId) && visibleTemplates[0]) {
      setSelectedId(visibleTemplates[0].ID);
    }
  }, [selectedCategory, search, visibleTemplates, selectedId]);

  const openEditor = async (template) => {
    setEditor(template);
    setEditorContent('');
    setDirty(false);
    setEditorLoading(true);
    try {
      const content = await printTemplates.content(template.ID);
      setEditorContent(typeof content === 'string' ? content : String(content || ''));
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Không tải được nội dung mẫu FastReport.');
      setEditor(null);
    } finally {
      setEditorLoading(false);
    }
  };

  const openFastReportDesigner = (template) => { if(meta?.customDesignerAvailable===false)return;setWebDesigner(template); };

  const openDesktopDesigner = async (template) => {
    if (designerLaunching || ['opening', 'editing'].includes(designerSession?.status)) return;
    setDesignerLaunching(true);
    try {
      const session = await printTemplates.openDesigner(template.ID);
      setDesignerSession(session);
    } catch (requestError) {
      const message = requestError?.response?.data?.error || 'Không mở được FastReport Designer.';
      setError(`${message} Đang chuyển sang trình sửa XML dự phòng.`);
      openEditor(template);
    } finally {
      setDesignerLaunching(false);
    }
  };

  const closeEditor = () => {
    if (dirty && !window.confirm('Mẫu đang có thay đổi chưa lưu. Bạn có muốn đóng?')) return;
    setEditor(null);
    setEditorContent('');
    setDirty(false);
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      const response = editor.isNew
        ? await printTemplates.create(editor.NAME, editorContent, editor.CONFIG_NAME)
        : await printTemplates.saveContent(editor.ID, editorContent);
      if (editor.isNew) {
        setSelectedId(response.data.ID);
        setSelectedCategory(categoryDefinitions.find(item => item.configName === editor.CONFIG_NAME)?.name || selectedCategory);
        setEditor(null);
        onConfigChanged?.();
      }
      setDirty(false);
      onToast?.(response?.message || 'Đã lưu mẫu FastReport.');
      await loadTemplates(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Không lưu được mẫu FastReport.');
    } finally {
      setSaving(false);
    }
  };

  const importFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditorContent(String(reader.result || ''));
      setDirty(true);
    };
    reader.onerror = () => setError('Không đọc được tệp mẫu đã chọn.');
    reader.readAsText(file, 'utf-8');
  };

  const downloadContent = () => {
    if (!editor) return;
    const blob = new Blob([editorContent], { type: 'application/xml;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${String(editor.NAME || 'mau-in').replace(/[\\/:*?"<>|]+/g, '-')}.frx`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  };

  const setDefault = async (template) => {
    setApplying(true);
    try {
      const response = await printTemplates.setDefault(template.ID, template.CONFIG_NAME);
      onToast?.(response?.message || 'Đã đặt mẫu mặc định.');
      onConfigChanged?.({ configName: template.CONFIG_NAME, templateId: template.ID, label: template.NAME, mode: 'default' });
      await loadTemplates(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Không đặt được mẫu mặc định.');
    } finally { setApplying(false); }
  };

  const assignTemplate = async () => {
    if (!selected || !assignmentType) return;
    setApplying(true);
    try {
      const response = await printTemplates.assign(selected.ID, assignmentType);
      onToast?.(response.message);
      onConfigChanged?.({ configName: assignmentType, templateId: selected.ID, label: selected.NAME, mode: 'assignment' });
      await loadTemplates(true);
      const type = categoryDefinitions.find(item => item.configName === assignmentType);
      if (type) { setSelectedCategory(type.name); setSearch(''); }
      setAssignmentType('');
    } catch (requestError) { setError(requestError?.response?.data?.error || 'Không gắn được mẫu vào loại phiếu.'); }
    finally { setApplying(false); }
  };

  return (
    <section className="pt-panel">
      <div className="pt-toolbar">
        <div>
          <b>Mẫu in GARA</b>
          <span>Tiếp nhận xe · sửa chữa · bán phụ tùng · kho · thu–chi</span>
        </div>
        <label className="pt-search">
          <Search size={14} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên mẫu hoặc loại phiếu..." />
        </label>
        <div className="pt-db-chip"><Database size={13} />{meta?.database || 'GARAGE.FDB'}</div>
        <button className="pt-icon-button" onClick={() => loadTemplates(true)} title="Tải lại"><RefreshCw size={15} /></button>
      </div>

      <p className="pt-print-note">Bản in được tạo trực tiếp bằng FastReport từ mẫu trong cơ sở dữ liệu. Thay đổi và lưu mẫu FRX sẽ áp dụng khi tạo lại bản in.</p>
      {error && <div className="pt-alert"><AlertCircle size={15} /><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}

      <div className="pt-browser">
        <aside className="pt-categories">
          <div className="pt-pane-title">Loại phiếu GARA <small>{categories.length}</small></div>
          <div className="pt-category-list">
            {categories.map((category) => {
              const active = !search && category === selectedCategory;
              return (
                <button key={category} className={active ? 'active' : ''} onClick={() => { setSearch(''); setSelectedCategory(category); setSelectedId(''); }}>
                  {active ? <FolderOpen size={16} /> : <Folder size={16} />}
                  <span>{category}</span><small>{grouped.get(category)?.length || 0}</small><ChevronRight size={12} />
                </button>
              );
            })}
          </div>
          <label className="pt-unassigned-toggle"><input type="checkbox" checked={showUnassigned} onChange={event => { setShowUnassigned(event.target.checked); if (!event.target.checked && selectedCategory === 'Mẫu chưa phân loại') setSelectedCategory('Hóa đơn bán phụ tùng'); }} />Hiện mẫu chưa phân loại</label>
        </aside>

        <main className="pt-template-pane">
          <div className="pt-pane-title">
            <span>{search ? `Kết quả tìm kiếm “${search}”` : selectedCategory}</span>
            <button onClick={() => { setEditor({ isNew: true, NAME: '', CONFIG_NAME: categoryDefinitions.find(item => item.name === selectedCategory)?.configName || 'MauHoaDonBanHang' }); setEditorContent(''); setDirty(false); setEditorLoading(false); }}><Upload size={14} />Thêm mẫu .frx</button>
            <small>{visibleTemplates.length} mẫu</small>
          </div>
          {loading ? (
            <div className="pt-empty"><Loader2 className="spin" size={25} />Đang đọc STEMPLATE...</div>
          ) : visibleTemplates.length === 0 ? (
            <div className="pt-empty"><FileText size={28} /><b>{search ? 'Không có mẫu phù hợp' : `Chưa có mẫu ${selectedCategory.toLowerCase()}`}</b>{!search && <span>Chọn một mẫu trong “Mẫu dùng chung”, gắn vào loại phiếu này và chỉnh nội dung cho GARA.</span>}</div>
          ) : (
            <div className="pt-template-grid">
              {visibleTemplates.map((template, index) => (
                <button key={`${template.ID}:${template.CATEGORY_NAME}`} className={`pt-template-card ${selected?.ID === template.ID && selected?.CATEGORY_NAME === template.CATEGORY_NAME ? 'selected' : ''}`} onClick={() => setSelectedId(template.ID)} onDoubleClick={() => openFastReportDesigner(template)}>
                  <span className={`pt-template-icon tone-${index % 4}`}><Star size={22} fill="currentColor" /></span>
                  <span className="pt-template-name">{template.NAME}</span>
                  <span className="pt-template-meta">{template.CATEGORY_NAME}</span>
                  {Number(template.IS_DEFAULT) === 1 && <span className="pt-default-badge"><Check size={10} />Mặc định</span>}
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="pt-details">
          <div className="pt-pane-title">Sử dụng mẫu in</div>
          {selected ? <>
            <div className="pt-detail-heading"><FileText size={25} /><div><b>{selected.NAME}</b><span>{selected.CATEGORY_NAME}</span></div></div>
            <dl>
              <div><dt>Trạng thái</dt><dd className={Number(selected.STATUS) === 30 ? 'ok' : ''}>{selected.STATUS_LABEL}</dd></div>
              <div><dt>Loại phiếu</dt><dd>{selected.CATEGORY_NAME}</dd></div>
              <div><dt>Mặc định</dt><dd>{Number(selected.IS_DEFAULT) === 1 ? 'Đang dùng' : 'Chưa đặt'}</dd></div>
              <div><dt>Nội dung</dt><dd>{Number(selected.HAS_TEMPLATE) ? 'Có mẫu FastReport' : 'Chưa có nội dung mẫu'}</dd></div>
            </dl>
            {selected.CONFIG_NAME && <p className="pt-use-description">{'Mẫu mặc định được dùng khi in chứng từ tương ứng trong GARA. Có thể chọn mẫu khác trước khi xem bản in.'}</p>}
            <button className="pt-primary" onClick={() => openFastReportDesigner(selected)} disabled={meta?.customDesignerAvailable===false || !Number(selected.HAS_TEMPLATE) || ['opening', 'editing'].includes(designerSession?.status)}><Edit3 size={14} />Sửa mẫu trên web</button>
            <div className="pt-detail-actions">
              <a href={printTemplates.contentUrl(selected.ID)} download><Download size={13} />Tải .frx</a>
              <button onClick={() => setDefault(selected)} disabled={!selected.CONFIG_NAME || !Number(selected.HAS_TEMPLATE) || Number(selected.IS_DEFAULT) === 1 || applying}><Star size={13} />Đặt mặc định</button>
            </div>
            <div className="pt-assignment"><label htmlFor="template-document-type">Gắn thêm vào loại phiếu</label><select id="template-document-type" value={assignmentType} onChange={event => setAssignmentType(event.target.value)} disabled={applying}><option value="">Chọn loại phiếu GARA</option>{categoryDefinitions.filter(item => item.configName).map(item => <option key={item.configName} value={item.configName}>{item.name}</option>)}</select><button onClick={assignTemplate} disabled={applying || !assignmentType}>Gắn mẫu</button></div>
            <details className="pt-technical"><summary>Thông tin kỹ thuật</summary><p>ID mẫu: {selected.ID}</p><p>Cấu hình: {selected.CONFIG_NAME || 'Chưa gắn loại phiếu'}</p><p>Nguồn dữ liệu GARA: {selected.SOURCE_TABLE || 'Mẫu dùng chung / chưa phân loại'}</p><p>Nguồn dữ liệu trong mẫu: {selected.DATASET_NAME || selected.FORM_NAME || 'Chưa khai báo'}</p></details>
            <button className="pt-xml-fallback" onClick={() => openEditor(selected)} disabled={meta?.customDesignerAvailable===false || !Number(selected.HAS_TEMPLATE)}><Code2 size={13} />Sửa XML dự phòng</button>
            {meta?.designerAvailable && <button className="pt-xml-fallback" onClick={() => openDesktopDesigner(selected)} disabled={designerLaunching || ['opening', 'editing'].includes(designerSession?.status)}><ExternalLink size={13} />Mở Designer Windows</button>}
          </> : <div className="pt-empty small">Chọn một mẫu để xem chi tiết</div>}
        </aside>
      </div>

      <footer className="pt-statusbar">
        <span>{new Set(templates.filter(item => showUnassigned || item.CATEGORY_NAME !== 'Mẫu chưa phân loại').map(item => item.ID)).size} mẫu hiển thị</span><span>{categories.length} loại phiếu / nhóm mẫu</span><span>{meta?.customDesignerAvailable===false?'Đang sử dụng bộ mẫu in chuẩn':'Trình thiết kế kéo thả trên web sẵn sàng'}</span>
      </footer>

      {designerSession && (
        <div className="pt-designer-session">
          <div className={`pt-session-icon ${designerSession.status}`}>
            {['opening', 'editing'].includes(designerSession.status) ? <Loader2 className="spin" size={23} /> : designerSession.status === 'saved' ? <Check size={23} /> : <AlertCircle size={23} />}
          </div>
          <div><b>{designerSession.templateName}</b><span>{designerSession.message}</span></div>
          {!['opening', 'editing'].includes(designerSession.status) && <button onClick={() => setDesignerSession(null)}><X size={16} /></button>}
        </div>
      )}

      {webDesigner && <WebReportDesigner template={webDesigner} onClose={() => setWebDesigner(null)} onSaved={() => { loadTemplates(true); onToast?.('Đã lưu mẫu in.'); }} />}

      {editor && (
        <div className="pt-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <div className="pt-editor-modal">
            <header>
              <div><Code2 size={18} /><span><b>Trình sửa mẫu FastReport</b><small>{editor.NAME} · STEMPLATE.TEMPLATE</small></span></div>
              <button onClick={closeEditor}><X size={18} /></button>
            </header>
            <div className="pt-editor-toolbar">
              {editor.isNew && <><label>Tên mẫu <input aria-label="Tên mẫu mới" value={editor.NAME} maxLength={200} onChange={event => { setEditor({ ...editor, NAME: event.target.value }); setDirty(true); }}/></label><label>Loại phiếu <select aria-label="Loại phiếu mẫu mới" value={editor.CONFIG_NAME} onChange={event => { setEditor({ ...editor, CONFIG_NAME: event.target.value }); setDirty(true); }}>{categoryDefinitions.filter(item => item.configName).map(item => <option key={item.configName} value={item.configName}>{item.name}</option>)}</select></label></>}
              <button onClick={() => fileInputRef.current?.click()}><Upload size={14} />Nạp tệp .frx</button>
              <button onClick={downloadContent}><Download size={14} />Tải xuống</button>
              {designerUrl && <button onClick={() => window.open(`${designerUrl}${designerUrl.includes('?') ? '&' : '?'}uuid=${encodeURIComponent(editor.ID)}&lang=vi`, '_blank', 'noopener,noreferrer')}><ExternalLink size={14} />Mở FastReport Designer</button>}
              <input ref={fileInputRef} type="file" accept=".frx,.xml,text/xml,application/xml" hidden onChange={importFile} />
              <span>{dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ với cơ sở dữ liệu'}</span>
            </div>
            {editorLoading ? <div className="pt-editor-loading"><Loader2 className="spin" />Đang tải BLOB FastReport...</div> : (
              <textarea aria-label="Nội dung XML mẫu FastReport" spellCheck={false} value={editorContent} onChange={(event) => { setEditorContent(event.target.value); setDirty(true); }} />
            )}
            <footer>
              <span>Định dạng FastReport XML (.frx) · UTF-8</span>
              <div><button onClick={closeEditor}>Đóng</button><button className="save" onClick={saveEditor} disabled={saving || editorLoading || !dirty}>{saving ? <Loader2 className="spin" size={14} /> : <Save size={14} />}Lưu vào cơ sở dữ liệu</button></div>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
