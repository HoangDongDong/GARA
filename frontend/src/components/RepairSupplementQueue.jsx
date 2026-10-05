import { useMemo, useState } from 'react';
import RepairSupplements from './RepairSupplements';
import CustomerDetailModal from './CustomerDetailModal';

const labels = { draft: 'Bản nháp', pending: 'Chờ khách xác nhận', approved: 'Đã chấp thuận', partially_approved: 'Chấp thuận một phần', rejected: 'Đã từ chối', cancelled: 'Đã hủy' };
const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export default function RepairSupplementQueue({ rows, loading, search, advisor, canEdit, onChanged }) {
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const counts = useMemo(() => rows.reduce((result, row) => ({ ...result, [row.TRANGTHAI]: (result[row.TRANGTHAI] || 0) + 1 }), {}), [rows]);
  const visible = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return rows.filter(row => (status === 'all' || row.TRANGTHAI === status)
      && (advisor === 'all' || (row.TEN_CV || 'Chưa phân công') === advisor)
      && (!keyword || [row.BIENSO, row.SO_LENH, row.TEN_KH, row.DIENTHOAI, row.LYDO].some(value => String(value || '').toLocaleLowerCase('vi').includes(keyword))));
  }, [rows, status, search, advisor]);
  return <section className="hscd-supplements" aria-label="Phát sinh chờ duyệt">
    <div className="hscd-supplement-heading"><div><h2>Phát sinh chờ duyệt <span className="hscd-supplement-count">{counts.pending || 0}</span></h2><p>Các báo giá bổ sung khi xe đang sửa. Chỉ hạng mục khách chấp thuận mới được thêm vào phiếu và tổng tiền.</p></div>
      <label>Trạng thái đề xuất <select className="hscd-filter-select" value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label} ({counts[key] || 0})</option>)}<option value="all">Tất cả ({rows.length})</option></select></label>
    </div>
    {loading ? <div className="hscd-col-empty">Đang tải phát sinh…</div> : <div className="hscd-supplement-table"><table className="hscd-table"><thead><tr><th>Phiếu / Xe</th><th>Khách hàng / Cố vấn</th><th>Lý do phát sinh</th><th>Báo giá bổ sung</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visible.map(row => <tr key={row.ID}>
      <td><b>{row.SO_LENH}</b><div>{row.BIENSO}</div><small>{row.TIMECREATED ? new Date(row.TIMECREATED).toLocaleString('vi-VN') : ''}</small></td>
      <td>{row.DKHACHHANGID ? <button type="button" className="hscd-customer-link" onClick={() => setSelectedCustomerId(row.DKHACHHANGID)} title="Xem chi tiết khách hàng">{row.TEN_KH || 'Khách vãng lai'}</button> : <b>{row.TEN_KH || 'Khách vãng lai'}</b>}<div><small>CV: {row.TEN_CV || 'Chưa phân công'}</small></div></td>
      <td className="hscd-supplement-reason">{row.LYDO}</td><td><b>{money(row.TONGPHATSINH)}</b><div>{row.SO_HANGMUC} hạng mục</div></td>
      <td><span className="hscd-supplement-status">{labels[row.TRANGTHAI] || row.TRANGTHAI}</span></td>
      <td><button className="hscd-btn-table-detail" onClick={() => setSelected(row)}>{canEdit && Number(row.WORKFLOW_STATE) === 2 && row.TRANGTHAI === 'pending' ? 'Xem & ghi nhận duyệt' : 'Xem chi tiết'}</button></td>
    </tr>)}</tbody></table>{!visible.length && <div className="hscd-col-empty">Không có đề xuất phát sinh phù hợp.</div>}</div>}
    {selected && <RepairSupplements key={selected.ID} repairId={selected.TLENHSUACHUAID} state={selected.WORKFLOW_STATE} customerId={selected.DKHACHHANGID} selectedSupplementId={selected.ID} contextTitle={`${selected.SO_LENH} · ${selected.BIENSO} · ${selected.TEN_KH || 'Khách vãng lai'}`} allowCreate={false} canEdit={canEdit} onClose={() => setSelected(null)} onChanged={onChanged} />}
    {selectedCustomerId && <CustomerDetailModal key={selectedCustomerId} customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />}
  </section>;
}
