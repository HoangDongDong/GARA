import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, Wrench, ShoppingCart, Boxes, ShieldCheck, 
  BarChart3, User, Lock, Eye, EyeOff, LogIn, 
  Fingerprint, QrCode 
} from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoginMsg, setQuickLoginMsg] = useState('');
  const nav = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if ((username === 'admin' && password === 'admin') || username) {
        localStorage.setItem('garage_user', JSON.stringify({
          USERNAME: username || 'admin',
          TEN_HIEN_THI: username === 'admin' ? 'Admin' : username,
        }));
        nav('/');
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      }
      setLoading(false);
    }, 400);
  };

  const handleQuickLogin = (type) => {
    if (type === 'windows') {
      setUsername('Admin');
      setPassword('admin');
      setQuickLoginMsg('Đã xác thực tài khoản Windows thành công!');
      setTimeout(() => {
        localStorage.setItem('garage_user', JSON.stringify({
          USERNAME: 'Admin',
          TEN_HIEN_THI: 'Admin (Windows)',
        }));
        nav('/');
      }, 500);
    } else if (type === 'fingerprint') {
      setQuickLoginMsg('Đang xác thực vân tay bảo mật...');
      setTimeout(() => {
        localStorage.setItem('garage_user', JSON.stringify({
          USERNAME: 'Admin',
          TEN_HIEN_THI: 'Admin (Vân tay)',
        }));
        nav('/');
      }, 600);
    } else if (type === 'qr') {
      setQuickLoginMsg('Mở ứng dụng Kazuko trên điện thoại và quét mã QR');
    }
  };

  // Danh mục 6 tính năng cốt lõi của Gara ô tô theo bố cục mockup
  const garageFeatures = [
    {
      title: 'Sửa chữa & Dịch vụ',
      desc: 'Lệnh sửa chữa, báo giá, tiến độ',
      icon: <Wrench size={22} color="#E65100" />,
      bg: '#FFF3E0'
    },
    {
      title: 'Bán hàng & POS',
      desc: 'Phụ tùng, vật tư, thanh toán nhanh',
      icon: <ShoppingCart size={22} color="#16A34A" />,
      bg: '#DCFCE7'
    },
    {
      title: 'Kho phụ tùng',
      desc: 'Nhập xuất tồn, quét mã vạch',
      icon: <Boxes size={22} color="#D97706" />,
      bg: '#FEF3C7'
    },
    {
      title: 'Hồ sơ xe & Lịch sử',
      desc: 'Nhận diện biển số OCR, tra cứu xe',
      icon: <Car size={22} color="#2563EB" />,
      bg: '#DBEAFE'
    },
    {
      title: 'Bảo hành & Chăm sóc',
      desc: 'Nhắc bảo dưỡng định kỳ, CSKH',
      icon: <ShieldCheck size={22} color="#E11D48" />,
      bg: '#FFE4E6'
    },
    {
      title: 'Báo cáo & Thu chi',
      desc: 'Doanh thu, lãi lỗ, công nợ chi tiết',
      icon: <BarChart3 size={22} color="#9333EA" />,
      bg: '#F3E8FF'
    }
  ];

  return (
    <div className="kazuko-login-page">
      {/* CỘT TRÁI (DESKTOP): BẢNG GIỚI THIỆU THƯƠNG HIỆU & TÍNH NĂNG GARA */}
      <div className="login-left-banner">
        <div className="banner-glass-container">
          {/* Logo & Slogan Header */}
          <div className="banner-header">
            <div className="brand-logo-badge">
              <div className="car-badge-icon">
                <Car size={30} color="#E65100" />
              </div>
              <div className="brand-badge-text">
                <span className="brand-main">KAZUKO <span className="brand-accent">Auto</span></span>
                <span className="brand-sub">ALL IN ONE GARAGE SYSTEM</span>
              </div>
            </div>
            <h1 className="banner-main-title">Quản lý gara ô tô chuyên nghiệp</h1>
            <p className="banner-sub-title">Một phần mềm — Vận hành trọn vẹn xưởng dịch vụ</p>
          </div>

          {/* Lưới 6 tính năng theo đúng bố cục mockup */}
          <div className="banner-features-grid">
            {garageFeatures.map((item, idx) => (
              <div key={idx} className="feature-tile-card">
                <div className="feature-icon-box" style={{ background: item.bg }}>
                  {item.icon}
                </div>
                <div className="feature-text-box">
                  <div className="feature-title">{item.title}</div>
                  <div className="feature-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer thông điệp giải pháp ở dưới cột trái */}
          <div className="banner-bottom-slogan">
            <div className="slogan-script">Giải pháp quản lý toàn diện</div>
            <div className="slogan-caps">HIỆU QUẢ HƠN • ĐƠN GIẢN HƠN • PHÁT TRIỂN BỀN VỮNG</div>
          </div>
        </div>
      </div>

      {/* BANNER ĐẦU TRANG CHO MOBILE (THEO BỐ CỤC MOBILE MOCKUP) */}
      <div className="login-mobile-banner">
        <div className="mobile-banner-glass">
          <div className="mobile-brand-row">
            <Car size={26} color="#E65100" />
            <span className="mobile-brand-title">KAZUKO <span className="brand-accent">Auto</span></span>
          </div>
          <div className="mobile-sub-title">HỆ THỐNG QUẢN LÝ GARA Ô TÔ</div>
          <div className="mobile-script">Garage & Auto Care</div>

          {/* 4 Icon hình tròn theo mockup mobile */}
          <div className="mobile-quick-features">
            <div className="mobile-feature-item">
              <div className="circle-icon" style={{ background: '#FFF3E0' }}>
                <Wrench size={18} color="#E65100" />
              </div>
              <span>Sửa chữa</span>
            </div>
            <div className="mobile-feature-item">
              <div className="circle-icon" style={{ background: '#DCFCE7' }}>
                <ShoppingCart size={18} color="#16A34A" />
              </div>
              <span>Bán hàng</span>
            </div>
            <div className="mobile-feature-item">
              <div className="circle-icon" style={{ background: '#FEF3C7' }}>
                <Boxes size={18} color="#D97706" />
              </div>
              <span>Kho phụ tùng</span>
            </div>
            <div className="mobile-feature-item">
              <div className="circle-icon" style={{ background: '#DBEAFE' }}>
                <Car size={18} color="#2563EB" />
              </div>
              <span>Hồ sơ xe</span>
            </div>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI (DESKTOP) / KHỐI DƯỚI (MOBILE): FORM ĐĂNG NHẬP */}
      <div className="login-right-panel">
        <div className="login-card">
          {/* Header thẻ đăng nhập trên Desktop */}
          <div className="login-card-header desktop-header">
            <div className="card-brand-logo">
              <div className="card-car-icon">
                <Car size={24} color="#E65100" />
              </div>
              <div className="brand-text-col">
                <span className="brand-name">
                  KAZUKO <span className="brand-pos">Auto</span>
                </span>
                <span className="brand-sub">ALL IN ONE GARAGE SYSTEM</span>
              </div>
            </div>
            <h2 className="login-title">Đăng nhập</h2>
            <p className="login-welcome">Chào mừng bạn quay trở lại!</p>
          </div>

          {/* Header thẻ đăng nhập trên Mobile */}
          <div className="login-card-header mobile-header">
            <h2 className="login-title-mobile">
              <span className="title-dot">•</span> Đăng nhập <span className="title-dot">•</span>
            </h2>
            <p className="login-welcome">Chào mừng bạn quay trở lại!</p>
          </div>

          {/* Form đăng nhập */}
          <form onSubmit={handleLogin} className="login-form">
            {/* Input Tên đăng nhập */}
            <div className="login-input-field">
              <User size={18} className="field-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                required
                className="field-input"
              />
            </div>

            {/* Input Mật khẩu */}
            <div className="login-input-field">
              <Lock size={18} className="field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                required
                className="field-input"
              />
              <button
                type="button"
                className="toggle-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Tùy chọn: Ghi nhớ & Quên mật khẩu */}
            <div className="login-options-row">
              <label className="remember-box">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ mật khẩu</span>
              </label>
              <a 
                href="#forgot" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ Hotline: 0917 66 4444 để được hỗ trợ cấp lại mật khẩu.');
                }}
                className="forgot-link"
              >
                Quên mật khẩu?
              </a>
            </div>

            {/* Thông báo lỗi & trạng thái */}
            {error && <div className="login-error-msg">⚠️ {error}</div>}
            {quickLoginMsg && <div className="login-info-msg">ℹ️ {quickLoginMsg}</div>}

            {/* Nút Đăng nhập cam gradient */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-button"
            >
              <LogIn size={18} />
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
            </button>

            {/* Đăng ký */}
            <div className="register-prompt">
              <span>Chưa có tài khoản? </span>
              <a 
                href="#register" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ Hotline: 0917 66 4444 để đăng ký tài khoản mới cho xưởng.');
                }}
                className="register-link"
              >
                Đăng ký
              </a>
            </div>

            {/* Hoặc đăng nhập nhanh (Desktop) */}
            <div className="quick-login-section">
              <div className="quick-login-divider">
                <span>Hoặc đăng nhập nhanh</span>
              </div>
              <div className="quick-login-buttons">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('windows')}
                  className="quick-btn"
                  title="Đăng nhập Windows"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0078D4">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.902-1.799"/>
                  </svg>
                  <span>Windows</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('fingerprint')}
                  className="quick-btn"
                  title="Đăng nhập Vân tay"
                >
                  <Fingerprint size={18} color="#059669" />
                  <span>Vân tay</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('qr')}
                  className="quick-btn"
                  title="Đăng nhập Quét mã QR"
                >
                  <QrCode size={18} color="#4F46E5" />
                  <span>Quét mã QR</span>
                </button>
              </div>
            </div>
          </form>

          {/* Footer thông tin công ty */}
          <div className="login-company-footer">
            <div className="company-name">PHẦN MỀM ĐƯỢC PHÁT TRIỂN BỞI CTY KAZUKO VIỆT NAM</div>
            <div className="company-contact">
              Hotline: <a href="tel:0917664444">0917 66 4444</a> - <a href="tel:0967041111">0967 04 1111</a>
            </div>
            <div className="company-contact">
              Website: <a href="https://kazukovietnam.com" target="_blank" rel="noreferrer">kazukovietnam.com</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}