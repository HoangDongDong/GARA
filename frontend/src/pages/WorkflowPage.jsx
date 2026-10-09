import { useState, useEffect } from 'react';
import {
  Inbox, Search, CheckCircle, Wrench, ChevronRight, Package,
  ThumbsUp, ClipboardCheck, AlertCircle, Clock, User,
  Phone, Hash, History, Calendar, X, ChevronLeft, RefreshCw,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';

const API = '/api/workflow';

/* Mapping icon theo ten trang thai */
const ICONS = {
  Inbox: Inbox,
  Search: Search,
  'thumbs-up': ThumbsUp,
  package: Package,
  wrench: Wrench,
  'check-double': ClipboardCheck,
  'check-circle': CheckCircle,
};

/* Mau sac theo ten - map sang CSS classes */
const COLORS = {
  blue:   { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6' },
  cyan:   { bg: '#cffafe', fg: '#155e75', border: '#06b6d4' },
  yellow: { bg: '#fef3c7', fg: '#92400e', border: '#f59e0b' },
  orange: { bg: '#ffedd5', fg: '#9a3412', border: '#f97316' },
  red:    { bg: '#fee2e2', fg: '#991b1b', border: '#ef4444' },
  purple: { bg: '#f3e8ff', fg: '#6b21a8', border: '#a855f7' },
  green:  { bg: '#dcfce7', fg: '#166534', border: '#22c55e' },
};

const fmtDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(x.getDate())}/${pad(x.getMonth()+1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export default function WorkflowPage() {
  const [states, setStates] = useState([]);
  const [items, setItems] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [filter, setFilter] = useState(null);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState(null);
  const [transitionData, setTransitionData] = useState({ tt_moi: '', lydo: '', ghichu: '' });

  /* Load trang thai + dashboard khi mount */
  useEffect(() => {
    loadStates();
    loadDashboard();
    loadItems();
  }, []);

  const loadStates = async () => {
    try {
      const r = await axios.get(`${API}/states`);
      setStates(r.data.data || []);
    } catch (e) { console.error(e); }
  };

  const loadDashboard = async () => {
    try {
      const r = await axios.get(`${API}/dashboard`);
      setDashboard(r.data.data || []);
    } catch (e) { console.error(e); }
  };

  const loadItems = async (trangthai = null) => {
    setLoading(true);
    try {
      const url = trangthai !== null ? `${API}?trangthai=${trangthai}` : API;
      const r = await axios.get(url);
      setItems(r.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSelectItem = async (item) => {
    setSelected(item);
    try {
      const r = await axios.get(`${API}/by-vehicle/${item.DXEID}`);
      setHistory(r.data.history || []);
    } catch (e) { console.error(e); }
  };

  const handleRefresh = () => {
    loadItems(filter);
    loadDashboard();
  };

  const handleFilter = (tt) => {
    const newFilter = filter === tt ? null : tt;
    setFilter(newFilter);
    loadItems(newFilter);
  };

  const handleOpenTransition = (item) => {
    setTransitionTarget(item);
    setTransitionData({ tt_moi: '', lydo: '', ghichu: '' });
    setShowTransitionModal(true);
  };

  const handleTransition = async () => {
    if (!transitionData.tt_moi) return;
    try {
      await axios.post(`${API}/transition`, {
        DXEID: transitionTarget.DXEID,
        TRANGTHAI: parseInt(transitionData.tt_moi, 10),
        DNHANVIENID: JSON.parse(localStorage.getItem('garage_user') || '{}').USERNAME || 'SYSTEM',
        LYDO: transitionData.lydo,
        GHICHU: transitionData.ghichu,
      });
      setShowTransitionModal(false);
      handleRefresh();
      if (selected && selected.DXEID === transitionTarget.DXEID) {
        handleSelectItem(transitionTarget);
      }
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.error || e.message));
    }
  };

  const filtered = items.filter(x => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (x.BIENSO || '').toLowerCase().includes(s) ||
      (x.TEN_KH || '').toLowerCase().includes(s) ||
      (x.DIENTHOAI || '').includes(s)
    );
  });

  const getCount = (tt) => dashboard.find(d => d.TRANGTHAI === tt)?.SO_LUONG || 0;

  return (
    <div className="workflow-page">
      {/* Header */}
      <div className="wp-header">
        <div>
          <h1 className="wp-title">Quản lý Workflow sửa chữa</h1>
          <p className="wp-subtitle">
            Theo dõi vòng đời xe trong xưởng - 7 trạng thái cốt lõi
          </p>
        </div>
        <button className="wp-refresh" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} /> Làm mới
        </button>
      </div>

      {/* 7-state Pipeline */}
      <div className="wp-pipeline">
        {states.map((s, idx) => {
          const c = COLORS[s.MAU] || COLORS.blue;
          const Icon = ICONS[s.ICON] || Inbox;
          const isActive = filter === s.STT_WORKFLOW;
          return (
            <div
              key={s.STT_WORKFLOW}
              className={`wp-pipeline-card ${isActive ? 'active' : ''}`}
              style={{ borderTopColor: c.border, background: c.bg }}
              onClick={() => handleFilter(s.STT_WORKFLOW)}
            >
              <div className="wp-pipeline-icon" style={{ color: c.fg }}>
                <Icon size={22} />
              </div>
              <div className="wp-pipeline-info">
                <div className="wp-pipeline-stt">Bước {s.STT_WORKFLOW + 1}</div>
                <div className="wp-pipeline-name" style={{ color: c.fg }}>{s.TEN}</div>
              </div>
              <div className="wp-pipeline-count" style={{ color: c.fg }}>
                {getCount(s.STT_WORKFLOW)}
              </div>
              {idx < states.length - 1 && <ChevronRight className="wp-pipeline-arrow" size={20} color="#94a3b8" />}
            </div>
          );
        })}
      </div>

      {/* Layout chính: list + detail */}
      <div className="wp-main">
        {/* ===== List xe ===== */}
        <div className="wp-list">
          <div className="wp-list-toolbar">
            <div className="wp-search">
              <Search size={16} />
              <input
                placeholder="Tìm theo biển số, tên KH, SĐT..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="wp-list-count">
              {filtered.length} xe
              {filter !== null && ` (đang lọc bước ${filter + 1})`}
            </div>
          </div>

          <div className="wp-list-scroll">
            {filtered.length === 0 ? (
              <div className="wp-empty">
                <Inbox size={48} />
                <p>Không có xe nào trong workflow</p>
              </div>
            ) : (
              filtered.map(item => {
                const c = COLORS[item.TRANGTHAI_MAU] || COLORS.blue;
                const Icon = ICONS[item.ICON] || Inbox;
                return (
                  <div
                    key={item.ID}
                    className={`wp-item ${selected?.DXEID === item.DXEID ? 'selected' : ''}`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="wp-item-header">
                      <div className="wp-item-plate">
                        <Hash size={14} /> {item.BIENSO}
                      </div>
                      <span
                        className="wp-item-badge"
                        style={{ background: c.bg, color: c.fg, borderColor: c.border }}
                      >
                        <Icon size={12} /> {item.TRANGTHAI_TEN}
                      </span>
                    </div>
                    <div className="wp-item-body">
                      <div className="wp-item-line">
                        <User size={13} /> {item.TEN_KH || '—'}
                      </div>
                      <div className="wp-item-line">
                        <Phone size={13} /> {item.DIENTHOAI || '—'}
                      </div>
                      <div className="wp-item-line">
                        <Calendar size={13} /> {fmtDateTime(item.NGAY_VAO)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===== Detail panel ===== */}
        <div className="wp-detail">
          {!selected ? (
            <div className="wp-detail-empty">
              <ClipboardCheck size={64} />
              <h3>Chọn một xe để xem chi tiết</h3>
              <p>Nhấp vào xe bên trái để xem lịch sử workflow và chuyển trạng thái</p>
            </div>
          ) : (
            <>
              <div className="wp-detail-header" style={{ borderTopColor: COLORS[selected.TRANGTHAI_MAU]?.border || '#3b82f6' }}>
                <div>
                  <div className="wp-detail-plate">
                    <Hash size={20} /> {selected.BIENSO}
                  </div>
                  <div className="wp-detail-customer">
                    {selected.TEN_KH} • {selected.DIENTHOAI}
                  </div>
                </div>
                <button
                  className="wp-btn-primary"
                  onClick={() => handleOpenTransition(selected)}
                >
                  <ChevronRight size={16} /> Chuyển trạng thái
                </button>
              </div>

              {/* Pipeline timeline visual */}
              <div className="wp-timeline-pipeline">
                {states.map((s, idx) => {
                  const c = COLORS[s.MAU] || COLORS.blue;
                  const isPast = s.STT_WORKFLOW < selected.TRANGTHAI;
                  const isCurrent = s.STT_WORKFLOW === selected.TRANGTHAI;
                  const isFuture = s.STT_WORKFLOW > selected.TRANGTHAI;
                  return (
                    <div key={s.STT_WORKFLOW} className="wp-tl-step">
                      <div
                        className={`wp-tl-dot ${isPast ? 'past' : isCurrent ? 'current' : 'future'}`}
                        style={isCurrent ? { background: c.border, boxShadow: `0 0 0 4px ${c.bg}` } : {}}
                      >
                        {isPast ? <CheckCircle2 size={14} color="white" /> :
                         isCurrent ? <span style={{color: 'white', fontWeight: 700}}>{idx+1}</span> :
                         <span style={{color: '#94a3b8'}}>{idx+1}</span>}
                      </div>
                      <div className="wp-tl-label" style={{ color: isFuture ? '#94a3b8' : c.fg, fontWeight: isCurrent ? 700 : 500 }}>
                        {s.TEN}
                      </div>
                      {idx < states.length - 1 && (
                        <div className={`wp-tl-line ${isPast ? 'past' : 'future'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* History */}
              <div className="wp-history">
                <h3><History size={18} /> Lịch sử thay đổi trạng thái</h3>
                {history.length === 0 ? (
                  <p className="wp-history-empty">Chưa có lịch sử</p>
                ) : (
                  <div className="wp-history-list">
                    {history.map(h => {
                      const c1 = states.find(s => s.STT_WORKFLOW === h.TRANGTHAI_CU);
                      const c2 = states.find(s => s.STT_WORKFLOW === h.TRANGTHAI_MOI);
                      return (
                        <div key={h.ID} className="wp-history-item">
                          <div className="wp-history-time">{fmtDateTime(h.NGAY)}</div>
                          <div className="wp-history-content">
                            <div className="wp-history-arrow">
                              {c1 && <span style={{ color: COLORS[c1.MAU]?.fg }}>{c1.TEN}</span>}
                              {!c1 && <span style={{ color: '#94a3b8' }}>Bắt đầu</span>}
                              <ChevronRight size={14} />
                              {c2 && <span style={{ color: COLORS[c2.MAU]?.fg, fontWeight: 700 }}>{c2.TEN}</span>}
                            </div>
                            {h.LYDO && <div className="wp-history-lydo">"{h.LYDO}"</div>}
                            {h.TEN_NV && (
                              <div className="wp-history-nv">
                                <User size={12} /> {h.TEN_NV}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transition Modal */}
      {showTransitionModal && transitionTarget && (
        <div className="wp-modal-backdrop" onClick={() => setShowTransitionModal(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div className="wp-modal-header">
              <h2>Chuyển trạng thái xe</h2>
              <button onClick={() => setShowTransitionModal(false)}><X size={20} /></button>
            </div>

            <div className="wp-modal-body">
              <div className="wp-modal-info">
                <div><strong>Xe:</strong> {transitionTarget.BIENSO}</div>
                <div><strong>KH:</strong> {transitionTarget.TEN_KH}</div>
                <div>
                  <strong>Hiện tại:</strong>{' '}
                  <span style={{ color: COLORS[transitionTarget.TRANGTHAI_MAU]?.fg, fontWeight: 700 }}>
                    {transitionTarget.TRANGTHAI_TEN}
                  </span>
                </div>
              </div>

              <div className="wp-modal-field">
                <label>Chuyển sang trạng thái</label>
                <select
                  value={transitionData.tt_moi}
                  onChange={e => setTransitionData({ ...transitionData, tt_moi: e.target.value })}
                >
                  <option value="">-- Chọn trạng thái --</option>
                  {states.map(s => (
                    <option key={s.STT_WORKFLOW} value={s.STT_WORKFLOW}>
                      Bước {s.STT_WORKFLOW + 1}: {s.TEN}
                    </option>
                  ))}
                </select>
              </div>

              <div className="wp-modal-field">
                <label>Lý do</label>
                <textarea
                  rows={3}
                  placeholder="VD: Khách đã duyệt báo giá, tiến hành xuất phụ tùng..."
                  value={transitionData.lydo}
                  onChange={e => setTransitionData({ ...transitionData, lydo: e.target.value })}
                />
              </div>

              <div className="wp-modal-field">
                <label>Ghi chú thêm (tùy chọn)</label>
                <textarea
                  rows={2}
                  value={transitionData.ghichu}
                  onChange={e => setTransitionData({ ...transitionData, ghichu: e.target.value })}
                />
              </div>
            </div>

            <div className="wp-modal-footer">
              <button className="wp-btn-secondary" onClick={() => setShowTransitionModal(false)}>Hủy</button>
              <button className="wp-btn-primary" onClick={handleTransition} disabled={!transitionData.tt_moi}>
                <CheckCircle size={16} /> Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .workflow-page { padding: 24px; background: #f1f5f9; min-height: 100%; }
        .wp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wp-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
        .wp-subtitle { color: #64748b; margin: 4px 0 0 0; font-size: 13px; }
        .wp-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .wp-refresh:hover:not(:disabled) { background: #f8fafc; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .wp-pipeline { display: flex; gap: 0; background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow-x: auto; }
        .wp-pipeline-card { flex: 1; min-width: 120px; padding: 14px 12px; border-top: 4px solid; border-radius: 8px; cursor: pointer; position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .wp-pipeline-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .wp-pipeline-card.active { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); outline: 2px solid #0f172a; }
        .wp-pipeline-icon { display: flex; align-items: center; justify-content: center; }
        .wp-pipeline-info { text-align: center; }
        .wp-pipeline-stt { font-size: 11px; color: #64748b; }
        .wp-pipeline-name { font-size: 13px; font-weight: 700; }
        .wp-pipeline-count { font-size: 24px; font-weight: 800; line-height: 1; }
        .wp-pipeline-arrow { position: absolute; right: -16px; top: 50%; transform: translateY(-50%); z-index: 1; background: white; border-radius: 50%; padding: 2px; }

        .wp-main { display: grid; grid-template-columns: 360px 1fr; gap: 16px; min-height: 600px; }

        .wp-list { background: white; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; flex-direction: column; }
        .wp-list-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
        .wp-search { flex: 1; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .wp-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; }
        .wp-list-count { font-size: 12px; color: #64748b; font-weight: 600; }
        .wp-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .wp-empty { text-align: center; color: #94a3b8; padding: 48px 0; }
        .wp-empty p { margin-top: 8px; }

        .wp-item { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .wp-item:hover { border-color: #94a3b8; background: #f8fafc; }
        .wp-item.selected { border-color: #0f172a; background: #eff6ff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .wp-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .wp-item-plate { font-weight: 700; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 4px; }
        .wp-item-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid; }
        .wp-item-body { display: flex; flex-direction: column; gap: 4px; }
        .wp-item-line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; }

        .wp-detail { background: white; border-radius: 12px; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; flex-direction: column; }
        .wp-detail-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; padding: 48px; text-align: center; }
        .wp-detail-empty h3 { margin: 16px 0 4px 0; color: #475569; }
        .wp-detail-empty p { font-size: 13px; }

        .wp-detail-header { padding: 20px 24px; border-top: 4px solid; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .wp-detail-plate { font-size: 24px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }
        .wp-detail-customer { font-size: 13px; color: #64748b; margin-top: 4px; }
        .wp-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .wp-btn-primary:hover:not(:disabled) { background: #1e293b; }
        .wp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .wp-btn-secondary { padding: 10px 18px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; cursor: pointer; }

        .wp-timeline-pipeline { display: flex; padding: 24px; align-items: flex-start; gap: 0; }
        .wp-tl-step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
        .wp-tl-dot { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; z-index: 2; }
        .wp-tl-dot.past { background: #22c55e; }
        .wp-tl-label { margin-top: 8px; font-size: 12px; text-align: center; }
        .wp-tl-line { position: absolute; top: 16px; left: 50%; right: -50%; height: 3px; background: #e2e8f0; z-index: 1; }
        .wp-tl-line.past { background: #22c55e; }

        .wp-history { padding: 0 24px 24px; flex: 1; overflow-y: auto; }
        .wp-history h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #475569; margin: 0 0 12px 0; }
        .wp-history-empty { color: #94a3b8; font-size: 13px; }
        .wp-history-list { display: flex; flex-direction: column; gap: 8px; }
        .wp-history-item { display: flex; gap: 12px; padding: 10px; border-radius: 6px; background: #f8fafc; }
        .wp-history-time { font-size: 11px; color: #64748b; white-space: nowrap; font-weight: 600; }
        .wp-history-content { flex: 1; }
        .wp-history-arrow { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
        .wp-history-lydo { font-size: 12px; color: #475569; font-style: italic; margin-top: 4px; }
        .wp-history-nv { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b; margin-top: 4px; }

        .wp-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .wp-modal { background: white; border-radius: 12px; width: 500px; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; }
        .wp-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .wp-modal-header h2 { margin: 0; font-size: 18px; }
        .wp-modal-header button { background: transparent; border: none; cursor: pointer; color: #64748b; }
        .wp-modal-body { padding: 24px; flex: 1; overflow-y: auto; }
        .wp-modal-info { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; line-height: 1.8; }
        .wp-modal-field { margin-bottom: 14px; }
        .wp-modal-field label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .wp-modal-field select, .wp-modal-field textarea { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-family: inherit; }
        .wp-modal-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; justify-content: flex-end; }
      `}</style>
    </div>
  );
}
