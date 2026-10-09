import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import api from '../api';
import './DocumentPrintDialog.css';
import PrintAgentControls from './PrintAgentControls';
import { createPrintJobKey } from './printJobKey';
export const openDocumentPrint = options => window.dispatchEvent(new CustomEvent('garage:print', { detail: options }));
const contexts = {
 '/tiep-nhan':['MauPhieuTiepNhan','MauBaoGia'], '/sua-chua':['MauPhieuSuaChua','MauPhieuTamTinh','MauBaoGia','MauPhieuTiepNhan','MauHoaDonSuaChua','MauPhieuBanGiao','MauPhieuXuatKho'],
 '/ho-so-cho-duyet':['MauPhieuSuaChua','MauPhieuTamTinh','MauBaoGia','MauHoaDonSuaChua','MauPhieuBanGiao'], '/ban-hang':['MauHoaDonBanHang'],
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
export default function DocumentPrintDialog({ embedded = false }) {
 const { pathname } = useLocation();
 const [request,setRequest]=useState(null),[types,setTypes]=useState([]),[type,setType]=useState(''),[records,setRecords]=useState([]),[record,setRecord]=useState(''),[template,setTemplate]=useState('');
 const [search,setSearch]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[ready,setReady]=useState(false);
 const pdfUrl=useRef(''),generation=useRef(0);
 const printFrame=useRef(null),autoPrintStarted=useRef(false);
 const [printOpened,setPrintOpened]=useState(false);
 const [printNotice,setPrintNotice]=useState('');
 const [agentConfig,setAgentConfig]=useState({printers:[],routes:[]}),[printerId,setPrinterId]=useState(''),[copies,setCopies]=useState(1),[job,setJob]=useState(null),[sending,setSending]=useState(false);
 const jobKey=useRef('');
 const reprintKey=useRef({id:'',key:''});
 const jobLabels={queued:'Chờ trạm in',received:'Agent đã nhận',dispatching:'Đang gửi máy in',submitted:'Đã gửi máy in',failed:'In lỗi',needs_review:'Cần kiểm tra giấy trước khi in lại',cancelled:'Đã hủy',expired:'Hết hạn chờ'};
 const availablePrinters=agentConfig.printers.filter(p=>p.ENABLED&&agentConfig.stations?.some(s=>s.ID===p.STATIONID&&!s.REVOKED));
 const defaultPrinterId=availablePrinters.find(p=>p.ID===agentConfig.routes.find(r=>r.TYPEKEY===type)?.PRINTERID)?.ID||'';
 useEffect(()=>{setPrinterId(defaultPrinterId);},[type]);
 useEffect(()=>{setPrinterId(current=>availablePrinters.some(p=>p.ID===current)?current:defaultPrinterId);},[agentConfig,type]);
 useEffect(()=>{jobKey.current='';setJob(null);},[type,record,template,from,to,printerId,copies]);
 useEffect(()=>{if(!job?.ID||!['queued','received','dispatching'].includes(job.STATE))return;const timer=setInterval(async()=>{try{const r=await api.get('/print-control/jobs/'+job.ID);setJob(r.data);if(r.data.STATE==='submitted')setPrintOpened(true);}catch{}},2000);return()=>clearInterval(timer);},[job?.ID,job?.STATE]);
 const sendAgent=async()=>{if(sending)return;setSending(true);setError('');try{if(!jobKey.current)jobKey.current=createPrintJobKey();const r=await api.post('/print-control/jobs',{type,recordId:record,templateId:template,from:from||undefined,to:to||undefined,printerId:printerId||undefined,copies,idempotencyKey:jobKey.current},{timeout:90000});setJob(r.data);if(r.data.STATE==='submitted')setPrintOpened(true);}catch(e){setError(await errorMessage(e));}finally{setSending(false);}};
 const reprintAgent=async()=>{if(sending||!window.confirm('In lại đúng bản PDF trước? Kiểm tra giấy đã ra để tránh in trùng.'))return;setSending(true);setError('');try{if(reprintKey.current.id!==job.ID)reprintKey.current={id:job.ID,key:createPrintJobKey()};const r=await api.post('/print-control/jobs/'+job.ID+'/reprint',{idempotencyKey:reprintKey.current.key});setJob(r.data);}catch(e){setError(await errorMessage(e));}finally{setSending(false);}};
 const relevant=contexts[pathname]||[];
 const selected=types.find(t=>t.key===type);
 const invalidate=()=>{generation.current++;if(pdfUrl.current)URL.revokeObjectURL(pdfUrl.current);pdfUrl.current='';setUrl('');setReady(false);setError('');setPrintNotice('');setBusy(false);};
 const open=(options={})=>{invalidate();setJob(null);jobKey.current='';setPrintOpened(false);autoPrintStarted.current=false;setTypes([]);setRecords([]);setType('');setRecord('');setSearch('');setRequest(options);setFrom(options.from||'');setTo(options.to||'');};
 useEffect(()=>{if(embedded)return;const listener=e=>open(e.detail);window.addEventListener('garage:print',listener);return()=>window.removeEventListener('garage:print',listener);},[embedded]);
 useEffect(()=>{if(embedded){open({allTypes:true});return;}if(request?.requiredPrint)return;setRequest(null);invalidate();},[pathname,embedded]);
 useEffect(()=>()=>{generation.current++;if(pdfUrl.current)URL.revokeObjectURL(pdfUrl.current);},[]);
 
 useEffect(()=>{if(!request)return;const controller=new AbortController();api.get('/printing/types',{signal:controller.signal}).then(r=>{
  const keys=request.requiredPrint?[request.type]:request.types||contexts[pathname]||[];const available=request.allTypes&&!request.requiredPrint?r.data.data:r.data.data.filter(t=>keys.includes(t.key));setTypes(available);
  const first=available.find(t=>t.key===request.type)||available[0];if(first){setType(first.key);setTemplate(first.defaultId);setRecord(request.id||'');}else setError('Bạn chưa có quyền Xem và In cho nghiệp vụ này.');
 }).catch(async e=>{if(!controller.signal.aborted)setError(await errorMessage(e));});return()=>controller.abort();},[request,pathname]);
 useEffect(()=>{if(!request||!type)return;const controller=new AbortController();setRecords([]);const timer=setTimeout(async()=>{
  try{const result=await api.get(`/printing/${type}/records`,{params:{search},signal:controller.signal});let list=result.data.data;
   if(request.id&&type===request.type&&!search&&!list.some(r=>r.ID===request.id)){const exact=await api.get(`/printing/${type}/records`,{params:{search:request.id},signal:controller.signal});list=[...exact.data.data,...list];}
   if(!controller.signal.aborted){setRecords(list);setRecord(current=>request.requiredPrint?request.id:type==='MauBaoCao'?'summary':list.some(r=>r.ID===current)?current:'');}
  }catch(e){if(!controller.signal.aborted)setError(await errorMessage(e));}
 },200);return()=>{clearTimeout(timer);controller.abort();};},[request,type,search]);
 const preview=async()=>{invalidate();const version=generation.current;setBusy(true);try{
  const r=await api.get(`/printing/${type}/${encodeURIComponent(record)}/pdf`,{params:{templateId:template,from:from||undefined,to:to||undefined},responseType:'blob',timeout:90000});
  if(version!==generation.current)return;if(!r.headers['content-type']?.includes('application/pdf'))throw new Error('Không nhận được bản PDF từ FastReport.');pdfUrl.current=URL.createObjectURL(r.data);setUrl(pdfUrl.current);setPrintNotice(decodeURIComponent(r.headers['x-print-notice']||''));
 }catch(e){const message=await errorMessage(e);if(version===generation.current)setError(message);}finally{if(version===generation.current)setBusy(false);}};
 useEffect(()=>{
  if(!request || request.autoPreview===false || !type || !record || !template || busy || url || error)return;
  if(!selected?.templates.some(item=>item.value===template))return;
  if(record!=='summary'&&!records.some(item=>item.ID===record))return;
  const timer=setTimeout(()=>preview(),250);
  return()=>clearTimeout(timer);
 },[request,type,record,template,from,to,records,busy,url,error]);
 useEffect(()=>{if(request?.autoPrint&&type===request.type&&record===request.id&&template&&printerId&&!autoPrintStarted.current){autoPrintStarted.current=true;sendAgent();}},[request,type,record,template,printerId]);
 return <>
  {!embedded&&!!relevant.length&&<button className="gara-print-launcher" onClick={()=>open({type:relevant[0]})}><Printer size={15}/> In chứng từ</button>}
  {request&&<div className={embedded?'gara-print-page':'gara-print-overlay'}><section className="gara-print-dialog" role={embedded?'region':'dialog'} aria-modal={embedded?undefined:true} aria-label="In chứng từ GARA">
   <header><strong>{request.requiredPrint?'In bill thanh toán':'In chứng từ GARA'}</strong>{!embedded&&<button aria-label="Đóng" disabled={request.requiredPrint && !printOpened} onClick={()=>{invalidate();setRequest(null);}}><X size={20}/></button>}</header>
   <div className="gara-print-controls"><label>Loại bản in<select disabled={request.requiredPrint} value={type} onChange={e=>{invalidate();setType(e.target.value);setRecord('');setSearch('');setTemplate(types.find(t=>t.key===e.target.value)?.defaultId||'');}}>{types.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
    <label>Tìm chứng từ đã lưu<input disabled={request.requiredPrint} value={search} placeholder="Mã phiếu, biển số hoặc tên" onChange={e=>{invalidate();setSearch(e.target.value);setRecord('');}}/></label>
    <label>Chứng từ<select disabled={request.requiredPrint} value={record} onChange={e=>{invalidate();setRecord(e.target.value);}}><option value="">Chọn chứng từ đã lưu</option>{records.map(r=><option key={r.ID} value={r.ID}>{r.NAME||r.ID}</option>)}</select></label>
    <label>Mẫu in<select value={template} onChange={e=>{invalidate();autoPrintStarted.current=false;setPrintOpened(false);setTemplate(e.target.value);}}><option value="">Chọn mẫu in</option>{selected?.templates.map(t=><option key={t.value} value={t.value}>{t.label}{t.value===selected.defaultId?' (mặc định)':''}</option>)}</select></label>
    {['MauBaoCao','MauLichSuSuaChua','MauCongNoKhachHang','MauCongNoNhaCungCap'].includes(type)&&<><label>Từ ngày<input type="date" value={from} onChange={e=>{invalidate();setFrom(e.target.value);}}/></label><label>Đến ngày<input type="date" value={to} onChange={e=>{invalidate();setTo(e.target.value);}}/></label></>}
   </div>
   <PrintAgentControls types={types} onChange={setAgentConfig}/>
   <div className="gara-print-controls"><label>Máy in<select value={printerId} disabled={sending} onChange={e=>{setPrinterId(e.target.value);setError('');}}><option value="">Chọn máy in Agent</option>{availablePrinters.map(p=><option key={p.ID} value={p.ID}>{p.STATIONNAME} / {p.NAME}{p.ONLINE?'':' (mất kết nối)'}</option>)}</select></label><label>Số bản<input type="number" min="1" max="5" value={copies} disabled={sending} onChange={e=>setCopies(Number(e.target.value))}/></label></div>
   {!printerId&&<p className="gara-print-note">{availablePrinters.length?'Chọn máy in bên trên. Máy in mặc định cũ có thể đã tắt hoặc thuộc Agent đã thu hồi.':'Chưa có máy in được bật. Mở Máy in & Agent để kiểm tra kết nối và bật máy in.'}</p>}
   <p className="gara-print-note">Nhấn In để gửi trực tiếp tới máy in qua Agent. Xem bản in và Tải PDF dùng khi cần kiểm tra hoặc lưu chứng từ.</p>
   {job&&<p role="status" className="gara-print-note">{jobLabels[job.STATE]||job.STATE}{job.DETAIL?' — '+job.DETAIL:''} {['failed','needs_review','expired','cancelled','submitted'].includes(job.STATE)&&<button disabled={sending} onClick={reprintAgent}>In lại</button>} {['queued','received'].includes(job.STATE)&&<button onClick={async()=>{try{await api.post('/print-control/jobs/'+job.ID+'/cancel');setJob({...job,STATE:'cancelled'});}catch(e){setError(await errorMessage(e));}}}>Hủy lệnh</button>}</p>}
   {error&&<p role="alert" className="gara-print-error">{error}</p>}
   {printNotice&&<p role="status" className="gara-print-note">{printNotice}</p>}
   {request.requiredPrint && <p className="gara-print-note">Bill thanh toán bắt buộc in. Nếu tạo bản in lỗi, hãy thử lại; chứng từ đã được lưu.</p>}
   <div className="gara-print-preview">{url?<iframe ref={printFrame} title="Bản in GARA" src={url} onLoad={()=>setReady(true)}/>:<span>{busy?'Đang tạo bản in…':'Chọn chứng từ và mẫu để in hoặc xem trước.'}</span>}</div>
   <footer><button disabled={!type||!record||!template||busy||sending} onClick={preview}>Xem bản in</button><button disabled={!type||!record||!template||!printerId||sending||!!job} onClick={sendAgent}>{sending?'Đang gửi…':request.requiredPrint?'In bill':'In'}</button><button disabled={!url||!ready} onClick={()=>{const a=document.createElement('a');a.href=url;a.download='GARA.pdf';a.click();}}>Tải PDF</button></footer>
  </section></div>}
 </>;
}
