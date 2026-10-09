import { compressImage, imagePolicies } from '../utils/compressImage';
import { useEffect, useRef, useState } from 'react';
import { Settings, Folder, Save, RefreshCw, Search, Printer, Loader2 } from 'lucide-react';
import PrintTemplatesPanel from '../components/PrintTemplatesPanel';
import DocumentNumberControl from '../components/DocumentNumberControl';
import api from '../api';
import { compressCompanyLogo } from '../utils/compressCompanyLogo';
import './CauHinhPage.css';
import { interfaceScaleId, readInterfaceScale, saveInterfaceScale } from '../components/GlobalInterfaceScale';

const fields = { 1: 'TEXTVALUE', 2: 'DATETIMEVALUE', 3: 'INTVALUE', 4: 'DECIMALVALUE', 5: 'BLOBVALUE' };
const messageOf = error => error.response?.data?.error || error.message;
function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CauHinhPage() {
  const [groups, setGroups] = useState([]);
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [convention, setConvention] = useState('garage');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compressingLogo, setCompressingLogo] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const noticeTimer = useRef(null);
  const busy = loading || saving || compressingLogo;
  const changed = Object.keys(values).filter(id => values[id] !== original[id]);
  const showToast = (message, type = 'ok') => {
    clearTimeout(noticeTimer.current);
    setNotice({ message, type });
    noticeTimer.current = setTimeout(() => setNotice(null), 4500);
  };
  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/system-config/grouped');
      data.data.push({ groupId: 'interface', groupName: 'Giao diện', items: [{
        ID: interfaceScaleId, NAME: 'InterfaceScale', CAPTION: 'Cỡ chữ và giao diện toàn hệ thống (%)',
        DATATYPE: 3, CONTROLTYPE: 3, INTVALUE: readInterfaceScale(),
        MOREDETAIL: 'Áp dụng cho tất cả trang, cửa sổ và màn hình phụ. Tăng cả chữ, nút và ô nhập để dễ đọc. Lưu trên trình duyệt đang dùng; cỡ chữ bản in giữ theo mẫu in.'
      }] });
      const map = Object.fromEntries(data.data.flatMap(group => group.items.map(item => [item.ID, item[fields[Number(item.DATATYPE || 1)]] ?? ''])));
      setGroups(data.data);
      setConvention(data.controlConvention);
      setValues(map);
      setOriginal(map);
      setActiveId(previous => data.data.some(group => group.groupId === previous) || previous === 'print-templates' ? previous : data.data[0]?.groupId ?? null);
      return true;
    } catch (error) { setLoadError(messageOf(error)); return false; }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const focusSearch = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', focusSearch);
    return () => { clearTimeout(noticeTimer.current); window.removeEventListener('keydown', focusSearch); };
  }, []);
  const save = async () => {
    const scale = Number(values[interfaceScaleId]);
    if (changed.includes(interfaceScaleId) && (!Number.isInteger(scale) || scale < 50 || scale > 200)) {
      showToast('Nhập cỡ chữ và giao diện từ 50% đến 200%.', 'err');
      return;
    }
    setSaving(true);
    try {
      const databaseChanges = changed.filter(id => id !== interfaceScaleId);
      if (databaseChanges.length) await api.put('/system-config/bulk', databaseChanges.map(id => ({ id, value: values[id] })));
      if (changed.includes(interfaceScaleId)) saveInterfaceScale(values[interfaceScaleId]);
      setOriginal({ ...values });
      window.dispatchEvent(new Event('garage-charge-rates-changed'));
      const reloaded = await load();
      showToast(reloaded ? `Đã lưu ${changed.length} mục cấu hình.` : 'Đã lưu cấu hình, nhưng chưa tải lại được dữ liệu. Vui lòng thử tải lại.', reloaded ? 'ok' : 'err');
    } catch (error) { showToast(messageOf(error), 'err'); }
    finally { setSaving(false); }
  };
  const reload = () => {
    if (changed.length && !window.confirm('Tải lại sẽ bỏ các thay đổi chưa lưu. Bạn muốn tiếp tục?')) return;
    load();
  };
  const change = (id, value) => setValues(previous => ({ ...previous, [id]: value }));
  const syncPrintConfig = ({ configName, templateId, label, mode } = {}) => {
    const item = groups.flatMap(group => group.items).find(row => row.NAME === configName);
    if (!item) return;
    if (mode === 'default') {
      setValues(previous => ({ ...previous, [item.ID]: previous[item.ID] === original[item.ID] ? templateId : previous[item.ID] }));
      setOriginal(previous => ({ ...previous, [item.ID]: templateId }));
    }
    setGroups(previous => previous.map(group => ({ ...group, items: group.items.map(row => {
      if (row.ID !== item.ID) return row;
      if (mode === 'default') return { ...row, TEXTVALUE: templateId };
      const options = row.OPTIONS || [];
      const nextOptions = options.some(option => option.value === templateId) ? options : [...options, { value: templateId, label }];
      return { ...row, OPTIONS: nextOptions, OTHERCONFIG: JSON.stringify(nextOptions.map(option => option.value)), MOREDETAIL: `Mẫu dùng cho ${row.CAPTION || row.NAME}.` };
    }) })));
  };
  const upload = async (item, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (item.NAME === 'CompanyLogo') {
      setCompressingLogo(true);
      try {
        const result = await compressCompanyLogo(file);
        change(item.ID, result.base64);
        const kb = size => `${(size / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} KB`;
        showToast(`Logo: ${kb(result.originalBytes)} → ${kb(result.compressedBytes)}. Nhấn Ghi dữ liệu để lưu.`);
      } catch (error) { showToast(messageOf(error), 'err'); }
      finally { setCompressingLogo(false); }
      return;
    }
    setCompressingLogo(true);
    try{const result=await compressImage(file,imagePolicies.configuration);change(item.ID,result.base64);}catch(error){showToast(messageOf(error),'err');}finally{setCompressingLogo(false);}
  };
  const isCheckbox = item => Number(item.CONTROLTYPE) === (convention === 'garage' ? 7 : 9);
  const renderControl = item => {
    const type = Number(item.DATATYPE || 1);
    const control = Number(item.CONTROLTYPE);
    const value = values[item.ID] ?? '';
    const isPaymentAccount = item.NAME === 'PaymentBankAccountId';
    const props = { id: `config-${item.ID}`, disabled: busy, value, onChange: event => change(item.ID, event.target.value) };
    if (item.ID === interfaceScaleId) return <div className="config-interface-scale">
      <input {...props} type="number" min="50" max="200" step="10" onFocus={event => event.target.select()} />
      <div>{[100, 125, 150, 175, 200].map(percent => <button type="button" key={percent} disabled={busy}
        aria-pressed={Number(value) === percent} onClick={() => change(item.ID, percent)}>{percent}%</button>)}</div>
    </div>;
    if (item.NAME.startsWith('SoPhieu')) return <DocumentNumberControl {...props}/>;
    const options = String(item.OTHERCONFIG || '').split(/\r?\n/).map(option => option.trim()).filter(Boolean);
    if (isCheckbox(item)) return <label className="config-checkbox"><input type="checkbox" disabled={busy} checked={[1, 30].includes(Number(value))} onChange={event => change(item.ID, event.target.checked ? 30 : 0)} /><span>{item.CAPTION || item.NAME}</span></label>;
    if (type === 5) return <div className="config-image-control">{item.NAME==='CompanyLogo' && <small>{compressingLogo?'Đang nén logo…':'PNG/JPG tối đa 20 MB; tự nén còn tối đa 256 KB, cạnh dài tối đa 800 px. PNG giữ nền trong suốt.'}</small>}{value && <img src={`data:image/${String(value).startsWith('/9j/')?'jpeg':'png'};base64,${value}`} alt={item.CAPTION || item.NAME} />}<input id={props.id} type="file" accept={item.NAME==='CompanyLogo'?'image/png,image/jpeg':'image/png,image/jpeg,image/webp,image/gif'} disabled={busy} onChange={event => upload(item, event)} /><button type="button" disabled={busy || !value} onClick={() => change(item.ID, '')}>Xóa ảnh</button></div>;
    if (Array.isArray(item.OPTIONS)) return <div><select {...props}>
      <option value="">{isPaymentAccount ? (item.OPTIONS.length ? '— Chọn tài khoản nhận thanh toán —' : 'Chưa có tài khoản ngân hàng đang hoạt động') : (item.OPTIONS.length ? 'Chưa chọn mẫu in' : 'Chưa có mẫu in phù hợp')}</option>
      {value && !item.OPTIONS.some(option => option.value === value) && <option value={value} disabled>{isPaymentAccount ? 'Tài khoản đã lưu không còn hoạt động' : 'Mẫu đã lưu không còn trong danh sách'}</option>}
      {item.OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></div>;
    if ((control === 10 || control === 8) && options.length) {
      const indexed = control === 10 && type === 3;
      return <select {...props} onChange={event => change(item.ID, indexed && event.target.value !== '' ? Number(event.target.value) : event.target.value)}>{!options.some((option, index) => String(indexed ? index : option) === String(value)) && <option value={value}>{value || 'Chưa chọn'}</option>}{options.map((option, index) => <option key={index} value={indexed ? index : option}>{option}</option>)}</select>;
    }
    if (control === 8) return <select {...props} disabled><option value={value}>{value ? 'Mẫu đã lưu chưa có danh sách lựa chọn' : 'Chưa có mẫu in phù hợp'}</option></select>;
    if (type === 2) return <input {...props} type="datetime-local" value={dateInput(value)} />;
    if (['MacDinhThueSuat', 'MacDinhPhiDichVu'].includes(item.NAME)) {
      const toggleName = item.NAME === 'MacDinhThueSuat' ? 'BanHangTinhThue' : 'BanHangTinhPhiDichVu';
      const toggle = groups.flatMap(group => group.items).find(row => row.NAME === toggleName);
      const enabled = !toggle || Number(values[toggle.ID]) === 30;
      return <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <input {...props} type="number" min="0" max="100" step="0.01" inputMode="decimal" aria-label={item.CAPTION} />
        {toggle && <label className="config-checkbox"><input type="checkbox" disabled={busy} checked={enabled}
          onChange={event => change(toggle.ID, event.target.checked ? 30 : 0)} />
          <span>Áp dụng trong bán hàng & sửa chữa</span></label>}
      </div>;
    }
    if (type === 3 || type === 4) return <input {...props} type="number" step={type === 3 ? 1 : 'any'} onChange={event => change(item.ID, event.target.value === '' ? '' : Number(event.target.value))} />;
    if (control === 6) return <textarea {...props} rows={3} />;
    return <input {...props} type="text" />;
  };
  const term = search.trim().toLocaleLowerCase('vi');
  const matches = item => !['BanHangTinhThue', 'BanHangTinhPhiDichVu'].includes(item.NAME) && [item.CAPTION, item.NAME, item.MOREDETAIL, values[item.ID]].some(value => String(value ?? '').toLocaleLowerCase('vi').includes(term));
  const current = groups.find(group => group.groupId === activeId);
  const visibleGroups = term ? groups.filter(group => group.items.some(matches)) : groups;
  const sections = term ? visibleGroups : current ? [current] : [];
  return <div className="system-config-page">
    <header className="config-header"><div><Settings size={22} /><div><h1>Cấu hình hệ thống</h1><p>Thiết lập thông tin và tham số hoạt động của gara</p></div></div><span className={changed.length ? 'config-unsaved' : 'config-saved'}>{changed.length ? `${changed.length} mục chưa lưu` : 'Không có thay đổi chưa lưu'}</span></header>
    {notice && <div role="status" className={`config-notice ${notice.type === 'err' ? 'error' : ''}`}>{notice.message}</div>}
    <div className="config-workspace">
      <nav className="config-sidebar" aria-label="Nhóm cấu hình">{visibleGroups.map(group => <button key={group.groupId} className={activeId === group.groupId && !term ? 'active' : ''} disabled={busy} onClick={() => { setActiveId(group.groupId); setSearch(''); }}><Folder size={16} /><span>{group.groupName}</span><small>{group.items.length}</small></button>)}<button className={activeId === 'print-templates' ? 'active' : ''} disabled={busy} onClick={() => { setActiveId('print-templates'); setSearch(''); }}><Printer size={16} /><span>Quản lý mẫu in</span></button></nav>
      <main className="config-content">
        {loading ? <div className="config-empty"><Loader2 className="config-spinner" size={22} />Đang tải cấu hình...</div> : loadError ? <div className="config-empty" role="alert"><p>Không thể tải cấu hình: {loadError}</p><button onClick={reload}>Thử lại</button></div> : activeId === 'print-templates' && !term ? <PrintTemplatesPanel onToast={showToast} onConfigChanged={syncPrintConfig} /> : <>
          {sections.map(group => <section key={group.groupId}><h2>{group.groupName}</h2>{group.groupName==='Nội dung hóa đơn bán hàng'&&<div className="config-detail"><p>Tích chọn các dòng muốn hiện trên hóa đơn. Bỏ chọn để ẩn và thu gọn khoảng trống. Tổng cộng luôn được giữ; áp dụng cho các mẫu bán hàng đã kết nối tùy chọn hiển thị.</p><button type="button" disabled={busy} onClick={()=>setValues(previous=>({...previous,...Object.fromEntries(group.items.map(item=>[item.ID,['SalesPrintShow_discount','SalesPrintShow_thanks'].includes(item.NAME)?30:0]))}))}>Chỉ tổng cộng và giảm giá</button>{' '}<button type="button" disabled={busy} onClick={()=>setValues(previous=>({...previous,...Object.fromEntries(group.items.map(item=>[item.ID,30]))}))}>Hiện tất cả</button><p>Nhấn Ghi dữ liệu để lưu, sau đó tạo lại bản xem trước.</p></div>}{group.groupName==='Số phiếu'&&<div className="config-detail"><p>Dùng (yy) cho năm 2 số, (yyyy) cho năm 4 số, (MM) cho tháng, (dd) cho ngày. Nhóm (*) đến (*********) là số tự tăng, từ 1 đến 9 chữ số.</p><p>Có ngày: đếm lại mỗi ngày; có tháng: mỗi tháng; chỉ có năm: mỗi năm; không có ngày tháng năm: đếm liên tục. Ngày dùng để sinh mã là ngày lập phiếu hiện tại.</p><p>Bàn giao xe và xuất phụ tùng theo lệnh sử dụng số lệnh sửa chữa. Thay đổi chỉ áp dụng phiếu mới; phiếu cũ giữ nguyên số.</p></div>}<div className="config-fields">{group.items.filter(matches).map(item => <div key={item.ID} className={`config-field ${Number(item.SOCOT) === 2 ? 'half' : ''}`}>
            {!isCheckbox(item) && <label htmlFor={`config-${item.ID}`}>{item.CAPTION || item.NAME}</label>}{renderControl(item)}{item.MOREDETAIL && <p className="config-detail">{item.MOREDETAIL}</p>}
          </div>)}</div>{!group.items.length && <p className="config-empty">Nhóm này chưa có tham số cấu hình.</p>}</section>)}
          {!sections.length && <p className="config-empty">{term ? 'Không có cấu hình phù hợp với từ khóa.' : 'Chưa có nhóm cấu hình trong cơ sở dữ liệu.'}</p>}
        </>}
      </main>
    </div>
    <footer className="config-footer"><div className="config-search"><Search size={17} /><input ref={searchRef} aria-label="Tìm cấu hình" placeholder="Tìm cấu hình (Ctrl + F)" value={search} onChange={event => setSearch(event.target.value)} />{search && <button onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">×</button>}</div><div className="config-actions"><button disabled={busy} onClick={reload}><RefreshCw size={16} />Tải lại</button><button className="primary" disabled={busy || !!loadError || !changed.length} onClick={save}>{saving ? <Loader2 size={16} className="config-spinner" /> : <Save size={16} />}{saving ? 'Đang lưu...' : 'Ghi dữ liệu'}</button></div></footer>
  </div>;
}
