import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #BF360C 0%, #E65100 30%, #F57C00 60%, #FF9800 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Left - Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        color: 'white',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: 2 }}>
            KAZUKO <span style={{ color: '#FFD54F', fontStyle: 'italic' }}>Auto</span>
          </h1>
          <p style={{ fontSize: 16, opacity: 0.9, marginTop: 8, fontWeight: 500 }}>
            Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!
          </p>
          <div style={{ marginTop: 24, padding: '16px 24px', background: 'rgba(255,255,255,.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,.15)' }}>
            <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.8 }}>
              CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM<br/>
              925/15 Âu Cơ - Tân Sơn Nhì - TPHCM<br/>
              📞 Hotline: <strong style={{color:'#FFD54F'}}>0917 66 4444</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 32 }}>
            {[{n:'🔧',t:'Sửa chữa'},{n:'📦',t:'Phụ tùng'},{n:'📊',t:'Báo cáo'},{n:'👥',t:'Khách hàng'}].map((f,i) => (
              <div key={i} style={{ textAlign: 'center', opacity: 0.8 }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{f.n}</div>
                <div style={{ fontSize: 11 }}>{f.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div style={{
        width: 460,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}>
        <div style={{
          width: '100%',
          background: 'white',
          borderRadius: 16,
          padding: 40,
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#212121' }}>Đăng nhập hệ thống</h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#757575' }}>Hệ thống quản lý sửa chữa ô tô - phụ tùng</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#424242', marginBottom: 6 }}>
                👤 Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #E0E0E0', fontSize: 14, outline: 'none', transition: 'border-color .2s' }}
                onFocus={e => e.target.style.borderColor = '#E65100'}
                onBlur={e => e.target.style.borderColor = '#E0E0E0'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#424242', marginBottom: 6 }}>
                🔒 Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #E0E0E0', fontSize: 14, outline: 'none', transition: 'border-color .2s' }}
                onFocus={e => e.target.style.borderColor = '#E65100'}
                onBlur={e => e.target.style.borderColor = '#E0E0E0'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 400, color: '#616161', marginBottom: 0 }}>
                <input type="checkbox" style={{ width: 16, height: 16 }}/>
                Ghi nhớ đăng nhập
              </label>
              <a href="#" style={{ color: '#E65100', fontWeight: 600, fontSize: 13 }}>Quên mật khẩu?</a>
            </div>

            {error && (
              <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #E65100, #F57C00)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all .2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? '⏳ Đang đăng nhập...' : '🔑 Đăng nhập'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#9E9E9E' }}>
            KAZUKO AUTO © 2025 · Version 1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}