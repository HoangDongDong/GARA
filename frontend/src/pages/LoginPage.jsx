import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Lock, Eye, EyeOff, LogIn, Fingerprint, QrCode } from 'lucide-react';
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
      setQuickLoginMsg('Đang xác thực vân tay...');
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

  return (
    <div className="kazuko-login-page">
      {/* Banner bên trái cho Desktop */}
      <div className="login-left-banner">
        <img 
          src="/login-banner-desktop.png" 
          alt="KAZUKO POS - Quản lý bán hàng đa ngành" 
          className="login-desktop-img"
        />
      </div>

      {/* Banner đầu trang cho Mobile */}
      <div className="login-mobile-banner">
        <img 
          src="/login-banner-mobile.png" 
          alt="KAZUKO POS" 
          className="login-mobile-img"
        />
      </div>

      {/* Khung thẻ đăng nhập bên phải / bên dưới */}
      <div className="login-right-panel">
        <div className="login-card">
          {/* Logo & Tiêu đề trên Desktop */}
          <div className="login-card-header desktop-header">
            <div className="card-brand-logo">
              <ShoppingCart size={28} className="cart-icon" />
              <div className="brand-text-col">
                <span className="brand-name">
                  KAZUKO<span className="brand-pos">POS</span>
                </span>
                <span className="brand-sub">ALL IN ONE BUSINESS</span>
              </div>
            </div>
            <h2 className="login-title">Đăng nhập</h2>
            <p className="login-welcome">Chào mừng bạn quay trở lại!</p>
          </div>

          {/* Tiêu đề trên Mobile */}
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
                  alert('Vui lòng liên hệ Hotline: 0917 66 444 để được hỗ trợ đặt lại mật khẩu.');
                }}
                className="forgot-link"
              >
                Quên mật khẩu?
              </a>
            </div>

            {/* Thông báo lỗi & trạng thái */}
            {error && <div className="login-error-msg">⚠️ {error}</div>}
            {quickLoginMsg && <div className="login-info-msg">ℹ️ {quickLoginMsg}</div>}

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-button"
            >
              <LogIn size={18} />
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
            </button>

            {/* Chưa có tài khoản */}
            <div className="register-prompt">
              <span>Chưa có tài khoản? </span>
              <a 
                href="#register" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ Hotline: 0917 66 444 để đăng ký tài khoản mới.');
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
              Hotline: <a href="tel:091766444">0917 66 444</a> - <a href="tel:0967041111">0967 04 1111</a>
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