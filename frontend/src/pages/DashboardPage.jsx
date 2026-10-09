import { useEffect, useMemo, useState } from 'react';
import { 
  Car, Wrench, Clock, Package, CheckCircle, CalendarClock, AlertTriangle, 
  Activity, PieChart, Banknote, CarFront, Users, Wrench as WrenchIcon, Bell,
  Info, AlertCircle, CheckCircle2, XCircle, Home
} from 'lucide-react';
import { invoices, parts, reports, suppliers, vehicles, workflow } from '../services';

const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const badgeForState = (state) => ({ 0: 'badge-info', 1: 'badge-warning', 2: 'badge-danger', 3: 'badge-primary', 4: 'badge-success' }[Number(state)] || 'badge-info');

export default function DashboardPage() {
  const now = new Date();
  const [month] = useState(`Tháng ${now.getMonth() + 1}/${now.getFullYear()}`);
  const [summary, setSummary] = useState({});
  const [workflowItems, setWorkflowItems] = useState([]);
  const [workflowCounts, setWorkflowCounts] = useState([]);
  const [partList, setPartList] = useState([]);
  const [invoiceList, setInvoiceList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [revenueRows, setRevenueRows] = useState([]);
  const [maintenanceRows, setMaintenanceRows] = useState([]);

  useEffect(() => {
    const year = new Date().getFullYear();
    Promise.all([
      reports.dashboard(), workflow.list(), workflow.dashboard(), parts.list(),
      invoices.list(), suppliers.list(), vehicles.list(),
      reports.revenue(`${year}-01-01`, `${year}-12-31`),
      reports.maintenance(),
    ]).then(([dashboard, flow, counts, partRows, invoiceRows, supplierRows, vehicleRows, revenue, maintenance]) => {
      setSummary(dashboard || {});
      setWorkflowItems(Array.isArray(flow) ? flow : []);
      setWorkflowCounts(Array.isArray(counts) ? counts : []);
      setPartList(Array.isArray(partRows) ? partRows : []);
      setInvoiceList(Array.isArray(invoiceRows) ? invoiceRows : []);
      setSupplierList(Array.isArray(supplierRows) ? supplierRows : []);
      setVehicleList(Array.isArray(vehicleRows) ? vehicleRows : []);
      setRevenueRows(Array.isArray(revenue) ? revenue : []);
      setMaintenanceRows(Array.isArray(maintenance) ? maintenance : []);
    }).catch((error) => console.error('Load dashboard error', error));
  }, []);

  const workflowCount = (state) => Number(workflowCounts.find((item) => Number(item.TRANGTHAI) === state)?.SO_LUONG || 0);
  const lowStock = partList.filter((item) => Number(item.TON_KHO || 0) <= Number(item.TONTOITHIEU || 0));
  const STATS = [
    { label: 'Tổng số xe', value: summary.xe || 0, delta: '—', icon: <Car size={24} />, color: 'orange' },
    { label: 'Đang sửa chữa', value: workflowCount(2), delta: '—', icon: <Wrench size={24} />, color: 'red' },
    { label: 'Chờ xác nhận', value: workflowCount(1), delta: '—', icon: <Clock size={24} />, color: 'yellow' },
    { label: 'Chờ giao xe', value: workflowCount(3), delta: '—', icon: <Package size={24} />, color: 'blue' },
    { label: 'Đã hoàn thành', value: workflowCount(4), delta: '—', icon: <CheckCircle size={24} />, color: 'green' },
    { label: 'Lịch hẹn bảo dưỡng', value: maintenanceRows.length, delta: '—', icon: <CalendarClock size={24} />, color: 'purple' },
    { label: 'Cảnh báo tồn kho', value: lowStock.length, delta: '—', icon: <AlertTriangle size={24} />, color: 'red' },
  ];

  const REPAIR_CARS = workflowItems.filter((item) => Number(item.TRANGTHAI) !== 4).slice(0, 5).map((item, index) => {
    const vehicle = vehicleList.find((row) => row.ID === item.DXEID) || {};
    return {
      stt: index + 1, bienso: item.BIENSO || '—',
      loai: [vehicle.HANG_XE, vehicle.DONG_XE || item.PHIENBAN].filter(Boolean).join(' ') || '—',
      hangmuc: item.LYDO || item.GHICHU || '—', ktv: item.TEN_KTV || '—',
      ngay: date(item.NGAY_VAO), trangthai: item.TRANGTHAI_TEN || '—', statusClass: badgeForState(item.TRANGTHAI),
    };
  });

  const SUPPLIER_DEBTS = [...supplierList].sort((a, b) => Number(b.TOTAL_DEBT || 0) - Number(a.TOTAL_DEBT || 0)).slice(0, 5).map((item, index) => ({
    stt: index + 1, name: item.NAME || '—', tongno: money(item.TOTAL_DEBT), denhan: money(item.TOTAL_DEBT), quahan: '0',
    trangthai: Number(item.TOTAL_DEBT) > 0 ? 'Còn nợ' : 'Đã thanh toán', statusClass: Number(item.TOTAL_DEBT) > 0 ? 'badge-danger' : 'badge-success',
  }));

  const TOP_CUSTOMERS = useMemo(() => {
    const map = new Map();
    invoiceList.forEach((item) => {
      const id = item.DKHACHHANGID || item.TEN_KH || 'unknown';
      const current = map.get(id) || { name: item.TEN_KH || '—', chitieu: 0, congno: 0 };
      current.chitieu += Number(item.TONGCONG || 0);
      current.congno += Number(item.CONLAI || 0);
      map.set(id, current);
    });
    return [...map.entries()].map(([id, item]) => ({ ...item, soxe: new Set(vehicleList.filter((v) => v.DKHACHHANGID === id).map((v) => v.ID)).size }))
      .sort((a, b) => b.chitieu - a.chitieu).slice(0, 5).map((item, index) => ({ ...item, stt: index + 1, chitieu: money(item.chitieu), congno: money(item.congno) }));
  }, [invoiceList, vehicleList]);

  const MAINTENANCE = maintenanceRows.slice(0, 5).map((item) => {
    const remainingKm = Number(item.ODO_DUKIEN || 0) - Number(item.ODO_HIENTAI || 0);
    const remainingDays = item.NGAY_DUKIEN ? Math.ceil((new Date(item.NGAY_DUKIEN) - new Date()) / 86400000) : null;
    const overdue = remainingKm < 0 || (remainingDays !== null && remainingDays < 0);
    const soon = !overdue && (remainingKm <= 500 || (remainingDays !== null && remainingDays <= 30));
    return {
      bienso: item.BIENSO || '—', loai: item.LOAIBAODUONG || 'Định kỳ',
      sokm: item.ODO_DUKIEN ? `${money(item.ODO_DUKIEN)} km` : (item.NGAY_DUKIEN ? date(item.NGAY_DUKIEN) : '—'),
      thoigian: item.ODO_DUKIEN ? `${money(Math.max(0, remainingKm))} km` : (remainingDays === null ? '—' : `${Math.max(0, remainingDays)} ngày`),
      conlai: overdue ? 'Quá hạn' : soon ? 'Sắp đến hạn' : 'Còn hạn', statusClass: overdue ? 'badge-danger' : soon ? 'badge-warning' : 'badge-success',
    };
  });

  const NOTIFICATIONS = [
    ...MAINTENANCE.filter((item) => item.conlai !== 'Còn hạn').slice(0, 2).map((item) => ({ icon: <Info size={16} color="#1976D2" />, text: `Xe ${item.bienso}: ${item.loai} - ${item.conlai.toLowerCase()}`, time: 'Hiện tại', bg: '#E3F2FD' })),
    ...lowStock.slice(0, 3).map((item) => ({ icon: <AlertTriangle size={16} color="#E65100" />, text: `Linh kiện ${item.NAME} sắp hết tồn (còn ${item.TON_KHO || 0})`, time: 'Hiện tại', bg: '#FFF3E0' })),
    ...invoiceList.filter((item) => Number(item.DATHANHTOAN) === 0).slice(0, 2).map((item) => ({ icon: <Banknote size={16} color="#D32F2F" />, text: `Hóa đơn ${item.NAME} còn nợ ${money(item.CONLAI)}đ`, time: date(item.NGAY), bg: '#FFEBEE' })),
  ];

  const chartMonths = Array.from({ length: now.getMonth() + 1 }, (_, index) => {
    const rows = revenueRows.filter((row) => new Date(row.NGAY).getMonth() === index);
    return { label: `T${String(index + 1).padStart(2, '0')}`, labor: rows.reduce((sum, row) => sum + Number(row.TIEN_CONG || 0), 0), parts: rows.reduce((sum, row) => sum + Number(row.TIEN_PT || 0), 0) };
  });
  const maxChartValue = Math.max(1, ...chartMonths.flatMap((item) => [item.labor, item.parts]));
  const totalPartsRevenue = invoiceList.reduce((sum, item) => sum + Number(item.TIENPHUTUNG || 0), 0);
  const totalLabor = invoiceList.reduce((sum, item) => sum + Number(item.TIENCONG || 0), 0);
  const totalCost = totalPartsRevenue + totalLabor;
  const revenueBreakdown = [{ name: 'Phụ tùng', pct: totalPartsRevenue ? '100%' : '0%', val: `${money(totalPartsRevenue)}đ`, color: '#E65100', length: totalPartsRevenue ? 88 : 0, offset: 0 }];
  const costBreakdown = [
    { name: 'Sửa chữa', value: totalLabor, color: '#F44336' },
    { name: 'Linh kiện', value: totalPartsRevenue, color: '#FF9800' },
  ].map((item, index, rows) => ({ ...item, pct: totalCost ? `${((item.value / totalCost) * 100).toFixed(1)}%` : '0%', val: `${money(item.value)}đ`, length: totalCost ? (item.value / totalCost) * 88 : 0, offset: index === 0 ? 0 : (totalCost ? (rows[0].value / totalCost) * 88 : 0) }));

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Page Header */}
      <div className="page-header">
        <h1>
          <span className="page-icon"><Home size={24} color="#E65100" /></span>
          Tổng quan
        </h1>
        <div className="page-actions">
          <select style={{ width: 'auto', padding: '6px 12px' }}>
            <option>📅 {month}</option>
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label" title={s.label}>{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-delta up">▲ {s.delta} <span style={{color:'#9E9E9E', fontWeight:400}}>so với tháng trước</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="responsive-grid-3" style={{ marginBottom: 10, flex: 1, minHeight: 0 }}>
        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><Activity size={18} color="#E65100" /></span> Chi phí sửa chữa & mua linh kiện</h3>
          </div>
          <div className="card-body" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 4 }}>
            {chartMonths.map((item) => {
              const h1 = (item.labor / maxChartValue) * 100;
              const h2 = (item.parts / maxChartValue) * 100;
              return (
                <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%' }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', flex: 1, width: '100%', justifyContent: 'center' }}>
                    <div style={{ width: 12, height: `${h1}%`, background: '#E65100', borderRadius: '2px 2px 0 0' }}/>
                    <div style={{ width: 12, height: `${h2}%`, background: '#FFB74D', borderRadius: '2px 2px 0 0' }}/>
                  </div>
                  <span style={{ fontSize: 10, color: '#757575' }}>{item.label}</span>
                </div>
              );
            })}
          </div>
          <div className="card-footer" style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11 }}>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#E65100',borderRadius:2,marginRight:4}}/>Sửa chữa</span>
            <span><span style={{display:'inline-block',width:10,height:10,background:'#FFB74D',borderRadius:2,marginRight:4}}/>Linh kiện</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><PieChart size={18} color="#E65100" /></span> Doanh thu bán hàng (Phụ tùng)</h3>
          </div>
          <div className="card-body" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E0E0E0" strokeWidth="3"/>
                {revenueBreakdown.map((item) => <circle key={item.name} cx="18" cy="18" r="14" fill="none" stroke={item.color} strokeWidth="3" strokeDasharray={`${item.length} 88`} strokeDashoffset={-item.offset} strokeLinecap="round"/>)}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#E65100' }}>{money(totalPartsRevenue)}đ</div>
                <div style={{ fontSize: 9, color: '#757575' }}>Tổng doanh thu</div>
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 11 }}>
              {revenueBreakdown.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }}/>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ fontWeight: 600, width: 40, fontSize: 10 }}>{item.pct}</span>
                  <span style={{ color: '#757575', fontSize: 10 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><PieChart size={18} color="#E65100" /></span> Chi phí theo loại</h3>
          </div>
          <div className="card-body" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E0E0E0" strokeWidth="3"/>
                {costBreakdown.map((item) => <circle key={item.name} cx="18" cy="18" r="14" fill="none" stroke={item.color} strokeWidth="3" strokeDasharray={`${item.length} 88`} strokeDashoffset={-item.offset} strokeLinecap="round"/>)}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#E65100' }}>{money(totalCost)}đ</div>
                <div style={{ fontSize: 9, color: '#757575' }}>Tổng chi phí</div>
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 11 }}>
              {costBreakdown.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }}/>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ fontWeight: 600, width: 40, fontSize: 10 }}>{item.pct}</span>
                  <span style={{ color: '#757575', fontSize: 10 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row - Cars being repaired & Supplier debts */}
      <div className="dashboard-row-2col">
        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><CarFront size={18} color="#E65100" /></span> Xe đang sửa chữa (Top 5)</h3>
            <button className="link-btn">Xem tất cả</button>
          </div>
          <div className="card-body no-padding table-responsive">
            <table className="table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Biển số</th>
                  <th>Loại xe</th>
                  <th>Hạng mục sửa chữa</th>
                  <th>Kỹ thuật viên</th>
                  <th>Ngày bắt đầu</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {REPAIR_CARS.map(c => (
                  <tr key={c.stt}>
                    <td>{c.stt}</td>
                    <td><strong>{c.bienso}</strong></td>
                    <td>{c.loai}</td>
                    <td>{c.hangmuc}</td>
                    <td>{c.ktv}</td>
                    <td>{c.ngay}</td>
                    <td><span className={`badge ${c.statusClass}`}>{c.trangthai}</span></td>
                  </tr>
                ))}
                {REPAIR_CARS.length === 0 && <tr><td colSpan={7} className="text-center">Chưa có xe đang sửa chữa</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><Banknote size={18} color="#E65100" /></span> Công nợ nhà cung cấp</h3>
            <button className="link-btn">Xem tất cả</button>
          </div>
          <div className="card-body no-padding table-responsive">
            <table className="table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Nhà cung cấp</th>
                  <th>Tổng nợ</th>
                  <th>Đến hạn</th>
                  <th>Quá hạn</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {SUPPLIER_DEBTS.map(d => (
                  <tr key={d.stt}>
                    <td>{d.stt}</td>
                    <td>{d.name}</td>
                    <td className="money">{d.tongno}</td>
                    <td className="money">{d.denhan}</td>
                    <td className="money">{d.quahan}</td>
                    <td><span className={`badge ${d.statusClass}`}>{d.trangthai}</span></td>
                  </tr>
                ))}
                {SUPPLIER_DEBTS.length === 0 && <tr><td colSpan={6} className="text-center">Chưa có công nợ nhà cung cấp</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dashboard-row-3col">
        {/* Top Customers */}
        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><Users size={18} color="#E65100" /></span> Khách hàng (Top 5)</h3>
            <button className="link-btn">Xem tất cả</button>
          </div>
          <div className="card-body no-padding table-responsive">
            <table className="table" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên khách hàng</th>
                  <th>Số xe</th>
                  <th>Tổng chi tiêu</th>
                  <th>Công nợ</th>
                </tr>
              </thead>
              <tbody>
                {TOP_CUSTOMERS.map(c => (
                  <tr key={c.stt}>
                    <td>{c.stt}</td>
                    <td>{c.name}</td>
                    <td className="text-center">{c.soxe}</td>
                    <td className="money">{c.chitieu}</td>
                    <td className="money">{c.congno}</td>
                  </tr>
                ))}
                {TOP_CUSTOMERS.length === 0 && <tr><td colSpan={5} className="text-center">Chưa có dữ liệu khách hàng</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance History */}
        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><WrenchIcon size={18} color="#E65100" /></span> Lịch sử bảo dưỡng & nhắc hạn</h3>
            <button className="link-btn">Xem tất cả</button>
          </div>
          <div className="card-body no-padding table-responsive">
            <table className="table" style={{ minWidth: 460 }}>
              <thead>
                <tr>
                  <th>Biển số</th>
                  <th>Loại bảo dưỡng</th>
                  <th>Số km / Thời gian</th>
                  <th>Còn lại</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {MAINTENANCE.map((m, i) => (
                  <tr key={i}>
                    <td><strong>{m.bienso}</strong></td>
                    <td>{m.loai}</td>
                    <td>{m.sokm}</td>
                    <td>{m.thoigian}</td>
                    <td><span className={`badge ${m.statusClass}`}>{m.conlai}</span></td>
                  </tr>
                ))}
                {MAINTENANCE.length === 0 && <tr><td colSpan={5} className="text-center">Chưa có dữ liệu bảo dưỡng</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header">
            <h3><span className="icon"><Bell size={18} color="#E65100" /></span> Thông báo nhanh</h3>
            <button className="link-btn">Xem tất cả</button>
          </div>
          <div className="card-body">
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} className="notification-item">
                <div className="notif-icon" style={{ background: n.bg }}>{n.icon}</div>
                <div className="notif-text">{n.text}</div>
                <div className="notif-time">{n.time}</div>
              </div>
            ))}
            {NOTIFICATIONS.length === 0 && <div style={{ textAlign: 'center', color: '#757575', padding: 12 }}>Không có thông báo mới</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
