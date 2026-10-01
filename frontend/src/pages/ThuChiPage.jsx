import { useState } from 'react';
import { 
  CircleDollarSign, TrendingUp, TrendingDown, Wallet, BookOpen, 
  Search, Plus, FileSpreadsheet, MoreVertical, Calendar, 
  ArrowUpRight, ArrowDownRight, Users, CheckCircle, X, Filter
} from 'lucide-react';

export default function ThuChiPage() {
  const [fromDate, setFromDate] = useState('01/09/2025');
  const [toDate, setToDate] = useState('30/09/2025');
  const [transactionType, setTransactionType] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debtTab, setDebtTab] = useState('receivable'); // 'receivable' (Phải thu) or 'payable' (Phải trả)
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

  // Công nợ phải thu
  const debtReceivable = [
    { customer: 'Nguyễn Văn A', amount: '25.000.000đ', dueDate: '05/10/2025' },
    { customer: 'Công ty TNHH Phụ Tùng A', amount: '18.500.000đ', dueDate: '10/10/2025' },
    { customer: 'Trần Thị B', amount: '15.000.000đ', dueDate: '15/10/2025' },
    { customer: 'Lê Văn C', amount: '12.000.000đ', dueDate: '20/10/2025' },
    { customer: 'Phạm Thị D', amount: '8.000.000đ', dueDate: '25/10/2025' },
  ];

  // Công nợ phải trả
  const debtPayable = [
    { customer: 'Công ty CP Phụ Tùng Denso', amount: '35.000.000đ', dueDate: '05/10/2025' },
    { customer: 'Đại lý Dầu Nhớt Motul', amount: '22.000.000đ', dueDate: '12/10/2025' },
    { customer: 'Nhà cung cấp Sơn Dupont', amount: '14.500.000đ', dueDate: '18/10/2025' },
    { customer: 'Công ty Lốp Michelin VN', amount: '18.000.000đ', dueDate: '22/10/2025' },
  ];

  // Form tạo phiếu mới
  const [modalType, setModalType] = useState('THU');
  const [modalAmount, setModalAmount] = useState('');
  const [modalPartner, setModalPartner] = useState('');
  const [modalContent, setModalContent] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!modalAmount || !modalPartner) {
      alert('Vui lòng nhập số tiền và đối tác/khách hàng!');
      return;
    }
    setShowAddModal(false);
    showToastMsg(`Đã tạo thành công Phiếu ${modalType === 'THU' ? 'Thu' : 'Chi'}: ${Number(modalAmount).toLocaleString('vi-VN')}đ`);
    setModalAmount('');
    setModalPartner('');
    setModalContent('');
  };

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
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto' }}>
      
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
      <div className="page-header" style={{ marginBottom: 6, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: '#E65100', color: 'white', width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
            💰
          </span>
          Thu - Chi
        </h1>
        <div className="page-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ background: '#E65100', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            + Tạo phiếu thu/chi
          </button>
          <button 
            onClick={() => showToastMsg('Tính năng Import Excel sẵn sàng')}
            style={{ background: 'white', color: '#424242', border: '1px solid #E0E0E0', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={13} color="#4CAF50" /> Import Excel
          </button>
          <button 
            onClick={() => showToastMsg('Xuất file Excel sổ quỹ thu chi thành công!')}
            style={{ background: 'white', color: '#424242', border: '1px solid #E0E0E0', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={13} color="#1976D2" /> Xuất Excel
          </button>
          <button style={{ background: 'white', color: '#616161', border: '1px solid #E0E0E0', padding: '5px 8px', borderRadius: 4, fontSize: 10.5, cursor: 'pointer' }}>
            <MoreVertical size={13} color="#616161" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'white', padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 }}>
        <div>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 2 }}>Từ ngày</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: 100, padding: '4px 24px 4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10.5 }} 
            />
            <Calendar size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 2 }}>Đến ngày</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: 100, padding: '4px 24px 4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10.5 }} 
            />
            <Calendar size={12} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
          </div>
        </div>

        <div style={{ minWidth: 120 }}>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 2 }}>Loại giao dịch</label>
          <select 
            value={transactionType} 
            onChange={(e) => setTransactionType(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10.5 }}
          >
            <option value="">Tất cả</option>
            <option value="thu">Phiếu thu</option>
            <option value="chi">Phiếu chi</option>
          </select>
        </div>

        <div style={{ minWidth: 130 }}>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 2 }}>Danh mục</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10.5 }}
          >
            <option value="">Tất cả</option>
            <option>Sửa chữa bảo dưỡng</option>
            <option>Mua phụ tùng</option>
            <option>Lương nhân sự</option>
            <option>Chi phí văn phòng</option>
            <option>Công nợ nhà cung cấp</option>
          </select>
        </div>

        <div style={{ flex: 1.5, minWidth: 200 }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập nội dung, mã phiếu, đối tác..." 
              style={{ width: '100%', padding: '4px 28px 4px 8px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10.5 }} 
            />
            <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
          </div>
        </div>

        <button 
          onClick={() => showToastMsg('Đã lọc kết quả theo tiêu chí')}
          style={{ background: '#E65100', color: 'white', border: 'none', padding: '5px 14px', borderRadius: 4, fontWeight: 600, fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', height: 27 }}
        >
          <Search size={12} /> Tìm kiếm
        </button>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="responsive-grid-4" style={{ marginBottom: 8, flexShrink: 0 }}>
        
        {/* Card 1: Tổng thu */}
        <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
        <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
        <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1976D2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={19} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#616161', fontWeight: 500 }}>Tồn quỹ hiện tại</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1976D2' }}>53.670.000đ</div>
          </div>
        </div>

        {/* Card 4: Công nợ phải thu */}
        <div className="card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E65100', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={19} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#616161', fontWeight: 500 }}>Công nợ phải thu</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#E65100' }}>78.500.000đ</div>
            <div style={{ fontSize: 9.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} /> 5 khách hàng
            </div>
          </div>
        </div>

      </div>

      {/* Middle Section: Biểu đồ thu - chi theo tháng (~60%) & Giao dịch gần đây (~40%) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexShrink: 0, height: 260 }}>
        
        {/* Left: Biểu đồ thu - chi theo tháng */}
        <div className="card" style={{ flex: 1.45, padding: '6px 10px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
          <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
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
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
        <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#E65100', fontSize: 13 }}>📋</span>
              <h2 style={{ fontSize: 11.5, fontWeight: 700, margin: 0, color: '#212121' }}>Giao dịch gần đây</h2>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer', fontWeight: 500 }}>Xem tất cả</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
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
      <div className="responsive-grid-3" style={{ flex: 1, minHeight: 180 }}>
        
        {/* Card 1: Danh sách thu trong tháng */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#2E7D32', fontSize: 13 }}>📥</span>
              <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Danh sách thu trong tháng</h2>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer' }}>Xem tất cả</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
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
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#D32F2F', fontSize: 13 }}>📤</span>
              <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Danh sách chi trong tháng</h2>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer' }}>Xem tất cả</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
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

        {/* Card 3: Công nợ */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#E65100', fontSize: 13 }}>📑</span>
                <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Công nợ</h2>
              </div>
              <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
                <button 
                  onClick={() => setDebtTab('receivable')}
                  style={{
                    background: debtTab === 'receivable' ? '#E65100' : '#EEEEEE',
                    color: debtTab === 'receivable' ? 'white' : '#424242',
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 8.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Phải thu
                </button>
                <button 
                  onClick={() => setDebtTab('payable')}
                  style={{
                    background: debtTab === 'payable' ? '#E65100' : '#EEEEEE',
                    color: debtTab === 'payable' ? 'white' : '#424242',
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 8.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Phải trả
                </button>
              </div>
            </div>
            <span style={{ fontSize: 9.5, color: '#1976D2', cursor: 'pointer' }}>Xem tất cả</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                  <th style={{ ...tableHeaderThStyle }}>{debtTab === 'receivable' ? 'Khách hàng' : 'Nhà cung cấp'}</th>
                  <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'right' }}>Số tiền</th>
                  <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'center' }}>Hạn thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {(debtTab === 'receivable' ? debtReceivable : debtPayable).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 600, color: '#333' }}>{item.customer}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: debtTab === 'receivable' ? '#E65100' : '#D32F2F' }}>
                      {item.amount}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', color: '#616161' }}>{item.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '4px 10px', background: '#FAFAFA', borderTop: '1px solid #E0E0E0', textAlign: 'right', fontSize: 10.5, flexShrink: 0 }}>
            <span style={{ color: '#616161' }}>{debtTab === 'receivable' ? 'Tổng cộng nợ phải thu: ' : 'Tổng cộng nợ phải trả: '}</span>
            <b style={{ color: '#E65100' }}>{debtTab === 'receivable' ? '78.500.000đ' : '89.500.000đ'}</b>
          </div>
        </div>

      </div>

      {/* Modal Tạo phiếu thu / chi */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{ background: 'white', borderRadius: 8, width: 440, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '10px 14px', background: '#E65100', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CircleDollarSign size={16} /> + TẠO PHIẾU THU / CHI
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Loại phiếu <span style={{color:'red'}}>*</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    <input type="radio" name="modalType" value="THU" checked={modalType === 'THU'} onChange={() => setModalType('THU')} />
                    <span style={{ color: '#2E7D32' }}>Phiếu thu</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    <input type="radio" name="modalType" value="CHI" checked={modalType === 'CHI'} onChange={() => setModalType('CHI')} />
                    <span style={{ color: '#D32F2F' }}>Phiếu chi</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Số tiền (VNĐ) <span style={{color:'red'}}>*</span></label>
                <input 
                  type="number" 
                  value={modalAmount} 
                  onChange={(e) => setModalAmount(e.target.value)} 
                  placeholder="Ví dụ: 5000000" 
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, fontWeight: 700 }} 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Đối tác / Người nộp - nhận <span style={{color:'red'}}>*</span></label>
                <input 
                  type="text" 
                  value={modalPartner} 
                  onChange={(e) => setModalPartner(e.target.value)} 
                  placeholder="Họ tên khách hàng hoặc nhà cung cấp..." 
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Nội dung thu / chi</label>
                <textarea 
                  value={modalContent} 
                  onChange={(e) => setModalContent(e.target.value)} 
                  placeholder="Lý do thu hoặc chi tiết thanh toán..." 
                  style={{ width: '100%', height: 45, padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, resize: 'none' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '5px 12px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#333', fontSize: 11, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  style={{ padding: '5px 16px', background: '#E65100', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Tạo phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
