import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './MainLayout.css';
import { workflow, auth } from '../services';
import '../pages/SaasPages.css';

import { 
  Home, 
  CarFront, 
  Wrench, 
  ShoppingCart, 
  Package, 
  Truck, 
  Contact, 
  Users, 
  FileText, 
  ShieldCheck, 
  CircleDollarSign, 
  UserCog, 
  LineChart, 
  Shield, 
  Settings,
  Printer,
  Monitor,
  Menu,
  X,
  ClipboardCheck,
  Folders,
  Phone,
  Calendar,
  ChevronDown,
  MapPin,
  User
} from 'lucide-react';

const NAV = [
  { to: '/',                code: 'DASHBOARD', icon: <Home size={18} />, label: 'Tổng quan' },
  // Tạm thời ẩn theo yêu cầu:
  // { to: '/tiep-nhan',      icon: <CarFront size={18} />, label: 'Tiếp nhận xe' },
  { to: '/sua-chua',       code: 'REPAIR', icon: <Wrench size={18} />, label: 'Sửa chữa - Dịch vụ' },
  { to: '/ho-so-cho-duyet', code: 'REPAIR', icon: <ClipboardCheck size={18} />, label: 'Hồ sơ chờ duyệt', liveBadge: true },
  { to: '/ban-hang',       code: 'SALES', icon: <ShoppingCart size={18} />, label: 'Bán hàng (POS)' },
  // Tạm thời ẩn theo yêu cầu:
  // { to: '/mua-linh-kien',  icon: <Package size={18} />, label: 'Mua linh kiện &\nKho phụ tùng' },
  { to: '/nhap-kho',       code: 'INVENTORY', icon: <Truck size={18} />, label: 'Nhập kho' },
  { to: '/nha-cung-cap',   code: 'SUPPLIERS', icon: <Contact size={18} />, label: 'Nhà cung cấp' },
  { to: '/khach-hang',     code: 'CUSTOMERS', icon: <Users size={18} />, label: 'Khách hàng' },
  { to: '/ho-so-xe',       code: 'VEHICLES', icon: <FileText size={18} />, label: 'Hồ sơ xe & Lịch sử' },
  { to: '/danh-muc',       code: 'CATALOG', icon: <Folders size={18} />, label: 'Danh mục' },
  { to: '/bao-hanh',       code: 'WARRANTY', icon: <ShieldCheck size={18} />, label: 'Bảo hành' },
  { to: '/thu-chi',        code: 'FINANCE', icon: <CircleDollarSign size={18} />, label: 'Thu - Chi / Công nợ' },
  { to: '/nhan-vien',      code: 'EMPLOYEES', icon: <UserCog size={18} />, label: 'Nhân viên &\nKỹ thuật viên' },
  { to: '/bao-cao',        code: 'REPORTS', icon: <LineChart size={18} />, label: 'Báo cáo' },
  { to: '/in-chung-tu',    icon: <Printer size={18} />, label: 'In chứng từ' },
  { to: '/quan-tri',       code: 'ADMIN', icon: <Shield size={18} />, label: 'Quản trị - Phân quyền' },
  { to: '/cau-hinh',       code: 'SETTINGS', icon: <Settings size={18} />, label: 'Cấu hình' },
  { to: '/man-hinh-phu',    code: 'SETTINGS', icon: <Monitor size={18} />, label: 'Màn hình phụ' },
];

const MOBILE_BOTTOM_NAV = [
  { to: '/sua-chua',        code: 'REPAIR',   icon: <Wrench size={20} />,         label: 'Sửa chữa' },
  { to: '/ho-so-cho-duyet', code: 'REPAIR',   icon: <ClipboardCheck size={20} />, label: 'Hồ sơ chờ duyệt' },
  { to: '/',                code: 'DASHBOARD', icon: <Home size={20} />,           label: 'Trang chủ' },
  { to: '/ban-hang',        code: 'SALES',    icon: <ShoppingCart size={20} />,   label: 'Bán hàng' },
  { to: '/bao-hanh',        code: 'WARRANTY', icon: <ShieldCheck size={20} />,    label: 'Bảo hành' },
];

export default function MainLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = JSON.parse(localStorage.getItem('garage_user') || '{}');
  const canView = (code) => Number(user.ISADMIN) === 1 || (!['ADMIN', 'SETTINGS'].includes(code) && (Number(user.PERMISSIONS?.[code] || 0) & 1) === 1);
  const visibleNav = NAV.filter((item) => !item.code || canView(item.code));
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const menuRef = useRef(null);
  const contentRef = useRef(null);

  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [workflowBadge, setWorkflowBadge] = useState(0);
  const [supplementBadge, setSupplementBadge] = useState(0);

  useEffect(() => {
    if (!canView('REPAIR')) return;
    let active = true;
    const refresh = () => {
      workflow.list().then((rows) => { if (active) setWorkflowBadge((Array.isArray(rows) ? rows : []).filter((row) => Number(row.TRANGTHAI) < 4).length); }).catch(() => { if (active) setWorkflowBadge(0); });
      workflow.supplements().then((rows) => { if (active) setSupplementBadge(rows.filter(row => row.TRANGTHAI === 'pending').length); }).catch(() => { if (active) setSupplementBadge(0); });
    };
    refresh();
    window.addEventListener('garage:supplements-changed', refresh);
    return () => { active = false; window.removeEventListener('garage:supplements-changed', refresh); };
  }, [loc.pathname]);

  // Áp dụng cho TẤT CẢ các giao diện: Cuộn trang xem bên dưới thì ẩn thanh điều khiển, cuộn ngược lên thì hiện lại
  useEffect(() => {
    let lastScrollTop = 0;
    const threshold = 8;

    const onScroll = (e) => {
      const target = (e.target === document || e.target === window) 
        ? (document.scrollingElement || document.documentElement || document.body)
        : e.target;

      // Bỏ qua các container cuộn nhỏ (như dropdown hoặc widget nhỏ < 250px)
      if (target && target !== document.documentElement && target !== document.body && !target.classList?.contains('app-content')) {
        if (target.clientHeight && target.clientHeight < 250) return;
      }

      const rawScrollTop = target ? target.scrollTop : (window.pageYOffset || 0);
      const currentScrollTop = Math.max(0, rawScrollTop || 0);

      // Nếu đang ở đỉnh trang (< 20px) thì luôn hiện thanh
      if (currentScrollTop <= 20) {
        setBottomNavHidden(false);
        lastScrollTop = 0;
        return;
      }

      const diff = currentScrollTop - lastScrollTop;
      if (Math.abs(diff) >= threshold) {
        if (diff > 0) {
          // Cuộn xuống xem nội dung phía dưới -> ẩn thanh điều khiển
          setBottomNavHidden(true);
        } else {
          // Cuộn ngược từ dưới lên -> hiện lại thanh điều khiển
          setBottomNavHidden(false);
        }
        lastScrollTop = currentScrollTop;
      }
    };

    const contentEl = contentRef.current || document.querySelector('.app-content');
    if (contentEl) {
      contentEl.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      if (contentEl) {
        contentEl.removeEventListener('scroll', onScroll);
      }
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [loc.pathname]);

  // Luôn hiện lại thanh điều khiển khi chuyển sang trang mới
  useEffect(() => {
    setBottomNavHidden(false);
  }, [loc.pathname]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Đóng mobile nav khi chuyển trang
  useEffect(() => {
    setMobileNavOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const click = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  const logout = async () => {
    try { await auth.logout(); } catch { /* Local sign-out remains available if offline. */ }
    localStorage.removeItem('garage_user');
    localStorage.removeItem('garage_token');
    nav('/login');
  };

  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayStr = days[now.getDay()];
  const dateStr = `${dayStr}, ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const displayName = user.TEN_HIEN_THI || user.USERNAME || 'admin';
  const roleName = user.ROLE || (Number(user.ISADMIN) === 1 ? 'Admin' : 'Chưa gán chức vụ');

  return (
    <div className={`app-layout ${bottomNavHidden ? 'mobile-nav-hidden' : ''}`}>
      {/* Overlay backdrop khi mở Drawer trên mobile */}
      {mobileNavOpen && (
        <div 
          className="sidebar-overlay active" 
          onClick={() => setMobileNavOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* ===== TOP HEADER BAR ===== */}
      {/* ===== TOP HEADER BAR ===== */}
      <header className="app-header">
        {/* Desktop Header Content (>= 768px) */}
        <div className="header-desktop-wrap">
          {/* 1. Pure Vector Brand Block */}
          <div className="header-brand-block" onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-k-logo">
              <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
                <path d="M4 27L8.5 5h5L9 27H4z" fill="#CC1100" />
                <path d="M10 16l8.5-11h6L15.5 16H10z" fill="#CC1100" />
                <path d="M14 14.5l9.5 12.5h-6.2l-6.8-9L14 14.5z" fill="#CC1100" />
              </svg>
            </div>
            <div className="brand-text-col">
              <span className="brand-title">KAZUKO AUTO</span>
              <span className="brand-slogan">Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!</span>
            </div>
          </div>

          {/* 2. Pure Vector S-Wave Banner */}
          <div className="header-wave-banner">
            <svg className="wave-left-svg" viewBox="0 0 48 50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveLeftGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#BA2400" />
                  <stop offset="100%" stopColor="#CC2800" />
                </linearGradient>
              </defs>
              <path d="M 0 0 L 48 0 C 34 0 25 10 20 23 C 14 36 7 46 0 50 Z" fill="#FFFFFF" />
              <path d="M 48 0 C 34 0 25 10 20 23 C 14 36 7 46 0 50 L 48 50 Z" fill="url(#waveLeftGrad)" />
              <path d="M 48 0 C 34 0 25 10 20 23 C 14 36 7 46 0 50" stroke="#F7CEBA" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 48 0 C 35 1 27 11 22 23 C 16 35 9 45 3 49" stroke="#F39E75" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8" />
            </svg>

            <div className="wave-center-content">
              <div className="company-title">CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM</div>
              <div className="company-addr">
                <MapPin size={11} className="header-addr-pin" />
                <span>925/15 Âu Cơ - Tân Sơn Nhì - TP.HCM</span>
              </div>
            </div>

            <svg className="wave-right-svg" viewBox="0 0 48 50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveRightGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F4511E" />
                  <stop offset="100%" stopColor="#FF5722" />
                </linearGradient>
              </defs>
              <path d="M 0 0 L 40 0 C 42 12 36 26 24 36 C 14 44 6 48 0 50 Z" fill="url(#waveRightGrad)" />
              <path d="M 40 0 C 42 12 36 26 24 36 C 14 44 6 48 0 50" stroke="#F7CEBA" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          {/* 3. Middle Speeding Car & Heading Slogan */}
          <div className="header-car-slogan-section">
            <div className="header-speed-car">
              <svg viewBox="0 0 165 42" width="142" height="36" fill="none">
                {/* 5 Motion Speed Trail Lines */}
                <line x1="24" y1="15" x2="56" y2="15" stroke="#D83A00" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="14" y1="19" x2="50" y2="19" stroke="#D83A00" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="2"  y1="23" x2="58" y2="23" stroke="#D83A00" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="16" y1="27" x2="54" y2="27" stroke="#D83A00" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="26" y1="31" x2="60" y2="31" stroke="#D83A00" strokeWidth="1.6" strokeLinecap="round" />

                {/* Car Body Outline */}
                <path 
                  d="M 50 25 C 57 18 71 10.5 92 10 C 110 10 123 15 131 21 C 139 21.5 150 24 154 27.5 C 157 30.5 155 33.5 151 34 C 146 34 144 30.5 137 30.5 C 129 30.5 126 34 120 34 L 78 34 C 74 34 71 30.5 64 30.5 C 56 30.5 53 34 47 34 L 43 33.5 C 41 31 43 27 47 25" 
                  stroke="#D83A00" 
                  strokeWidth="1.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Cabin / Windows */}
                <path 
                  d="M 72 13.5 C 80 11.2 93 11.2 105 12.8 C 114 14.8 121 18.5 125 21.5 L 69 21.5 C 70 17.5 71 15 72 13.5 Z" 
                  stroke="#D83A00" 
                  strokeWidth="1.4" 
                  strokeLinejoin="round" 
                />
                {/* Window B-pillar divider */}
                <line x1="97" y1="12" x2="96" y2="21.5" stroke="#D83A00" strokeWidth="1.4" />

                {/* Wheels */}
                <circle cx="58" cy="30.5" r="5.2" stroke="#D83A00" strokeWidth="1.8" />
                <circle cx="58" cy="30.5" r="2.2" stroke="#D83A00" strokeWidth="1.2" />

                <circle cx="132" cy="30.5" r="5.2" stroke="#D83A00" strokeWidth="1.8" />
                <circle cx="132" cy="30.5" r="2.2" stroke="#D83A00" strokeWidth="1.2" />

                {/* Underbody rocker line */}
                <line x1="68" y1="34" x2="122" y2="34" stroke="#D83A00" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Slogan text */}
            <div className="header-middle-slogan">
              <span className="slogan-line-1">Quản lý chuyên nghiệp</span>
              <span className="slogan-line-2">Vận hành hiệu quả</span>
            </div>

            {/* Chevrons */}
            <div className="header-chevrons">
              <svg viewBox="0 0 34 24" width="28" height="20" fill="none">
                <path d="M 4 4 L 11 12 L 4 20" stroke="#F06A35" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                <path d="M 12 4 L 19 12 L 12 20" stroke="#F06A35" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                <path d="M 20 4 L 27 12 L 20 20" stroke="#F06A35" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Right Info Bar - Sát vào mép sóng banner */}
          <div className="header-info-bar">
            <div className="header-hotline-item">
              <div className="header-icon-circle">
                <Phone size={15} color="white" />
              </div>
              <div className="header-text-group">
                <div className="header-item-title">Hotline</div>
                <div className="header-item-val">
                  <span>0917 66 4444</span>
                  <span className="hotline-secondary"> - 0967 04 1111</span>
                </div>
              </div>
            </div>

            <div className="header-divider" />

            <div className="header-time-item">
              <div className="header-icon-square">
                <Calendar size={15} color="white" />
              </div>
              <div className="header-text-group">
                <div className="header-item-title">{dateStr}</div>
                <div className="header-item-val">{timeStr}</div>
              </div>
            </div>

            <div className="header-divider" />

            <div className="header-user-item" onClick={() => setMenuOpen(!menuOpen)} ref={menuRef}>
              <div className="header-icon-circle">
                <User size={16} color="white" />
              </div>
              <div className="header-text-group">
                <div className="header-user-name">{displayName}</div>
                <div className="header-user-role">{roleName}</div>
              </div>
              <ChevronDown size={14} className="header-chevron" />

              {menuOpen && (
                <div className="header-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{displayName}</div>
                    <div className="dropdown-email">{roleName}</div>
                  </div>
                  <button className="dropdown-item" onClick={() => {}}>👤 Hồ sơ cá nhân</button>
                  <button className="dropdown-item" onClick={() => {}}>🔑 Đổi mật khẩu</button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={logout}>🚪 Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Header (< 768px - Tự động co dãn chuẩn điện thoại) */}
        <div className="header-mobile-wrap">
          <div className="mobile-brand-block" onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
            <div className="mobile-logo-icon">
              <svg viewBox="0 0 36 36" width="24" height="24" fill="none">
                <path d="M4 4h7v13l11-13h9L18.5 17.5 31 32h-9.5l-10.5-13V32H4V4z" fill="#CC1100" />
              </svg>
            </div>
            <div className="mobile-brand-text">
              <span className="mobile-brand-title">KAZUKO AUTO</span>
            </div>
          </div>

          <div className="mobile-header-actions">
            {/* User on mobile */}
            <div className="mobile-user-trigger" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="mobile-user-avatar">
                <User size={15} color="white" />
              </div>
              <span className="mobile-user-name">{displayName}</span>

              {menuOpen && (
                <div className="header-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{displayName}</div>
                    <div className="dropdown-email">{roleName}</div>
                  </div>
                  <button className="dropdown-item" onClick={() => {}}>👤 Hồ sơ cá nhân</button>
                  <button className="dropdown-item" onClick={() => {}}>🔑 Đổi mật khẩu</button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={logout}>🚪 Đăng xuất</button>
                </div>
              )}
            </div>

            {/* Hamburger button on mobile */}
            <button 
              type="button" 
              className="mobile-menu-btn" 
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Mở menu điều hướng"
            >
              <Menu size={22} color="#D43900" />
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* ===== SIDEBAR (Drawer trên mobile, Cột cố định trên desktop) ===== */}
        <aside className={`app-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
          {/* Header trong sidebar trên mobile */}
          <div className="sidebar-mobile-header">
            <div className="sidebar-mobile-title">
              <CarFront size={18} color="#FFD54F" />
              <span>MENU CHỨC NĂNG</span>
            </div>
            <button 
              type="button" 
              className="sidebar-close-btn" 
              onClick={() => setMobileNavOpen(false)}
            >
              <X size={20} color="white" />
            </button>
          </div>

          <nav className="sidebar-nav">
            {visibleNav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="sidebar-icon">{n.icon}</span>
                <span className="sidebar-label">{n.label}</span>
                {n.liveBadge && (workflowBadge > 0 || supplementBadge > 0) && (
                  <span className="sidebar-badges">
                    {workflowBadge > 0 && <span className="sidebar-badge">{workflowBadge}</span>}
                    {supplementBadge > 0 && <span className="sidebar-badge" title="Đề xuất phát sinh chờ khách xác nhận">+{supplementBadge} PS</span>}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-bottom">
            {/* Vector car illustration */}
            <div className="sidebar-car-wrap">
              <svg viewBox="0 0 160 48" width="100%" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M 6 34 C 8 34 13 34 17 33 C 20 30 24 27 29 27 C 35 27 39 30 42 33 L 110 33 C 113 30 117 27 123 27 C 129 27 133 30 136 33 L 152 33 C 155 33 156 31 154 29 C 150 25 143 23 134 22 C 125 21 115 18 105 13 C 94 7 78 7 57 7 C 43 7 34 11 26 16 C 20 20 11 23 7 27 C 5 29 5 32 6 34 Z" 
                  stroke="#FFD54F" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d="M 49 9 L 84 9 C 96 9 104 13 111 20 L 40 20 C 42 15 45 10 49 9 Z" 
                  stroke="#FFD54F" 
                  strokeWidth="1.2" 
                  strokeLinejoin="round"
                />
                <line x1="76" y1="9" x2="74" y2="20" stroke="#FFD54F" strokeWidth="1.2" />
                <circle cx="29" cy="33" r="6.5" stroke="#FFD54F" strokeWidth="1.5" />
                <circle cx="29" cy="33" r="3" stroke="#FFD54F" strokeWidth="1" />
                <circle cx="123" cy="33" r="6.5" stroke="#FFD54F" strokeWidth="1.5" />
                <circle cx="123" cy="33" r="3" stroke="#FFD54F" strokeWidth="1" />
                <path d="M 6 28 L 9 26" stroke="#FFE082" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 152 27 L 148 27" stroke="#FF8A65" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="41" x2="158" y2="41" stroke="rgba(255,213,79,0.3)" strokeWidth="1" strokeDasharray="3 3" />
              </svg>
            </div>

            <div className="sidebar-brand-bottom">
              <div className="brand-name-bottom">KAZUKO AUTO</div>
              <div className="brand-desc-bottom">Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!</div>
            </div>
            <div className="sidebar-contact">
              <div className="sidebar-contact-row">
                <Phone size={12} className="contact-icon" />
                <span>Hotline: <strong>0917 66 4444</strong></span>
              </div>
              <div className="sidebar-contact-row">
                <span className="zalo-badge">Zalo</span>
                <span>Zalo: <strong>0917 66 4444</strong></span>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== KHUNG CHÍNH (BÊN PHẢI SIDEBAR) ===== */}
        <div className="app-main-wrapper">
          <main className="app-content" ref={contentRef}>
            {user.TENANT && <div className={'saas-subscription '+(user.TENANT.readOnly?'expired':'')}><strong>{user.TENANT.name}</strong> · Mã cửa hàng: {user.TENANT.code}{user.TENANT.endsAt && <> · Hạn sử dụng: {new Date(user.TENANT.endsAt).toLocaleDateString('vi-VN')}</>}{user.TENANT.readOnly && <span> · Đã hết hạn, chỉ xem dữ liệu. Liên hệ hỗ trợ để gia hạn.</span>}</div>}
            <Outlet />
          </main>

          {/* ===== FOOTER: Chỉ hiển thị trong khung chính ở phần Tổng quan ===== */}
          {loc.pathname === '/' && (
            <footer className="app-footer">
              <span>KAZUKO AUTO | Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!</span>
              <span>Version 1.0.0 | Đã kết nối: SQL Server</span>
            </footer>
          )}
        </div>
      </div>

      {/* ===== MOBILE BOTTOM DOCK (5 CHỨC NĂNG CHÍNH - GIỐNG MOONPHIM) ===== */}
      <nav className={`mobile-bottom-nav ${bottomNavHidden ? 'nav-hidden' : ''}`}>
        {MOBILE_BOTTOM_NAV.filter((item) => canView(item.code)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `mobile-bottom-item ${isActive ? 'active' : ''}`
            }
          >
            <div className="mobile-bottom-icon-wrap">
              {item.icon}
            </div>
            <span className="mobile-bottom-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
