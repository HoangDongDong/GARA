import { useEffect, useState } from 'react';
import api from '../api';
import { can } from '../utils/permissions';
import { openDocumentPrint } from '../components/DocumentPrintDialog';
const day=value=>String(value||'').slice(0,10);
const status=row=>day(row.NGAYKETTHUC)<day(new Date().toISOString())?'Hết hạn':'Còn hạn';
const today=()=>new Date().toISOString().slice(0,10);
const empty=()=>({DXEID:'',NGAYBATDAU:today(),NGAYKETTHUC:today(),NOTE:'',TRANGTHAI:1,KETQUAXULY:'',CHIPHI:0});
export default function BaoHanhPage(){
  const [rows,setRows]=useState([]),[vehicles,setVehicles]=useState([]),[search,setSearch]=useState(''),[selected,setSelected]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[form,setForm]=useState(null),[editing,setEditing]=useState(null),[saving,setSaving]=useState(false);
  const load=async()=>{setBusy(true);setError('');try{const r=await api.get('/vehicles/warranties');setRows(r.data.data||[]);}catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy(false);}};
  useEffect(()=>{load();},[]);
  const filtered=rows.filter(row=>[row.NAME,row.BIENSO,row.TEN_KH].some(value=>String(value||'').toLowerCase().includes(search.toLowerCase())));
  const active=rows.find(row=>row.ID===selected)||filtered[0];
  const open=async(row=null)=>{if(!can('WARRANTY',row?4:2))return;setEditing(row?.ID||null);setForm(row?{...row,NGAYBATDAU:day(row.NGAYBATDAU),NGAYKETTHUC:day(row.NGAYKETTHUC)}:empty());setError('');try{if(!row){const r=await api.get('/vehicles');setVehicles(r.data.data||[]);}}catch(e){setError(e.response?.data?.error||e.message);}};
  const save=async event=>{event.preventDefault();if(saving)return;setSaving(true);setError('');try{const payload={...form,CHIPHI:Number(form.CHIPHI||0)};if(editing)await api.put('/vehicles/warranties/'+editing,payload);else await api.post('/vehicles/warranties',payload);setForm(null);await load();}catch(e){setError(e.response?.data?.error||e.message);}finally{setSaving(false);}};
  const exportCsv=()=>{
    if(!can('EXPORT'))return;
    const cell=value=>'"'+String(value??'').replace(/"/g,'""').replace(/^[=+@-]/,"'")+'"';
    const data=[['Mã bảo hành','Biển số','Khách hàng','Từ ngày','Đến ngày','Nội dung','Kết quả'],...filtered.map(row=>[row.NAME,row.BIENSO,row.TEN_KH,day(row.NGAYBATDAU),day(row.NGAYKETTHUC),row.NOTE,row.KETQUAXULY])].map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+data],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='bao-hanh.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="dashboard" style={{padding:16}}>
    <div className="page-header"><h1>Bảo hành</h1><div className="page-actions"><button className="btn" onClick={load} disabled={busy}>Tải lại</button><button className="btn" disabled={!can('EXPORT')||!filtered.length} onClick={exportCsv}>Xuất CSV</button><button className="btn" disabled={!can('WARRANTY',2)} onClick={()=>open()}>Tạo phiếu bảo hành</button></div></div>
    {error&&<div role="alert" style={{color:'#b91c1c',padding:12}}>{error}</div>}
    <input aria-label="Tìm bảo hành" placeholder="Mã bảo hành, biển số, khách hàng…" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:10,width:'min(500px,100%)',marginBottom:12}}/>
    {busy?<p>Đang tải bảo hành…</p>:<div className="card"><div className="table-responsive"><table className="table"><thead><tr><th>Mã bảo hành</th><th>Biển số</th><th>Khách hàng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thời hạn</th></tr></thead><tbody>{filtered.map(row=><tr key={row.ID} onClick={()=>setSelected(row.ID)} style={{cursor:'pointer',background:active?.ID===row.ID?'#fff7ed':undefined}}><td>{row.NAME}</td><td>{row.BIENSO}</td><td>{row.TEN_KH}</td><td>{day(row.NGAYBATDAU)}</td><td>{day(row.NGAYKETTHUC)}</td><td>{status(row)}</td></tr>)}</tbody></table>{!filtered.length&&<p style={{padding:16}}>{error?'Chưa tải được dữ liệu.':'Chưa có phiếu bảo hành phù hợp.'}</p>}</div></div>}
    {active&&<div className="card" style={{padding:16,marginTop:12}}><h3>{active.NAME} — {active.BIENSO}</h3><p>{active.NOTE||'Chưa có nội dung bảo hành.'}</p><p>Kết quả xử lý: {active.KETQUAXULY||'Chưa ghi nhận'}</p><p>Chi phí: {Number(active.CHIPHI||0).toLocaleString('vi-VN')} đ</p><button className="btn" disabled={!can('WARRANTY',4)} onClick={()=>open(active)}>Sửa / Gia hạn / Ghi kết quả</button> <button className="btn" disabled={!can('WARRANTY',17)} onClick={()=>openDocumentPrint({type:'MauPhieuBaoHanh',id:active.ID})}>In phiếu</button></div>}
    {form&&<div style={{position:'fixed',inset:0,background:'#0008',zIndex:1000,display:'grid',placeItems:'center'}}><form onSubmit={save} style={{background:'white',padding:24,borderRadius:8,width:'min(540px,95vw)',maxHeight:'90vh',overflow:'auto',display:'grid',gap:12}}><h3>{editing?'Cập nhật bảo hành':'Tạo phiếu bảo hành'}</h3>
      {!editing&&<label>Xe<select required value={form.DXEID} onChange={e=>setForm({...form,DXEID:e.target.value})}><option value="">Chọn xe</option>{vehicles.map(v=><option key={v.ID} value={v.ID}>{v.BIENSO} — {v.TEN_KH}</option>)}</select></label>}
      <label>Ngày bắt đầu<input required type="date" value={form.NGAYBATDAU} onChange={e=>setForm({...form,NGAYBATDAU:e.target.value})}/></label><label>Ngày kết thúc<input required min={form.NGAYBATDAU} type="date" value={form.NGAYKETTHUC} onChange={e=>setForm({...form,NGAYKETTHUC:e.target.value})}/></label>
      <label>Nội dung<textarea maxLength={2000} value={form.NOTE||''} onChange={e=>setForm({...form,NOTE:e.target.value})}/></label>
      {editing&&<><label>Trạng thái xử lý<select value={form.TRANGTHAI} onChange={e=>setForm({...form,TRANGTHAI:Number(e.target.value)})}><option value="0">Chờ tiếp nhận</option><option value="1">Đã tiếp nhận</option><option value="2">Đang xử lý</option><option value="3">Hoàn thành</option></select></label><label>Kết quả<textarea maxLength={2000} value={form.KETQUAXULY||''} onChange={e=>setForm({...form,KETQUAXULY:e.target.value})}/></label><label>Chi phí xử lý<input type="number" min="0" step="0.01" value={form.CHIPHI||0} onChange={e=>setForm({...form,CHIPHI:e.target.value})}/></label></>}
      {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}<div><button type="button" disabled={saving} onClick={()=>setForm(null)}>Hủy</button> <button type="submit" disabled={saving}>{saving?'Đang lưu…':'Lưu bảo hành'}</button></div></form></div>}
  </div>;
}
