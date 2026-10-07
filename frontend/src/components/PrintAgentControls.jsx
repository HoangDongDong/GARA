import {useEffect,useState} from 'react';
import api from '../api';
export default function PrintAgentControls({types,onChange}){
 const [config,setConfig]=useState({stations:[],printers:[],routes:[]}),[open,setOpen]=useState(false),[ticket,setTicket]=useState(''),[error,setError]=useState('');
 const admin=Number(JSON.parse(localStorage.getItem('garage_user')||'{}').ISADMIN)===1;
 async function load(){try{const r=await api.get('/print-control/configuration');setConfig(r.data);onChange(r.data);setError('');}catch(e){setError(e.response?.data?.error||e.message);}}
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t);},[]);
 async function save(printer,change){try{await api.put('/print-control/printers/'+printer.ID,{enabled:!!printer.ENABLED,widthMm:printer.WIDTHMM,...change});await load();}catch(e){setError(e.response?.data?.error||e.message);}}
 return <div className="gara-print-note">
  <button onClick={()=>{setOpen(!open);load();}}>Máy in & Agent</button>
  {open&&<div style={{padding:'12px 0'}}>
   {admin&&<><button onClick={async()=>{try{const r=await api.post('/print-control/pairing');setTicket(r.data.ticket);}catch(e){setError(e.response?.data?.error||e.message);}}}>Tạo mã ghép Agent</button> <a href="http://127.0.0.1:3790" target="_blank" rel="noreferrer">Mở Agent trên máy này</a>
    {ticket&&<p>Mã ghép dùng một lần trong 5 phút: <code>{ticket}</code>. Nhập mã này trong Agent trên PC cắm USB. API cục bộ: http://localhost:4000</p>}</>}
   {config.stations.map(s=><p key={s.ID}>{s.NAME}: {s.REVOKED?'Đã thu hồi':s.ONLINE?'Đang kết nối':'Mất kết nối'} {admin&&!s.REVOKED&&<button onClick={async()=>{if(window.confirm('Thu hồi Agent này và hủy các lệnh chưa gửi?')){await api.post('/print-control/stations/'+s.ID+'/revoke');load();}}}>Thu hồi</button>}</p>)}
   {!config.stations.length&&<p>Chưa ghép Agent. Chạy GARA Print Agent trên máy có máy in, sau đó ghép bằng mã Admin cấp.</p>}
   {admin&&config.printers.map(p=><div key={p.ID} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',margin:'8px 0'}}>
    <strong>{p.STATIONNAME} / {p.NAME}</strong>
    <label><input type="checkbox" checked={!!p.ENABLED} onChange={e=>save(p,{enabled:e.target.checked})}/> Bật máy in</label>
    <select aria-label={'Khổ giấy '+p.NAME} value={p.WIDTHMM} onChange={e=>save(p,{widthMm:Number(e.target.value)})}>{[[80,'Bill 80mm'],[58,'Bill 58mm'],[54,'Bill 54mm'],[210,'A4'],[148,'A5'],[0,'Theo khổ PDF / tem']].map(([v,t])=><option value={v} key={v}>{t}</option>)}</select>
    <select aria-label={'Đặt mặc định '+p.NAME} value="" onChange={e=>{if(e.target.value)save(p,{types:[e.target.value]});}}><option value="">Đặt mặc định cho loại bản in…</option>{types.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select>
    <small>{config.routes.filter(r=>r.PRINTERID===p.ID).map(r=>types.find(t=>t.key===r.TYPEKEY)?.label||r.TYPEKEY).join(', ')}</small>
   </div>)}
   {error&&<p role="alert">{error}</p>}
  </div>}
 </div>;
}
