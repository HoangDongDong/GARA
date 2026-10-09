import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../services';

export default function AccessSession({ children }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const token = localStorage.getItem('garage_token');
  useEffect(() => {
    if (!token) return;
    let active = true, pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const user = await auth.me();
        if (!active || localStorage.getItem('garage_token') !== token) return;
        const old = localStorage.getItem('garage_user');
        const next = JSON.stringify({ ...JSON.parse(old || '{}'), ...user });
        localStorage.setItem('garage_user', next);
        if (next !== old) window.dispatchEvent(new Event('garage:permissions-changed'));
        setError(''); setReady(true);
      } catch (exception) {
        if (active) setError(exception.response?.data?.error || 'Chưa xác minh được quyền truy cập. Vui lòng thử lại.');
      } finally { pending = false; }
    };
    refresh();
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    const interval = window.setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', focus); };
  }, [token, retry]);
  if (!token) return <Navigate to="/login" replace />;
  if (error) return <div role="alert" style={{ padding: 24 }}>{error} <button onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>;
  return ready ? children : <div role="status" style={{ padding: 24 }}>Đang xác minh quyền truy cập…</div>;
}
