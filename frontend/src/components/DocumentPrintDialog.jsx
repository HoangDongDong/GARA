import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import api from '../api';
import './DocumentPrintDialog.css';
export const openDocumentPrint = options => window.dispatchEvent(new CustomEvent('garage:print', { detail: options }));
const contexts = {
 '/tiep-nhan':['MauPhieuTiepNhan','MauBaoGia'], '/sua-chua':['MauPhieuSuaChua','MauBaoGia','MauPhieuTiepNhan','MauHoaDonSuaChua','MauPhieuBanGiao','MauPhieuXuatKho'],
 '/ho-so-cho-duyet':['MauPhieuSuaChua','MauBaoGia','MauHoaDonSuaChua','MauPhieuBanGiao'], '/ban-hang':['MauHoaDonBanHang'],
 '/nhap-kho':['MauPhieuNhapKho','MauPhieuXuatKho','MauMaVachPhuTung'], '/mua-linh-kien':['MauPhieuNhapKho','MauMaVachPhuTung'],
 '/bao-hanh':['MauPhieuBaoHanh'], '/ho-so-xe':['MauHoSoXe','MauLichSuSuaChua','MauPhieuSuaChua','MauPhieuBaoHanh'],
 '/thu-chi':['MauPhieuThu','MauPhieuChi','MauCongNoKhachHang','MauCongNoNhaCungCap'], '/khach-hang':['MauCongNoKhachHang'],
 '/nha-cung-cap':['MauCongNoNhaCungCap'], '/nhan-vien':['MauBangLuong'], '/bao-cao':['MauBaoCao'],
};
async function errorMessage(error) {
 if(error.response?.data instanceof Blob){try{return JSON.parse(await error.response.data.text()).error;}catch{}}
 if(typeof error.response?.data==='string'){try{return JSON.parse(error.response.data).error || error.message;}catch{}}
 return error.response?.data?.error || error.message;
}
export default function DocumentPrintDialog() {
 const { pathname } = useLocation();
 const [request,setRequest]=useState(null),[types,setTypes]=useState([]),[type,setType]=useState(''),[records,setRecords]=useState([]),[record,setRecord]=useState(''),[template,setTemplate]=useState('');
 const [search,setSearch]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[ready,setReady]=useState(false);
 const pdfUrl=useRef(''),generation=useRef(0);
 const relevant=contexts[pathname]||[];
 const selected=types.find(t=>t.key===type);
 const invalidate=()=>{generation.current++;if(pdfUrl.current)URL.revokeObjectURL(pdfUrl.current);pdfUrl.current='';setUrl('');setReady(false);setError('');setBusy(false);};
 const open=(options={})=>{invalidate();setTypes([]);setRecords([]);setType('');setRecord('');setSearch('');setRequest(options);setFrom(options.from||'');setTo(options.to||'');};
 useEffect(()=>{const listener=e=>open(e.detail);window.addEventListener('garage:print',listener);return()=>window.removeEventListener('garage:print',listener);},[]);
 useEffect(()=>{setRequest(null);invalidate();},[pathname]);
 useEffect(()=>()=>{generation.current++;if(pdfUrl.current)URL.revokeObjectURL(pdfUrl.current);},[]);
 
 useEffect(()=>{if(!request)return;const controller=new AbortController();api.get('/printing/types',{signal:controller.signal}).then(r=>{
  const keys=request.types||contexts[pathname]||[];const available=r.data.data.filter(t=>keys.includes(t.key));setTypes(available);
  const first=available.find(t=>t.key===request.type)||available[0];if(first){setType(first.key);setTemplate(first.defaultId);setRecord(request.id||'');}else setError('Bạn chưa có quyền Xem và In cho nghiệp vụ này.');
 }).catch(async e=>{if(!controller.signal.aborted)setError(await errorMessage(e));});return()=>controller.abort();},[request,pathname]);
 useEffect(()=>{if(!request||!type)return;const controller=new AbortController();setRecords([]);const timer=setTimeout(async()=>{
  try{const result=await api.get(`/printing/${type}/records`,{params:{search},signal:controller.signal});let list=result.data.data;
   if(request.id&&type===request.type&&!search&&!list.some(r=>r.ID===request.id)){const exact=await api.get(`/printing/${type}/records`,{params:{search:request.id},signal:controller.signal});list=[...exact.data.data,...list];}
   if(!controller.signal.aborted){setRecords(list);setRecord(current=>type==='MauBaoCao'?'summary':list.some(r=>r.ID===current)?current:'');}
  }catch(e){if(!controller.signal.aborted)setError(await errorMessage(e));}
 },200);return()=>{clearTimeout(timer);controller.abort();};},[request,type,search]);
 const preview=async()=>{invalidate();const version=generation.current;setBusy(true);try{
  const r=await api.get(`/printing/${type}/${encodeURIComponent(record)}/pdf`,{params:{templateId:template,from:from||undefined,to:to||undefined},responseType:'blob',timeout:90000});
  if(version!==generation.current)return;if(!r.headers['content-type']?.includes('application/pdf'))throw new Error('Không nhận được bản PDF từ FastReport.');pdfUrl.current=URL.createObjectURL(r.data);setUrl(pdfUrl.current);setReady(true);
 }catch(e){const message=await errorMessage(e);if(version===generation.current)setError(message);}finally{if(version===generation.current)setBusy(false);}};
 return <>
  {!!relevant.length&&<button className="gara-print-launcher" onClick={()=>open({type:relevant[0]})}><Printer size={15}/> In chứng từ</button>}
  {request&&<div className="gara-print-overlay"><section className="gara-print-dialog" role="dialog" aria-modal="true" aria-label="In chứng từ GARA">
   <header><strong>In chứng từ GARA</strong><button aria-label="Đóng" onClick={()=>{invalidate();setRequest(null);}}><X size={20}/></button></header>
   <div className="gara-print-controls"><label>Loại bản in<select value={type} onChange={e=>{invalidate();setType(e.target.value);setRecord('');setSearch('');setTemplate(types.find(t=>t.key===e.target.value)?.defaultId||'');}}>{types.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
    <label>Tìm chứng từ đã lưu<input value={search} placeholder="Mã phiếu, biển số hoặc tên" onChange={e=>{invalidate();setSearch(e.target.value);setRecord('');}}/></label>
    <label>Chứng từ<select value={record} onChange={e=>{invalidate();setRecord(e.target.value);}}><option value="">Chọn chứng từ đã lưu</option>{records.map(r=><option key={r.ID} value={r.ID}>{r.NAME||r.ID}</option>)}</select></label>
    <label>Mẫu in<select value={template} onChange={e=>{invalidate();setTemplate(e.target.value);}}><option value="">Chọn mẫu in</option>{selected?.templates.map(t=><option key={t.value} value={t.value}>{t.label}{t.value===selected.defaultId?' (mặc định)':''}</option>)}</select></label>
    {['MauBaoCao','MauLichSuSuaChua','MauCongNoKhachHang','MauCongNoNhaCungCap'].includes(type)&&<><label>Từ ngày<input type="date" value={from} onChange={e=>{invalidate();setFrom(e.target.value);}}/></label><label>Đến ngày<input type="date" value={to} onChange={e=>{invalidate();setTo(e.target.value);}}/></label></>}
   </div>
   <p className="gara-print-note">Bản PDF được tạo trực tiếp từ mẫu FastReport đã lưu trong cấu hình và dữ liệu chứng từ. Nhấn “In / Lưu PDF” để mở bản PDF, sau đó dùng nút in hoặc tải xuống của trình xem PDF. {type==='MauBaoCao'?'Tổng hợp giá trị hóa đơn sửa chữa và bán phụ tùng theo khoảng ngày.':type.startsWith('MauCongNo')?'Tổng dư nợ hiện tại của các chứng từ trong khoảng ngày đã chọn.':''} {!records.length&&type?'Chưa có chứng từ phù hợp; hãy lưu chứng từ trước khi in.':''}</p>
   {error&&<p role="alert" className="gara-print-error">{error}</p>}
   <div className="gara-print-preview">{url?<iframe title="Bản in GARA" src={url}/>:<span>{busy?'Đang tạo bản in…':'Chọn chứng từ và mẫu, sau đó nhấn Xem bản in.'}</span>}</div>
   <footer><button disabled={!type||!record||!template||busy} onClick={preview}>Xem bản in</button><button disabled={!url||!ready} onClick={()=>window.open(url,'_blank','noopener,noreferrer')}>In / Lưu PDF</button></footer>
  </section></div>}
 </>;
}
