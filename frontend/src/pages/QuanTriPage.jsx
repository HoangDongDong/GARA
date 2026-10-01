import { useState } from 'react';
import {
  Shield, Users, Key, Database, Building2, User, UserCheck,
  Calendar, Clock, CheckSquare, Square, Save, Edit3, Settings,
  Printer, Mail, HardDrive, RefreshCw, UploadCloud, DownloadCloud,
  Image, Search, X, CheckCircle, ChevronRight, Sliders
} from 'lucide-react';

export default function QuanTriPage() {
  const [activeTab, setActiveTab] = useState('nguoi-dung');
  const [searchFunction, setSearchFunction] = useState('');
  const [selectedRole, setSelectedRole] = useState('ktv');
  const [selectedFunction, setSelectedFunction] = useState('sua-chua');
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalTitle, setSettingsModalTitle] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // State cho checkbox quyền hạn
  const [permissions, setPermissions] = useState({
    view: true,
    add: false,
    edit: true,
    delete: false,
    print: true
  });

  // State cho tree view chức năng
  const [treeState, setTreeState] = useState({
    all: true,
    tongQuan: true,
    tiepNhan: true,
    tiepNhan_add: true,
    tiepNhan_edit: true,
    tiepNhan_delete: true,
    tiepNhan_print: true,
    suaChua: true,
    suaChua_add: true,
    suaChua_edit: true,
    suaChua_delete: true
  });

  const toggleTree = (key) => {
    setTreeState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 5 Tab trên cùng
  const tabs = [
    { id: 'nguoi-dung', label: 'Người dùng & Phân quyền', icon: User },
    { id: 'nhat-ky', label: 'Nhật ký hệ thống', icon: Calendar },
    { id: 'cau-hinh', label: 'Cấu hình chung', icon: Settings },
    { id: 'sao-luu', label: 'Sao lưu & Khôi phục', icon: Database },
    { id: 'doanh-nghiep', label: 'Thông tin doanh nghiệp', icon: Building2 }
  ];

  // Danh sách Người dùng hoạt động
  const activeUsers = [
    { stt: 1, username: 'admin', name: 'Quản trị hệ thống', role: 'Admin', status: 'Đang hoạt động', lastLogin: '30/09/2025 14:28' },
    { stt: 2, username: 'nv001', name: 'Nguyễn Văn A', role: 'Kỹ thuật viên', status: 'Đang hoạt động', lastLogin: '30/09/2025 13:45' },
    { stt: 3, username: 'nv002', name: 'Trần Thị B', role: 'Nhân viên', status: 'Đang hoạt động', lastLogin: '30/09/2025 11:20' },
    { stt: 4, username: 'thukho', name: 'Lê Văn C', role: 'Thủ kho', status: 'Đã đăng xuất', lastLogin: '30/09/2025 10:12' },
    { stt: 5, username: 'ketoan', name: 'Phạm Thị D', role: 'Kế toán', status: 'Đang hoạt động', lastLogin: '30/09/2025 09:05' }
  ];

  // Danh sách Phân quyền theo nhóm
  const roles = [
    { stt: 1, name: 'Admin', count: 1, desc: 'Toàn quyền hệ thống', color: '#E65100', icon: Key },
    { stt: 2, name: 'Kỹ thuật viên', count: 4, desc: 'Sửa chữa, bảo dưỡng', color: '#2E7D32', icon: WrenchIcon },
    { stt: 3, name: 'Nhân viên', count: 3, desc: 'Bán hàng, CSKH', color: '#1976D2', icon: Users },
    { stt: 4, name: 'Thủ kho', count: 2, desc: 'Nhập xuất kho, linh kiện', color: '#7B1FA2', icon: HardDrive },
    { stt: 5, name: 'Kế toán', count: 1, desc: 'Thu - Chi, công nợ', color: '#0097A7', icon: UserCheck },
    { stt: 6, name: 'Quản lý', count: 1, desc: 'Xem báo cáo, quản lý chung', color: '#D32F2F', icon: Shield }
  ];

  function WrenchIcon(props) {
    return (
      <svg {...props} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }

  // Danh sách Nhật ký đăng nhập gần đây
  const loginLogs = [
    { stt: 1, time: '30/09/2025 14:28', username: 'admin', name: 'Quản trị hệ thống', ip: '127.0.0.1', device: 'Windows - Chrome' },
    { stt: 2, time: '30/09/2025 13:45', username: 'nv001', name: 'Nguyễn Văn A', ip: '192.168.1.10', device: 'Windows - Edge' },
    { stt: 3, time: '30/09/2025 11:20', username: 'nv002', name: 'Trần Thị B', ip: '192.168.1.11', device: 'Windows - Chrome' },
    { stt: 4, time: '30/09/2025 10:12', username: 'thukho', name: 'Lê Văn C', ip: '192.168.1.12', device: 'Windows - Chrome' },
    { stt: 5, time: '30/09/2025 09:05', username: 'ketoan', name: 'Phạm Thị D', ip: '192.168.1.13', device: 'Windows - Firefox' }
  ];

  // 8 Ô Cài đặt hệ thống
  const settingsGrid = [
    { title: 'Thông tin công ty', icon: Building2 },
    { title: 'Logo & giao diện', icon: Image },
    { title: 'Máy in', icon: Printer },
    { title: 'Email / SMS', icon: Mail },
    { title: 'Kết nối dữ liệu', icon: HardDrive },
    { title: 'Sao lưu dữ liệu', icon: UploadCloud },
    { title: 'Khôi phục dữ liệu', icon: DownloadCloud },
    { title: 'Cập nhật phần mềm', icon: RefreshCw }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(4px, 0.8vh, 10px)',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
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

      {/* Header & Tabs bar kết hợp gọn đẹp 1 hàng */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 6,
        padding: 'clamp(4px, 0.6vh, 8px) 12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexShrink: 0
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
            <Settings size={14} />
          </div>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#212121' }}>
            Quản trị hệ thống
          </h1>
        </div>

        {/* 5 Tabs Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          flexWrap: 'nowrap'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  showToast(`Chuyển sang tab: ${tab.label}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? 'none' : '1px solid #DEDEDE',
                  background: isActive ? '#E65100' : 'white',
                  color: isActive ? 'white' : '#424242',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={12} color={isActive ? 'white' : '#616161'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hàng 1 (2 Cột): Tổng quan hệ thống (4 Cards) | Người dùng hoạt động (Table) (flex: 1) */}
      <div className="responsive-grid-2" style={{
        flex: 1,
        minHeight: 0
      }}>
        {/* Khối Trái: Tổng quan hệ thống (4 Cards) */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
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
              <Users size={11} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Tổng quan hệ thống</span>
          </div>

          <div className="responsive-grid-4" style={{
            gap: 6,
            flex: 1,
            alignItems: 'stretch'
          }}>
            {/* Card 1: Người dùng */}
            <div style={{
              background: '#FFEBEE',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 4px'
            }}>
              <User size={18} color="#D32F2F" />
              <div style={{ fontSize: 'clamp(16px, 2.5vh, 22px)', fontWeight: 800, color: '#D32F2F', lineHeight: 1.1, marginTop: 2 }}>
                12
              </div>
              <div style={{ fontSize: 10, color: '#616161', marginTop: 1 }}>Người dùng</div>
            </div>

            {/* Card 2: Nhóm quyền */}
            <div style={{
              background: '#E3F2FD',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 4px'
            }}>
              <Users size={18} color="#1976D2" />
              <div style={{ fontSize: 'clamp(16px, 2.5vh, 22px)', fontWeight: 800, color: '#1976D2', lineHeight: 1.1, marginTop: 2 }}>
                5
              </div>
              <div style={{ fontSize: 10, color: '#616161', marginTop: 1 }}>Nhóm quyền</div>
            </div>

            {/* Card 3: Chức năng */}
            <div style={{
              background: '#E8F5E9',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 4px'
            }}>
              <Shield size={18} color="#2E7D32" />
              <div style={{ fontSize: 'clamp(16px, 2.5vh, 22px)', fontWeight: 800, color: '#2E7D32', lineHeight: 1.1, marginTop: 2 }}>
                18
              </div>
              <div style={{ fontSize: 10, color: '#616161', marginTop: 1 }}>Chức năng</div>
            </div>

            {/* Card 4: Nhật ký hôm nay */}
            <div style={{
              background: '#FFEBEE',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 4px'
            }}>
              <Calendar size={18} color="#D32F2F" />
              <div style={{ fontSize: 'clamp(16px, 2.5vh, 22px)', fontWeight: 800, color: '#D32F2F', lineHeight: 1.1, marginTop: 2 }}>
                256
              </div>
              <div style={{ fontSize: 10, color: '#616161', marginTop: 1 }}>Nhật ký hôm nay</div>
            </div>
          </div>
        </div>

        {/* Khối Phải: Người dùng hoạt động (Table 5 dòng) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
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
                <User size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Người dùng hoạt động</span>
            </div>
            <button
              onClick={() => setShowUserModal(true)}
              style={{
                background: 'white',
                color: '#D32F2F',
                border: '1px solid #FFCDD2',
                borderRadius: 10,
                padding: '1px 8px',
                fontSize: 9.5,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Xem tất cả
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 6px', textAlign: 'center', fontWeight: 600, border: 'none', width: 28 }}>STT</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Tên đăng nhập</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Họ tên</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Nhóm quyền</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 6px', textAlign: 'center', fontWeight: 600, border: 'none' }}>Trạng thái</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'right', fontWeight: 600, border: 'none' }}>Đăng nhập cuối</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u, i) => (
                  <tr
                    key={u.stt}
                    style={{
                      borderBottom: '1px solid #F5F5F5',
                      background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF'
                    }}
                  >
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 6px', textAlign: 'center', color: '#757575' }}>{u.stt}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', fontWeight: 600, color: '#212121' }}>{u.username}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#424242' }}>{u.name}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#424242' }}>{u.role}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 6px', textAlign: 'center' }}>
                      <span style={{
                        background: u.status === 'Đang hoạt động' ? '#E0F2F1' : '#ECEFF1',
                        color: u.status === 'Đang hoạt động' ? '#00796B' : '#546E7A',
                        padding: '1px 6px',
                        borderRadius: 10,
                        fontSize: 9,
                        fontWeight: 600
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', textAlign: 'right', color: '#616161' }}>{u.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hàng 2 (2 Cột): Phân quyền theo nhóm (Table 6 dòng) | Phân quyền chức năng (Tree + Form) (flex: 1.25) */}
      <div className="responsive-grid-2" style={{
        flex: 1.25,
        minHeight: 0
      }}>
        {/* Cột Trái: Phân quyền theo nhóm */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
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
                <Key size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Phân quyền theo nhóm</span>
            </div>
            <button
              onClick={() => setShowRoleModal(true)}
              style={{
                background: 'white',
                color: '#D32F2F',
                border: '1px solid #FFCDD2',
                borderRadius: 10,
                padding: '1px 8px',
                fontSize: 9.5,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Quản lý quyền
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 6px', textAlign: 'center', fontWeight: 600, border: 'none', width: 28 }}>STT</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Nhóm quyền</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 6px', textAlign: 'center', fontWeight: 600, border: 'none' }}>Số người dùng</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Mô tả</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 6px', textAlign: 'center', fontWeight: 600, border: 'none', width: 26 }}></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => {
                  const RoleIcon = r.icon;
                  return (
                    <tr
                      key={r.stt}
                      style={{
                        borderBottom: '1px solid #F5F5F5',
                        background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF'
                      }}
                    >
                      <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 6px', textAlign: 'center', color: '#757575' }}>{r.stt}</td>
                      <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', fontWeight: 600, color: '#212121' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            background: r.color,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8.5
                          }}>
                            <RoleIcon size={10} color="white" />
                          </span>
                          {r.name}
                        </div>
                      </td>
                      <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 6px', textAlign: 'center', fontWeight: 700, color: '#212121' }}>{r.count}</td>
                      <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#616161' }}>{r.desc}</td>
                      <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 6px', textAlign: 'center' }}>
                        <Edit3
                          size={12}
                          color="#757575"
                          style={{ cursor: 'pointer' }}
                          onClick={() => showToast(`Chỉnh sửa nhóm: ${r.name}`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột Phải: Phân quyền chức năng (Tree view & Permission form) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}>
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
                <Shield size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Phân quyền chức năng</span>
            </div>

            {/* Ô tìm kiếm chức năng */}
            <div style={{ position: 'relative', width: 140 }}>
              <input
                type="text"
                placeholder="Tìm chức năng..."
                value={searchFunction}
                onChange={(e) => setSearchFunction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '2px 20px 2px 6px',
                  borderRadius: 4,
                  border: '1px solid #DEDEDE',
                  fontSize: 10,
                  outline: 'none',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
            </div>
          </div>

          {/* 2 Pane Layout: Tree checklist bên trái, Form bên phải */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', flex: 1, minHeight: 0 }}>
            {/* Left: Tree checklist */}
            <div style={{
              padding: '6px 8px',
              borderRight: '1px solid #F0F0F0',
              overflowY: 'auto',
              fontSize: 10.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(2px, 0.5vh, 6px)'
            }}>
              {/* Root item */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                <span onClick={() => toggleTree('all')} style={{ cursor: 'pointer', color: '#E65100' }}>
                  {treeState.all ? <CheckSquare size={13} /> : <Square size={13} />}
                </span>
                <span>Tất cả chức năng</span>
              </div>

              {/* Sub: Tổng quan */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 14 }}>
                <span onClick={() => toggleTree('tongQuan')} style={{ cursor: 'pointer', color: '#E65100' }}>
                  {treeState.tongQuan ? <CheckSquare size={13} /> : <Square size={13} />}
                </span>
                <span>Tổng quan</span>
              </div>

              {/* Sub: Tiếp nhận xe */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 14 }}>
                <span onClick={() => toggleTree('tiepNhan')} style={{ cursor: 'pointer', color: '#E65100' }}>
                  {treeState.tiepNhan ? <CheckSquare size={13} /> : <Square size={13} />}
                </span>
                <span style={{ fontWeight: 600 }}>Tiếp nhận xe</span>
              </div>

              {/* Action items of Tiếp nhận xe */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', paddingLeft: 28, gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('tiepNhan_add')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.tiepNhan_add ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>Thêm mới</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('tiepNhan_edit')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.tiepNhan_edit ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>Sửa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('tiepNhan_delete')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.tiepNhan_delete ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>Xóa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('tiepNhan_print')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.tiepNhan_print ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>In phiếu</span>
                </div>
              </div>

              {/* Sub: Sửa chữa - Dịch vụ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 14, marginTop: 2 }}>
                <span onClick={() => toggleTree('suaChua')} style={{ cursor: 'pointer', color: '#E65100' }}>
                  {treeState.suaChua ? <CheckSquare size={13} /> : <Square size={13} />}
                </span>
                <span style={{ fontWeight: 600 }}>Sửa chữa - Dịch vụ</span>
              </div>

              {/* Action items of Sửa chữa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', paddingLeft: 28, gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('suaChua_add')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.suaChua_add ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>Thêm mới</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('suaChua_edit')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.suaChua_edit ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>Sửa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => toggleTree('suaChua_delete')} style={{ cursor: 'pointer', color: '#E65100' }}>
                    {treeState.suaChua_delete ? <CheckSquare size={12} /> : <Square size={12} />}
                  </span>
                  <span>Xóa</span>
                </div>
              </div>
            </div>

            {/* Right: Thông tin quyền & Form thiết lập */}
            <div style={{
              padding: 'clamp(6px, 1vh, 10px) 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: '#FAFAFA'
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#212121', marginBottom: 4 }}>
                  Thông tin quyền
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
                  {/* Nhóm quyền */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#616161' }}>Nhóm quyền</span>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        border: '1px solid #DEDEDE',
                        fontSize: 10,
                        background: 'white',
                        color: '#333',
                        width: 105
                      }}
                    >
                      <option value="ktv">Kỹ thuật viên</option>
                      <option value="admin">Admin</option>
                      <option value="nv">Nhân viên</option>
                      <option value="thukho">Thủ kho</option>
                      <option value="ketoan">Kế toán</option>
                    </select>
                  </div>

                  {/* Chức năng */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#616161' }}>Chức năng</span>
                    <select
                      value={selectedFunction}
                      onChange={(e) => setSelectedFunction(e.target.value)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        border: '1px solid #DEDEDE',
                        fontSize: 10,
                        background: 'white',
                        color: '#333',
                        width: 105
                      }}
                    >
                      <option value="sua-chua">Sửa chữa - Dịch vụ</option>
                      <option value="tiep-nhan">Tiếp nhận xe</option>
                      <option value="tong-quan">Tổng quan</option>
                      <option value="kho">Kho phụ tùng</option>
                    </select>
                  </div>

                  {/* Quyền hạn Checkboxes */}
                  <div style={{ marginTop: 2 }}>
                    <span style={{ color: '#616161', display: 'block', marginBottom: 2 }}>Quyền hạn</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.view}
                          onChange={(e) => setPermissions({ ...permissions, view: e.target.checked })}
                          style={{ accentColor: '#E65100' }}
                        />
                        <span>Xem</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.add}
                          onChange={(e) => setPermissions({ ...permissions, add: e.target.checked })}
                          style={{ accentColor: '#E65100' }}
                        />
                        <span>Thêm</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.edit}
                          onChange={(e) => setPermissions({ ...permissions, edit: e.target.checked })}
                          style={{ accentColor: '#E65100' }}
                        />
                        <span>Sửa</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.delete}
                          onChange={(e) => setPermissions({ ...permissions, delete: e.target.checked })}
                          style={{ accentColor: '#E65100' }}
                        />
                        <span>Xóa</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.print}
                          onChange={(e) => setPermissions({ ...permissions, print: e.target.checked })}
                          style={{ accentColor: '#E65100' }}
                        />
                        <span>In</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nút Lưu phân quyền */}
              <button
                onClick={() => showToast('Đã lưu thiết lập phân quyền thành công')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  background: '#E65100',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: 'clamp(4px, 0.7vh, 8px) 8px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: 4
                }}
              >
                <Save size={12} />
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 3 (2 Cột): Nhật ký đăng nhập gần đây (Table) | Cài đặt hệ thống (8 Tiles) (flex: 1) */}
      <div className="responsive-grid-2" style={{
        flex: 1,
        minHeight: 0
      }}>
        {/* Cột Trái: Nhật ký đăng nhập gần đây */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            padding: 'clamp(4px, 0.8vh, 8px) 10px',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
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
                <Clock size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Nhật ký đăng nhập gần đây</span>
            </div>
            <button
              onClick={() => setShowLogModal(true)}
              style={{
                background: 'white',
                color: '#D32F2F',
                border: '1px solid #FFCDD2',
                borderRadius: 10,
                padding: '1px 8px',
                fontSize: 9.5,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Xem tất cả
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 6px', textAlign: 'center', fontWeight: 600, border: 'none', width: 28 }}>STT</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Thời gian</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Tên đăng nhập</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Họ tên</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>IP</th>
                  <th style={{ background: '#FFE0B2', color: '#D84315', padding: 'clamp(3px, 0.5vh, 6px) 8px', textAlign: 'left', fontWeight: 600, border: 'none' }}>Thiết bị</th>
                </tr>
              </thead>
              <tbody>
                {loginLogs.map((l, i) => (
                  <tr
                    key={l.stt}
                    style={{
                      borderBottom: '1px solid #F5F5F5',
                      background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF'
                    }}
                  >
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 6px', textAlign: 'center', color: '#757575' }}>{l.stt}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#616161' }}>{l.time}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', fontWeight: 600, color: '#212121' }}>{l.username}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#424242' }}>{l.name}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#616161' }}>{l.ip}</td>
                    <td style={{ padding: 'clamp(2.5px, 0.4vh, 5px) 8px', color: '#616161' }}>{l.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột Phải: Cài đặt hệ thống (8 Ô thao tác) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(4px, 0.8vh, 8px) 10px',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6
          }}>
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
                <Settings size={11} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>Cài đặt hệ thống</span>
            </div>
            <button
              onClick={() => {
                setSettingsModalTitle('Cài đặt hệ thống toàn diện');
                setShowSettingsModal(true);
              }}
              style={{
                background: 'white',
                color: '#D32F2F',
                border: '1px solid #FFCDD2',
                borderRadius: 10,
                padding: '1px 8px',
                fontSize: 9.5,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cài đặt
            </button>
          </div>

          {/* Grid 8 Ô (4 cột x 2 hàng) */}
          <div className="responsive-grid-4" style={{
            gap: 5,
            flex: 1
          }}>
            {settingsGrid.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSettingsModalTitle(item.title);
                    setShowSettingsModal(true);
                  }}
                  style={{
                    background: '#FAFAFA',
                    border: '1px solid #EEEEEE',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'clamp(2px, 0.4vh, 6px)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ItemIcon size={16} color="#D32F2F" />
                  <span style={{
                    fontSize: 8.5,
                    color: '#333',
                    textAlign: 'center',
                    marginTop: 3,
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%'
                  }}>
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Quản lý quyền */}
      {showRoleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Key size={16} />
                <span>Quản lý nhóm quyền</span>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#616161', marginBottom: 3 }}>Tên nhóm quyền:</label>
                <input type="text" placeholder="Nhập tên nhóm quyền mới..." style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #DEDEDE', fontSize: 11, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#616161', marginBottom: 3 }}>Mô tả nhiệm vụ:</label>
                <textarea rows={3} placeholder="Mô tả phạm vi quyền hạn..." style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #DEDEDE', fontSize: 11, boxSizing: 'border-box' }} />
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
                  setShowRoleModal(false);
                  showToast('Đã thêm nhóm quyền mới');
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
                Thêm nhóm quyền
              </button>
              <button
                onClick={() => setShowRoleModal(false)}
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

      {/* Modal Xem tất cả Người dùng */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: 620,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Users size={16} />
                <span>Danh sách toàn bộ người dùng hệ thống (12 người dùng)</span>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '12px 16px', maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'center' }}>STT</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>Tài khoản</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>Họ tên</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>Nhóm</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((u) => (
                    <tr key={u.stt} style={{ borderBottom: '1px solid #EEE' }}>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{u.stt}</td>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{u.username}</td>
                      <td style={{ padding: '6px' }}>{u.name}</td>
                      <td style={{ padding: '6px' }}>{u.role}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span style={{ background: '#E0F2F1', color: '#00796B', padding: '2px 8px', borderRadius: 10, fontSize: 10 }}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              background: '#FAFAFA',
              padding: '8px 16px',
              borderTop: '1px solid #EEEEEE',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: '#E0E0E0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 14px',
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

      {/* Modal Xem tất cả Nhật ký */}
      {showLogModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: 620,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Clock size={16} />
                <span>Nhật ký truy cập hệ thống chi tiết (256 nhật ký hôm nay)</span>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '12px 16px', maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'center' }}>STT</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>Thời gian</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>Tài khoản</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>IP</th>
                    <th style={{ background: '#FFE0B2', color: '#D84315', padding: '6px', textAlign: 'left' }}>Thiết bị</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.map((l) => (
                    <tr key={l.stt} style={{ borderBottom: '1px solid #EEE' }}>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{l.stt}</td>
                      <td style={{ padding: '6px' }}>{l.time}</td>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{l.username}</td>
                      <td style={{ padding: '6px' }}>{l.ip}</td>
                      <td style={{ padding: '6px' }}>{l.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              background: '#FAFAFA',
              padding: '8px 16px',
              borderTop: '1px solid #EEEEEE',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowLogModal(false)}
                style={{
                  background: '#E0E0E0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 14px',
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

      {/* Modal Cài đặt hệ thống con */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Settings size={16} />
                <span>{settingsModalTitle}</span>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', fontSize: 12, color: '#333' }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Đang cấu hình: <strong>{settingsModalTitle}</strong>. Tính năng cho phép bạn tùy chỉnh thiết lập phần cứng, giao diện và dữ liệu theo chuẩn Gara Kazuko Auto.
              </p>
              <div style={{ marginTop: 12, background: '#FAFAFA', padding: 10, borderRadius: 6, border: '1px solid #EEE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2E7D32', fontWeight: 600 }}>
                  <CheckCircle size={14} />
                  <span>Trạng thái kết nối: Ổn định (SQL Server - D:/Garage/GARAGE.FDB)</span>
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
                  setShowSettingsModal(false);
                  showToast(`Đã lưu cấu hình: ${settingsModalTitle}`);
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
                Lưu cấu hình
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
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
    </div>
  );
}
