import { useEffect, useState } from 'react';
import { 
  Users, User, Phone, Mail, Calendar, Award, Clock, Wrench, 
  Search, Plus, FileSpreadsheet, MoreVertical, Edit, Eye, 
  CheckCircle, X, Shield, Briefcase, ArrowLeft
} from 'lucide-react';
import { employees } from '../services';
import EmployeeFormModal from '../components/EmployeeFormModal';
import './NhanVienPage.css';

const ROLE_BY_TYPE = {
  0: 'Nhân viên',
  1: 'Kỹ thuật viên',
  2: 'Cố vấn dịch vụ',
  3: 'Thủ kho',
  4: 'Thu ngân',
};

const DEPARTMENT_BY_TYPE = {
  0: 'Văn phòng',
  1: 'Sửa chữa',
  2: 'Dịch vụ',
  3: 'Kho hàng',
  4: 'Kế toán',
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
}

function mapEmployee(row, index) {
  const type = Number(row.LOAINHANVIEN ?? 0);
  const isActive = Number(row.STATUS) === 1;
  let noteData = {};
  try { noteData = JSON.parse(row.NOTE || '{}'); } catch {}
  return {
    databaseId: row.ID,
    stt: index + 1,
    id: row.CODE || `NV${String(index + 1).padStart(3, '0')}`,
    name: row.NAME || '—',
    role: noteData.chucVu || ROLE_BY_TYPE[type] || row.LOAI_NV_LABEL || 'Nhân viên',
    department: noteData.phongBan || DEPARTMENT_BY_TYPE[type] || 'Văn phòng',
    phone: row.DIENTHOAI || '—',
    email: noteData.email || '—',
    startDate: formatDate(row.TIMECREATED),
    manager: '—',
    status: isActive ? 'Đang làm việc' : 'Nghỉ việc',
    statusColor: isActive ? '#2E7D32' : '#E65100',
    statusBg: isActive ? '#E8F5E9' : '#FFE0B2',
    avatar: DEFAULT_AVATAR,
    cert: noteData.chungChi || (typeof row.NOTE === 'string' && !row.NOTE.trim().startsWith('{') ? row.NOTE : '—'),
    skills: row.CHUYENMON || '—',
    specialty: row.CHUYENMON || '',
    exp: '—',
    workingTime: isActive ? '08:00 - 17:00' : 'Đã nghỉ việc',
  };
}

export default function NhanVienPage() {
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedId, setSelectedId] = useState('NV001');
  const selectedStaff = employeeList.find(e => e.id === selectedId) || employeeList[0] || mapEmployee({ STATUS: 1 }, 0);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'detail' | 'stats'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Đang làm việc');

  // Modal & Toast
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let mounted = true;
    employees.list({ includeInactive: 1 })
      .then((rows) => {
        if (!mounted) return;
        const mapped = (Array.isArray(rows) ? rows : []).map(mapEmployee);
        setEmployeeList(mapped);
        setSelectedId(mapped[0]?.id || '');
      })
      .catch(() => {
        if (!mounted) return;
        setEmployeeList([]);
        setSelectedId('');
        setToast({ msg: 'Không thể tải dữ liệu nhân viên từ hệ thống', type: 'error' });
      });
    return () => { mounted = false; };
  }, []);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Thêm nhân viên mới
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Kỹ thuật viên',
    department: 'Sửa chữa',
    phone: '',
    email: '',
    cert: '',
    skills: ''
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.phone.trim()) {
      alert('Vui lòng nhập Họ tên và Số điện thoại!');
      return;
    }
    const newId = 'NV' + String(employeeList.length + 1).padStart(3, '0');
    const created = {
      stt: employeeList.length + 1,
      id: newId,
      name: newStaff.name,
      role: newStaff.role,
      department: newStaff.department,
      phone: newStaff.phone,
      email: newStaff.email || `${newId.toLowerCase()}@kazuko.vn`,
      startDate: new Date().toLocaleDateString('vi-VN'),
      manager: 'Trần Văn B',
      status: 'Đang làm việc',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
      cert: newStaff.cert || 'Chứng chỉ nghề kỹ thuật ô tô',
      skills: newStaff.skills || 'Sửa chữa và bảo dưỡng chung',
      exp: '1 năm',
      workingTime: '08:00 - 17:00'
    };
    setEmployeeList([created, ...employeeList]);
    setSelectedId(newId);
    setShowAddModal(false);
    showToastMsg(`Đã thêm nhân viên mới: [${newId}] ${created.name}`);
  };

  // Lọc danh sách: nếu người dùng gõ tìm kiếm hoặc chọn lọc phòng ban/chức vụ thì lọc,
  // mặc định giữ hiển thị đầy đủ 10 người như ảnh gốc
  const filteredList = employeeList.filter(item => {
    const matchSearch = searchTerm === '' || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = departmentFilter === '' || item.department === departmentFilter;
    const matchRole = roleFilter === '' || item.role === roleFilter;
    const matchStatus = statusFilter === 'Tất cả' || item.status === statusFilter;
    return matchSearch && matchDept && matchRole && matchStatus;
  });

  const departmentStats = ['Sửa chữa', 'Dịch vụ', 'Kế toán', 'Kho hàng', 'Văn phòng'].map((name) => ({
    name,
    count: employeeList.filter((item) => item.department === name).length,
  }));
  const maxDepartmentCount = Math.max(1, ...departmentStats.map((item) => item.count));

  const statusStats = [
    { name: 'Đang làm việc', color: '#2E7D32' },
    { name: 'Nghỉ phép', color: '#0288D1' },
    { name: 'Nghỉ việc', color: '#E65100' },
    { name: 'Khác', color: '#EF5350' },
  ].map((item) => ({
    ...item,
    count: item.name === 'Khác'
      ? employeeList.filter((employee) => !['Đang làm việc', 'Nghỉ phép', 'Nghỉ việc'].includes(employee.status)).length
      : employeeList.filter((employee) => employee.status === item.name).length,
  }));

  let statusOffset = 25;
  const statusSegments = statusStats.map((item) => {
    const percentage = employeeList.length ? (item.count / employeeList.length) * 100 : 0;
    const segment = { ...item, percentage, offset: statusOffset };
    statusOffset -= percentage;
    return segment;
  });

  const technicianRows = employeeList.filter((item) => item.role === 'Kỹ thuật viên');
  const specialtyMatchers = [
    { spec: 'Động cơ', terms: ['may', 'máy', 'dong co', 'động cơ'] },
    { spec: 'Điện - Điện tử', terms: ['dien', 'điện'] },
    { spec: 'Gầm - Hộp số', terms: ['gam', 'gầm', 'hop so', 'hộp số'] },
    { spec: 'Sơn - Thân vỏ', terms: ['son', 'sơn', 'than vo', 'thân vỏ'] },
  ];
  const specialtyStats = specialtyMatchers.map(({ spec, terms }) => ({
    spec,
    count: technicianRows.filter((item) => terms.some((term) => item.specialty.toLowerCase().includes(term))).length,
  }));
  const classifiedTechnicians = specialtyStats.reduce((sum, item) => sum + item.count, 0);
  specialtyStats.push({ spec: 'Khác', count: Math.max(0, technicianRows.length - classifiedTechnicians) });

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
    <div className="nv-page-container">
      
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
      <div className="nv-header">
        <h1 className="nv-header-title">
          <span style={{ background: '#E65100', color: 'white', width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
            🚗
          </span>
          Nhân viên / Kỹ thuật viên
        </h1>
        <div className="nv-actions-group">
          <button 
            onClick={() => setShowAddModal(true)}
            className="nv-btn-add"
          >
            <Plus size={14} /> Thêm nhân viên
          </button>
          <div className="nv-actions-row-mobile">
            <button 
              type="button"
              onClick={() => showToastMsg('Tính năng Import Excel sẵn sàng')}
              className="nv-btn-outline"
            >
              <FileSpreadsheet size={14} color="#4CAF50" /> Import Excel
            </button>
            <button 
              type="button"
              onClick={() => showToastMsg('Xuất file Excel danh sách nhân viên thành công!')}
              className="nv-btn-outline"
            >
              <FileSpreadsheet size={14} color="#1976D2" /> Xuất Excel
            </button>
            <button type="button" className="nv-btn-outline" style={{ padding: '6px 8px' }}>
              <MoreVertical size={14} color="#616161" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="nv-filter-bar">
        <div className="nv-filter-row-1">
          <div className="nv-search-box">
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, mã NV, SĐT, phòng ban..." 
                className="nv-search-input"
              />
              <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
            </div>
          </div>
        </div>

        <div className="nv-filter-row-2">
          <div className="nv-filter-item">
            <label className="nv-filter-label">Phòng ban</label>
            <select 
              value={departmentFilter} 
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="nv-filter-select"
            >
              <option value="">Tất cả</option>
              <option>Sửa chữa</option>
              <option>Dịch vụ</option>
              <option>Kế toán</option>
              <option>Kho hàng</option>
              <option>Văn phòng</option>
            </select>
          </div>

          <div className="nv-filter-item">
            <label className="nv-filter-label">Chức vụ</label>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="nv-filter-select"
            >
              <option value="">Tất cả</option>
              <option>Nhân viên</option>
              <option>Kỹ thuật viên</option>
              <option>Cố vấn dịch vụ</option>
              <option>Thủ kho</option>
              <option>Thu ngân</option>
            </select>
          </div>
        </div>

        <div className="nv-filter-row-3">
          <div className="nv-filter-item">
            <label className="nv-filter-label">Trạng thái</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="nv-filter-select"
            >
              <option value="Đang làm việc">Đang làm việc</option>
              <option value="Nghỉ phép">Nghỉ phép</option>
              <option value="Nghỉ việc">Nghỉ việc</option>
              <option value="Tất cả">Tất cả</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Segmented Tabs */}
      <div className="nv-mobile-tabs">
        <button
          type="button"
          className={`nv-mobile-tab-btn ${mobileTab === 'list' ? 'active' : ''}`}
          onClick={() => setMobileTab('list')}
        >
          <Users size={14} /> Danh sách ({filteredList.length})
        </button>
        <button
          type="button"
          className={`nv-mobile-tab-btn ${mobileTab === 'detail' ? 'active' : ''}`}
          onClick={() => setMobileTab('detail')}
        >
          <User size={14} /> Chi tiết & Lịch
        </button>
        <button
          type="button"
          className={`nv-mobile-tab-btn ${mobileTab === 'stats' ? 'active' : ''}`}
          onClick={() => setMobileTab('stats')}
        >
          <Wrench size={14} /> Thống kê
        </button>
      </div>

      {/* Main Content: 2 Columns */}
      <div className="nv-main-grid">
        
        {/* Cột Trái (~58%): Bảng danh sách + 2 Thống kê dưới */}
        <div className="nv-left-col">
          
          {/* Table: Danh sách nhân viên */}
          <div className={`card ${mobileTab !== 'list' ? 'nv-mobile-hidden' : ''}`} style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1.35, minHeight: 290, overflow: 'hidden' }}>
            <div className="nv-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="nv-table-staff">
                <thead>
                  <tr>
                    <th style={{ width: 34, textAlign: 'center' }}>STT</th>
                    <th style={{ width: 65 }}>Mã NV</th>
                    <th style={{ minWidth: 120 }}>Họ và tên</th>
                    <th style={{ width: 95 }}>Chức vụ</th>
                    <th style={{ width: 85 }}>Phòng ban</th>
                    <th style={{ width: 95 }}>SĐT</th>
                    <th style={{ width: 85, textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ width: 65, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <tr 
                        key={item.id}
                        onClick={() => {
                          setSelectedId(item.id);
                          if (window.innerWidth <= 768) {
                            setMobileTab('detail');
                          }
                        }}
                        style={{ 
                          cursor: 'pointer',
                          background: isSelected ? '#FFF8E1' : (idx % 2 === 1 ? '#FAFAFA' : 'white'),
                          borderLeft: isSelected ? '3px solid #E65100' : '3px solid transparent',
                          borderBottom: '1px solid #F0F0F0'
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#1976D2' }}>{item.id}</td>
                        <td style={{ fontWeight: 600, color: '#212121' }}>{item.name}</td>
                        <td style={{ color: '#424242' }}>{item.role}</td>
                        <td style={{ color: '#616161' }}>{item.department}</td>
                        <td style={{ color: '#424242' }}>{item.phone}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: 10,
                            fontSize: 9,
                            fontWeight: 600,
                            color: item.statusColor,
                            background: item.statusBg,
                            border: `1px solid ${item.statusColor}33`,
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            <Eye size={12} color="#1976D2" style={{ cursor: 'pointer' }} title="Xem" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); setMobileTab('detail'); }} />
                            <Edit size={12} color="#757575" style={{ cursor: 'pointer' }} title="Sửa" onClick={(e) => { e.stopPropagation(); showToastMsg(`Mở chỉnh sửa nhân viên ${item.name}`); }} />
                            <MoreVertical size={12} color="#9E9E9E" style={{ cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div className="nv-pagination-bar">
              <div>Tổng cộng: <b>{filteredList.length}</b> nhân viên</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" className="nv-pagination-btn">&lt;</button>
                <button type="button" className="nv-pagination-btn active">1</button>
                <button type="button" className="nv-pagination-btn">&gt;</button>
              </div>
            </div>
          </div>

          {/* Bottom Left: 2 Thống kê (Phòng ban & Trạng thái) */}
          <div className={`nv-bottom-stats-row ${mobileTab !== 'stats' ? 'nv-mobile-hidden' : ''}`} style={{ display: 'flex', gap: 6, flex: 0.9, minHeight: 155 }}>
            
            {/* Card: Thống kê nhân sự theo phòng ban */}
            <div className="card" style={{ flex: 1.1, padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 4, marginBottom: 6 }}>
                <span style={{ color: '#E65100', fontSize: 12 }}>📊</span>
                <h3 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Thống kê nhân sự theo phòng ban</h3>
              </div>

              {/* Bar Chart theo dữ liệu nhân viên */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 4px 6px 4px', borderBottom: '1px solid #E0E0E0', minHeight: 100 }}>
                {departmentStats.map((item, i) => {
                  const barHeight = Math.round((item.count / maxDepartmentCount) * 85);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18%' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#333', marginBottom: 2 }}>{item.count}</span>
                      <div style={{ width: '60%', height: Math.max(8, barHeight), background: '#E65100', borderRadius: '2px 2px 0 0' }} />
                      <span style={{ fontSize: 8.5, color: '#616161', marginTop: 4, whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card: Thống kê trạng thái nhân viên (Donut Chart Đa sắc) */}
            <div className="card" style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 4, marginBottom: 6 }}>
                <span style={{ color: '#E65100', fontSize: 12 }}>🍩</span>
                <h3 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Thống kê trạng thái nhân viên</h3>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around', minHeight: 100 }}>
                {/* Donut circle representation */}
                <div style={{ position: 'relative', width: 95, height: 95, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="95" height="95" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F5F5F5" strokeWidth="4" />
                    {statusSegments.map((item) => (
                      <circle
                        key={item.name}
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="4"
                        strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                        strokeDashoffset={item.offset}
                      />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#212121', lineHeight: 1 }}>{employeeList.length}</div>
                    <div style={{ fontSize: 7.5, color: '#757575', marginTop: 2 }}>Tổng nhân viên</div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 9 }}>
                  {statusStats.map((item) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#424242' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} /> {item.name}
                      </span>
                      <b style={{ color: '#212121' }}>{item.count}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Cột Phải (~42%): 4 Khối chi tiết */}
        <div className="nv-right-col">
          
          {/* Card 1: Thông tin nhân viên */}
          <div className={`card ${mobileTab !== 'detail' ? 'nv-mobile-hidden' : ''}`} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="nv-mobile-back-btn"
                  onClick={() => setMobileTab('list')}
                >
                  <ArrowLeft size={12} /> Danh sách
                </button>
                <span style={{ color: '#E65100', fontSize: 13 }}>👤</span>
                <h2 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: '#212121' }}>Thông tin nhân viên</h2>
              </div>
              <button 
                onClick={() => showToastMsg(`Mở chỉnh sửa nhân viên ${selectedStaff.name}`)}
                style={{ background: 'white', color: '#333333', border: '1px solid #ccc', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
              >
                <Edit size={11} color="#333" /> Sửa
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Avatar biểu tượng */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFE0B2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={26} color="#E65100" />
              </div>

              {/* Thông tin nhân viên */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#212121' }}>{selectedStaff.name}</span>
                  <span style={{
                    background: selectedStaff.statusBg,
                    color: selectedStaff.statusColor,
                    padding: '2px 7px',
                    borderRadius: 10,
                    fontSize: 9,
                    fontWeight: 600
                  }}>
                    {selectedStaff.status}
                  </span>
                </div>
                <div style={{ fontSize: 9.5, color: '#616161' }}>Mã NV: <b style={{ color: '#333' }}>{selectedStaff.id}</b></div>
                <div style={{ fontSize: 9.5, color: '#616161' }}>Chức vụ: <b style={{ color: '#333' }}>{selectedStaff.role}</b></div>
                <div style={{ fontSize: 9.5, color: '#616161' }}>Phòng ban: <b style={{ color: '#333' }}>{selectedStaff.department}</b></div>
                <div style={{ fontSize: 9.5, color: '#1976D2' }}>
                  <a href={`tel:${selectedStaff.phone}`} style={{ color: '#1976D2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <Phone size={11} /> {selectedStaff.phone}
                  </a>
                </div>
                <div style={{ fontSize: 9.5, color: '#616161' }}>
                  <a href={`mailto:${selectedStaff.email}`} style={{ color: '#616161', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={11} /> {selectedStaff.email}
                  </a>
                </div>
                <div style={{ fontSize: 9.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> Ngày vào làm: <span style={{ color: '#333' }}>{selectedStaff.startDate}</span>
                </div>
                <div style={{ fontSize: 9.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={11} /> Quản lý trực tiếp: <span style={{ color: '#333' }}>{selectedStaff.manager}</span>
                </div>
              </div>

              {/* Ảnh chân dung nhân viên */}
              <div style={{ width: 70, height: 85, borderRadius: 4, overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
                <img src={selectedStaff.avatar} alt={selectedStaff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>

          {/* Card 2: Chứng chỉ / Kỹ năng */}
          <div className={`card ${mobileTab !== 'detail' ? 'nv-mobile-hidden' : ''}`} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#E65100', fontSize: 12 }}>🛡️</span>
                <h3 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Chứng chỉ / Kỹ năng</h3>
              </div>
              <span style={{ fontSize: 9.5, color: '#E65100', cursor: 'pointer', fontWeight: 500 }}>Xem chi tiết</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 9.5, color: '#424242', padding: '2px 0' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span>•</span>
                <span>{selectedStaff.cert}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <span>•</span>
                <span>Kỹ năng: {selectedStaff.skills}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <span>•</span>
                <span>Kinh nghiệm: {selectedStaff.exp}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Lịch làm việc */}
          <div className={`card ${mobileTab !== 'detail' ? 'nv-mobile-hidden' : ''}`} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#E65100', fontSize: 12 }}>📅</span>
                <h3 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Lịch làm việc</h3>
              </div>
              <span style={{ fontSize: 9.5, color: '#E65100', cursor: 'pointer', fontWeight: 500 }}>Xem lịch</span>
            </div>

            {/* 7 Days of week */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {[
                { day: 'Thứ 2', date: '29/09', active: false },
                { day: 'Thứ 3', date: '30/09', active: true },
                { day: 'Thứ 4', date: '01/10', active: false },
                { day: 'Thứ 5', date: '02/10', active: false },
                { day: 'Thứ 6', date: '03/10', active: false },
                { day: 'Thứ 7', date: '04/10', active: false },
                { day: 'CN', date: '05/10', active: false },
              ].map((d, i) => (
                <div 
                  key={i}
                  style={{
                    background: d.active ? '#E65100' : '#F5F5F5',
                    color: d.active ? 'white' : '#424242',
                    padding: '4px 2px',
                    borderRadius: 4,
                    textAlign: 'center',
                    border: d.active ? 'none' : '1px solid #E0E0E0'
                  }}
                >
                  <div style={{ fontSize: 8.5, fontWeight: d.active ? 700 : 500 }}>{d.day}</div>
                  <div style={{ fontSize: 8 }}>{d.date}</div>
                </div>
              ))}
            </div>

            {/* Status & time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{
                background: selectedStaff.statusBg,
                color: selectedStaff.statusColor,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 600
              }}>
                {selectedStaff.status}
              </span>
              <span style={{ fontSize: 9.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {selectedStaff.workingTime}
              </span>
            </div>
          </div>

          {/* Card 4: Kỹ thuật viên theo chuyên môn */}
          <div className={`card ${mobileTab !== 'stats' ? 'nv-mobile-hidden' : ''}`} style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 140, overflow: 'hidden' }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ color: '#E65100', fontSize: 12 }}>👨‍🔧</span>
              <h3 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Kỹ thuật viên theo chuyên môn</h3>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ margin: 0, width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                    <th style={{ ...tableHeaderThStyle }}>Chuyên môn</th>
                    <th style={{ ...tableHeaderThStyle, width: 85, textAlign: 'center' }}>Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {specialtyStats.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '5px 10px', color: '#333' }}>{row.spec}</td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 700, color: row.count > 0 ? '#E65100' : '#9E9E9E' }}>
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      <EmployeeFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        notify={(message) => showToastMsg(message)}
        onCreated={(id, rows) => {
          const mapped = rows.map(mapEmployee);
          setEmployeeList(mapped);
          const created = mapped.find((item) => item.databaseId === id);
          if (created) setSelectedId(created.id);
        }}
      />

      {/* Modal cũ giữ tạm để đối chiếu, không còn hiển thị. */}
      {false && showAddModal && (
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
          <div style={{ background: 'white', borderRadius: 8, width: 450, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '10px 14px', background: '#E65100', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={16} /> + THÊM NHÂN VIÊN MỚI
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Họ và tên <span style={{color:'red'}}>*</span></label>
                <input 
                  type="text" 
                  value={newStaff.name} 
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} 
                  placeholder="Nhập họ và tên..." 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, fontWeight: 600 }} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Chức vụ</label>
                  <select 
                    value={newStaff.role} 
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} 
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  >
                    <option>Kỹ thuật viên</option>
                    <option>Cố vấn dịch vụ</option>
                    <option>Thu ngân</option>
                    <option>Lễ tân</option>
                    <option>Kế toán</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Phòng ban</label>
                  <select 
                    value={newStaff.department} 
                    onChange={(e) => setNewStaff({...newStaff, department: e.target.value})} 
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  >
                    <option>Sửa chữa</option>
                    <option>Dịch vụ</option>
                    <option>Kế toán</option>
                    <option>Văn phòng</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Số điện thoại <span style={{color:'red'}}>*</span></label>
                  <input 
                    type="text" 
                    value={newStaff.phone} 
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} 
                    placeholder="09xx xxx xxx" 
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Email</label>
                  <input 
                    type="email" 
                    value={newStaff.email} 
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} 
                    placeholder="email@..." 
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Chứng chỉ</label>
                <input 
                  type="text" 
                  value={newStaff.cert} 
                  onChange={(e) => setNewStaff({...newStaff, cert: e.target.value})} 
                  placeholder="Chứng chỉ kỹ thuật ô tô..." 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Kỹ năng chuyên môn</label>
                <input 
                  type="text" 
                  value={newStaff.skills} 
                  onChange={(e) => setNewStaff({...newStaff, skills: e.target.value})} 
                  placeholder="Động cơ, gầm hộp số, điện ô tô..." 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '4px 12px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#333', fontSize: 11, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  style={{ padding: '4px 16px', background: '#E65100', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Lưu nhân viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
