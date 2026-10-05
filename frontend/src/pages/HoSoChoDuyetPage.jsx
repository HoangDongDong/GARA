import { openDocumentPrint } from '../components/DocumentPrintDialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ClipboardCheck, Clock, Eye, FileText,
  Kanban, Plus, RefreshCw, Search, ShieldCheck, Table as TableIcon,
  User, Wrench, CarFront, X,
} from 'lucide-react';
import { workflow } from '../services';
import RepairSupplementQueue from '../components/RepairSupplementQueue';
import './HoSoChoDuyetPage.css';

export const WORKFLOW_STAGES = [
  { id: 0, label: 'Chờ duyệt báo giá', icon: <FileText size={16}/>, color: '#d97706', nextBtn: 'Duyệt & Xác nhận sửa' },
  { id: 1, label: 'Xác nhận sửa chữa', icon: <CheckCircle2 size={16}/>, color: '#2563eb', nextBtn: 'Bắt đầu sửa chữa' },
  { id: 2, label: 'Đang sửa chữa', icon: <Wrench size={16}/>, color: '#7c3aed', nextBtn: 'Hoàn thành kỹ thuật (QC)' },
  { id: 3, label: 'Chờ giao xe', icon: <CarFront size={16}/>, color: '#0891b2', nextBtn: 'Giao xe & Hoàn tất' },
  { id: 4, label: 'Hoàn thành', icon: <ShieldCheck size={16}/>, color: '#059669', nextBtn: null },
];

const progressByState = [15, 35, 70, 95, 100];
const fmtMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const fmtDate = (value, time = true) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', time ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
};
const errorText = (error) => error?.response?.data?.error || error?.message || 'Không thể thực hiện thao tác.';

function readPermission() {
  try {
    const user = JSON.parse(localStorage.getItem('garage_user') || '{}');
    return Number(user.ISADMIN) === 1 ? 31 : Number(user.PERMISSIONS?.REPAIR || 0);
  } catch { return 0; }
}

function mapOrder(row) {
  const ticketCode = row.SO_LENH || row.SO_PHIEU_TN || 'Chưa lập lệnh';
  return {
    id: row.ID, vehicleId: row.DXEID, repairId: row.TLENHSUACHUAID,
    soPhieuText: ticketCode,
    soPhieu: <span className="hscd-ticket-with-time"><span>{ticketCode}</span><small><Clock size={10}/> Cập nhật: {fmtDate(row.NGAY_TRANGTHAI)}</small></span>,
    bienSo: row.BIENSO || '—',
    tenXe: [row.HANG_XE, row.DONG_XE, row.PHIENBAN, row.NAMSANXUAT ? `(${row.NAMSANXUAT})` : ''].filter(Boolean).join(' ') || 'Chưa có thông tin xe',
    khachHang: row.TEN_KH || 'Khách vãng lai', dienThoai: row.DIENTHOAI || '—',
    coVan: row.TEN_CV || 'Chưa phân công', ktv: row.TEN_KTV || 'Chưa phân công',
    trangThai: Math.max(0, Math.min(4, Number(row.TRANGTHAI || 0))),
    tienDuKien: Number(row.TONGCONG || 0), ngayVao: row.NGAY_VAO, ngayHenGiao: row.NGAY_DUKIEN,
    ngayCapNhatTrangThai: row.NGAY_TRANGTHAI,
    yeuCau: row.LENH_NOTE || row.YEUCAUKHACH || row.GHICHU || row.TINHTRANGXE || 'Chưa có nội dung yêu cầu',
    tienDo: progressByState[Math.max(0, Math.min(4, Number(row.TRANGTHAI || 0)))],
    items: (row.ITEMS || []).map((item) => ({ id: item.ID, ten: item.TEN_HANG_MUC || item.NOTE || 'Hạng mục', loai: Number(item.LOAI) === 0 ? 'Phụ tùng' : 'Dịch vụ / Công', sl: Number(item.SOLUONG || 0), donGia: Number(item.DONGIA || 0), thanhTien: Number(item.THANHTIEN || 0) })),
    history: (row.HISTORY || []).map((item) => ({ id: item.ID, thoiGian: fmtDate(item.NGAY), nguoi: item.TEN_NV || 'Hệ thống', hanhDong: item.LYDO || `${item.TEN_CU || 'Bắt đầu'} → ${item.TEN_MOI || WORKFLOW_STAGES[item.TRANGTHAI_MOI]?.label || ''}`, ghiChu: item.GHICHU })),
  };
}

export default function HoSoChoDuyetPage() {
  const navigate = useNavigate();
  const permission = readPermission();
  const canAdd = (permission & 2) === 2;
  const canEdit = (permission & 4) === 4;
  const [orders, setOrders] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterAdvisor, setFilterAdvisor] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState('');
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, supplementRows] = await Promise.all([workflow.board(), workflow.supplements()]);
      setSupplements(Array.isArray(supplementRows) ? supplementRows : []);
      const mapped = (Array.isArray(rows) ? rows : []).map(mapOrder);
      setOrders(mapped);
      setSelectedOrder((current) => current ? mapped.find((item) => item.id === current.id) || null : null);
    } catch (error) { notify(errorText(error), 'error'); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleNextStep = async (order) => {
    if (!canEdit) return notify('Chức vụ của bạn chưa có quyền Sửa cho chức năng Sửa chữa - Dịch vụ.', 'error');
    if (order.trangThai >= 4) return;
    setChangingId(order.id);
    try {
      await workflow.transition({ DXEID: order.vehicleId, TRANGTHAI: order.trangThai + 1, LYDO: `Chuyển sang bước ${WORKFLOW_STAGES[order.trangThai + 1].label}`, GHICHU: order.yeuCau });
      notify(`Xe ${order.bienSo} đã chuyển sang ${WORKFLOW_STAGES[order.trangThai + 1].label}.`);
      await loadBoard();
    } catch (error) { notify(errorText(error), 'error'); }
    finally { setChangingId(''); }
  };

  const advisors = useMemo(() => [...new Set([...orders.map((item) => item.coVan), ...supplements.map((item) => item.TEN_CV)].filter((name) => name && name !== 'Chưa phân công'))].sort(), [orders, supplements]);
  const counts = useMemo(() => orders.reduce((result, item) => { result[item.trangThai] += 1; result.total += 1; return result; }, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, total: 0 }), [orders]);
  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return orders.filter((item) => {
      const matchesText = !keyword || [item.bienSo, item.khachHang, item.dienThoai, item.soPhieuText, item.tenXe].some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword));
      return matchesText && (filterStage === 'all' || item.trangThai === Number(filterStage)) && (filterAdvisor === 'all' || item.coVan === filterAdvisor);
    });
  }, [orders, search, filterStage, filterAdvisor]);

  const action = (order, compact = false) => {
    const stage = WORKFLOW_STAGES[order.trangThai];
    if (!stage.nextBtn) return <div style={{ color: '#059669', fontWeight: 700, flex: 1, textAlign: 'center' }}>✓ Đã bàn giao</div>;
    return <button type="button" className={compact ? 'hscd-btn-table-detail' : 'hscd-btn-step-next'} disabled={!canEdit || changingId === order.id} onClick={(event) => { event.stopPropagation(); handleNextStep(order); }} title={!canEdit ? 'Cần quyền Sửa' : 'Chuyển đúng sang bước tiếp theo'}>
      {changingId === order.id ? 'Đang lưu...' : compact ? 'Bước kế →' : stage.nextBtn}<ArrowRight size={13}/>
    </button>;
  };

  return <div className="hscd-page">
    {toast && <div className={`hscd-toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.type === 'error' ? <X size={17}/> : <CheckCircle2 size={17}/>}<span>{toast.message}</span></div>}
    <div className="hscd-header">
      <div className="hscd-title-group"><div className="hscd-title-icon"><ClipboardCheck size={24}/></div><div><h1 className="hscd-title">Hồ sơ chờ duyệt & Điều phối sửa chữa <span className="hscd-live-badge">Dữ liệu GARAGE.FDB</span></h1><div className="hscd-subtitle">Quản lý quy trình thật 5 bước: Chờ duyệt → Xác nhận sửa → Đang sửa → Giao xe → Hoàn thành</div></div></div>
      <div className="hscd-header-actions"><div className="hscd-view-toggle"><button className={`hscd-view-btn ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}><Kanban size={15}/> <span>Quy trình</span></button><button className={`hscd-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><TableIcon size={15}/> <span>Danh sách</span></button></div><button className="hscd-btn-reset" onClick={loadBoard} disabled={loading} title="Tải lại dữ liệu"><RefreshCw size={14}/> <span>Làm mới</span></button>{canAdd && <button className="hscd-btn-add" onClick={() => navigate('/sua-chua')} title="Lập phiếu tiếp nhận sửa chữa mới"><Plus size={14}/> <span>Tạo hồ sơ</span></button>}</div>
    </div>

    <RepairSupplementQueue rows={supplements} loading={loading} search={search} advisor={filterAdvisor} canEdit={canEdit} onChanged={loadBoard} />

    <div className="hscd-stats-grid">{WORKFLOW_STAGES.map((stage) => <div key={stage.id} className={`hscd-stat-card stage-${stage.id} ${filterStage === stage.id ? 'selected' : ''}`} onClick={() => setFilterStage(filterStage === stage.id ? 'all' : stage.id)}><div className="hscd-stat-info"><span className="hscd-stat-name">{stage.label}</span><div className="hscd-stat-value">{counts[stage.id]} <span>xe</span></div></div><div className="hscd-stat-icon-wrap">{stage.icon}</div></div>)}</div>

    <div className="hscd-filter-bar"><div className="hscd-filter-left"><div className="hscd-search-box"><Search size={15} className="hscd-search-icon"/><input className="hscd-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Biển số, khách hàng, SĐT..."/></div><select className="hscd-filter-select" value={filterAdvisor} onChange={(event) => setFilterAdvisor(event.target.value)}><option value="all">Tất cả Cố vấn</option>{advisors.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div className="hscd-status-tabs"><button className={`hscd-status-tab ${filterStage === 'all' ? 'active' : ''}`} onClick={() => setFilterStage('all')}>Tất cả ({counts.total})</button>{WORKFLOW_STAGES.map((stage) => <button key={stage.id} className={`hscd-status-tab ${filterStage === stage.id ? 'active' : ''}`} onClick={() => setFilterStage(stage.id)}>{stage.label} ({counts[stage.id]})</button>)}</div></div>

    {loading ? <div className="hscd-loading"><RefreshCw size={20}/> Đang tải dữ liệu từ backend...</div> : viewMode === 'kanban' ? <div className="hscd-kanban-board">{WORKFLOW_STAGES.map((stage) => { const stageOrders = filteredOrders.filter((item) => item.trangThai === stage.id); return <div className={`hscd-kanban-col stage-${stage.id}`} key={stage.id}><div className={`hscd-col-header stage-${stage.id}`}><div className="hscd-col-title-wrap">{stage.icon}<span className="hscd-col-title">{stage.label}</span></div><span className="hscd-col-count">{stageOrders.length}</span></div><div className="hscd-col-body">{!stageOrders.length ? <div className="hscd-col-empty">Không có hồ sơ</div> : stageOrders.map((order) => <div className="hscd-card" key={order.id} onClick={() => setSelectedOrder(order)}><div className="hscd-card-header"><span className="hscd-plate-badge">{order.bienSo}</span><span className="hscd-card-id">{order.soPhieu}</span></div><div className="hscd-card-car" title={order.tenXe}>{order.tenXe}</div><div className="hscd-card-customer" title={`${order.khachHang} (${order.dienThoai})`}><User size={12}/><span>{order.khachHang}</span><span className="hscd-card-phone">({order.dienThoai})</span></div><div className="hscd-card-services" title={order.yeuCau}><strong>CV:</strong> {order.yeuCau}</div><div className="hscd-card-progress"><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}><span>Tiến độ</span><strong style={{ color: stage.color }}>{order.tienDo}%</strong></div><div className="hscd-progress-bar-bg"><div className="hscd-progress-bar-fill" style={{ width: `${order.tienDo}%`, background: stage.color }}/></div></div><div className="hscd-card-meta"><span>KTV: <strong>{order.ktv}</strong></span><span className="hscd-card-amount">{fmtMoney(order.tienDuKien)}</span></div><div className="hscd-card-actions" onClick={(event) => event.stopPropagation()}>{action(order)}<button className="hscd-btn-card-more" onClick={() => setSelectedOrder(order)} title="Xem chi tiết hồ sơ"><Eye size={13}/></button></div></div>)}</div></div>; })}</div> : <div className="hscd-table-wrapper"><div className="hscd-table-desktop"><table className="hscd-table"><thead><tr><th>Số phiếu</th><th>Biển số</th><th>Dòng xe</th><th>Khách hàng & SĐT</th><th>Cố vấn / KTV</th><th>Chi phí</th><th>Trạng thái</th><th>Thao tác</th><th>Chi tiết</th></tr></thead><tbody>{filteredOrders.map((order) => { const stage = WORKFLOW_STAGES[order.trangThai]; return <tr key={order.id}><td><b>{order.soPhieu}</b></td><td><span className="hscd-plate-badge">{order.bienSo}</span></td><td><b>{order.tenXe}</b></td><td><b>{order.khachHang}</b><div style={{ color: '#2563eb' }}>{order.dienThoai}</div></td><td><div>CV: {order.coVan}</div><div style={{ color: '#64748b' }}>KTV: {order.ktv}</div></td><td className="hscd-card-amount">{fmtMoney(order.tienDuKien)}</td><td><span className={`hscd-badge-status status-${order.trangThai}`}>{stage.icon}{stage.label}</span></td><td>{action(order, true)}</td><td><button className="hscd-btn-table-detail" onClick={() => setSelectedOrder(order)}><Eye size={14}/></button></td></tr>; })}</tbody></table></div><div className="hscd-table-mobile">{filteredOrders.map((order) => { const stage = WORKFLOW_STAGES[order.trangThai]; return <div className="hscd-mobile-item-card" key={order.id} onClick={() => setSelectedOrder(order)}><div className="hscd-mobile-item-top"><span className="hscd-plate-badge">{order.bienSo}</span><span className={`hscd-badge-status status-${order.trangThai}`}>{stage.icon}{stage.label}</span></div><div className="hscd-mobile-item-car">{order.tenXe}</div><div className="hscd-mobile-item-info"><span>👤 {order.khachHang}</span><a href={`tel:${order.dienThoai}`} onClick={(e) => e.stopPropagation()} style={{ color: '#2563eb', fontWeight: 600 }}>📞 {order.dienThoai}</a></div><div className="hscd-mobile-item-footer"><span className="hscd-card-amount">{fmtMoney(order.tienDuKien)}</span><div className="hscd-mobile-item-actions" onClick={(e) => e.stopPropagation()}>{action(order, true)}<button className="hscd-btn-card-more" onClick={() => setSelectedOrder(order)}><Eye size={13}/></button></div></div></div>; })}</div>{!filteredOrders.length && <div className="hscd-col-empty">Không tìm thấy hồ sơ phù hợp</div>}</div>}

    {selectedOrder && <div className="hscd-modal-overlay" onClick={() => setSelectedOrder(null)}><div className="hscd-modal-content" onClick={(event) => event.stopPropagation()}><div className="hscd-modal-header"><div className="hscd-modal-title-left"><span className="hscd-plate-badge" style={{ fontSize: 15 }}>{selectedOrder.bienSo}</span><div><b style={{ fontSize: 16 }}>{selectedOrder.tenXe}</b><div style={{ opacity: .8 }}>Phiếu: {selectedOrder.soPhieu}</div></div></div><button className="hscd-modal-close-btn" onClick={() => setSelectedOrder(null)}><X size={18}/></button></div><div className="hscd-stepper">{WORKFLOW_STAGES.map((stage) => <div key={stage.id} className={`hscd-step-item ${selectedOrder.trangThai === stage.id ? 'active' : ''} ${selectedOrder.trangThai > stage.id ? 'completed' : ''}`}><div className="hscd-step-number">{selectedOrder.trangThai > stage.id ? '✓' : stage.id + 1}</div><div className="hscd-step-text">{stage.label}</div></div>)}</div><div className="hscd-modal-body"><div className="hscd-info-box-grid"><div className="hscd-info-box"><div className="hscd-info-box-label">Khách hàng</div><div className="hscd-info-box-val">{selectedOrder.khachHang}</div><div>📞 {selectedOrder.dienThoai}</div></div><div className="hscd-info-box"><div className="hscd-info-box-label">Phân công</div><div className="hscd-info-box-val">CV: {selectedOrder.coVan}</div><div>KTV: {selectedOrder.ktv}</div></div><div className="hscd-info-box"><div className="hscd-info-box-label">Thời gian</div><div className="hscd-info-box-val">Vào: {fmtDate(selectedOrder.ngayVao)}</div><div>Hẹn giao: {fmtDate(selectedOrder.ngayHenGiao)}</div></div></div><div><h4>Chi tiết hạng mục sửa chữa</h4><div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'auto' }}><table className="hscd-items-table"><thead><tr><th>STT</th><th>Hạng mục</th><th>Loại</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{selectedOrder.items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><b>{item.ten}</b></td><td>{item.loai}</td><td>{item.sl}</td><td>{fmtMoney(item.donGia)}</td><td><b>{fmtMoney(item.thanhTien)}</b></td></tr>)}</tbody><tfoot><tr><td colSpan="5" style={{ textAlign: 'right' }}><b>TỔNG CỘNG:</b></td><td><b style={{ color: '#b91c1c' }}>{fmtMoney(selectedOrder.tienDuKien)}</b></td></tr></tfoot></table>{!selectedOrder.items.length && <div className="hscd-col-empty">Hồ sơ chưa có chi tiết báo giá</div>}</div></div><div><h4>Lịch sử chuyển trạng thái</h4><div className="hscd-history">{selectedOrder.history.map((item) => <div key={item.id}><Clock size={13}/><span>{item.thoiGian}</span><b>{item.nguoi}:</b><span>{item.hanhDong}{item.ghiChu ? ` — ${item.ghiChu}` : ''}</span></div>)}{!selectedOrder.history.length && <div>Chưa có lịch sử.</div>}</div></div></div><div className="hscd-modal-footer"><span className={`hscd-badge-status status-${selectedOrder.trangThai}`}>{WORKFLOW_STAGES[selectedOrder.trangThai].label}</span><div style={{ display: 'flex', gap: 8 }}><button className="hscd-btn-reset" disabled={!selectedOrder.repairId || (permission & 17)!==17} onClick={()=>openDocumentPrint({ type:'MauPhieuSuaChua',id:selectedOrder.repairId })}>In phiếu</button>{action(selectedOrder)}<button className="hscd-btn-reset" onClick={() => setSelectedOrder(null)}>Đóng</button></div></div></div></div>}
  </div>;
}
