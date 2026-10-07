import { useEffect, useRef, useState } from 'react';
import api from '../api';
import DocumentNumberField from './DocumentNumberField';
import MasterDataFormModal from './MasterDataFormModal';
import EmployeeFormModal from './EmployeeFormModal';
import { catalog } from '../services';
import { catalogDefinitions } from '../pages/catalogDefinitions';
import { openDocumentPrint } from './DocumentPrintDialog';
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Calendar,
  Tag,
  Store,
  FileText,
  Users,
  User,
  Truck,
  UserCheck,
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Eye,
  Plus,
  Check,
  Sparkles
} from 'lucide-react';
import './CashVoucherModal.css';

// Hàm đọc 3 chữ số thành chữ tiếng Việt
function readThreeDigits(baso, docsoDaydu) {
  const chuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tram = Math.floor(baso / 100);
  const chuc = Math.floor((baso % 100) / 10);
  const donvi = baso % 10;
  let ketqua = '';

  if (tram === 0 && chuc === 0 && donvi === 0) return '';
  if (tram !== 0 || docsoDaydu) {
    ketqua += chuSo[tram] + ' trăm ';
    if (chuc === 0 && donvi !== 0) ketqua += 'lẻ ';
  }
  if (chuc !== 0 && chuc !== 1) {
    ketqua += chuSo[chuc] + ' mươi ';
  }
  if (chuc === 1) ketqua += 'mười ';
  switch (donvi) {
    case 1:
      if (chuc !== 0 && chuc !== 1) ketqua += 'mốt ';
      else ketqua += chuSo[donvi] + ' ';
      break;
    case 5:
      if (chuc === 0) ketqua += chuSo[donvi] + ' ';
      else ketqua += 'lăm ';
      break;
    default:
      if (donvi !== 0) ketqua += chuSo[donvi] + ' ';
      break;
  }
  return ketqua;
}

// Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán
function numberToWords(so) {
  const num = Number(so);
  if (!num || isNaN(num) || num <= 0) return '';
  const chuSoTien = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let str = Math.round(num).toString();
  const chunks = [];
  while (str.length > 0) {
    chunks.push(str.slice(-3));
    str = str.slice(0, -3);
  }
  const words = [];
  for (let i = 0; i < chunks.length; i++) {
    const val = parseInt(chunks[i], 10);
    if (val > 0) {
      const read = readThreeDigits(val, i < chunks.length - 1);
      words.unshift(read.trim() + ' ' + chuSoTien[i]);
    }
  }
  let result = words.join(' ').replace(/\s+/g, ' ').trim();
  if (!result) return '';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

const empty = () => ({
  type: 0,
  date: new Date().toLocaleDateString('en-CA'),
  categoryId: '',
  reason: '',
  originalDocument: '',
  partnerType: 'other',
  partnerId: '',
  partnerName: '',
  address: '',
  amount: '',
  transfer: false,
  accountId: '',
  storeId: '',
  noDebtChange: false,
  note: ''
});

function SelectWithAdd({ children, onAdd, disabled, title }) {
  return <div className="cv-select-with-add">{children}<button type="button" className="cv-add-option" onClick={onAdd} disabled={disabled} title={title}><Plus size={14} /> Thêm</button></div>;
}

export default function CashVoucherModal({ onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const [numberVersion, setNumberVersion] = useState(0);
  const [addResource, setAddResource] = useState(null);
  const [addForm, setAddForm] = useState({});
  const [addOptions, setAddOptions] = useState({});
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const addPending = useRef(false);

  const openAdd = async (resource) => {
    setAddError('');
    setAddOptions({});
    setAddForm(resource === 'cashReasons' ? { NAME: '', NOTE: '', LOAI: String(form.type) } : {});
    setAddResource(resource);
    const groupResource = { customers: 'customer_groups', suppliers: 'supplier_groups' }[resource];
    if (groupResource) {
      try { const result = await catalog.resource(groupResource); setAddOptions({ [groupResource]: result.data.filter((row) => Number(row.STATUS) === 1) }); }
      catch (exception) { setAddError(exception.response?.data?.error || 'Không tải được nhóm đối tượng.'); }
    }
  };
  const applyCreated = (resource, row) => {
    const key = { cashReasons: 'categories', stores: 'stores', banks: 'accounts', customers: 'customers', suppliers: 'suppliers', employees: 'employees' }[resource];
    setOptions((current) => ({ ...current, [key]: [...current[key], row].sort((a, b) => a.NAME.localeCompare(b.NAME, 'vi')) }));
    if (resource === 'cashReasons') setForm((current) => ({ ...current, type: Number(row.LOAI), categoryId: row.ID }));
    else if (resource === 'stores') change('storeId', row.ID);
    else if (resource === 'banks') change('accountId', row.ID);
    else setForm((current) => ({ ...current, partnerId: row.ID, partnerName: row.NAME, address: row.DIACHI || '' }));
    setAddResource(null);
    setNotice(`Đã thêm ${row.NAME}.`);
  };
  const saveAdded = async (event) => {
    event.preventDefault();
    if (addPending.current) return;
    addPending.current = true;
    setAdding(true); setAddError('');
    try {
      const definition = catalogDefinitions[addResource];
      const payload = Object.fromEntries(definition.fields.map((field) => [field.key, addForm[field.key] || '']).filter(([, value]) => value !== ''));
      const result = await catalog.create(addResource, payload);
      applyCreated(addResource, { ...payload, ID: result.id, STATUS: 1 });
    } catch (exception) {
      setAddError(exception.response?.data?.error || 'Không thêm được danh mục.');
    } finally { addPending.current = false; setAdding(false); }
  };

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/finance/vouchers/options')
      .then((r) => {
        setOptions(r.data.data);
        setForm((f) => ({
          ...f,
          storeId: f.storeId || r.data.data.stores[0]?.ID || ''
        }));
      })
      .catch((e) => setError(e.response?.data?.error || 'Không tải được danh mục.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };

  const reset = () => {
    setForm({ ...empty(), type: form.type, storeId: form.storeId });
    setSaved(null);
    setNumberVersion((v) => v + 1);
    setNotice('');
    setError('');
  };

  const handlePartnerTypeChange = (newType) => {
    setForm((f) => ({
      ...f,
      partnerType: newType,
      partnerId: '',
      partnerName: '',
      address: ''
    }));
  };

  const selectPartner = (id) => {
    const list =
      options?.[
        { customer: 'customers', supplier: 'suppliers', employee: 'employees' }[
          form.partnerType
        ]
      ] || [];
    const row = list.find((r) => r.ID === id);
    setForm((f) => ({
      ...f,
      partnerId: id,
      partnerName: row?.NAME || '',
      address: row?.DIACHI || ''
    }));
  };

  // Tăng nhanh số tiền
  const addQuickAmount = (val) => {
    if (val === 0) {
      change('amount', '');
      return;
    }
    const current = Number(form.amount) || 0;
    change('amount', String(current + val));
  };

  const print = (record, autoPrint) =>
    openDocumentPrint({
      type: record.type === 0 ? 'MauPhieuThu' : 'MauPhieuChi',
      id: record.id,
      autoPrint,
      autoPreview: true
    });

  const save = async (mode) => {
    if (pending.current || loading || !options) return;
    if (saved) {
      if (mode === 'print' || mode === 'preview') print(saved, mode === 'print');
      else if (mode === 'new') reset();
      else if (mode === 'exit') onClose();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/finance/vouchers', {
        ...form,
        amount: Number(form.amount)
      });
      const record = response.data.data;
      setSaved(record);
      setNotice(`Đã lưu ${record.code} · ${record.amount.toLocaleString('vi-VN')} đ`);
      onSaved(record);
      if (mode === 'print' || mode === 'preview') print(record, mode === 'print');
      if (mode === 'new') reset();
      if (mode === 'exit') onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Không lưu được phiếu. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const isThu = Number(form.type) === 0;
  const currentCategoryList =
    options?.categories.filter((r) => Number(r.LOAI) === form.type) || [];
  const wordsAmount = numberToWords(form.amount);
  const addDefinition = addResource && addResource !== 'employees' ? {
    ...catalogDefinitions[addResource],
    name: addResource === 'cashReasons' ? (Number(addForm.LOAI) === 0 ? 'phân loại thu' : 'phân loại chi') : catalogDefinitions[addResource].name,
    fields: catalogDefinitions[addResource].fields.filter((field) => addResource !== 'cashReasons' || field.key !== 'LOAI').map((field) => {
      const lookup = { DNHOMKHACHHANGID: 'customer_groups', DNHOMNHACUNGCAPID: 'supplier_groups' }[field.key];
      return lookup ? { ...field, options: addOptions[lookup] || [] } : field;
    }),
  } : null;

  return (
    <div className="cv-modal-overlay">
      <section
        className={`cv-modal-card ${isThu ? 'theme-thu' : 'theme-chi'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tạo phiếu thu chi"
      >
        {/* HEADER */}
        <header className="cv-modal-header">
          <div className="cv-header-left">
            <div className="cv-header-icon-wrap">
              <Receipt size={20} />
            </div>
            <div className="cv-header-titles">
              <div className="cv-header-title-row">
                <h2>{isThu ? 'PHIẾU THU TIỀN' : 'PHIẾU CHI TIỀN'}</h2>
                <span className={`cv-badge-status ${saved ? 'is-saved' : 'is-new'}`}>
                  {saved ? (
                    <>
                      <CheckCircle2 size={12} /> ĐÃ LƯU
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> THÊM MỚI
                    </>
                  )}
                </span>
              </div>
              <span className="cv-header-sub">
                {isThu
                  ? 'Ghi nhận nguồn thu tiền mặt / chuyển khoản vào quỹ gara'
                  : 'Ghi nhận chi tiền mặt / chuyển khoản từ quỹ gara'}
              </span>
            </div>
          </div>

          <div className="cv-header-right">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="cv-close-btn"
              aria-label="Đóng"
              title="Đóng cửa sổ (Esc)"
            >
              <X size={18} strokeWidth={2.5} color="#FFFFFF" />
            </button>
          </div>
        </header>

        {/* TOOLBAR: LOẠI PHIẾU & CÁC NÚT THAO TÁC */}
        <div className="cv-toolbar-bar">
          <div className="cv-type-switcher">
            <button
              type="button"
              disabled={busy || !!saved}
              className={`cv-type-pill ${isThu ? 'active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, type: 0, categoryId: '' }))}
            >
              <ArrowDownLeft size={15} />
              <span>Phiếu thu</span>
            </button>
            <button
              type="button"
              disabled={busy || !!saved}
              className={`cv-type-pill ${!isThu ? 'active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, type: 1, categoryId: '' }))}
            >
              <ArrowUpRight size={15} />
              <span>Phiếu chi</span>
            </button>
          </div>

          <div className="cv-toolbar-actions">
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="cv-tool-btn"
              title="Làm mới phiếu"
            >
              <RefreshCw size={14} />
              <span>Tạo mới</span>
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => {
                  setSaved(null);
                  setNotice('');
                }}
                className="cv-tool-btn is-copy"
                title="Sao chép thông tin phiếu sang bản ghi mới"
              >
                <Copy size={14} />
                <span>Sao chép</span>
              </button>
            )}
          </div>
        </div>

        {/* NỘI DUNG CHÍNH */}
        {loading ? (
          <div className="cv-loading-wrap">
            <RefreshCw size={24} className="cv-spin" />
            <span>Đang tải danh mục tài chính & cửa hàng…</span>
          </div>
        ) : (
          <form
            className="cv-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              save('stay');
            }}
          >
            <div className="cv-form-scrollable">
              <fieldset disabled={busy || !!saved || !options} className="cv-fieldset">
                {/* KHỐI 1: SỐ TIỀN & PHƯƠNG THỨC THANH TOÁN (NỔI BẬT) */}
                <div className="cv-card-section cv-amount-highlight-card">
                  <div className="cv-section-header">
                    <Wallet size={15} color={isThu ? '#E65100' : '#DC2626'} />
                    <span className="cv-section-title">
                      Số tiền & Hình thức thanh toán
                    </span>
                  </div>

                  <div className="cv-amount-main-grid">
                    {/* Ô nhập số tiền lớn */}
                    <div className="cv-amount-field-col">
                      <label className="cv-label cv-amount-label">
                        <span>Số tiền {isThu ? 'thu' : 'chi'} (VNĐ) *</span>
                        <div className="cv-amount-input-wrap">
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="0"
                            className="cv-amount-input"
                            value={
                              form.amount
                                ? Number(form.amount).toLocaleString('vi-VN')
                                : ''
                            }
                            onChange={(e) =>
                              change('amount', e.target.value.replace(/\D/g, ''))
                            }
                          />
                          <span className="cv-currency-suffix">VNĐ</span>
                        </div>
                      </label>

                      {/* Hiển thị số tiền bằng chữ */}
                      {wordsAmount && (
                        <div className="cv-words-amount-box">
                          <span className="cv-words-prefix">Bằng chữ:</span>
                          <span className="cv-words-text">{wordsAmount}</span>
                        </div>
                      )}

                      {/* Phím tăng tiền nhanh */}
                      <div className="cv-quick-amounts">
                        <span className="cv-quick-label">Chọn nhanh:</span>
                        {[
                          { label: '+200k', val: 200000 },
                          { label: '+500k', val: 500000 },
                          { label: '+1Tr', val: 1000000 },
                          { label: '+2Tr', val: 2000000 },
                          { label: '+5Tr', val: 5000000 },
                          { label: '+10Tr', val: 10000000 }
                        ].map((q) => (
                          <button
                            type="button"
                            key={q.val}
                            className="cv-quick-btn"
                            onClick={() => addQuickAmount(q.val)}
                          >
                            {q.label}
                          </button>
                        ))}
                        {form.amount && (
                          <button
                            type="button"
                            className="cv-quick-btn cv-quick-clear"
                            onClick={() => addQuickAmount(0)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Phương thức thanh toán: Tiền mặt / Chuyển khoản */}
                    <div className="cv-payment-method-col">
                      <label className="cv-label">Hình thức giao dịch</label>
                      <div className="cv-transfer-toggle-group">
                        <button
                          type="button"
                          className={`cv-pay-method-btn ${!form.transfer ? 'active' : ''}`}
                          onClick={() =>
                            setForm((f) => ({ ...f, transfer: false, accountId: '' }))
                          }
                        >
                          <Banknote size={15} />
                          <span>Tiền mặt</span>
                        </button>
                        <button
                          type="button"
                          className={`cv-pay-method-btn ${form.transfer ? 'active' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, transfer: true }))}
                        >
                          <CreditCard size={15} />
                          <span>Chuyển khoản</span>
                        </button>
                      </div>

                      {/* Nếu chuyển khoản: chọn tài khoản */}
                      {form.transfer ? (
                        <div className="cv-account-select-wrap">
                          <label className="cv-label">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Landmark size={12} color="#0284C7" />
                              {isThu ? 'Tài khoản nhận tiền *' : 'Tài khoản trích tiền *'}
                            </span>
                            <SelectWithAdd onAdd={() => openAdd('banks')} disabled={busy || !!saved} title="Thêm tài khoản ngân hàng">
                            <select
                              required={form.transfer}
                              value={form.accountId}
                              onChange={(e) => change('accountId', e.target.value)}
                              className="cv-input cv-select"
                            >
                              <option value="">-- Chọn tài khoản ngân hàng --</option>
                              {options?.accounts.map((r) => (
                                <option key={r.ID} value={r.ID}>
                                  {r.NAME} {r.SOTAIKHOAN ? `(${r.SOTAIKHOAN})` : ''}
                                </option>
                              ))}
                            </select>
                            </SelectWithAdd>
                          </label>
                        </div>
                      ) : (
                        <div className="cv-cash-note">
                          <span>Thu/Chi trực tiếp tại quỹ tiền mặt quầy thu ngân</span>
                        </div>
                      )}

                      {/* Tùy chọn công nợ */}
                      <label className="cv-checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.noDebtChange}
                          onChange={(e) => change('noDebtChange', e.target.checked)}
                        />
                        <span className="cv-checkbox-custom" />
                        <span className="cv-checkbox-text">
                          Không ghi nhận thay đổi công nợ
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* KHỐI 2: THÔNG TIN CHỨNG TỪ */}
                <div className="cv-card-section">
                  <div className="cv-section-header">
                    <FileText size={15} color="#475569" />
                    <span className="cv-section-title">Thông tin chứng từ</span>
                  </div>

                  <div className="cv-grid-3">
                    {/* Ngày lập */}
                    <label className="cv-label">
                      <span className="cv-label-with-icon">
                        <Calendar size={13} color="#64748B" /> Ngày chứng từ *
                      </span>
                      <input
                        type="date"
                        required
                        className="cv-input"
                        value={form.date}
                        onChange={(e) => change('date', e.target.value)}
                      />
                    </label>

                    {/* Số phiếu */}
                    <div className="cv-doc-field-wrapper">
                      <DocumentNumberField
                        key={`${form.type}-${saved?.id || numberVersion}`}
                        type={form.type === 0 ? 'Thu' : 'Chi'}
                        savedCode={saved?.code}
                      />
                    </div>

                    {/* Phân loại thu/chi */}
                    <label className="cv-label">
                      <span className="cv-label-with-icon">
                        <Tag size={13} color="#64748B" /> Phân loại {isThu ? 'thu' : 'chi'} *
                      </span>
                      <SelectWithAdd onAdd={() => openAdd('cashReasons')} disabled={busy || !!saved} title="Thêm phân loại thu / chi">
                      <select
                        required
                        className="cv-input cv-select"
                        value={form.categoryId}
                        onChange={(e) => change('categoryId', e.target.value)}
                      >
                        <option value="">-- Chọn phân loại --</option>
                        {currentCategoryList.map((r) => (
                          <option key={r.ID} value={r.ID}>
                            {r.NAME}
                          </option>
                        ))}
                      </select>
                      </SelectWithAdd>
                    </label>
                  </div>

                  <div className="cv-grid-2" style={{ marginTop: 8 }}>
                    {/* Cửa hàng / Chi nhánh */}
                    <label className="cv-label">
                      <span className="cv-label-with-icon">
                        <Store size={13} color="#64748B" /> Chi nhánh / Cửa hàng *
                      </span>
                      <SelectWithAdd onAdd={() => openAdd('stores')} disabled={busy || !!saved} title="Thêm chi nhánh / cửa hàng">
                      <select
                        required
                        className="cv-input cv-select"
                        value={form.storeId}
                        onChange={(e) => change('storeId', e.target.value)}
                      >
                        <option value="">-- Chọn chi nhánh --</option>
                        {options?.stores.map((r) => (
                          <option key={r.ID} value={r.ID}>
                            {r.NAME}
                          </option>
                        ))}
                      </select>
                      </SelectWithAdd>
                    </label>

                    {/* Chứng từ gốc */}
                    <label className="cv-label">
                      <span>Chứng từ gốc kèm theo</span>
                      <input
                        maxLength={255}
                        placeholder="Số HĐ, phiếu nhập, biên bản nghiệm thu..."
                        className="cv-input"
                        value={form.originalDocument}
                        onChange={(e) => change('originalDocument', e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Lý do thu/chi */}
                  <label className="cv-label" style={{ marginTop: 8 }}>
                    <span>Lý do {isThu ? 'thu tiền' : 'chi tiền'} *</span>
                    <input
                      required
                      maxLength={255}
                      placeholder={
                        isThu
                          ? 'Ví dụ: Thu tiền sửa xe Kia Cerato 18A-123.45...'
                          : 'Ví dụ: Chi mua phụ tùng dầu nhớt, thanh toán vật tư...'
                      }
                      className="cv-input cv-input-highlight"
                      value={form.reason}
                      onChange={(e) => change('reason', e.target.value)}
                    />
                  </label>
                </div>

                {/* KHỐI 3: ĐỐI TƯỢNG GIAO DỊCH */}
                <div className="cv-card-section">
                  <div className="cv-section-header">
                    <Users size={15} color="#475569" />
                    <span className="cv-section-title">
                      {isThu ? 'Người nộp tiền (Đối tượng)' : 'Người nhận tiền (Đối tượng)'}
                    </span>
                  </div>

                  {/* Pills chọn loại đối tượng */}
                  <div className="cv-partner-type-pills">
                    {[
                      { key: 'customer', label: 'Khách hàng', icon: Users },
                      { key: 'supplier', label: 'Nhà cung cấp', icon: Truck },
                      { key: 'employee', label: 'Nhân viên', icon: UserCheck },
                      { key: 'other', label: 'Đối tượng khác', icon: User }
                    ].map((pt) => {
                      const Icon = pt.icon;
                      const isActive = form.partnerType === pt.key;
                      return (
                        <button
                          type="button"
                          key={pt.key}
                          className={`cv-ptype-btn ${isActive ? 'active' : ''}`}
                          onClick={() => handlePartnerTypeChange(pt.key)}
                        >
                          <Icon size={14} />
                          <span>{pt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ô chọn đối tượng tương ứng nếu thuộc Khách hàng/NCC/Nhân viên */}
                  {form.partnerType !== 'other' && (
                    <div style={{ marginTop: 8 }}>
                      <label className="cv-label">
                        <span>
                          Chọn{' '}
                          {form.partnerType === 'customer'
                            ? 'Khách hàng'
                            : form.partnerType === 'supplier'
                            ? 'Nhà cung cấp'
                            : 'Nhân viên'}{' '}
                          *
                        </span>
                        <SelectWithAdd onAdd={() => openAdd({ customer: 'customers', supplier: 'suppliers', employee: 'employees' }[form.partnerType])} disabled={busy || !!saved} title="Thêm đối tượng thu / chi">
                        <select
                          className="cv-input cv-select"
                          value={form.partnerId}
                          onChange={(e) => selectPartner(e.target.value)}
                        >
                          <option value="">
                            -- Chọn{' '}
                            {form.partnerType === 'customer'
                              ? 'khách hàng'
                              : form.partnerType === 'supplier'
                              ? 'nhà cung cấp'
                              : 'nhân viên'}{' '}
                            từ danh bạ --
                          </option>
                          {(
                            options?.[
                              {
                                customer: 'customers',
                                supplier: 'suppliers',
                                employee: 'employees'
                              }[form.partnerType]
                            ] || []
                          ).map((r) => (
                            <option key={r.ID} value={r.ID}>
                              {r.NAME} {r.PHONE ? `— ${r.PHONE}` : ''}
                            </option>
                          ))}
                        </select>
                        </SelectWithAdd>
                      </label>
                    </div>
                  )}

                  {/* Tên đối tượng & Địa chỉ */}
                  <div className="cv-grid-2" style={{ marginTop: 8 }}>
                    <label className="cv-label">
                      <span>Tên người nộp / nhận *</span>
                      <input
                        required
                        maxLength={255}
                        readOnly={form.partnerType !== 'other'}
                        placeholder="Họ tên người giao dịch..."
                        className={`cv-input ${
                          form.partnerType !== 'other' ? 'cv-readonly' : ''
                        }`}
                        value={form.partnerName}
                        onChange={(e) => change('partnerName', e.target.value)}
                      />
                    </label>

                    <label className="cv-label">
                      <span>Địa chỉ</span>
                      <input
                        maxLength={255}
                        placeholder="Địa chỉ, số điện thoại..."
                        className="cv-input"
                        value={form.address}
                        onChange={(e) => change('address', e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Ghi chú */}
                  <label className="cv-label" style={{ marginTop: 8 }}>
                    <span>Ghi chú thêm</span>
                    <textarea
                      rows={2}
                      maxLength={255}
                      placeholder="Ghi chú diễn giải thêm cho kế toán..."
                      className="cv-input cv-textarea"
                      value={form.note}
                      onChange={(e) => change('note', e.target.value)}
                    />
                  </label>
                </div>
              </fieldset>

              {/* Thông báo trạng thái */}
              {notice && (
                <div role="status" className="cv-alert cv-alert-success">
                  <CheckCircle2 size={16} />
                  <span>{notice}</span>
                </div>
              )}

              {error && (
                <div role="alert" className="cv-alert cv-alert-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                  {!options && (
                    <button type="button" onClick={load} className="cv-retry-btn">
                      Thử lại
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* STICKY FOOTER ACTIONS */}
            <footer className="cv-modal-footer">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="cv-btn cv-btn-ghost"
              >
                <X size={15} />
                <span>Thoát</span>
              </button>

              <div className="cv-footer-right-actions">
                <button
                  type="button"
                  disabled={busy || !options}
                  onClick={() => save('preview')}
                  className="cv-btn cv-btn-sub"
                  title="Lưu dữ liệu và xem trước bản in"
                >
                  <Eye size={14} />
                  <span>Lưu & Xem in</span>
                </button>

                <button
                  type="button"
                  disabled={busy || !options}
                  onClick={() => save('print')}
                  className="cv-btn cv-btn-sub"
                  title="Lưu dữ liệu và mở hộp thoại in"
                >
                  <Printer size={14} />
                  <span>Lưu & In</span>
                </button>

                <button
                  type="button"
                  disabled={busy || !options}
                  onClick={() => save('new')}
                  className="cv-btn cv-btn-sub"
                  title="Lưu phiếu và mở form mới ngay"
                >
                  <Plus size={14} />
                  <span>Lưu & Mới</span>
                </button>

                <button
                  type="button"
                  disabled={busy || !options}
                  onClick={() => save('stay')}
                  className="cv-btn cv-btn-primary"
                  title="Lưu phiếu vào hệ thống"
                >
                  <Check size={16} />
                  <span>{saved ? 'Cập nhật' : 'Lưu phiếu'}</span>
                </button>
              </div>
            </footer>
          </form>
        )}

        {loading && error && (
          <div className="cv-loading-error">
            <AlertCircle size={20} color="#DC2626" />
            <p>{error}</p>
            <button type="button" onClick={load} className="cv-retry-btn">
              Tải lại
            </button>
          </div>
        )}
      </section>
      {addResource && addResource !== 'employees' && <MasterDataFormModal
        definition={addDefinition}
        mode="add" form={addForm} setForm={setAddForm} saving={adding} error={addError}
        onSubmit={saveAdded} onClose={() => { if (!adding) setAddResource(null); }} />}
      <EmployeeFormModal open={addResource === 'employees'} onClose={() => setAddResource(null)}
        onCreated={(id, rows) => { const row = rows.find((item) => item.ID === id); if (row) applyCreated('employees', row); }}
        notify={(message) => setNotice(message)} />
    </div>
  );
}
