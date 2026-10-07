import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import DocumentNumberField from './DocumentNumberField';
import './DebtLedger.css';

const money = value => Number(value || 0).toLocaleString('en-US', {maximumFractionDigits:2});
const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export default function DebtLedger({kind, onKindChange, onLoaded, mobileTab}) {
  const [data,setData] = useState({receivable:[],payable:[]});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [group,setGroup] = useState('all');
  const [search,setSearch] = useState('');
  const [showAll,setShowAll] = useState(false);
  const [selected,setSelected] = useState(null);
  const [paymentAmount,setPaymentAmount] = useState('');
  const [editingPaymentAmount,setEditingPaymentAmount] = useState(false);
  const [paymentDate,setPaymentDate] = useState(today);
  const [paymentNote,setPaymentNote] = useState('');
  const [saving,setSaving] = useState(false);
  const [paymentError,setPaymentError] = useState('');
  const [paymentSuccess,setPaymentSuccess] = useState('');
  const [showPayment,setShowPayment] = useState(false);
  const [paymentPartnerId,setPaymentPartnerId] = useState('');
  const [paymentCategoryId,setPaymentCategoryId] = useState('');
  const [transferPayment,setTransferPayment] = useState(false);
  const [paymentAccountId,setPaymentAccountId] = useState('');
  const [paymentOptions,setPaymentOptions] = useState({categories:[],accounts:[]});
  const [optionsLoading,setOptionsLoading] = useState(false);
  const [optionsError,setOptionsError] = useState('');
  const paymentDialog=useRef(null);
  useEffect(()=>{
    if (showPayment && !paymentDialog.current.open) paymentDialog.current.showModal();
  },[showPayment]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/finance/debts/ledger');
      const next = response.data.data;
      setData(next);
      const receivable=next.receivable.filter(row=>row.amount>0),payable=next.payable.filter(row=>row.amount>0);
      onLoaded({receivable,payable,receivableTotal:receivable.reduce((sum,row)=>sum+row.amount,0),payableTotal:payable.reduce((sum,row)=>sum+row.amount,0)});
    } catch (failure) { setError(failure.response?.data?.error || 'Không tải được chi tiết công nợ.'); }
    finally { setLoading(false); }
  },[onLoaded]);
  useEffect(()=>{load();window.addEventListener('focus',load);window.addEventListener('garage-cashbook-changed',load);return ()=>{window.removeEventListener('focus',load);window.removeEventListener('garage-cashbook-changed',load);};},[load]);
  useEffect(()=>{setGroup('all');setSelected(null);},[kind]);
  const partners=data[kind] || [];
  const groups=useMemo(()=>[...new Map(partners.map(row=>[row.groupId,row.groupName])).entries()], [partners]);
  const rows=useMemo(()=>partners.filter(row=>(showAll || row.amount!==0)
    && (group==='all' || row.groupId===group)
    && [row.customer,row.code,row.phone,row.address,row.email].join(' ').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))),[partners,showAll,group,search]);
  const active=rows.find(row=>row.id===selected) || rows[0];
  const total=rows.reduce((sum,row)=>sum+row.amount,0);
  const supplier=kind==='payable';
  const paymentPartner=partners.find(row=>row.id===paymentPartnerId);
  const paymentAccount=paymentOptions.accounts.find(row=>row.ID===paymentAccountId);
  const paymentCategories=paymentOptions.categories.filter(row=>Number(row.LOAI)===(supplier?1:0));
  const loadPaymentOptions=async()=>{
    setOptionsLoading(true);setOptionsError('');
    try {
      const response=await api.get('/finance/payment-options');
      setPaymentOptions(response.data.data);
      const categories=response.data.data.categories.filter(row=>Number(row.LOAI)===(supplier?1:0));
      setPaymentCategoryId(categories.find(row=>row.NAME==='Thanh toán công nợ')?.ID || '');
    } catch(failure){setOptionsError(failure.response?.data?.error || 'Không tải được phân loại và tài khoản.');}
    finally{setOptionsLoading(false);}
  };
  useEffect(()=>{setPaymentAmount('');setPaymentNote('');setPaymentError('');setShowPayment(false);},[active?.id,kind]);
  const canPay=!loading && !error && active && active.id!=='unknown' && active.amount>0;
  const canSubmitPayment=!loading && !error && !optionsLoading && !optionsError && paymentPartner?.amount>0 && paymentCategoryId && (!transferPayment || paymentAccountId);
  const openPayment=()=>{
    setPaymentAmount('');setEditingPaymentAmount(false);setPaymentDate(today());
    setPaymentNote('');setPaymentError('');setPaymentSuccess('');setPaymentPartnerId(active.id);
    setPaymentCategoryId('');setTransferPayment(false);setPaymentAccountId('');setShowPayment(true);
    loadPaymentOptions();
  };
  const submitPayment=async event=>{
    event.preventDefault();
    if (saving || !canSubmitPayment) return;
    const amount=Number(paymentAmount);
    setPaymentError('');setPaymentSuccess('');
    if (!Number.isFinite(amount) || amount<=0 || amount>paymentPartner.amount) {
      setPaymentError('Nhập số tiền lớn hơn 0 và không vượt quá số còn nợ.');return;
    }
    setSaving(true);
    try {
      const response=await api.post('/finance/debts/payments',{kind,partnerId:paymentPartner.id,amount,date:paymentDate,note:paymentNote,categoryId:paymentCategoryId,accountId:transferPayment?paymentAccountId:null});
      setPaymentSuccess(`Đã lưu phiếu ${supplier?'chi':'thu'} ${response.data.data.code}: ${money(amount)} đ — ${paymentPartner.customer}.`);
      setSelected(paymentPartner.id);
      setPaymentAmount('');setPaymentNote('');
      setShowPayment(false);
      await load();
    } catch (failure) {setPaymentError(failure.response?.data?.error || 'Không lưu được thanh toán. Vui lòng kiểm tra lại lịch sử công nợ trước khi thử lại.');}
    finally {setSaving(false);}
  };
  return <section className={`card debt-ledger ${mobileTab!=='debt' ? 'tc-mobile-hidden' : ''}`} aria-label="Chi tiết công nợ">
    <div className="debt-toolbar">
      <strong>Công nợ</strong>
      <button type="button" className={supplier?'':'active'} onClick={()=>onKindChange('receivable')}>Khách hàng / Phải thu</button>
      <button type="button" className={supplier?'active':''} onClick={()=>onKindChange('payable')}>Nhà cung cấp / Phải trả</button>
      <button type="button" onClick={load} disabled={loading}>↻ Tải lại</button>
      <label><input type="checkbox" checked={showAll} onChange={event=>setShowAll(event.target.checked)}/> Hiển thị tất cả</label>
      <input className="debt-search" aria-label="Tìm đối tác công nợ" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Tìm tên, mã, điện thoại..."/>
      <strong className="debt-total">TỔNG: {error?'—':money(total)} đ</strong>
    </div>
    {error && <div className="debt-error" role="alert">{error} <button type="button" onClick={load}>Thử lại</button></div>}
    <div className="debt-layout">
      <aside className="debt-groups">
        <h3>Lọc dữ liệu</h3>
        <button type="button" className={group==='all'?'active':''} onClick={()=>setGroup('all')}>Tất cả</button>
        {groups.map(([id,name])=><button type="button" key={id} className={group===id?'active':''} onClick={()=>setGroup(id)}>{name}</button>)}
      </aside>
      <div className="debt-tables">
        <div className="debt-partners">
          <table>
            <thead><tr><th>STT</th><th>Tên {supplier?'nhà cung cấp':'khách hàng'}</th><th>Mã {supplier?'nhà cung cấp':'khách hàng'}</th><th>Địa chỉ</th><th>Điện thoại</th><th>Email</th><th className="number">Còn nợ</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="empty" role="status">Đang tải công nợ…</td></tr>}
              {!loading && !error && !rows.length && <tr><td colSpan={7} className="empty">Không có đối tác phù hợp.</td></tr>}
              {!loading && !error && rows.map((row,index)=><tr key={row.id} className={active?.id===row.id?'selected':''} onClick={()=>setSelected(row.id)} tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(row.id);}}} aria-selected={active?.id===row.id}>
                <td>{index+1}</td><td>{row.customer}</td><td>{row.code || '—'}</td><td>{row.address}</td><td>{row.phone}</td><td>{row.email}</td><td className="number">{money(row.amount)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="debt-history-heading">Lịch sử công nợ{active ? ` — ${active.customer}` : ''}</div>
        <div className="debt-history">
          <table>
            <thead><tr><th>STT</th><th>Số phiếu</th><th>Ngày</th><th className="number">Tổng cộng</th><th>Diễn giải</th><th className="number">Tiền thanh toán</th><th className="number">Lũy kế</th></tr></thead>
            <tbody>
              {!loading && !error && (active?.history || []).map((row,index)=><tr key={`${row.source}-${row.id}`}>
                <td>{index+1}</td><td>{row.code || '—'}</td><td>{date(row.date)}</td><td className="number">{money(row.total)}</td><td>{row.description}</td><td className="number">{money(row.payment)}</td><td className="number">{money(row.balance)}</td>
              </tr>)}
              {!loading && !error && !active?.history.length && <tr><td colSpan={7} className="empty">{active?'Chưa có giao dịch.':'Chọn một đối tác để xem lịch sử.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="debt-footer">{rows.length} đối tác <span>Còn nợ của đối tác đang chọn: <b>{money(active?.amount)} đ</b></span></div>
        <div className="debt-payment-actions">
          {paymentSuccess && <div className="debt-payment-success" role="status">{paymentSuccess}</div>}
          <button className="debt-open-payment" type="button" disabled={!canPay || saving} onClick={openPayment}>Thanh toán</button>
        </div>
        {showPayment && createPortal(<dialog ref={paymentDialog} className="debt-payment-dialog" aria-labelledby="debt-payment-title" onCancel={event=>{event.preventDefault();if(!saving)setShowPayment(false);}} onClick={event=>{if(event.target===event.currentTarget && !saving)setShowPayment(false);}}>
        <div className="debt-payment-dialog-header"><strong id="debt-payment-title">Thanh toán công nợ</strong><button type="button" aria-label="Đóng form thanh toán" disabled={saving} onClick={()=>setShowPayment(false)}>×</button></div>
        <form className="debt-payment" onSubmit={submitPayment} aria-label="Thanh toán công nợ">
          <div className="debt-payment-heading"><span>{supplier?'Chi trả nhà cung cấp':'Thu tiền khách hàng'}</span></div>
          <div className="debt-payment-balance">Còn nợ: <b>{money(paymentPartner?.amount)} đ</b></div>
          {optionsLoading && <div role="status">Đang tải phân loại và tài khoản…</div>}
          {optionsError && <div className="debt-error" role="alert">{optionsError} <button type="button" onClick={loadPaymentOptions}>Thử lại</button></div>}
          <fieldset disabled={loading || !!error || saving || optionsLoading || !!optionsError}>
            <DocumentNumberField type={supplier?'Chi':'Thu'}/>
            <label>Ngày thanh toán<input type="date" required value={paymentDate} onChange={event=>setPaymentDate(event.target.value)}/></label>
            <label className="debt-payment-wide">Phân loại<select required value={paymentCategoryId} onChange={event=>setPaymentCategoryId(event.target.value)}><option value="">Chọn phân loại</option>{paymentCategories.map(row=><option key={row.ID} value={row.ID}>{row.NAME}</option>)}</select></label>
            <label className="debt-payment-wide">{supplier?'Nhà cung cấp':'Khách hàng'}<select required value={paymentPartnerId} onChange={event=>{setPaymentPartnerId(event.target.value);setPaymentAmount('');setPaymentError('');}}><option value="">Chọn {supplier?'nhà cung cấp':'khách hàng'}</option>{partners.filter(row=>row.id!=='unknown').map(row=><option key={row.id} value={row.id}>{row.customer}{row.code?` — ${row.code}`:''}</option>)}</select></label>
            <label>Số tiền thanh toán (đ)<div className="debt-payment-amount"><input type="text" inputMode="decimal" required value={editingPaymentAmount || !paymentAmount ? paymentAmount : money(paymentAmount)} onFocus={()=>setEditingPaymentAmount(true)} onBlur={()=>setEditingPaymentAmount(false)} onChange={event=>{
              const value=event.target.value.replace(/[,\s]/g,'');
              if (/^\d*(\.\d{0,2})?$/.test(value)) setPaymentAmount(value);
            }} placeholder="Nhập số tiền"/><button type="button" disabled={!paymentPartner || paymentPartner.amount<=0} onClick={()=>setPaymentAmount(String(paymentPartner.amount))}>Toàn bộ</button></div></label>
            <label className="debt-payment-note">{supplier?'Lý do chi':'Lý do thu'}<input maxLength={255} value={paymentNote} onChange={event=>setPaymentNote(event.target.value)} placeholder="Nhập diễn giải thanh toán"/></label>
            <div className="debt-payment-wide"><label className="debt-payment-transfer"><input type="checkbox" checked={transferPayment} onChange={event=>{setTransferPayment(event.target.checked);setPaymentAccountId('');}}/>{supplier?'Chuyển từ tài khoản':'Nhận vào tài khoản'}</label>
              {transferPayment && <><label>Tài khoản<select required value={paymentAccountId} onChange={event=>setPaymentAccountId(event.target.value)}><option value="">Chọn tài khoản</option>{paymentOptions.accounts.map(row=><option key={row.ID} value={row.ID}>{row.NAME} — {row.SOTAIKHOAN} ({money(row.BALANCE)} đ)</option>)}</select></label>
              {!paymentOptions.accounts.length && <p>Chưa có tài khoản ngân hàng. Thêm tài khoản trong Danh mục.</p>}
              {paymentAccount && <div className="debt-account-balance">Số dư tài khoản: <b>{money(paymentAccount.BALANCE)} đ</b><br/>Sau thanh toán: <b>{money(paymentAccount.BALANCE+(supplier?-1:1)*(Number(paymentAmount)||0))} đ</b></div>}</>}
            </div>
          </fieldset>
          {paymentPartner?.amount>0 && <div className="debt-payment-remaining">Còn nợ sau thanh toán: <b>{money(paymentPartner.amount-(Number(paymentAmount)||0))} đ</b></div>}
          {!(paymentPartner?.amount>0) && <div className="debt-payment-remaining">Chọn đối tác có công nợ để thanh toán.</div>}
          {paymentError && <div className="debt-error" role="alert">{paymentError}</div>}
          <div className="debt-payment-dialog-actions"><button type="button" disabled={saving} onClick={()=>setShowPayment(false)}>Hủy</button><button className="debt-payment-submit" type="submit" disabled={!canSubmitPayment || saving}>{saving?'Đang lưu…':supplier?'Lưu thanh toán / Phiếu chi':'Lưu thanh toán / Phiếu thu'}</button></div>
        </form>
        </dialog>,document.body)}
      </div>
    </div>
  </section>;
}
