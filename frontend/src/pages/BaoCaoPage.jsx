import { useState } from 'react';
import {
  FileText, Calendar, RotateCcw, Search, Car, DollarSign,
  Users, Wrench, Package, User, SlidersHorizontal, ArrowUpRight,
  TrendingUp, TrendingDown, Clock, Printer, FileSpreadsheet,
  CheckCircle, ChevronRight, Eye, Download, Filter, HelpCircle, X,
  BarChart3, Zap
} from 'lucide-react';
import './BaoCaoPage.css';

export default function BaoCaoPage() {
  // Bộ lọc
  const [fromDate, setFromDate] = useState('2025-09-01');
  const [toDate, setToDate] = useState('2025-09-30');
  const [branch, setBranch] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('tong-quan');

  // Mobile navigation tab ('charts' | 'recent' | 'quick')
  const [mobileTab, setMobileTab] = useState('charts');

  // Modal xem báo cáo
  const [selectedReport, setSelectedReport] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 7 danh mục báo cáo
  const categories = [
    {
      id: 'tong-quan',
      title: 'Báo cáo tổng quan',
      subtitle: 'Tổng hợp nhanh các chỉ số quan trọng',
      icon: Car
    },
    {
      id: 'doanh-thu',
      title: 'Doanh thu - Chi phí',
      subtitle: 'Doanh thu, chi phí, lợi nhuận',
      icon: DollarSign
    },
    {
      id: 'khach-hang',
      title: 'Khách hàng',
      subtitle: 'Khách hàng, công nợ',
      icon: Users
    },
    {
      id: 'xe-dich-vu',
      title: 'Xe & Dịch vụ',
      subtitle: 'Xe vào sửa, dịch vụ, phụ tùng',
      icon: Wrench
    },
    {
      id: 'kho-linh-kien',
      title: 'Kho & Linh kiện',
      subtitle: 'Tồn kho, nhập, xuất, tồn',
      icon: Package
    },
    {
      id: 'nhan-vien',
      title: 'Nhân viên',
      subtitle: 'Hiệu suất, chấm công',
      icon: User
    },
    {
      id: 'khac',
      title: 'Khác',
      subtitle: 'Báo cáo theo yêu cầu',
      icon: SlidersHorizontal
    }
  ];

  // Dữ liệu doanh thu & chi phí theo 9 tháng (01/2025 -> 09/2025)
  const monthlyData = [
    { month: '01/2025', revenue: 430, cost: 310, profit: 120 },
    { month: '02/2025', revenue: 450, cost: 350, profit: 100 },
    { month: '03/2025', revenue: 500, cost: 400, profit: 100 },
    { month: '04/2025', revenue: 580, cost: 440, profit: 140 },
    { month: '05/2025', revenue: 630, cost: 520, profit: 110 },
    { month: '06/2025', revenue: 680, cost: 570, profit: 110 },
    { month: '07/2025', revenue: 720, cost: 610, profit: 110 },
    { month: '08/2025', revenue: 780, cost: 640, profit: 140 },
    { month: '09/2025', revenue: 810, cost: 690, profit: 120 }
  ];

  // Doanh thu theo dịch vụ
  const serviceRevenues = [
    { name: 'Sửa chữa chung', percent: 35, amount: '437.500.000đ', color: '#FF5722' },
    { name: 'Bảo dưỡng', percent: 22, amount: '275.000.000đ', color: '#FFA726' },
    { name: 'Điện - Điện lạnh', percent: 15, amount: '187.500.000đ', color: '#26A69A' },
    { name: 'Phụ tùng', percent: 12, amount: '150.000.000đ', color: '#29B6F6' },
    { name: 'Khác', percent: 16, amount: '200.000.000đ', color: '#7E57C2' }
  ];

  // Top 5 khách hàng doanh thu cao
  const topCustomers = [
    { id: 1, name: 'Toyota Việt Nam', revenue: '285.000.000đ' },
    { id: 2, name: 'Công ty CP Mai Linh', revenue: '230.500.000đ' },
    { id: 3, name: 'Anh Nguyễn Văn A', revenue: '180.000.000đ' },
    { id: 4, name: 'Công ty TNHH Phụ Tùng A', revenue: '160.750.000đ' },
    { id: 5, name: 'Chị Lê Thị B', revenue: '125.300.000đ' }
  ];

  // Tình hình xe trong xưởng
  const workshopCars = [
    { label: 'Đang sửa chữa', count: 18, color: '#FF5722' },
    { label: 'Chờ tiếp nhận', count: 7, color: '#FFA726' },
    { label: 'Hoàn thành', count: 12, color: '#26A69A' },
    { label: 'Bảo hành', count: 5, color: '#29B6F6' }
  ];
  const totalWorkshopCars = workshopCars.reduce((acc, cur) => acc + cur.count, 0);

  // Báo cáo gần đây
  const recentReports = [
    {
      id: 1,
      createdAt: '30/09/2025 10:45',
      name: 'Doanh thu theo tháng',
      category: 'Doanh thu - Chi phí',
      creator: 'admin',
      status: 'Hoàn thành',
      details: 'Báo cáo tổng hợp số liệu doanh thu, chi phí và lợi nhuận thuần từ tháng 01/2025 đến 09/2025.'
    },
    {
      id: 2,
      createdAt: '29/09/2025 16:20',
      name: 'Danh sách xe đang sửa chữa',
      category: 'Xe & Dịch vụ',
      creator: 'admin',
      status: 'Hoàn thành',
      details: 'Chi tiết 18 xe đang được gia công, bảo dưỡng, kỹ thuật viên phụ trách và dự kiến giao xe.'
    },
    {
      id: 3,
      createdAt: '28/09/2025 14:10',
      name: 'Công nợ khách hàng',
      category: 'Công nợ',
      creator: 'admin',
      status: 'Hoàn thành',
      details: 'Thống kê tổng công nợ phải thu 78.500.000đ (Trong hạn: 79%, Quá hạn: 21%).'
    },
    {
      id: 4,
      createdAt: '28/09/2025 09:30',
      name: 'Tồn kho phụ tùng',
      category: 'Kho & Linh kiện',
      creator: 'admin',
      status: 'Hoàn thành',
      details: 'Báo cáo kiểm kê kho phụ tùng, cảnh báo hàng sắp hết và giá trị tồn kho hiện hữu.'
    },
    {
      id: 5,
      createdAt: '27/09/2025 17:05',
      name: 'Hiệu suất nhân viên',
      category: 'Nhân viên',
      creator: 'admin',
      status: 'Hoàn thành',
      details: 'Đánh giá KPI, số lượng xe xử lý và doanh thu đóng góp của 10 kỹ thuật viên / cố vấn.'
    }
  ];

  // SVG Calculation Donut chart Doanh thu theo dịch vụ
  const serviceCircumference = 2 * Math.PI * 34;
  let serviceOffset = 0;

  // SVG Calculation Donut chart Xe trong xưởng
  const carCircumference = 2 * Math.PI * 34;
  let carOffset = 0;

  // Điểm đồ thị đường cho Doanh thu - Chi phí - Lợi nhuận
  const getLinePoint = (val, idx, total) => {
    const x = 25 + (idx / (total - 1)) * 365;
    const y = 82 - (val / 1500) * 68;
    return { x, y };
  };

  const revenueLinePoints = monthlyData.map((d, i) => getLinePoint(d.revenue + 400, i, monthlyData.length));
  const costLinePoints = monthlyData.map((d, i) => getLinePoint(d.cost + 200, i, monthlyData.length));
  const profitLinePoints = monthlyData.map((d, i) => getLinePoint(d.profit + 150, i, monthlyData.length));

  const makeSvgPath = (points) => {
    return points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  };

  return (
    <div className="bc-page-container">
      {/* Toast thông báo */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 15,
          right: 15,
          background: '#2E7D32',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 600,
          fontSize: 12
        }}>
          <CheckCircle size={15} />
          {toastMessage}
        </div>
      )}

      {/* Header & Thanh lọc */}
      <div className="bc-header-filter">
        {/* Title row */}
        <div className="bc-mobile-header-top">
          <div className="bc-title-box">
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileText size={14} />
            </div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#212121' }}>
              Báo cáo
            </h1>
          </div>

          {/* Nút Làm mới (Hiện bên phải title trên mobile) */}
          <button
            onClick={() => {
              setBranch('all');
              setReportType('all');
              setSearchKeyword('');
              showToast('Đã làm mới dữ liệu báo cáo');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#E65100',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <RotateCcw size={12} />
            Làm mới
          </button>
        </div>

        {/* Filter items */}
        <div className="bc-filter-group">
          {/* Row 1 on mobile: Dates */}
          <div className="bc-filter-row-dates">
            {/* Từ ngày */}
            <div className="bc-filter-item">
              <span>Từ ngày</span>
              <div className="bc-filter-item-input-wrap">
                <input
                  type="text"
                  value="01/09/2025"
                  readOnly
                  style={{
                    padding: '3px 6px 3px 20px',
                    borderRadius: 4,
                    border: '1px solid #DEDEDE',
                    fontSize: 11,
                    background: 'white',
                    color: '#333'
                  }}
                />
                <Calendar size={11} style={{ position: 'absolute', left: 6, color: '#757575', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Đến ngày */}
            <div className="bc-filter-item">
              <span>Đến ngày</span>
              <div className="bc-filter-item-input-wrap">
                <input
                  type="text"
                  value="30/09/2025"
                  readOnly
                  style={{
                    padding: '3px 6px 3px 20px',
                    borderRadius: 4,
                    border: '1px solid #DEDEDE',
                    fontSize: 11,
                    background: 'white',
                    color: '#333'
                  }}
                />
                <Calendar size={11} style={{ position: 'absolute', left: 6, color: '#757575', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 2 on mobile: Selects */}
          <div className="bc-filter-row-selects">
            {/* Chi nhánh */}
            <div className="bc-filter-item">
              <span>Chi nhánh</span>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={{
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid #DEDEDE',
                  fontSize: 11,
                  background: 'white',
                  color: '#333'
                }}
              >
                <option value="all">Tất cả</option>
                <option value="cn1">Âu Cơ</option>
                <option value="cn2">Bình Tân</option>
              </select>
            </div>

            {/* Loại báo cáo */}
            <div className="bc-filter-item">
              <span>Loại báo cáo</span>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid #DEDEDE',
                  fontSize: 11,
                  background: 'white',
                  color: '#333'
                }}
              >
                <option value="all">Tất cả</option>
                <option value="doanhthu">Doanh thu</option>
                <option value="xe">Xe & DV</option>
              </select>
            </div>
          </div>

          {/* Row 3 on mobile: Search box */}
          <div className="bc-search-box">
            <input
              type="text"
              placeholder="Nhập tên báo cáo..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '3px 24px 3px 8px',
                borderRadius: 4,
                border: '1px solid #DEDEDE',
                fontSize: 11,
                background: 'white',
                boxSizing: 'border-box'
              }}
            />
            <Search size={12} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
          </div>
        </div>
      </div>

      {/* Row 7 Danh mục Báo cáo */}
      <div className="bc-categories-wrap">
        <div className="bc-categories-grid">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`bc-category-card ${isActive ? 'active' : ''}`}
              >
                <div style={{
                  width: 'clamp(22px, 3.2vh, 28px)',
                  height: 'clamp(22px, 3.2vh, 28px)',
                  borderRadius: 4,
                  background: '#E65100',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={14} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? '#E65100' : '#212121',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                  }}>
                    {cat.title}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: '#757575',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                  }}>
                    {cat.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thanh chuyển Tab trên Mobile */}
      <div className="bc-mobile-tabs">
        <button
          className={`bc-mobile-tab-btn ${mobileTab === 'charts' ? 'active' : ''}`}
          onClick={() => setMobileTab('charts')}
        >
          <BarChart3 size={13} />
          Biểu đồ & Chỉ số
        </button>
        <button
          className={`bc-mobile-tab-btn ${mobileTab === 'recent' ? 'active' : ''}`}
          onClick={() => setMobileTab('recent')}
        >
          <FileText size={13} />
          Báo cáo gần đây ({recentReports.length})
        </button>
        <button
          className={`bc-mobile-tab-btn ${mobileTab === 'quick' ? 'active' : ''}`}
          onClick={() => setMobileTab('quick')}
        >
          <Zap size={13} />
          Thao tác nhanh
        </button>
      </div>

      {/* Hàng 1 (3 Cột): Doanh thu theo tháng | Doanh thu theo dịch vụ | Top 5 khách hàng */}
      <div className={`bc-row-1 ${mobileTab !== 'charts' ? 'bc-mobile-hidden' : ''}`}>
        {/* Cột 1: Doanh thu theo tháng */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <DollarSign size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Doanh thu theo tháng</span>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E65100' }} />
                <span style={{ color: '#616161' }}>Doanh thu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFA726' }} />
                <span style={{ color: '#616161' }}>Chi phí</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 0 }}>
            {/* Y Axis */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: 9,
              color: '#888',
              paddingRight: 4,
              textAlign: 'right',
              width: 36,
              borderRight: '1px solid #F0F0F0'
            }}>
              <span>1.000tr</span>
              <span>800tr</span>
              <span>600tr</span>
              <span>400tr</span>
              <span>200tr</span>
              <span>0</span>
            </div>

            {/* Bars container */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              paddingLeft: 6,
              paddingRight: 4,
              borderBottom: '1px solid #E0E0E0',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: '0%', borderTop: '1px dashed #F2F2F2' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '20%', borderTop: '1px dashed #F2F2F2' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '40%', borderTop: '1px dashed #F2F2F2' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '60%', borderTop: '1px dashed #F2F2F2' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '80%', borderTop: '1px dashed #F2F2F2' }} />

              {monthlyData.map((d, i) => {
                const revPct = (d.revenue / 1000) * 100;
                const costPct = (d.cost / 1000) * 100;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10%', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%', width: '100%', justifyContent: 'center' }}>
                      <div
                        title={`Doanh thu ${d.month}: ${d.revenue}tr`}
                        style={{
                          width: '42%',
                          maxWidth: 12,
                          height: `${revPct}%`,
                          background: '#E65100',
                          borderRadius: '1.5px 1.5px 0 0'
                        }}
                      />
                      <div
                        title={`Chi phí ${d.month}: ${d.cost}tr`}
                        style={{
                          width: '42%',
                          maxWidth: 12,
                          height: `${costPct}%`,
                          background: '#FFA726',
                          borderRadius: '1.5px 1.5px 0 0'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X Axis labels */}
          <div style={{
            display: 'flex',
            paddingLeft: 36,
            paddingRight: 4,
            justifyContent: 'space-between',
            marginTop: 2
          }}>
            {monthlyData.map((d, i) => (
              <span key={i} style={{ fontSize: 8.5, color: '#757575', width: '10%', textAlign: 'center' }}>
                {d.month}
              </span>
            ))}
          </div>
        </div>

        {/* Cột 2: Doanh thu theo dịch vụ */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <DollarSign size={11} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Doanh thu theo dịch vụ</span>
          </div>

          {/* Content: Donut + Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minHeight: 0 }}>
            {/* Donut Chart */}
            <div style={{ position: 'relative', width: 'clamp(70px, 10vh, 110px)', height: 'clamp(70px, 10vh, 110px)', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="34" fill="none" stroke="#F5F5F5" strokeWidth="16" />
                {serviceRevenues.map((s, idx) => {
                  const strokeDash = (s.percent / 100) * serviceCircumference;
                  const strokeOffset = -serviceOffset;
                  serviceOffset += strokeDash;
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="34"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="16"
                      strokeDasharray={`${strokeDash} ${serviceCircumference}`}
                      strokeDashoffset={strokeOffset}
                    />
                  );
                })}
              </svg>
              {/* Center text */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 7, color: '#757575', fontWeight: 500, lineHeight: 1 }}>Tổng DT</span>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#212121', marginTop: 1, lineHeight: 1 }}>
                  1.250M
                </span>
              </div>
            </div>

            {/* Legend list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 5px)', justifyContent: 'center' }}>
              {serviceRevenues.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ color: '#424242', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 600, color: '#616161', width: 22, textAlign: 'right' }}>{s.percent}%</span>
                    <span style={{ fontWeight: 600, color: '#212121', fontSize: 9 }}>{s.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột 3: Top 5 khách hàng doanh thu cao */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <DollarSign size={11} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Top 5 khách hàng doanh thu cao</span>
          </div>

          {/* Table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: 0 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '2px 4px',
              fontSize: 10,
              color: '#888',
              borderBottom: '1px solid #EEEEEE'
            }}>
              <span>Khách hàng</span>
              <span>Doanh thu</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 6px)' }}>
              {topCustomers.map((cust) => (
                <div
                  key={cust.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5px 4px',
                    fontSize: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#FF7043',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {cust.id}
                    </span>
                    <span style={{ fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>{cust.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#212121', fontSize: 10 }}>
                    {cust.revenue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 2 (3 Cột): Tình hình xe trong xưởng | Doanh thu - Chi phí - Lợi nhuận | Công nợ (flex: 1) */}
      <div className={`bc-row-2 ${mobileTab !== 'charts' ? 'bc-mobile-hidden' : ''}`}>
        {/* Cột 1: Tình hình xe trong xưởng */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Car size={11} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Tình hình xe trong xưởng</span>
          </div>

          {/* Content */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minHeight: 0 }}>
            {/* Donut chart */}
            <div style={{ position: 'relative', width: 'clamp(70px, 9.5vh, 105px)', height: 'clamp(70px, 9.5vh, 105px)', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="34" fill="none" stroke="#F5F5F5" strokeWidth="16" />
                {workshopCars.map((item, idx) => {
                  const strokeDash = (item.count / totalWorkshopCars) * carCircumference;
                  const strokeOffset = -carOffset;
                  carOffset += strokeDash;
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="34"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="16"
                      strokeDasharray={`${strokeDash} ${carCircumference}`}
                      strokeDashoffset={strokeOffset}
                    />
                  );
                })}
              </svg>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#212121', lineHeight: '1' }}>42</span>
                <span style={{ fontSize: 7.5, color: '#757575', marginTop: 1 }}>Tổng xe</span>
              </div>
            </div>

            {/* Stats list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 5px)', justifyContent: 'center' }}>
              {workshopCars.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: w.color, flexShrink: 0 }} />
                    <span style={{ color: '#424242' }}>{w.label}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#212121', fontSize: 11 }}>{w.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột 2: Doanh thu - Chi phí - Lợi nhuận (Line Chart) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <DollarSign size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Doanh thu - Chi phí - Lợi nhuận</span>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E65100' }} />
                <span style={{ color: '#616161' }}>Doanh thu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFA726' }} />
                <span style={{ color: '#616161' }}>Chi phí</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#26A69A' }} />
                <span style={{ color: '#616161' }}>Lợi nhuận</span>
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 0 }}>
            {/* Y axis */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: 9,
              color: '#888',
              paddingRight: 4,
              textAlign: 'right',
              width: 36,
              borderRight: '1px solid #F0F0F0'
            }}>
              <span>1.500tr</span>
              <span>1.000tr</span>
              <span>500tr</span>
              <span>0</span>
            </div>

            {/* SVG Lines */}
            <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid #E0E0E0' }}>
              <svg viewBox="0 0 420 95" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <line x1="25" y1="20" x2="395" y2="20" stroke="#F0F0F0" strokeDasharray="3 3" />
                <line x1="25" y1="50" x2="395" y2="50" stroke="#F0F0F0" strokeDasharray="3 3" />
                <line x1="25" y1="75" x2="395" y2="75" stroke="#F0F0F0" strokeDasharray="3 3" />

                {/* Doanh thu line */}
                <path d={makeSvgPath(revenueLinePoints)} fill="none" stroke="#E65100" strokeWidth="2" />
                {revenueLinePoints.map((p, i) => (
                  <circle key={`r-${i}`} cx={p.x} cy={p.y} r="2.5" fill="#E65100" stroke="white" strokeWidth="1" />
                ))}

                {/* Chi phí line */}
                <path d={makeSvgPath(costLinePoints)} fill="none" stroke="#FFA726" strokeWidth="2" />
                {costLinePoints.map((p, i) => (
                  <circle key={`c-${i}`} cx={p.x} cy={p.y} r="2.5" fill="#FFA726" stroke="white" strokeWidth="1" />
                ))}

                {/* Lợi nhuận line */}
                <path d={makeSvgPath(profitLinePoints)} fill="none" stroke="#26A69A" strokeWidth="2" />
                {profitLinePoints.map((p, i) => (
                  <circle key={`p-${i}`} cx={p.x} cy={p.y} r="2.5" fill="#26A69A" stroke="white" strokeWidth="1" />
                ))}
              </svg>
            </div>
          </div>

          {/* X Axis labels */}
          <div style={{
            display: 'flex',
            paddingLeft: 36,
            justifyContent: 'space-between',
            marginTop: 2
          }}>
            {monthlyData.map((d, i) => (
              <span key={i} style={{ fontSize: 8.5, color: '#757575', width: '10%', textAlign: 'center' }}>
                {d.month}
              </span>
            ))}
          </div>
        </div>

        {/* Cột 3: Công nợ phải thu & Công nợ phải trả */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(4px, 0.6vh, 8px)',
          height: '100%'
        }}>
          {/* Subcard 1: Công nợ phải thu */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 6,
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid #EEEEEE',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            flex: 1,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <DollarSign size={10} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Công nợ phải thu</span>
              </div>
              <button
                onClick={() => showToast('Mở chi tiết công nợ phải thu')}
                style={{
                  background: 'white',
                  color: '#424242',
                  border: '1px solid #DEDEDE',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 9,
                  cursor: 'pointer'
                }}
              >
                Chi tiết
              </button>
            </div>

            <div style={{ fontSize: 'clamp(14px, 2vh, 18px)', fontWeight: 800, color: '#D32F2F', lineHeight: 1.1 }}>
              78.500.000đ
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 9.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#26A69A' }} />
                <span style={{ color: '#616161' }}>Trong hạn</span>
                <span style={{ fontWeight: 600, color: '#212121' }}>62.5M (79%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D32F2F' }} />
                <span style={{ color: '#616161' }}>Quá hạn</span>
                <span style={{ fontWeight: 600, color: '#212121' }}>16.0M (21%)</span>
              </div>
            </div>
          </div>

          {/* Subcard 2: Công nợ phải trả */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 6,
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid #EEEEEE',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            flex: 1,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Package size={10} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Công nợ phải trả</span>
              </div>
              <button
                onClick={() => showToast('Mở chi tiết công nợ phải trả')}
                style={{
                  background: 'white',
                  color: '#424242',
                  border: '1px solid #DEDEDE',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 9,
                  cursor: 'pointer'
                }}
              >
                Chi tiết
              </button>
            </div>

            <div style={{ fontSize: 'clamp(14px, 2vh, 18px)', fontWeight: 800, color: '#D32F2F', lineHeight: 1.1 }}>
              45.200.000đ
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 9.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#26A69A' }} />
                <span style={{ color: '#616161' }}>Trong hạn</span>
                <span style={{ fontWeight: 600, color: '#212121' }}>35.0M (77%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D32F2F' }} />
                <span style={{ color: '#616161' }}>Quá hạn</span>
                <span style={{ fontWeight: 600, color: '#212121' }}>10.2M (23%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 3 (2 Cột): Báo cáo gần đây (Trái) & Thao tác nhanh (Phải) */}
      <div className={`bc-row-3 ${(mobileTab !== 'recent' && mobileTab !== 'quick') ? 'bc-mobile-hidden' : ''}`}>
        {/* Cột Trái: Báo cáo gần đây */}
        <div className={`bc-card ${mobileTab !== 'recent' ? 'bc-mobile-hidden' : ''}`} style={{
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileText size={11} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Báo cáo gần đây</span>
          </div>

          {/* Table Responsive */}
          <div className="bc-table-responsive" style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(4px, 0.6vh, 7px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>
                    Ngày tạo
                  </th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(4px, 0.6vh, 7px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>
                    Tên báo cáo
                  </th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(4px, 0.6vh, 7px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>
                    Loại
                  </th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(4px, 0.6vh, 7px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>
                    Người tạo
                  </th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(4px, 0.6vh, 7px) 8px', textAlign: 'center', fontWeight: 600, border: 'none' }}>
                    Trạng thái
                  </th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(4px, 0.6vh, 7px) 8px', textAlign: 'center', fontWeight: 600, border: 'none' }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid #F5F5F5',
                      background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF'
                    }}
                  >
                    <td style={{ padding: 'clamp(3px, 0.6vh, 6px) 8px', color: '#616161' }}>{r.createdAt}</td>
                    <td style={{ padding: 'clamp(3px, 0.6vh, 6px) 8px', fontWeight: 600, color: '#212121' }}>{r.name}</td>
                    <td style={{ padding: 'clamp(3px, 0.6vh, 6px) 8px', color: '#424242' }}>{r.category}</td>
                    <td style={{ padding: 'clamp(3px, 0.6vh, 6px) 8px', color: '#616161' }}>{r.creator}</td>
                    <td style={{ padding: 'clamp(3px, 0.6vh, 6px) 8px', textAlign: 'center' }}>
                      <span style={{
                        background: '#E0F2F1',
                        color: '#00796B',
                        padding: '1.5px 6px',
                        borderRadius: 10,
                        fontSize: 9,
                        fontWeight: 600
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: 'clamp(3px, 0.6vh, 6px) 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedReport(r)}
                        style={{
                          background: 'white',
                          color: '#424242',
                          border: '1px solid #DEDEDE',
                          borderRadius: 10,
                          padding: '1px 8px',
                          fontSize: 9,
                          cursor: 'pointer'
                        }}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột Phải: Thao tác nhanh */}
        <div className={`bc-card ${mobileTab !== 'quick' ? 'bc-mobile-hidden' : ''}`}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <SlidersHorizontal size={11} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Thao tác nhanh</span>
          </div>

          {/* Quick buttons */}
          <div className="bc-quick-actions-list" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.6vh, 8px)', flex: 1, justifyContent: 'space-around' }}>
            {/* Row 1: Xuất Excel | In báo cáo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                onClick={() => showToast('Đang tải file Excel báo cáo...')}
                className="bc-quick-actions-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'white',
                  color: '#212121',
                  border: '1px solid #DEDEDE',
                  borderRadius: 4,
                  padding: 'clamp(4px, 0.7vh, 8px) 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileSpreadsheet size={13} color="#2E7D32" />
                Xuất Excel
              </button>

              <button
                onClick={() => showToast('Đang mở trang in báo cáo...')}
                className="bc-quick-actions-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'white',
                  color: '#212121',
                  border: '1px solid #DEDEDE',
                  borderRadius: 4,
                  padding: 'clamp(4px, 0.7vh, 8px) 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Printer size={13} color="#E65100" />
                In báo cáo
              </button>
            </div>

            {/* Row 2: Xuất PDF | Lịch sử báo cáo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                onClick={() => showToast('Đang tạo tài liệu PDF báo cáo...')}
                className="bc-quick-actions-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'white',
                  color: '#212121',
                  border: '1px solid #DEDEDE',
                  borderRadius: 4,
                  padding: 'clamp(4px, 0.7vh, 8px) 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FileText size={13} color="#D32F2F" />
                Xuất PDF
              </button>

              <button
                onClick={() => showToast('Mở danh sách lịch sử kết xuất báo cáo')}
                className="bc-quick-actions-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'white',
                  color: '#212121',
                  border: '1px solid #DEDEDE',
                  borderRadius: 4,
                  padding: 'clamp(4px, 0.7vh, 8px) 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Clock size={13} color="#E65100" />
                Lịch sử
              </button>
            </div>

            {/* Row 3: Tạo báo cáo theo mẫu */}
            <button
              onClick={() => setShowTemplateModal(true)}
              className="bc-quick-btn-full"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'white',
                color: '#212121',
                border: '1px solid #DEDEDE',
                borderRadius: 4,
                padding: 'clamp(4px, 0.7vh, 8px) 6px',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FileText size={13} color="#E65100" />
              Tạo báo cáo theo mẫu
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết Báo cáo */}
      {selectedReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div className="bc-modal-card">
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <FileText size={16} />
                <span>Chi tiết: {selectedReport.name}</span>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEE', paddingBottom: 4 }}>
                <span style={{ color: '#757575' }}>Ngày tạo:</span>
                <span style={{ fontWeight: 600 }}>{selectedReport.createdAt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEE', paddingBottom: 4 }}>
                <span style={{ color: '#757575' }}>Phân loại:</span>
                <span style={{ fontWeight: 600 }}>{selectedReport.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEE', paddingBottom: 4 }}>
                <span style={{ color: '#757575' }}>Người kết xuất:</span>
                <span style={{ fontWeight: 600 }}>{selectedReport.creator}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEE', paddingBottom: 4 }}>
                <span style={{ color: '#757575' }}>Trạng thái:</span>
                <span style={{
                  background: '#E0F2F1',
                  color: '#00796B',
                  padding: '1.5px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 600
                }}>
                  {selectedReport.status}
                </span>
              </div>
              <div style={{ background: '#FAFAFA', padding: 8, borderRadius: 6, border: '1px solid #EEEEEE' }}>
                <span style={{ color: '#616161', display: 'block', marginBottom: 2, fontWeight: 600 }}>Tóm tắt nội dung:</span>
                <p style={{ margin: 0, color: '#333', lineHeight: 1.4 }}>{selectedReport.details}</p>
              </div>
            </div>

            <div style={{
              background: '#FAFAFA',
              padding: '8px 16px',
              borderTop: '1px solid #EEEEEE',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  showToast('Đang tải tệp báo cáo đính kèm...');
                }}
                style={{
                  background: '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Tải xuống Excel
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  background: '#E0E0E0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 12px',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Báo Cáo Theo Mẫu */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div className="bc-modal-card">
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <FileText size={16} />
                <span>Tạo báo cáo theo mẫu</span>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#616161', marginBottom: 3 }}>
                  Chọn biểu mẫu báo cáo:
                </label>
                <select style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #DEDEDE', fontSize: 11 }}>
                  <option>Mẫu 01: Báo cáo kết quả kinh doanh tháng (Chuẩn Thuế & Kế toán)</option>
                  <option>Mẫu 02: Báo cáo công nợ nhà cung cấp & Khách hàng</option>
                  <option>Mẫu 03: Báo cáo hiệu suất kỹ thuật viên xưởng dịch vụ</option>
                  <option>Mẫu 04: Báo cáo luân chuyển phụ tùng & Tồn kho</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#616161', marginBottom: 3 }}>Kỳ bắt đầu:</label>
                  <input type="date" defaultValue="2025-09-01" style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #DEDEDE', fontSize: 11, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#616161', marginBottom: 3 }}>Kỳ kết thúc:</label>
                  <input type="date" defaultValue="2025-09-30" style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #DEDEDE', fontSize: 11, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#616161', marginBottom: 3 }}>
                  Định dạng xuất file:
                </label>
                <div style={{ display: 'flex', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="radio" name="format" defaultChecked /> Excel (.xlsx)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="radio" name="format" /> PDF Document (.pdf)
                  </label>
                </div>
              </div>
            </div>

            <div style={{
              background: '#FAFAFA',
              padding: '8px 16px',
              borderTop: '1px solid #EEEEEE',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  showToast('Đang kết xuất báo cáo theo mẫu...');
                }}
                style={{
                  background: '#E65100',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Khởi tạo báo cáo
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  background: '#E0E0E0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 12px',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
