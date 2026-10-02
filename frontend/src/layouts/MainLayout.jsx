import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './MainLayout.css';
import { workflow } from '../services';

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
  Menu,
  X,
  ClipboardCheck
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
  { to: '/bao-hanh',       code: 'WARRANTY', icon: <ShieldCheck size={18} />, label: 'Bảo hành' },
  { to: '/thu-chi',        code: 'FINANCE', icon: <CircleDollarSign size={18} />, label: 'Thu - Chi / Công nợ' },
  { to: '/nhan-vien',      code: 'EMPLOYEES', icon: <UserCog size={18} />, label: 'Nhân viên &\nKỹ thuật viên' },
  { to: '/bao-cao',        code: 'REPORTS', icon: <LineChart size={18} />, label: 'Báo cáo' },
  { to: '/quan-tri',       code: 'ADMIN', icon: <Shield size={18} />, label: 'Quản trị - Phân quyền' },
  { to: '/cau-hinh',       code: 'SETTINGS', icon: <Settings size={18} />, label: 'Cấu hình' },
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
  const visibleNav = NAV.filter((item) => canView(item.code));
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const menuRef = useRef(null);
  const contentRef = useRef(null);

  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [workflowBadge, setWorkflowBadge] = useState(0);

  useEffect(() => {
    if (!canView('REPAIR')) return;
    workflow.list().then((rows) => setWorkflowBadge((Array.isArray(rows) ? rows : []).filter((row) => Number(row.TRANGTHAI) < 4).length)).catch(() => setWorkflowBadge(0));
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

  const logout = () => {
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
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2">
                <rect x="2" y="7" width="20" height="10" rx="2"/>
                <path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2"/>
                <line x1="12" y1="11" x2="12" y2="13"/>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-name">KAZUKO <strong>Auto</strong></span>
              <span className="logo-sub">Auto</span>
            </div>
          </div>
          <div className="header-slogan">
            <span className="slogan-main">Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!</span>
            <span className="slogan-company">CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM</span>
            <span className="slogan-address">925/15 Âu Cơ - Tân Sơn Nhì - TPHCM</span>
          </div>
        </div>
        <div className="header-center">
          <div className="header-garage-name">
            <span className="garage-icon"><CarFront size={20} color="#E65100" /></span>
            <div>
              <div className="garage-title">KAZUKO AUTO</div>
              <div className="garage-desc">Hệ thống quản lý sửa chữa ô tô - phụ tùng</div>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-datetime">
            <div className="header-date">{dateStr}</div>
            <div className="header-time">{timeStr}</div>
          </div>
          <div className="header-user" onClick={() => setMenuOpen(!menuOpen)} ref={menuRef}>
            <div className="user-avatar">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
              </svg>
            </div>
            <div className="user-info-header">
              <div className="user-name">{displayName}</div>
              <div className="user-role">{roleName}</div>
            </div>

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

          {/* Nút Hamburger menu - vị trí góc phải trên mobile giống moonphim */}
          <button 
            type="button" 
            className="mobile-menu-btn" 
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Mở danh mục menu"
          >
            <Menu size={22} color="white" />
          </button>
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
                {n.liveBadge && workflowBadge > 0 && <span className="sidebar-badge">{workflowBadge}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-brand-bottom">
              <div className="brand-logo-bottom">K</div>
              <div>
                <div className="brand-name-bottom">KAZUKO AUTO</div>
                <div className="brand-desc-bottom">Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!</div>
              </div>
            </div>
            <div className="sidebar-contact">
              <div>📞 Hotline: <strong>0917 66 4444</strong></div>
              <div>🔧 Hỗ trợ kỹ thuật: <strong>0917 66 4444</strong></div>
            </div>
          </div>
        </aside>

        {/* ===== KHUNG CHÍNH (BÊN PHẢI SIDEBAR) ===== */}
        <div className="app-main-wrapper">
          <main className="app-content" ref={contentRef}>
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
