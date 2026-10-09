import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { prepareRegistrationLogin } from '../utils/registrationLogin';
import './SaasPages.css';

export default function RegisterPage() {
  const [params,setParams]=useSearchParams();
  const navigate=useNavigate();
  const registeredPassword=useRef('');
  const [info,setInfo]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(null);
  const [form,setForm]=useState({code:'',name:'',owner:'',email:'',phone:'',username:'',password:'',acceptTerms:false});
  const [statusToken,setStatusToken]=useState(params.get('verify') || sessionStorage.getItem('garage_registration_status'));
  const token=statusToken;
  useEffect(()=>{let active=true;api.get('/saas/info').then(r=>{if(active)setInfo(r.data);}).catch(()=>{if(active)setError('Chưa kết nối được máy chủ.');});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(!token || !info?.enabled)return;
    let active=true,timer;
    const poll=async()=>{
      try{const r=await api.post('/saas/status',{token});if(!active)return;setStatus(r.data);if(r.data.state==='active'){if(registeredPassword.current)prepareRegistrationLogin(r.data.code,registeredPassword.current,r.data.username);registeredPassword.current='';sessionStorage.removeItem('garage_registration_status');navigate('/login?store='+encodeURIComponent(r.data.code)+'&username='+encodeURIComponent(r.data.username || ''),{replace:true});return;}if(['provisioning','pending'].includes(r.data.state))timer=setTimeout(poll,5000);}
      catch(e){if(active)setError(e.response?.data?.error || 'Chưa đọc được tiến độ.');}
    };
    if(info.verificationRequired){api.post('/saas/verify',{token}).then(()=>{if(!active)return;sessionStorage.setItem('garage_registration_status',token);setParams({}, {replace:true});poll();}).catch(e=>{if(active)setError(e.response?.data?.error || 'Chưa xác minh được đăng ký.');});}else poll();
    return()=>{active=false;clearTimeout(timer);};
  },[token,info?.enabled,info?.verificationRequired]);
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{const submittedPassword=form.password;const r=await api.post('/saas/register',form);registeredPassword.current=submittedPassword;setMessage(r.data.message);setForm(v=>({...v,password:''}));if(r.data.statusToken){sessionStorage.setItem('garage_registration_status',r.data.statusToken);setStatus({code:r.data.code,username:r.data.username,state:'provisioning'});setStatusToken(r.data.statusToken);}}catch(e){setError(e.response?.data?.error || 'Chưa đăng ký được.');}finally{setBusy(false);}}
  async function resend(){setBusy(true);setError('');try{setMessage((await api.post('/saas/resend',{code:form.code,email:form.email})).data.message);}catch(e){setError(e.response?.data?.error || 'Chưa gửi lại được email.');}finally{setBusy(false);}}
  return <main className="saas-page"><section className="saas-card"><Link to="/login" className="saas-brand">KAZUKO Auto</Link><h1>Đăng ký cửa hàng</h1><p>Mỗi cửa hàng có dữ liệu riêng. Dùng thử {info?.trialDays || 14} ngày, tính từ khi khởi tạo thành công.</p>
    {error && <p role="alert" className="saas-error">{error}</p>}{message && <p role="status" className="saas-notice">{message}</p>}
    {status ? <><h2>{status.state==='active'?'Cửa hàng đã sẵn sàng':status.state==='failed'?'Khởi tạo cần hỗ trợ':'Đang khởi tạo cửa hàng…'}</h2><p>Mã cửa hàng: <strong>{status.code}</strong></p><p>Tên đăng nhập: <strong>{status.username}</strong>.</p>{status.state==='active' && <><p>Tài khoản chủ cửa hàng: <strong>{status.username}</strong>. Dùng mật khẩu đã đăng ký.</p><Link className="saas-button" to={'/login?store='+encodeURIComponent(status.code)+'&username='+encodeURIComponent(status.username || '')} onClick={()=>sessionStorage.removeItem('garage_registration_status')}>Đăng nhập cửa hàng</Link></>}{status.state==='failed'&&<p>Vui lòng liên hệ hỗ trợ và cung cấp mã cửa hàng. Dữ liệu khởi tạo sẽ được kiểm tra.</p>}</>
    : !info ? <p>Đang kiểm tra đăng ký…</p> : !info.registrationOpen ? <p className="saas-notice">Đăng ký dùng thử chưa được mở. Vui lòng liên hệ KAZUKO để tham gia đợt thử nghiệm.</p> : <form onSubmit={submit} className="saas-form">
      {[['name','Tên cửa hàng','text'],['code','Mã định danh cửa hàng','text'],['owner','Tên chủ cửa hàng','text'],['email','Email','email'],['phone','Số điện thoại','tel'],['username','Tên đăng nhập riêng của bạn','text'],['password','Mật khẩu (tối thiểu 10 ký tự)','password']].map(([key,label,type])=><label key={key}>{label}<input required type={type} value={form[key]} minLength={key==='password'?10:key==='code'||key==='username'?3:1} maxLength={key==='password'?128:key==='code'?40:key==='username'?60:key==='email'?255:key==='phone'?30:120} pattern={key==='code'?'[a-z0-9][a-z0-9-]{2,39}':key==='username'?'[a-z0-9][a-z0-9._-]{2,59}':undefined} autoComplete={key==='password'?'new-password':key==='email'?'email':key==='phone'?'tel':key==='username'?'username':'off'} onChange={e=>setForm(v=>({...v,[key]:(key==='code'||key==='username')?e.target.value.toLowerCase():e.target.value}))}/></label>)}
      <label className="saas-check"><input required type="checkbox" checked={form.acceptTerms} onChange={e=>setForm(v=>({...v,acceptTerms:e.target.checked}))}/>{info.termsUrl && info.privacyUrl?<>Tôi đồng ý với <a href={info.termsUrl} target="_blank" rel="noreferrer">điều khoản sử dụng</a> và <a href={info.privacyUrl} target="_blank" rel="noreferrer">chính sách dữ liệu</a>.</>:<>Tôi đồng ý tạo cửa hàng dùng thử và lưu thông tin đăng ký để quản lý tài khoản.</>}</label>
      {!info.verificationRequired && <p>Đăng ký trực tiếp, chưa yêu cầu xác minh email hoặc số điện thoại. Tên đăng nhập, email, số điện thoại và mã cửa hàng phải chưa được đăng ký.</p>}
      <button disabled={busy} className="saas-button">{busy?'Đang xử lý…':'Đăng ký dùng thử'}</button>{info.verificationRequired && <button type="button" disabled={busy || !form.email || !form.code} onClick={resend}>Gửi lại email xác minh</button>}
    </form>}
    <p><Link to="/login">Quay lại đăng nhập</Link></p>{token && <button type="button" onClick={()=>{sessionStorage.removeItem("garage_registration_status");registeredPassword.current='';setStatusToken(null);setStatus(null);setError("");setMessage("");setParams({}, {replace:true});}}>Đăng ký cửa hàng khác</button>}</section></main>;
}
