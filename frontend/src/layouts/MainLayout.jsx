import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './MainLayout.css';

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
  X
} from 'lucide-react';

const NAV = [
  { to: '/',                icon: <Home size={18} />, label: 'Tổng quan' },
  // Tạm thời ẩn theo yêu cầu:
  // { to: '/tiep-nhan',      icon: <CarFront size={18} />, label: 'Tiếp nhận xe' },
  { to: '/sua-chua',       icon: <Wrench size={18} />, label: 'Sửa chữa - Dịch vụ' },
  { to: '/ban-hang',       icon: <ShoppingCart size={18} />, label: 'Bán hàng (POS)' },
  // Tạm thời ẩn theo yêu cầu:
  // { to: '/mua-linh-kien',  icon: <Package size={18} />, label: 'Mua linh kiện &\nKho phụ tùng' },
  { to: '/nhap-kho',       icon: <Truck size={18} />, label: 'Nhập kho' },
  { to: '/nha-cung-cap',   icon: <Contact size={18} />, label: 'Nhà cung cấp' },
  { to: '/khach-hang',     icon: <Users size={18} />, label: 'Khách hàng' },
  { to: '/ho-so-xe',       icon: <FileText size={18} />, label: 'Hồ sơ xe & Lịch sử' },
  { to: '/bao-hanh',       icon: <ShieldCheck size={18} />, label: 'Bảo hành' },
  { to: '/thu-chi',        icon: <CircleDollarSign size={18} />, label: 'Thu - Chi / Công nợ' },
  { to: '/nhan-vien',      icon: <UserCog size={18} />, label: 'Nhân viên &\nKỹ thuật viên' },
  { to: '/bao-cao',        icon: <LineChart size={18} />, label: 'Báo cáo' },
  { to: '/quan-tri',       icon: <Shield size={18} />, label: 'Quản trị - Phân quyền' },
  { to: '/cau-hinh',       icon: <Settings size={18} />, label: 'Cấu hình' },
];

const MOBILE_BOTTOM_NAV = [
  { to: '/sua-chua', icon: <Wrench size={20} />, label: 'Sửa chữa' },
  { to: '/ban-hang', icon: <ShoppingCart size={20} />, label: 'Bán hàng' },
  { to: '/',         icon: <Home size={20} />,         label: 'Trang chủ' },
  { to: '/ho-so-xe', icon: <CarFront size={20} />,     label: 'Hồ sơ xe' },
  { to: '/bao-hanh', icon: <ShieldCheck size={20} />,  label: 'Bảo hành' },
];

export default function MainLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = JSON.parse(localStorage.getItem('garage_user') || '{}');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const menuRef = useRef(null);
  const contentRef = useRef(null);

  const isSuaChua = loc.pathname === '/sua-chua' || loc.pathname.startsWith('/sua-chua');
  const [bottomNavHidden, setBottomNavHidden] = useState(false);

  // Riêng trang Sửa chữa: Cuộn trang xem bên dưới thì ẩn thanh điều khiển, cuộn ngược lên thì hiện lại
  useEffect(() => {
    if (!isSuaChua) {
      setBottomNavHidden(false);
      return;
    }

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

    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [isSuaChua, loc.pathname]);

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
    nav('/login');
  };

  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayStr = days[now.getDay()];
  const dateStr = `${dayStr}, ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const displayName = user.TEN_HIEN_THI || user.USERNAME || 'admin';

  return (
    <div className={`app-layout ${isSuaChua && bottomNavHidden ? 'mobile-nav-hidden' : ''}`}>
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
              <div className="user-role">Quản trị hệ thống</div>
            </div>

            {menuOpen && (
              <div className="header-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-name">{displayName}</div>
                  <div className="dropdown-email">Quản trị hệ thống</div>
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
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => 'sidebar-item' + (isActive ? ' active' : '')}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="sidebar-icon">{n.icon}</span>
                <span className="sidebar-label">{n.label}</span>
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
      <nav className={`mobile-bottom-nav ${isSuaChua && bottomNavHidden ? 'nav-hidden' : ''}`}>
        {MOBILE_BOTTOM_NAV.map((item) => (
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