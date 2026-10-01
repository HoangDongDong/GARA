import { useEffect, useState } from 'react';
import { 
  Users, User, Phone, Mail, Calendar, Award, Clock, Wrench, 
  Search, Plus, FileSpreadsheet, MoreVertical, Edit, Eye, 
  CheckCircle, X, Shield, Briefcase
} from 'lucide-react';
import { employees } from '../services';
import EmployeeFormModal from '../components/EmployeeFormModal';

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
      <div className="page-header" style={{ marginBottom: 4, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: '#E65100', color: 'white', width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            🚗
          </span>
          Nhân viên / Kỹ thuật viên
        </h1>
        <div className="page-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ background: '#E65100', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            + Thêm nhân viên
          </button>
          <button 
            onClick={() => showToastMsg('Tính năng Import Excel sẵn sàng')}
            style={{ background: 'white', color: '#424242', border: '1px solid #E0E0E0', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={13} color="#4CAF50" /> Import Excel
          </button>
          <button 
            onClick={() => showToastMsg('Xuất file Excel danh sách nhân viên thành công!')}
            style={{ background: 'white', color: '#424242', border: '1px solid #E0E0E0', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={13} color="#1976D2" /> Xuất Excel
          </button>
          <button style={{ background: 'white', color: '#616161', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, fontSize: 10.5, cursor: 'pointer' }}>
            <MoreVertical size={13} color="#616161" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'white', padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E0E0', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, mã NV, SĐT, phòng ban..." 
              style={{ width: '100%', padding: '4px 28px 4px 8px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
            />
            <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
          </div>
        </div>

        <div style={{ minWidth: 110 }}>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 1 }}>Phòng ban</label>
          <select 
            value={departmentFilter} 
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
          >
            <option value="">Tất cả</option>
            <option>Sửa chữa</option>
            <option>Dịch vụ</option>
            <option>Kế toán</option>
            <option>Kho hàng</option>
            <option>Văn phòng</option>
          </select>
        </div>

        <div style={{ minWidth: 110 }}>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 1 }}>Chức vụ</label>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
          >
            <option value="">Tất cả</option>
            <option>Nhân viên</option>
            <option>Kỹ thuật viên</option>
            <option>Cố vấn dịch vụ</option>
            <option>Thủ kho</option>
            <option>Thu ngân</option>
          </select>
        </div>

        <div style={{ minWidth: 120 }}>
          <label style={{ fontSize: 9.5, color: '#616161', display: 'block', marginBottom: 1 }}>Trạng thái</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
          >
            <option value="Đang làm việc">Đang làm việc</option>
            <option value="Nghỉ phép">Nghỉ phép</option>
            <option value="Nghỉ việc">Nghỉ việc</option>
            <option value="Tất cả">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Main Content: 2 Columns */}
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        
        {/* Cột Trái (~58%): Bảng danh sách + 2 Thống kê dưới */}
        <div style={{ flex: 1.35, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          
          {/* Table: Danh sách nhân viên */}
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1.35, minHeight: 290, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ margin: 0, width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                    <th style={{ ...tableHeaderThStyle, width: 30, textAlign: 'center' }}>STT</th>
                    <th style={{ ...tableHeaderThStyle, width: 60 }}>Mã NV</th>
                    <th style={{ ...tableHeaderThStyle, width: 100 }}>Họ và tên</th>
                    <th style={{ ...tableHeaderThStyle, width: 90 }}>Chức vụ</th>
                    <th style={{ ...tableHeaderThStyle, width: 80 }}>Phòng ban</th>
                    <th style={{ ...tableHeaderThStyle, width: 85 }}>SĐT</th>
                    <th style={{ ...tableHeaderThStyle, width: 80, textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ ...tableHeaderThStyle, width: 55, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <tr 
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        style={{ 
                          cursor: 'pointer',
                          background: isSelected ? '#FFF8E1' : (idx % 2 === 1 ? '#FAFAFA' : 'white'),
                          borderLeft: isSelected ? '3px solid #E65100' : '3px solid transparent',
                          borderBottom: '1px solid #F0F0F0'
                        }}
                      >
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontSize: 9.5 }}>{idx + 1}</td>
                        <td style={{ padding: '4px 6px', fontWeight: 600, color: '#1976D2', fontSize: 9.5 }}>{item.id}</td>
                        <td style={{ padding: '4px 6px', fontWeight: 600, color: '#212121', fontSize: 9.5 }}>{item.name}</td>
                        <td style={{ padding: '4px 6px', color: '#424242', fontSize: 9.5 }}>{item.role}</td>
                        <td style={{ padding: '4px 6px', color: '#616161', fontSize: 9.5 }}>{item.department}</td>
                        <td style={{ padding: '4px 6px', color: '#424242', fontSize: 9.5 }}>{item.phone}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: 10,
                            fontSize: 8.5,
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
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            <Eye size={11} color="#1976D2" style={{ cursor: 'pointer' }} title="Xem" />
                            <Edit size={11} color="#757575" style={{ cursor: 'pointer' }} title="Sửa" />
                            <MoreVertical size={11} color="#9E9E9E" style={{ cursor: 'pointer' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div style={{ padding: '3px 8px', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9.5, color: '#616161', background: '#FAFAFA', flexShrink: 0 }}>
              <div>Tổng cộng: <b>{filteredList.length}</b> nhân viên</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={{ border: '1px solid #ccc', background: 'white', color: '#333', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>&lt;</button>
                <button style={{ border: 'none', background: '#E65100', color: 'white', borderRadius: 3, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>1</button>
                <button style={{ border: '1px solid #ccc', background: 'white', color: '#333', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>&gt;</button>
              </div>
            </div>
          </div>

          {/* Bottom Left: 2 Thống kê (Phòng ban & Trạng thái) */}
          <div style={{ display: 'flex', gap: 6, flex: 0.9, minHeight: 155 }}>
            
            {/* Card: Thống kê nhân sự theo phòng ban */}
            <div className="card" style={{ flex: 1.1, padding: '5px 8px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 3, marginBottom: 4 }}>
                <span style={{ color: '#E65100', fontSize: 11 }}>📊</span>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0, color: '#212121' }}>Thống kê nhân sự theo phòng ban</h3>
              </div>

              {/* Bar Chart theo dữ liệu nhân viên */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 4px 4px 4px', borderBottom: '1px solid #E0E0E0' }}>
                {departmentStats.map((item, i) => {
                  const barHeight = Math.round((item.count / maxDepartmentCount) * 85);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18%' }}>
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: '#333', marginBottom: 2 }}>{item.count}</span>
                      <div style={{ width: '60%', height: barHeight, background: '#E65100', borderRadius: '2px 2px 0 0' }} />
                      <span style={{ fontSize: 8, color: '#616161', marginTop: 4, whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card: Thống kê trạng thái nhân viên (Donut Chart Đa sắc) */}
            <div className="card" style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 3, marginBottom: 4 }}>
                <span style={{ color: '#E65100', fontSize: 11 }}>🍩</span>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0, color: '#212121' }}>Thống kê trạng thái nhân viên</h3>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                {/* Donut circle representation với 3 màu xanh lá, xanh dương, cam */}
                <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="90" height="90" viewBox="0 0 42 42">
                    {/* Background */}
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
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#212121', lineHeight: 1 }}>{employeeList.length}</div>
                    <div style={{ fontSize: 7, color: '#757575', marginTop: 1 }}>Tổng nhân viên</div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 8.5 }}>
                  {statusStats.map((item) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          
          {/* Card 1: Thông tin nhân viên */}
          <div className="card" style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#E65100', fontSize: 13 }}>👤</span>
                <h2 style={{ fontSize: 11.5, fontWeight: 700, margin: 0, color: '#212121' }}>Thông tin nhân viên</h2>
              </div>
              <button 
                onClick={() => showToastMsg(`Mở chỉnh sửa nhân viên ${selectedStaff.name}`)}
                style={{ background: 'white', color: '#333333', border: '1px solid #ccc', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
              >
                <Edit size={10} color="#333" /> Sửa
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Avatar biểu tượng */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFE0B2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={26} color="#E65100" />
              </div>

              {/* Thông tin nhân viên */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#212121' }}>{selectedStaff.name}</span>
                  <span style={{
                    background: selectedStaff.statusBg,
                    color: selectedStaff.statusColor,
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 8,
                    fontWeight: 600
                  }}>
                    {selectedStaff.status}
                  </span>
                </div>
                <div style={{ fontSize: 8.5, color: '#616161' }}>Mã NV: <b style={{ color: '#333' }}>{selectedStaff.id}</b></div>
                <div style={{ fontSize: 8.5, color: '#616161' }}>Chức vụ: <b style={{ color: '#333' }}>{selectedStaff.role}</b></div>
                <div style={{ fontSize: 8.5, color: '#616161' }}>Phòng ban: <b style={{ color: '#333' }}>{selectedStaff.department}</b></div>
                <div style={{ fontSize: 8.5, color: '#1976D2', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Phone size={9} /> {selectedStaff.phone}
                </div>
                <div style={{ fontSize: 8.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Mail size={9} /> {selectedStaff.email}
                </div>
                <div style={{ fontSize: 8.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={9} /> Ngày vào làm: <span style={{ color: '#333' }}>{selectedStaff.startDate}</span>
                </div>
                <div style={{ fontSize: 8.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <User size={9} /> Quản lý trực tiếp: <span style={{ color: '#333' }}>{selectedStaff.manager}</span>
                </div>
              </div>

              {/* Ảnh chân dung nhân viên */}
              <div style={{ width: 70, height: 85, borderRadius: 4, overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
                <img src={selectedStaff.avatar} alt={selectedStaff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>

          {/* Card 2: Chứng chỉ / Kỹ năng */}
          <div className="card" style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#E65100', fontSize: 11 }}>🛡️</span>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0, color: '#212121' }}>Chứng chỉ / Kỹ năng</h3>
              </div>
              <span style={{ fontSize: 9, color: '#E65100', cursor: 'pointer', fontWeight: 500 }}>Xem chi tiết</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, fontSize: 8.5, color: '#424242', padding: '2px 0' }}>
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
          <div className="card" style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#E65100', fontSize: 11 }}>📅</span>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0, color: '#212121' }}>Lịch làm việc</h3>
              </div>
              <span style={{ fontSize: 9, color: '#E65100', cursor: 'pointer', fontWeight: 500 }}>Xem lịch</span>
            </div>

            {/* 7 Days of week */}
            <div className="responsive-grid-7" style={{ gap: 3 }}>
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
                    padding: '3px 2px',
                    borderRadius: 3,
                    textAlign: 'center',
                    border: d.active ? 'none' : '1px solid #E0E0E0'
                  }}
                >
                  <div style={{ fontSize: 7.5, fontWeight: d.active ? 700 : 500 }}>{d.day}</div>
                  <div style={{ fontSize: 7 }}>{d.date}</div>
                </div>
              ))}
            </div>

            {/* Status & time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 1 }}>
              <span style={{
                background: selectedStaff.statusBg,
                color: selectedStaff.statusColor,
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 8,
                fontWeight: 600
              }}>
                {selectedStaff.status}
              </span>
              <span style={{ fontSize: 8.5, color: '#616161', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> {selectedStaff.workingTime}
              </span>
            </div>
          </div>

          {/* Card 4: Kỹ thuật viên theo chuyên môn */}
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 120, overflow: 'hidden' }}>
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ color: '#E65100', fontSize: 11 }}>👨‍🔧</span>
              <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0, color: '#212121' }}>Kỹ thuật viên theo chuyên môn</h3>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ margin: 0, width: '100%', fontSize: 9.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                    <th style={{ ...tableHeaderThStyle }}>Chuyên môn</th>
                    <th style={{ ...tableHeaderThStyle, width: 80, textAlign: 'center' }}>Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {specialtyStats.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '3px 8px', color: '#333' }}>{row.spec}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'center', fontWeight: 700, color: row.count > 0 ? '#E65100' : '#9E9E9E' }}>
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
