import {useEffect,useState} from 'react';
import api from '../api';
import {can} from '../utils/permissions';
import {openDocumentPrint} from './DocumentPrintDialog';
export default function SaleHistory(){
  const [rows,setRows]=useState([]),[q,setQ]=useState(''),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');api.get('/sales',{params:{q,offset,limit:50},signal:controller.signal}).then(r=>{setRows(r.data.data);setMore(r.data.pagination.hasMore);}).catch(e=>{if(!controller.signal.aborted)setError(e.response?.data?.error||e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[q,offset]);
  return <><input aria-label="Tìm số phiếu bán" placeholder="Tìm số phiếu bán…" value={q} onChange={e=>{setQ(e.target.value);setOffset(0);}}/>{error&&<p role="alert">{error}</p>}{busy?<p>Đang tải…</p>:<table className="pos-recent-table"><thead><tr><th>Số phiếu</th><th>Ngày</th><th>Khách hàng</th><th>Tổng tiền</th><th>Thanh toán</th><th>In</th></tr></thead><tbody>{rows.map(row=><tr key={row.ID}><td>{row.NAME}</td><td>{String(row.NGAY||'').slice(0,10)}</td><td>{row.TEN_KH||'Khách lẻ'}</td><td>{Number(row.TONGCONG||0).toLocaleString('vi-VN')}</td><td>{Number(row.DATHANHTOAN)===1?'Đã thanh toán':'Còn nợ'}</td><td><button disabled={!can('SALES',17)} onClick={()=>openDocumentPrint({type:'MauHoaDonBanHang',id:row.ID})}>In</button></td></tr>)}</tbody></table>}<button disabled={busy||offset===0} onClick={()=>setOffset(offset-50)}>Trang trước</button> <button disabled={busy||!more} onClick={()=>setOffset(offset+50)}>Trang sau</button></>;
}
