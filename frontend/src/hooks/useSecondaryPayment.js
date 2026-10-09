import { useEffect, useRef, useState } from 'react';
import api from '../api';
function createSession() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export default function useSecondaryPayment(open, order) {
  const session = useRef(null);
  if (!session.current) session.current = createSession();
  const queue = useRef(Promise.resolve());
  const saved = useRef(false);
  const snapshot = useRef(order);
  snapshot.current = order;
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const active = open && visible;
  const send = payload => {
    const task = queue.current.catch(()=>{}).then(()=>api.put('/secondary-payment', { session: session.current, ...payload }));
    queue.current = task;
    task.then(()=>setError('')).catch(()=>setError('Chưa đồng bộ được màn hình khách. Kiểm tra kết nối; thanh toán vẫn có thể tiếp tục.'));
    return task;
  };
  useEffect(() => {
    if (!active) return;
    saved.current = false;
    const push = () => { if (!saved.current) send({ state:'pending', order:snapshot.current }); };
    push(); const timer = setInterval(push,10000);
    return () => { clearInterval(timer); if (!saved.current) send({ state:'clear' }); };
  }, [active]);
  const json = JSON.stringify(order);
  useEffect(() => { if (!active || saved.current) return; const timer=setTimeout(()=>send({state:'pending',order:snapshot.current}),300); return()=>clearTimeout(timer); },[active,json]);
  return { error, completed: saleId => { saved.current=true; return send({ state:'saved', saleId }); } };
}
