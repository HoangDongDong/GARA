import { useEffect, useState } from 'react';
import { customers, repairOrders } from '../services';
import { customerPhoneUrl } from './CustomerDetailModal';
import { Phone } from 'lucide-react';
import './RepairSupplements.css';

const labels = { draft: 'Bản nháp', pending: 'Chờ khách xác nhận', approved: 'Đã chấp thuận', partially_approved: 'Chấp thuận một phần', rejected: 'Đã từ chối', cancelled: 'Đã hủy' };
const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';

export default function RepairSupplements({ repairId, state, customerId, catalog = [], onChanged, onClose, allowCreate = true, canEdit = true, selectedSupplementId = null, contextTitle = '' }) {
  const [contact, setContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const phoneUrl = customerPhoneUrl(contact?.DIENTHOAI);
  useEffect(() => {
    let active = true;
    setContact(null); setContactError('');
    setContactLoading(true);
    const loadContact = async () => {
      const id = customerId || (await repairOrders.get(repairId))?.DKHACHHANGID;
      if (!active || !id) return;
      const row = await customers.get(id);
      if (active) setContact(row);
    };
    loadContact()
      .catch(e => { if (active) setContactError(e.response?.data?.error || 'Không tải được thông tin liên hệ.'); })
      .finally(() => { if (active) setContactLoading(false); });
    return () => { active = false; };
  }, [customerId, repairId]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [source, setSource] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState(null);
  const [accepted, setAccepted] = useState([]);
  const [customer, setCustomer] = useState('');
  const [evidence, setEvidence] = useState('');
  const editable = canEdit && Number(state) === 2;
  const visibleRequests = selectedSupplementId ? requests.filter(head => head.ID === selectedSupplementId) : requests;
  const refresh = async () => setRequests(await repairOrders.supplements(repairId));
  useEffect(() => {
    let active = true;
    repairOrders.supplements(repairId).then(rows => { if (active) setRequests(rows); })
      .catch(e => { if (active) setError(e.response?.data?.error || 'Không tải được đề xuất phát sinh.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repairId]);
  const run = async (action) => {
    setBusy(true); setError('');
    try { await action(); window.dispatchEvent(new Event('garage:supplements-changed')); await refresh(); await onChanged(); }
    catch (e) { setError(e.response?.data?.error || e.message || 'Không lưu được phát sinh.'); }
    finally { setBusy(false); }
  };
  const add = () => {
    const entry = catalog.find(it => it.id === source);
    if (entry) { setItems(current => [...current, { ...entry, quantity: 1 }]); setSource(''); }
  };
  const save = (status) => run(async () => {
    await repairOrders.createSupplement(repairId, { LYDO: reason, TRANGTHAI: status, items: items.map(it => ({
      LOAI: it.sourceType, DMATHANGID: it.sourceType === 0 ? it.sourceId : null,
      DDICHVUID: it.sourceType === 1 ? it.sourceId : null, SOLUONG: it.quantity, DONGIA: it.price,
    })) });
    setItems([]); setReason('');
  });
  return <div className="repair-supplement-overlay"><section className="repair-supplement-dialog" role="dialog" aria-modal="true" aria-label="Phát sinh sửa chữa">
    <header><div><b>Đề xuất phát sinh sửa chữa</b>{contextTitle && <div>{contextTitle}</div>}</div><button disabled={busy} onClick={onClose}>Đóng</button></header>
    <div className="repair-supplement-body">
      <p>Hạng mục chưa được khách chấp thuận chưa tính vào tổng tiền và chưa được thực hiện. Khi thay đổi giá hoặc phụ tùng, hãy hủy đề xuất đang chờ và lập báo giá mới.</p>
      {error && <p role="alert" className="repair-supplement-error">{error}</p>}
      {loading ? <p>Đang tải…</p> : <>
        {editable && allowCreate && <fieldset disabled={busy}>
          <legend>Báo giá bổ sung</legend>
          <label>Lý do phát sinh<textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Mô tả vấn đề và lý do cần bổ sung" /></label>
          <div className="repair-supplement-select">
            <input aria-label="Tìm dịch vụ hoặc phụ tùng" placeholder="Tìm dịch vụ / phụ tùng" value={search} onChange={e => setSearch(e.target.value)} />
            <select aria-label="Chọn hạng mục" value={source} onChange={e => setSource(e.target.value)}><option value="">Chọn hạng mục</option>{catalog.filter(it => it.name.toLowerCase().includes(search.toLowerCase())).map(it => <option key={it.id} value={it.id}>{it.sourceType === 0 ? 'Phụ tùng' : 'Dịch vụ'}: {it.name}</option>)}</select>
            <button disabled={!source} onClick={add}>Thêm vào đề xuất</button>
          </div>
          <table><thead><tr><th>Hạng mục</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th /></tr></thead><tbody>{items.map((it, index) => <tr key={index}>
            <td>{it.name}</td><td><input aria-label={`Số lượng ${it.name}`} type="number" min="0.01" step="0.01" value={it.quantity} onChange={e => setItems(current => current.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} /></td>
            <td><input aria-label={`Đơn giá ${it.name}`} type="number" min="0" step="0.01" value={it.price} onChange={e => setItems(current => current.map((row, i) => i === index ? { ...row, price: e.target.value } : row))} /></td>
            <td>{money(it.quantity * it.price)}</td><td><button onClick={() => setItems(current => current.filter((_, i) => i !== index))}>Xóa</button></td>
          </tr>)}</tbody></table>
          <div className="repair-supplement-actions"><b>Tổng phát sinh: {money(items.reduce((sum, it) => sum + it.quantity * it.price, 0))}</b><button disabled={!reason.trim() || !items.length} onClick={() => save('draft')}>Lưu nháp</button><button disabled={!reason.trim() || !items.length} onClick={() => save('pending')}>Lưu báo giá chờ khách xác nhận</button></div>
        </fieldset>}
        <h3>{selectedSupplementId ? 'Chi tiết đề xuất' : `Lịch sử đề xuất (${requests.length})`}</h3>
        {!visibleRequests.length && <p>Chưa có đề xuất phát sinh.</p>}
        {visibleRequests.map(head => <article key={head.ID}>
          <div><b>{labels[head.TRANGTHAI]}</b> · {head.TIMECREATED ? new Date(head.TIMECREATED).toLocaleString('vi-VN') : ''}</div>
          <p>{head.LYDO}</p>
          <table><thead><tr><th>Hạng mục</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Trạng thái</th></tr></thead><tbody>{head.items.map(it => <tr key={it.ID}><td>{it.TEN}</td><td>{it.SOLUONG}</td><td>{money(it.DONGIA)}</td><td>{money(it.THANHTIEN)}</td><td>{head.TRANGTHAI === 'draft' ? 'Bản nháp' : labels[it.TRANGTHAI]}</td></tr>)}</tbody></table>
          <p><b>Tổng báo giá: {money(head.items.reduce((sum, it) => sum + Number(it.THANHTIEN), 0))}</b></p>
          {head.NGUOIXACNHAN && <p>Khách xác nhận: {head.NGUOIXACNHAN} · {new Date(head.NGAYXACNHAN).toLocaleString('vi-VN')}<br />Bằng chứng: {head.BANGCHUNG}</p>}
          {editable && ['draft', 'pending'].includes(head.TRANGTHAI) && <div className="repair-supplement-actions">
            {head.TRANGTHAI === 'draft' && <button disabled={busy} onClick={() => run(() => repairOrders.decideSupplement(repairId, head.ID, { action: 'submit' }))}>Chuyển sang chờ khách xác nhận</button>}
            {head.TRANGTHAI === 'pending' && <button disabled={busy} onClick={() => { setDecision(head); setAccepted(head.items.map(it => it.ID)); setCustomer(''); setEvidence(''); }}>Ghi nhận phản hồi khách</button>}
            <button disabled={busy} onClick={() => run(async () => { await repairOrders.decideSupplement(repairId, head.ID, { action: 'cancel' }); if (decision?.ID === head.ID) setDecision(null); })}>Hủy đề xuất</button>
          </div>}
        </article>)}
        {decision && editable && <fieldset disabled={busy}>
          <legend>Ghi nhận xác nhận của khách</legend>
          <p>Chọn đúng các hạng mục khách đồng ý. Bỏ chọn tất cả nếu khách từ chối toàn bộ.</p>
          {decision.items.map(it => <label className="repair-supplement-check" key={it.ID}><input type="checkbox" checked={accepted.includes(it.ID)} onChange={e => setAccepted(current => e.target.checked ? [...current, it.ID] : current.filter(id => id !== it.ID))} />{it.TEN} · {money(it.THANHTIEN)}</label>)}
          <label>Tên khách xác nhận<input maxLength={200} value={customer} onChange={e => setCustomer(e.target.value)} /></label>
          <label>Bằng chứng / nội dung xác nhận<textarea maxLength={2000} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Ví dụ: xác nhận qua điện thoại lúc…, nội dung khách đồng ý, đường dẫn tin nhắn…" /></label>
          <div className="repair-supplement-actions"><b>Được duyệt: {money(decision.items.filter(it => accepted.includes(it.ID)).reduce((sum, it) => sum + Number(it.THANHTIEN), 0))}</b><button onClick={() => setDecision(null)}>Đóng phản hồi</button><button disabled={!customer.trim() || !evidence.trim()} onClick={() => run(async () => {
            await repairOrders.decideSupplement(repairId, decision.ID, { action: 'decide', NGUOIXACNHAN: customer, BANGCHUNG: evidence, approvedItemIds: accepted }); setDecision(null);
          })}>{accepted.length ? 'Lưu chấp thuận và bổ sung vào phiếu' : 'Lưu khách từ chối'}</button></div>
        </fieldset>}
      </>}
    </div>
    <footer className="repair-supplement-contact">
      <div className="repair-supplement-contact-name"><b>{contact?.NAME || (contactLoading ? 'Đang tải khách hàng…' : 'Khách hàng')}</b><span>{contactLoading ? 'Đang tải số điện thoại…' : contactError || contact?.DIENTHOAI || 'Chưa có số điện thoại'}</span></div>
      {phoneUrl ? <a className="repair-supplement-call" href={phoneUrl} aria-label="Gọi khách hàng" title={`Gọi ${contact.NAME || 'khách hàng'}: ${contact.DIENTHOAI}`}><Phone size={24} fill="currentColor" aria-hidden="true" /></a> : <button className="repair-supplement-call" type="button" disabled aria-label="Gọi khách hàng" title={contactLoading ? 'Đang tải số điện thoại' : 'Chưa có số điện thoại hợp lệ'}><Phone size={24} fill="currentColor" aria-hidden="true" /></button>}
    </footer>
  </section></div>;
}
