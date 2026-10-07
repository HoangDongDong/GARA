import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import DebtLedger from '../components/DebtLedger';
import CashVoucherModal from '../components/CashVoucherModal';
import { 
  CircleDollarSign, TrendingUp, TrendingDown, Wallet, BookOpen, 
  Search, Plus, FileSpreadsheet, MoreVertical, Calendar, 
  ArrowUpRight, ArrowDownRight, Users, CheckCircle, X, Filter
} from 'lucide-react';
import './ThuChiPage.css';

export default function ThuChiPage() {
  const [fromDate, setFromDate] = useState('01/09/2025');
  const [toDate, setToDate] = useState('30/09/2025');
  const [transactionType, setTransactionType] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debtTab, setDebtTab] = useState('receivable'); // 'receivable' (Phải thu) or 'payable' (Phải trả)
  const [mobileTab, setMobileTab] = useState('overview'); // 'overview' | 'in_out' | 'debt'
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Dữ liệu biểu đồ 9 tháng
  const monthlyData = [
    { month: '01/2025', thu: 120, chi: 95 },
    { month: '02/2025', thu: 135, chi: 102 },
    { month: '03/2025', thu: 160, chi: 118 },
    { month: '04/2025', thu: 145, chi: 110 },
    { month: '05/2025', thu: 180, chi: 135 },
    { month: '06/2025', thu: 170, chi: 125 },
    { month: '07/2025', thu: 190, chi: 140 },
    { month: '08/2025', thu: 175, chi: 130 },
    { month: '09/2025', thu: 186, chi: 133 },
  ];

  // Giao dịch gần đây
  const recentTransactions = [
    { date: '30/09/2025', type: 'Thu', content: 'Khách hàng thanh toán', amount: '12.500.000đ', status: 'Đã thu' },
    { date: '30/09/2025', type: 'Chi', content: 'Mua phụ tùng Toyota', amount: '8.750.000đ', status: 'Đã chi' },
    { date: '29/09/2025', type: 'Thu', content: 'Thanh toán bảo hiểm', amount: '15.000.000đ', status: 'Đã thu' },
    { date: '28/09/2025', type: 'Chi', content: 'Trả lương nhân viên', amount: '25.000.000đ', status: 'Đã chi' },
    { date: '27/09/2025', type: 'Thu', content: 'Khách hàng thanh toán', amount: '18.200.000đ', status: 'Đã thu' },
    { date: '26/09/2025', type: 'Chi', content: 'Chi phí văn phòng', amount: '3.500.000đ', status: 'Đã chi' },
  ];

  // Danh sách thu trong tháng
  const incomeList = [
    { date: '30/09/2025', customer: 'Nguyễn Văn A', content: 'Thanh toán sửa chữa', amount: '12.500.000đ' },
    { date: '29/09/2025', customer: 'Công ty TNHH Phụ Tùng A', content: 'Thanh toán phụ tùng', amount: '15.000.000đ' },
    { date: '28/09/2025', customer: 'Trần Thị B', content: 'Thanh toán bảo hiểm', amount: '8.200.000đ' },
    { date: '26/09/2025', customer: 'Lê Văn C', content: 'Thanh toán dịch vụ', amount: '6.800.000đ' },
    { date: '25/09/2025', customer: 'Phạm Thị D', content: 'Thanh toán phụ tùng', amount: '5.500.000đ' },
  ];

  // Danh sách chi trong tháng
  const expenseList = [
    { date: '30/09/2025', content: 'Mua phụ tùng Toyota', category: 'Phụ tùng', amount: '8.750.000đ' },
    { date: '29/09/2025', content: 'Lương nhân viên', category: 'Nhân sự', amount: '25.000.000đ' },
    { date: '28/09/2025', content: 'Chi phí văn phòng', category: 'Văn phòng', amount: '3.500.000đ' },
    { date: '26/09/2025', content: 'Thanh toán nhà cung cấp', category: 'NCC', amount: '12.000.000đ' },
    { date: '25/09/2025', content: 'Chi phí điện nước', category: 'Văn phòng', amount: '1.800.000đ' },
  ];

  const [debts, setDebts] = useState({receivable: [], payable: [], receivableTotal: 0, payableTotal: 0});
  const [debtLoading, setDebtLoading] = useState(true);
  const [debtError, setDebtError] = useState('');
  const loadDebts = useCallback(async () => {
    setDebtLoading(true);
    setDebtError('');
    try { const response = await api.get('/finance/debts'); setDebts(response.data.data); }
    catch (error) { setDebtError(error.response?.data?.error || 'Không tải được công nợ.'); }
    finally { setDebtLoading(false); }
  }, []);
  useEffect(() => {
    loadDebts();
    window.addEventListener('focus', loadDebts);
    return () => window.removeEventListener('focus', loadDebts);
  }, [loadDebts]);
  const debtReceivable = debts.receivable;
  const debtPayable = debts.payable;
  const debtRows = (debtTab === 'receivable' ? debtReceivable : debtPayable)
    .filter(item => item.customer.toLocaleLowerCase('vi').includes(searchTerm.trim().toLocaleLowerCase('vi')));
  const debtMoney = amount => Number(amount || 0).toLocaleString('vi-VN') + 'đ';

  const tableHeaderThStyle = {
    background: '#FFE0B2',
    color: '#D84315',
    padding: '4px 6px',
    fontSize: '9.5px',
    fontWeight: 700,
    border: 'none',
    whiteSpace: 'nowrap'
  };

  return (
    <div className="tc-page-container">
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 9999,
          background: toast.type === 'error' ? '#D32F2F' : '#2E7D32',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600
        }}>
          <CheckCircle size={16} />
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="tc-header">
        <h1 className="tc-header-title">
          <span style={{ background: '#E65100', color: 'white', width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            💰
          </span>
          Thu - Chi
        </h1>
        <div className="tc-actions-group">
          <button 
            onClick={() => setShowAddModal(true)}
            className="tc-btn-add"
          >
            <Plus size={14} /> Tạo phiếu thu/chi
          </button>
          <div className="tc-actions-row-mobile">
            <button 
              type="button"
              onClick={() => showToastMsg('Tính năng Import Excel sẵn sàng')}
              className="tc-btn-outline"
            >
              <FileSpreadsheet size={14} color="#4CAF50" /> Import Excel
            </button>
            <button 
              type="button"
              onClick={() => showToastMsg('Xuất file Excel sổ quỹ thu chi thành công!')}
              className="tc-btn-outline"
            >
              <FileSpreadsheet size={14} color="#1976D2" /> Xuất Excel
            </button>
            <button type="button" className="tc-btn-outline" style={{ padding: '6px 8px' }}>
              <MoreVertical size={14} color="#616161" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="tc-filter-bar">
        <div className="tc-filter-row-1">
          <div className="tc-search-box">
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập nội dung, mã phiếu, đối tác..." 
                className="tc-search-input"
              />
              <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
            </div>
          </div>
          <button 
            type="button"
            className="tc-btn-search"
            onClick={() => showToastMsg('Đã lọc kết quả theo tiêu chí')}
          >
            <Search size={12} /> Tìm kiếm
          </button>
        </div>

        <div className="tc-filter-row-2">
          <div className="tc-filter-item">
            <label className="tc-filter-label">Từ ngày</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="tc-filter-input"
                style={{ width: '100%', paddingRight: 24 }}
              />
              <Calendar size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
            </div>
          </div>

          <div className="tc-filter-item">
            <label className="tc-filter-label">Đến ngày</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="tc-filter-input"
                style={{ width: '100%', paddingRight: 24 }}
              />
              <Calendar size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
            </div>
          </div>
        </div>

        <div className="tc-filter-row-3">
          <div className="tc-filter-item">
            <label className="tc-filter-label">Loại giao dịch</label>
            <select 
              value={transactionType} 
              onChange={(e) => setTransactionType(e.target.value)}
              className="tc-filter-select"
              style={{ width: '100%' }}
            >
              <option value="">Tất cả</option>
              <option value="thu">Phiếu thu</option>
              <option value="chi">Phiếu chi</option>
            </select>
          </div>

          <div className="tc-filter-item">
            <label className="tc-filter-label">Danh mục</label>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="tc-filter-select"
              style={{ width: '100%' }}
            >
              <option value="">Tất cả</option>
              <option>Sửa chữa bảo dưỡng</option>
              <option>Mua phụ tùng</option>
              <option>Lương nhân sự</option>
              <option>Chi phí văn phòng</option>
              <option>Công nợ nhà cung cấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Segmented Tabs */}
      <div className="tc-mobile-tabs">
        <button
          type="button"
          className={`tc-mobile-tab-btn ${mobileTab === 'overview' ? 'active' : ''}`}
          onClick={() => setMobileTab('overview')}
        >
          <TrendingUp size={14} /> Tổng quan & Biểu đồ
        </button>
        <button
          type="button"
          className={`tc-mobile-tab-btn ${mobileTab === 'in_out' ? 'active' : ''}`}
          onClick={() => setMobileTab('in_out')}
        >
          <Wallet size={14} /> Sổ Thu & Chi
        </button>
        <button
          type="button"
          className={`tc-mobile-tab-btn ${mobileTab === 'debt' ? 'active' : ''}`}
          onClick={() => setMobileTab('debt')}
        >
          <BookOpen size={14} /> Công nợ
        </button>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className={`tc-kpi-grid ${mobileTab !== 'overview' ? 'tc-mobile-hidden' : ''}`}>
        
        {/* Card 1: Tổng thu */}
        <div className="card tc-kpi-card">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowUpRight size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#616161', fontWeight: 500 }}>Tổng thu</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2E7D32' }}>186.450.000đ</div>
            <div style={{ fontSize: 9.5, color: '#2E7D32', fontWeight: 600 }}>↑ 12% so với tháng trước</div>
          </div>
        </div>

        {/* Card 2: Tổng chi */}
        <div className="card tc-kpi-card">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D32F2F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowDownRight size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#616161', fontWeight: 500 }}>Tổng chi</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#D32F2F' }}>132.780.000đ</div>
            <div style={{ fontSize: 9.5, color: '#D32F2F', fontWeight: 600 }}>↑ 8% so với tháng trước</div>
          </div>
        </div>

        {/* Card 3: Tồn quỹ hiện tại */}
        <div className="card tc-kpi-card">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1976D2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={19} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#616161', fontWeight: 500 }}>Tồn quỹ hiện tại</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1976D2' }}>53.670.000đ</div>
          </div>
        </div>

        {/* Card 4: Công nợ phải thu */}
        <div className="card tc-kpi-card">
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E65100', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={19} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#616161', fontWeight: 500 }}>Công nợ phải thu</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#E65100' }}>{debtLoading ? 'Đang tải…' : debtError ? '—' : debtMoney(debts.receivableTotal)}</div>
            <div style={{ fontSize: 9.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} /> {debtReceivable.length} khách hàng
            </div>
          </div>
        </div>

      </div>

      <DebtLedger kind={debtTab} onKindChange={setDebtTab} onLoaded={setDebts} mobileTab={mobileTab}/>

      {/* Middle Section: Biểu đồ thu - chi theo tháng (~60%) & Giao dịch gần đây (~40%) */}
      <div className={`tc-middle-grid ${mobileTab !== 'overview' ? 'tc-mobile-hidden' : ''}`}>
        
        {/* Left: Biểu đồ thu - chi theo tháng */}
        <div className="card tc-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#E65100', fontSize: 13 }}>📊</span>
              <h2 style={{ fontSize: 11.5, fontWeight: 700, margin: 0, color: '#212121' }}>Biểu đồ thu - chi theo tháng</h2>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#424242' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E7D32' }} /> Thu
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#424242' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E65100' }} /> Chi
              </span>
            </div>
          </div>

          {/* Dual Bar Chart Rendered with SVG */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', minWidth: 280, overflowX: 'auto' }}>
            {/* Y Axis Labels */}
            <div style={{ width: 35, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 8.5, color: '#757575', paddingBottom: 18, textAlign: 'right', paddingRight: 6 }}>
              <span>250tr</span>
              <span>200tr</span>
              <span>150tr</span>
              <span>100tr</span>
              <span>50tr</span>
              <span>0</span>
            </div>

            {/* Chart Area with Grid and Bars */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
              {/* Grid Lines */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                {[0, 1, 2, 3, 4, 5].map((_, i) => (
                  <div key={i} style={{ borderBottom: '1px dashed #E0E0E0', width: '100%', height: 0 }} />
                ))}
              </div>

              {/* Bars Container */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 2, zIndex: 1 }}>
                {monthlyData.map((d, i) => {
                  const maxVal = 250;
                  const thuHeight = Math.round((d.thu / maxVal) * 165);
                  const chiHeight = Math.round((d.chi / maxVal) * 165);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100 / monthlyData.length}%` }}>
                      {/* Bars Group */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 165 }}>
                        {/* Thu Bar (Green) */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 7, color: '#2E7D32', fontWeight: 600, marginBottom: 1 }}>{d.thu}tr</span>
                          <div style={{ width: 12, height: thuHeight, background: '#2E7D32', borderRadius: '2px 2px 0 0' }} />
                        </div>
                        {/* Chi Bar (Orange) */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 7, color: '#E65100', fontWeight: 600, marginBottom: 1 }}>{d.chi}tr</span>
                          <div style={{ width: 12, height: chiHeight, background: '#E65100', borderRadius: '2px 2px 0 0' }} />
                        </div>
                      </div>
                      {/* Month Label */}
                      <div style={{ fontSize: 8.5, color: '#616161', marginTop: 4, whiteSpace: 'nowrap' }}>
                        {d.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Giao dịch gần đây */}
        <div className="card tc-recent-card">
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#E65100', fontSize: 13 }}>📋</span>
              <h2 style={{ fontSize: 11.5, fontWeight: 700, margin: 0, color: '#212121' }}>Giao dịch gần đây</h2>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer', fontWeight: 500 }}>Xem tất cả</span>
          </div>

          <div className="tc-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="tc-table-recent" style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FFF3E0', borderBottom: '1px solid #FFE0B2' }}>
                  <th style={{ ...tableHeaderThStyle, width: 65 }}>Ngày</th>
                  <th style={{ ...tableHeaderThStyle, width: 45, textAlign: 'center' }}>Loại</th>
                  <th style={{ ...tableHeaderThStyle }}>Nội dung</th>
                  <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'right' }}>Số tiền</th>
                  <th style={{ ...tableHeaderThStyle, width: 60, textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '4px 6px', color: '#616161' }}>{tx.date}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: 8,
                        fontSize: 8,
                        fontWeight: 600,
                        color: tx.type === 'Thu' ? '#2E7D32' : '#D32F2F',
                        background: tx.type === 'Thu' ? '#E8F5E9' : '#FFEBEE'
                      }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ padding: '4px 6px', fontWeight: 500, color: '#333' }}>{tx.content}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: tx.type === 'Thu' ? '#2E7D32' : '#D32F2F' }}>
                      {tx.amount}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: 8,
                        fontSize: 8,
                        fontWeight: 600,
                        color: tx.status === 'Đã thu' ? '#2E7D32' : '#D32F2F',
                        background: tx.status === 'Đã thu' ? '#E8F5E9' : '#FFEBEE'
                      }}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Bottom Section: 3 Cards (Danh sách thu, Danh sách chi, Công nợ) */}
      <div className="tc-bottom-grid">
        
        {/* Card 1: Danh sách thu trong tháng */}
        <div className={`card tc-bottom-card ${mobileTab !== 'in_out' ? 'tc-mobile-hidden' : ''}`} style={{ padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#2E7D32', fontSize: 13 }}>📥</span>
              <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Danh sách thu trong tháng</h2>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer' }}>Xem tất cả</span>
          </div>

          <div className="tc-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="tc-table-income" style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                  <th style={{ ...tableHeaderThStyle, width: 65 }}>Ngày</th>
                  <th style={{ ...tableHeaderThStyle, width: 85 }}>Khách hàng</th>
                  <th style={{ ...tableHeaderThStyle }}>Nội dung</th>
                  <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'right' }}>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {incomeList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '4px 6px', color: '#616161' }}>{item.date}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600, color: '#333' }}>{item.customer}</td>
                    <td style={{ padding: '4px 6px', color: '#424242' }}>{item.content}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#2E7D32' }}>{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '4px 10px', background: '#FAFAFA', borderTop: '1px solid #E0E0E0', textAlign: 'right', fontSize: 10.5, flexShrink: 0 }}>
            <span style={{ color: '#616161' }}>Tổng thu: </span>
            <b style={{ color: '#2E7D32' }}>48.000.000đ</b>
          </div>
        </div>

        {/* Card 2: Danh sách chi trong tháng */}
        <div className={`card tc-bottom-card ${mobileTab !== 'in_out' ? 'tc-mobile-hidden' : ''}`} style={{ padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#D32F2F', fontSize: 13 }}>📤</span>
              <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Danh sách chi trong tháng</h2>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer' }}>Xem tất cả</span>
          </div>

          <div className="tc-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="tc-table-expense" style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                  <th style={{ ...tableHeaderThStyle, width: 65 }}>Ngày</th>
                  <th style={{ ...tableHeaderThStyle }}>Nội dung</th>
                  <th style={{ ...tableHeaderThStyle, width: 65 }}>Danh mục</th>
                  <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'right' }}>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {expenseList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '4px 6px', color: '#616161' }}>{item.date}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600, color: '#333' }}>{item.content}</td>
                    <td style={{ padding: '4px 6px', color: '#616161' }}>{item.category}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#D32F2F' }}>{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '4px 10px', background: '#FAFAFA', borderTop: '1px solid #E0E0E0', textAlign: 'right', fontSize: 10.5, flexShrink: 0 }}>
            <span style={{ color: '#616161' }}>Tổng chi: </span>
            <b style={{ color: '#D32F2F' }}>51.050.000đ</b>
          </div>
        </div>

      </div>

      {showAddModal && <CashVoucherModal onClose={() => setShowAddModal(false)} onSaved={() => { loadDebts(); window.dispatchEvent(new Event('garage-cashbook-changed')); }} />}

    </div>
  );
}
