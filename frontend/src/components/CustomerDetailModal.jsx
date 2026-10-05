import { useEffect, useRef, useState } from 'react';
import { customers } from '../services';
import './CustomerDetailModal.css';

export function customerPhoneUrl(value) {
  const phone = String(value || '').trim().replace(/[\s().-]/g, '');
  return /^\+?\d{3,15}$/.test(phone) ? `tel:${phone}` : null;
}

export default function CustomerDetailModal({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const closeRef = useRef(null);
  useEffect(() => {
    let active = true;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    customers.get(customerId).then(row => { if (active) setCustomer(row); })
      .catch(e => { if (active) setError(e.response?.data?.error || 'Không tải được thông tin khách hàng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; previousFocus?.focus(); };
  }, [customerId]);
  const phoneUrl = customerPhoneUrl(customer?.DIENTHOAI);
  const fields = customer ? [
    ['Mã khách hàng', customer.MAKHACH], ['Nhóm khách hàng', customer.NHOMKH],
    ['Email', customer.EMAIL], ['Địa chỉ', customer.DIACHI],
    ['CCCD / Mã số thuế', customer.MASOTHUE],
    ['Ngày sinh', customer.NGAYSINH ? new Date(customer.NGAYSINH).toLocaleDateString('vi-VN') : null],
  ] : [];
  return <div className="customer-detail-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="customer-detail-dialog" role="dialog" aria-modal="true" aria-label="Chi tiết khách hàng" onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const targets = [...e.currentTarget.querySelectorAll('button, a[href]')];
        const first = targets[0], last = targets[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <header><b>Chi tiết khách hàng</b><button ref={closeRef} type="button" onClick={onClose}>Đóng</button></header>
      <div className="customer-detail-body">
        {loading ? <p>Đang tải thông tin khách hàng…</p> : error ? <p role="alert">{error}</p> : customer && <>
          <h2>{customer.NAME || 'Khách hàng'}</h2>
          <div className="customer-detail-phone"><div><span>Số điện thoại</span><strong>{customer.DIENTHOAI || 'Chưa có số điện thoại'}</strong></div>{phoneUrl && <a href={phoneUrl} className="customer-detail-call">Gọi khách hàng</a>}</div>
          <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>
        </>}
      </div>
    </section>
  </div>;
}
