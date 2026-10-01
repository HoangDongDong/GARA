import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    }, 500);
  };

  return (
    <div className="login-page-container">
      {/* Left - Branding */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-car-icon">🚗</div>
          <h1 className="branding-title">
            KAZUKO <span className="branding-title-sub">Auto</span>
          </h1>
          <p className="branding-slogan">
            Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!
          </p>

          <div className="branding-info-box">
            <p style={{ margin: 0 }}>
              CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM<br/>
              925/15 Âu Cơ - Tân Sơn Nhì - TPHCM<br/>
              📞 Hotline: <strong style={{ color: '#FFD54F' }}>0917 66 4444</strong>
            </p>
          </div>

          <div className="branding-features">
            {[
              { n: '🔧', t: 'Sửa chữa' },
              { n: '📦', t: 'Phụ tùng' },
              { n: '📊', t: 'Báo cáo' },
              { n: '👥', t: 'Khách hàng' }
            ].map((f, i) => (
              <div key={i} className="branding-feature-item">
                <div className="branding-feature-icon">{f.n}</div>
                <div className="branding-feature-label">{f.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="login-card-header">
            <div className="lock-icon">🔐</div>
            <h2>Đăng nhập hệ thống</h2>
            <p>Hệ thống quản lý sửa chữa ô tô - phụ tùng</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <label>👤 Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="login-input"
                required
              />
            </div>

            <div className="login-input-group">
              <label>🔒 Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="login-input"
                required
              />
            </div>

            <div className="login-row-options">
              <label className="login-remember">
                <input type="checkbox" style={{ width: 16, height: 16 }} />
                Ghi nhớ đăng nhập
              </label>
              <a href="#" className="login-forgot">Quên mật khẩu?</a>
            </div>

            {error && (
              <div className="login-error-alert">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? '⏳ Đang đăng nhập...' : '🔑 Đăng nhập'}
            </button>
          </form>

          <div className="login-card-footer">
            KAZUKO AUTO © 2025 · Version 1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}