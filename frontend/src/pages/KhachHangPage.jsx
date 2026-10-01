import { useEffect, useState, useMemo } from 'react';
import {
  Users, Plus, FileSpreadsheet, MoreVertical,
  User, Edit, Phone, Mail, MapPin, Edit3, Eye, Clock,
  Car, CircleDollarSign, X, Trash2
} from 'lucide-react';
import { customers, masterData, vehicles } from '../services';

const fmtMoney = (n) => {
  if (n == null) return '0đ';
  return Number(n).toLocaleString('vi-VN') + 'đ';
};

export default function KhachHangPage() {
  const [list, setList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    NAME: '',
    MAKHACH: '',
    DIENTHOAI: '',
    EMAIL: '',
    DIACHI: '',
    MASOTHUE: '',
    DNHOMKHACHHANGID: '',
  });

  const load = async (preferredId) => {
    setLoading(true);
    try {
      const [a, b, groupRows] = await Promise.all([
        customers.list({ search }),
        vehicles.list().catch(() => []),
        masterData.customerGroups().catch(() => []),
      ]);
      const customerRows = Array.isArray(a) ? a : [];
      setList(customerRows);
      setVehiclesList(Array.isArray(b) ? b : []);
      setCustomerGroups(Array.isArray(groupRows) ? groupRows : []);
      setSelected((current) => {
        const currentId = preferredId || current?.ID || current?.DKHACHHANGID;
        return customerRows.find((item) => (item.ID || item.DKHACHHANGID) === currentId)
          || customerRows[0]
          || null;
      });
    } catch (e) {
      console.error('Load customers error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAddForm = () => {
    setForm({ NAME: '', MAKHACH: '', DIENTHOAI: '', EMAIL: '', DIACHI: '', MASOTHUE: '', DNHOMKHACHHANGID: '' });
    setFormError('');
    setFormMode('add');
  };

  const openEditForm = (customer) => {
    if (!customer) return;
    setForm({
      NAME: customer.NAME || customer.TENKH || customer.HOTEN || '',
      MAKHACH: customer.MAKHACH || customer.MAKH || customer.CODE || '',
      DIENTHOAI: customer.DIENTHOAI || customer.SDT || customer.SODT || '',
      EMAIL: customer.EMAIL || customer.MAIL || '',
      DIACHI: customer.DIACHI || customer.ADDRESS || '',
      MASOTHUE: customer.MASOTHUE || customer.CCCD || '',
      DNHOMKHACHHANGID: customer.DNHOMKHACHHANGID || '',
    });
    setFormError('');
    setFormMode('edit');
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setFormError('');
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!form.NAME.trim()) {
      setFormError('Vui lòng nhập tên khách hàng.');
      return;
    }
    const normalizedCode = form.MAKHACH.trim().toUpperCase();
    const editingId = formMode === 'edit' ? (selected?.ID || selected?.DKHACHHANGID) : null;
    const duplicateCode = normalizedCode && list.some((customer) => {
      const id = customer.ID || customer.DKHACHHANGID;
      const code = String(customer.MAKHACH || customer.MAKH || customer.CODE || '').trim().toUpperCase();
      return id !== editingId && code === normalizedCode;
    });
    if (duplicateCode) {
      setFormError('Mã khách hàng đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() || null])
    );

    try {
      if (formMode === 'edit') {
        const id = selected?.ID || selected?.DKHACHHANGID;
        if (!id) throw new Error('Không xác định được khách hàng cần sửa');
        await customers.update(id, payload);
        await load(id);
      } else {
        const result = await customers.create(payload);
        await load(result?.id);
      }
      setFormMode(null);
    } catch (error) {
      setFormError(error?.response?.data?.error || error.message || 'Không thể lưu khách hàng.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const id = customer?.ID || customer?.DKHACHHANGID;
    if (!id || deletingId) return;
    const name = customerName(customer);
    if (!window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"?`)) return;

    setDeletingId(id);
    try {
      await customers.remove(id);
      if (formMode) setFormMode(null);
      await load();
    } catch (error) {
      window.alert(error?.response?.data?.error || error.message || 'Không thể xóa khách hàng.');
    } finally {
      setDeletingId(null);
    }
  };

  const openGroupForm = () => {
    setNewGroupName('');
    setGroupError('');
    setShowGroupForm(true);
  };

  const handleAddGroup = async (event) => {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      setGroupError('Vui lòng nhập tên nhóm khách hàng.');
      return;
    }
    if (customerGroups.some((group) => String(group.NAME || '').trim().toLowerCase() === name.toLowerCase())) {
      setGroupError('Nhóm khách hàng này đã tồn tại.');
      return;
    }

    setSavingGroup(true);
    setGroupError('');
    try {
      const result = await masterData.create('customer_groups', { NAME: name });
      const refreshedGroups = await masterData.customerGroups();
      setCustomerGroups(Array.isArray(refreshedGroups) ? refreshedGroups : []);
      setForm((current) => ({ ...current, DNHOMKHACHHANGID: result?.id || '' }));
      setShowGroupForm(false);
    } catch (error) {
      setGroupError(error?.response?.data?.error || error.message || 'Không thể thêm nhóm khách hàng.');
    } finally {
      setSavingGroup(false);
    }
  };

  const filtered = useMemo(() => {
    return list.filter((c) => {
      if (groupFilter) {
        if (groupFilter === '__none__') {
          if (c.DNHOMKHACHHANGID || c.NHOMKH) return false;
        } else {
          const matchId = c.DNHOMKHACHHANGID === groupFilter;
          const matchName = c.NHOMKH && customerGroups.some((g) => g.ID === groupFilter && (g.NAME === c.NHOMKH || String(g.NAME).toLowerCase() === String(c.NHOMKH).toLowerCase()));
          if (!matchId && !matchName) return false;
        }
      }
      if (statusFilter && String(c.TRANGTHAI ?? c.STATUS ?? 1) !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (c.TENKH || c.HOTEN || c.NAME || '').toLowerCase().includes(s) ||
          (c.DIENTHOAI || c.SDT || c.SODT || '').toLowerCase().includes(s) ||
          (c.MASOTHUE || c.CCCD || '').toLowerCase().includes(s) ||
          (c.MAKHACH || c.MAKH || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [list, search, groupFilter, statusFilter, customerGroups]);

  useEffect(() => {
    if (filtered.length && !selected) {
      setSelected(filtered[0]);
    }
  }, [filtered, selected]);

  const selectedVehicles = useMemo(() => {
    if (!selected) return [];
    const id = selected.DKHACHHANGID || selected.ID;
    return vehiclesList.filter((v) => {
      const vid = v.DKHACHHANGID ?? v.KHACHHANGID ?? v.MAKH;
      return vid === id || vid === String(id);
    });
  }, [vehiclesList, selected]);

  const customerName = (c) => c?.TENKH || c?.HOTEN || c?.NAME || '—';
  const customerPhone = (c) => c?.DIENTHOAI || c?.SDT || c?.SODT || c?.PHONE || '';
  const customerEmail = (c) => c?.EMAIL || c?.MAIL || '';
  const customerAddr = (c) => c?.DIACHI || c?.ADDRESS || '';
  const customerCode = (c) => c?.MAKHACH || c?.MAKH || c?.MA_KH || c?.CODE || (c?.DKHACHHANGID ? 'KH' + c.DKHACHHANGID : '—');
  const customerDebt = (c) => Number(c?.CONGNO ?? c?.DEBT ?? 0);
  const customerSpent = (c) => Number(c?.CHITIEU ?? c?.TOTAL_SPENT ?? 0);
  const customerGroup = (c) => {
    if (!c) return '';
    if (c.NHOMKH) return c.NHOMKH;
    if (c.DNHOMKHACHHANGID) {
      const g = customerGroups.find((item) => item.ID === c.DNHOMKHACHHANGID);
      if (g?.NAME) return g.NAME;
    }
    return c.GROUP || '';
  };
  const customerStatus = (c) => c?.TRANGTHAI ?? c?.STATUS ?? 1;
  const customerNote = (c) => c?.GHICHU || c?.NOTE || '';
  const customerCreated = (c) => c?.TIMECREATED || c?.NGAYTAO || c?.CREATED_AT || '';

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 16 }}>
          <span className="page-icon" style={{ display: 'flex', alignItems: 'center' }}><Users size={20} color="#E65100" /></span>
          Khách hàng
        </h1>
        <div className="page-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
           <button onClick={openAddForm} className="btn" style={{ background: '#E65100', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Plus size={14} /> Thêm khách hàng</button>
           <button className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#424242' }}><FileSpreadsheet size={14} color="#4CAF50" /> Import Excel</button>
           <button className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#424242' }}><FileSpreadsheet size={14} color="#2196F3" /> Xuất Excel</button>
           <button className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MoreVertical size={14} color="#424242" /></button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexShrink: 0 }}>
         <div style={{ flex: 2 }}>
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, CCCD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '4px 8px', width: '100%', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11 }}
            />
         </div>
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#757575', whiteSpace: 'nowrap' }}>Nhóm</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              style={{ padding: '4px', flex: 1, border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11 }}
            >
              <option value="">Tất cả</option>
              {customerGroups.map((g) => <option key={g.ID} value={g.ID}>{g.NAME}</option>)}
              <option value="__none__">Chưa phân nhóm</option>
            </select>
         </div>
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#757575', whiteSpace: 'nowrap' }}>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '4px', flex: 1, border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11 }}
            >
              <option value="">Tất cả</option>
              <option value="1">Đang HĐ</option>
              <option value="0">Ngừng HĐ</option>
            </select>
         </div>
      </div>

      <div className="responsive-2col" style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Cột trái: Danh sách KH */}
        <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <div className="card" style={{ flex: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
            <div className="card-body no-padding" style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee' }}>
               <table className="table" style={{ border: 'none', width: '100%', fontSize: 11, margin: 0, tableLayout: 'fixed' }}>
                  <thead>
                     <tr style={{ background: '#E65100' }}>
                        <th style={{ color: 'white', padding: '4px', width: 30 }}>STT</th>
                        <th style={{ color: 'white', padding: '4px', width: 60 }}>Mã KH</th>
                        <th style={{ color: 'white', padding: '4px', width: 100 }}>Tên khách hàng</th>
                        <th style={{ color: 'white', padding: '4px', width: 80 }}>Số điện thoại</th>
                        <th style={{ color: 'white', padding: '4px', width: 70 }}>Nhóm KH</th>
                        <th style={{ color: 'white', padding: '4px', width: 80, textAlign: 'right' }}>Công nợ</th>
                        <th style={{ color: 'white', padding: '4px', width: 90, textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ color: 'white', padding: '4px', width: 60, textAlign: 'center' }}>Thao tác</th>
                     </tr>
                  </thead>
                  <tbody>
                     {loading && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 12, color: '#757575' }}>Đang tải...</td></tr>
                     )}
                     {!loading && filtered.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 12, color: '#757575' }}>Chưa có khách hàng</td></tr>
                     )}
                     {!loading && filtered.map((c, idx) => {
                        const isActive = (selected?.DKHACHHANGID || selected?.ID) === (c.DKHACHHANGID || c.ID);
                        const stt = customerStatus(c);
                        return (
                           <tr
                              key={c.DKHACHHANGID || c.ID || idx}
                              onClick={() => setSelected(c)}
                              style={{
                                 background: isActive ? '#FFE0B2' : (idx % 2 === 0 ? '#FFF3E0' : 'white'),
                                 cursor: 'pointer',
                              }}
                           >
                              <td style={{padding: '4px'}}>{idx + 1}</td>
                              <td style={{padding: '4px'}}>{customerCode(c)}</td>
                              <td style={{fontWeight: 600, padding: '4px'}}>{customerName(c)}</td>
                              <td style={{padding: '4px'}}>{customerPhone(c) || '—'}</td>
                              <td style={{padding: '4px', color: customerGroup(c) ? '#000' : '#9E9E9E'}}>{customerGroup(c) || '—'}</td>
                              <td className="text-right" style={{fontWeight: customerDebt(c) > 0 ? 600 : 400, padding: '4px', color: customerDebt(c) > 0 ? '#D32F2F' : '#424242'}}>
                                 {fmtMoney(customerDebt(c))}
                              </td>
                              <td style={{padding: '4px', textAlign: 'center'}}>
                                 <span
                                    className={Number(stt) === 1 ? 'badge badge-success' : 'badge badge-secondary'}
                                    style={{fontSize: 9, padding: '2px 4px'}}
                                 >
                                    {Number(stt) === 1 ? 'Đang HĐ' : 'Ngừng HĐ'}
                                 </span>
                              </td>
                              <td style={{ textAlign: 'center', padding: '4px' }} onClick={(e) => e.stopPropagation()}>
                                 <Eye size={12} style={{marginRight:4, cursor:'pointer', color:'#757575'}}/>
                                 <Edit onClick={() => { setSelected(c); openEditForm(c); }} size={12} style={{marginRight:4, cursor:'pointer', color:'#757575'}}/>
                                 <Trash2 onClick={() => handleDeleteCustomer(c)} size={12} style={{cursor: deletingId ? 'wait' : 'pointer', color:'#D32F2F', opacity: deletingId === (c.ID || c.DKHACHHANGID) ? 0.45 : 1}}/>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
            <div style={{ padding: '4px 10px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, background: '#fafafa', flexShrink: 0 }}>
               <span style={{ color: '#424242' }}>Tổng cộng: <b>{filtered.length} khách hàng</b></span>
               <div style={{ display: 'flex', gap: 4 }}>
                  <button style={{ border: '1px solid #E0E0E0', background: 'white', padding: '2px 6px', borderRadius: 2, cursor: 'pointer' }}>&lt;</button>
                  <button style={{ border: '1px solid #E65100', background: '#E65100', color: 'white', padding: '2px 6px', borderRadius: 2, cursor: 'pointer' }}>1</button>
                  <button style={{ border: '1px solid #E0E0E0', background: 'white', padding: '2px 6px', borderRadius: 2, cursor: 'pointer' }}>&gt;</button>
               </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
            <div className="card-header" style={{ padding: '6px 10px', borderBottom: '1px solid #eee', background: '#fafafa', flexShrink: 0 }}>
               <h3 style={{ margin: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}><Clock size={14} color="#E65100" /> Lịch sử giao dịch gần đây</h3>
            </div>
            <div className="card-body no-padding" style={{ overflowY: 'auto', flex: 1 }}>
              <table className="table" style={{ border: 'none', width: '100%', fontSize: 11, margin: 0 }}>
                 <thead>
                   <tr style={{ background: '#E65100' }}>
                     <th style={{ color: 'white', padding: '4px' }}>Ngày</th>
                     <th style={{ color: 'white', padding: '4px' }}>Loại giao dịch</th>
                     <th style={{ color: 'white', padding: '4px' }}>Nội dung</th>
                     <th style={{ color: 'white', padding: '4px', textAlign: 'right' }}>Số tiền</th>
                     <th style={{ color: 'white', padding: '4px', textAlign: 'center' }}>Trạng thái</th>
                   </tr>
                 </thead>
                 <tbody>
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 12, color: '#757575' }}>Chưa có giao dịch</td></tr>
                 </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin chi tiết */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflowY: 'auto', paddingRight: 4 }}>

          {/* Thông tin khách hàng */}
          <div className="card" style={{ padding: 10, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 6 }}>
               <h3 style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <span style={{color:'#E65100'}}><User size={16} color="#E65100" /></span> Thông tin khách hàng
               </h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button onClick={() => openEditForm(selected)} disabled={!selected} className="btn btn-ghost btn-sm" style={{ border: '1px solid #FF9800', color: '#FF9800', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, opacity: selected ? 1 : 0.5 }}>
                     <Edit size={12} /> Sửa
                  </button>
                  <button onClick={() => handleDeleteCustomer(selected)} disabled={!selected || Boolean(deletingId)} className="btn btn-ghost btn-sm" style={{ border: '1px solid #D32F2F', color: '#D32F2F', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, opacity: selected && !deletingId ? 1 : 0.5 }}>
                     <Trash2 size={12} /> Xóa
                  </button>
               </div>
            </div>

            {!selected ? (
               <div style={{ textAlign: 'center', padding: 20, color: '#757575', fontSize: 11 }}>Chọn khách hàng để xem chi tiết</div>
            ) : (
            <div style={{ display: 'flex', gap: 10 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <div style={{ width: 40, height: 40, background: '#FF5722', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} /></div>
                     <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <span style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{customerName(selected)}</span>
                           {customerGroup(selected) ? (
                              <span className="badge" style={{ background: '#FFCC80', color: '#E65100', padding: '2px 6px', borderRadius: 10, fontSize: 10 }}>{customerGroup(selected)}</span>
                            ) : (
                              <span className="badge" style={{ background: '#F1F5F9', color: '#94A3B8', padding: '2px 6px', borderRadius: 10, fontSize: 10 }}>Chưa phân nhóm</span>
                            )}
                        </div>
                        <div style={{ fontSize: 11, color: '#616161', marginTop: 4 }}>Mã KH: <b style={{color:'#000'}}>{customerCode(selected)}</b></div>
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <div style={{ display: 'flex' }}>
                       <div style={{ width: 80, color: '#757575', fontSize: 11 }}>Số điện thoại</div>
                       <div style={{ flex: 1, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, color: '#000' }}>
                          {customerPhone(selected) || '—'} {customerPhone(selected) && <Phone size={12} color="#E20074" />}
                       </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                       <div style={{ width: 80, color: '#757575', fontSize: 11 }}>Email</div>
                       <div style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#1565C0' }}>
                          <Mail size={12} color="#9E9E9E" /> {customerEmail(selected) || '—'}
                       </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                       <div style={{ width: 80, color: '#757575', fontSize: 11 }}>Địa chỉ</div>
                       <div style={{ flex: 1, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#000' }}>
                          <MapPin size={12} color="#E65100" /> {customerAddr(selected) || '—'}
                       </div>
                    </div>
                  </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '1px solid #eee', paddingLeft: 10, width: 150 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <div style={{ color: '#757575', fontSize: 11 }}>Ngày tạo:</div>
                     <div style={{ fontSize: 11, fontWeight: 600, color: '#000' }}>{customerCreated(selected) ? new Date(customerCreated(selected)).toLocaleDateString('vi-VN') : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ color: '#757575', fontSize: 11 }}>Trạng thái:</div>
                     <div>
                        <span
                           className={Number(customerStatus(selected)) === 1 ? 'badge badge-success' : 'badge badge-secondary'}
                           style={{ padding: '2px 6px', borderRadius: 10, fontSize: 9 }}
                        >
                           {Number(customerStatus(selected)) === 1 ? 'Đang HĐ' : 'Ngừng HĐ'}
                        </span>
                     </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
                     <div style={{ color: '#757575', fontSize: 11 }}>Công nợ:</div>
                     <div style={{ color: customerDebt(selected) > 0 ? '#E65100' : '#424242', fontWeight: 800, fontSize: 12 }}>{fmtMoney(customerDebt(selected))}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
                     <div style={{ color: '#757575', fontSize: 11 }}>Chi tiêu:</div>
                     <div style={{ fontWeight: 800, fontSize: 12, color: '#000' }}>{fmtMoney(customerSpent(selected))}</div>
                  </div>
               </div>
            </div>
            )}

            {selected && customerNote(selected) && (
            <div style={{ marginTop: 10, padding: '6px 10px', background: '#FFF8E1', borderRadius: 4, border: '1px solid #FFE0B2', display: 'flex', alignItems: 'center', gap: 6 }}>
               <div style={{ fontSize: 11, fontWeight: 700, color: '#E65100', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Edit3 size={12} /> Ghi chú:
               </div>
               <div style={{ fontSize: 11, color: '#424242' }}>{customerNote(selected)}</div>
            </div>
            )}
          </div>

          {/* Danh sách xe của khách hàng */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 120 }}>
            <div className="card-header" style={{ padding: '6px 10px', borderBottom: '1px solid #eee', background: '#fafafa', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#002147' }}>
                  <Car size={14} color="#E65100" /> Danh sách xe của khách hàng
               </h3>
               <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #FF9800', color: '#E65100', borderRadius: 4, padding: '2px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={10}/> Thêm xe
               </button>
            </div>
            <div className="card-body no-padding" style={{ flex: 1, overflowY: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                     <tr style={{ background: '#FFF3E0' }}>
                        <th style={{ color: '#E65100', padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Biển số</th>
                        <th style={{ color: '#E65100', padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Hãng xe</th>
                        <th style={{ color: '#E65100', padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Dòng xe</th>
                        <th style={{ color: '#E65100', padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Màu</th>
                        <th style={{ color: '#E65100', padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Thao tác</th>
                     </tr>
                  </thead>
                  <tbody>
                     {!selected && (
                        <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#757575' }}>Chọn khách hàng</td></tr>
                     )}
                     {selected && selectedVehicles.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#757575' }}>Chưa có xe</td></tr>
                     )}
                     {selected && selectedVehicles.map((v, idx) => (
                        <tr key={v.DXEID || v.ID || idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                           <td style={{ padding: '4px 6px', color: '#002147', fontWeight: 600 }}>{v.BIENSO || v.PLATE || '—'}</td>
                           <td style={{ padding: '4px 6px', color: '#424242' }}>{v.HANGXE || v.BRAND || '—'}</td>
                           <td style={{ padding: '4px 6px', color: '#424242' }}>{v.DONGXE || v.MODEL || '—'}</td>
                           <td style={{ padding: '4px 6px', color: '#424242' }}>{v.MAU || v.COLOR || '—'}</td>
                           <td style={{ padding: '4px 6px', color: '#424242', textAlign: 'center' }}>
                              <Eye size={12} style={{ marginRight: 6, cursor: 'pointer', color: '#757575' }}/>
                              <Edit size={12} style={{ cursor: 'pointer', color: '#757575' }}/>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>

          {/* Công nợ */}
          <div className="card" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 160 }}>
            <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderBottom: '1px solid #eee', background: '#fafafa', flexShrink: 0 }}>
               <div style={{ padding: '4px 10px', background: '#FF3D00', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <CircleDollarSign size={12}/> Công nợ
               </div>
               <div style={{ padding: '4px 10px', background: 'white', color: '#002147', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  Lịch hẹn
               </div>
               <div style={{ padding: '4px 10px', background: 'white', color: '#002147', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  Ghi chú
               </div>
            </div>
            <div className="card-body" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>

               <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#FFF3E0', borderRadius: 4, padding: '8px', border: '1px solid #FFE0B2' }}>
                     <div style={{ fontSize: 10, color: '#E65100', fontWeight: 600, marginBottom: 2 }}>Tổng công nợ</div>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#D32F2F' }}>{fmtMoney(selected ? customerDebt(selected) : 0)}</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: 4, padding: '8px', border: '1px solid #eee' }}>
                     <div style={{ fontSize: 10, color: '#757575', marginBottom: 2 }}>Nợ hiện tại</div>
                     <div style={{ fontSize: 13, fontWeight: 600, color: '#002147' }}>{fmtMoney(selected ? customerDebt(selected) : 0)}</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: 4, padding: '8px', border: '1px solid #eee' }}>
                     <div style={{ fontSize: 10, color: '#757575', marginBottom: 2 }}>Hạn thanh toán</div>
                     <div style={{ fontSize: 13, fontWeight: 600, color: '#002147' }}>—</div>
                  </div>
               </div>

               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 11, color: '#002147' }}>Chi tiết công nợ</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, border: '1px solid #eee' }}>
                     <thead>
                        <tr style={{ background: '#FFF3E0' }}>
                           <th style={{ color: '#E65100', padding: '4px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Ngày</th>
                           <th style={{ color: '#E65100', padding: '4px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Nội dung</th>
                           <th style={{ color: '#E65100', padding: '4px', textAlign: 'right', borderBottom: '1px solid #eee' }}>Số tiền</th>
                           <th style={{ color: '#E65100', padding: '4px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Trạng thái</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#757575' }}>Chưa có dữ liệu</td></tr>
                     </tbody>
                  </table>
               </div>
            </div>
          </div>

        </div>
      </div>

      {formMode && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{ width: 560, maxWidth: '100%', background: 'white', borderRadius: 7, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ background: '#E65100', color: 'white', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700 }}>
                <User size={16} /> {formMode === 'add' ? 'THÊM KHÁCH HÀNG' : 'SỬA THÔNG TIN KHÁCH HÀNG'}
              </div>
              <button type="button" onClick={closeForm} disabled={saving} style={{ border: 0, background: 'transparent', color: 'white', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Tên khách hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input
                    autoFocus
                    value={form.NAME}
                    onChange={(event) => setForm({ ...form, NAME: event.target.value })}
                    placeholder="Nhập tên khách hàng..."
                    style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  />
                </label>

                <label style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Nhóm khách hàng
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <select
                      value={form.DNHOMKHACHHANGID}
                      onChange={(event) => setForm({ ...form, DNHOMKHACHHANGID: event.target.value })}
                      style={{ flex: 1, minWidth: 0, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, background: 'white' }}
                    >
                      <option value="">-- Chọn nhóm khách hàng --</option>
                      {customerGroups.map((group) => (
                        <option key={group.ID} value={group.ID}>{group.NAME}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={openGroupForm}
                      title="Thêm nhóm khách hàng"
                      style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ＋ Thêm
                    </button>
                  </div>
                </label>

                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Mã khách hàng
                  <input
                    value={form.MAKHACH}
                    onChange={(event) => setForm({ ...form, MAKHACH: event.target.value })}
                    placeholder="Ví dụ: KH001"
                    style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  />
                </label>

                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Số điện thoại
                  <input
                    value={form.DIENTHOAI}
                    onChange={(event) => setForm({ ...form, DIENTHOAI: event.target.value })}
                    placeholder="Nhập số điện thoại..."
                    style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  />
                </label>

                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Email
                  <input
                    type="email"
                    value={form.EMAIL}
                    onChange={(event) => setForm({ ...form, EMAIL: event.target.value })}
                    placeholder="email@example.com"
                    style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  />
                </label>

                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  CCCD / Mã số thuế
                  <input
                    value={form.MASOTHUE}
                    onChange={(event) => setForm({ ...form, MASOTHUE: event.target.value })}
                    placeholder="Nhập CCCD hoặc mã số thuế..."
                    style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                  />
                </label>

                <label style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Địa chỉ
                  <textarea
                    value={form.DIACHI}
                    onChange={(event) => setForm({ ...form, DIACHI: event.target.value })}
                    placeholder="Nhập địa chỉ..."
                    rows={3}
                    style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, resize: 'vertical' }}
                  />
                </label>
              </div>

              {formError && (
                <div style={{ marginTop: 9, padding: '6px 8px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 10.5 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 12 }}>
                <button type="button" onClick={closeForm} disabled={saving} style={{ padding: '5px 13px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#424242', fontSize: 11, cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={saving} style={{ padding: '5px 16px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Đang lưu...' : (formMode === 'add' ? 'Thêm khách hàng' : 'Lưu thay đổi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGroupForm && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingGroup) setShowGroupForm(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: 390, maxWidth: '100%', background: 'white', borderRadius: 7, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.28)' }}>
            <div style={{ background: '#E65100', color: 'white', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>THÊM NHÓM KHÁCH HÀNG</div>
              <button type="button" onClick={() => !savingGroup && setShowGroupForm(false)} disabled={savingGroup} style={{ border: 0, background: 'transparent', color: 'white', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <X size={17} />
              </button>
            </div>
            <form onSubmit={handleAddGroup} style={{ padding: 14 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                Tên nhóm khách hàng <span style={{ color: '#D32F2F' }}>*</span>
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="Nhập tên nhóm..."
                  style={{ width: '100%', marginTop: 4, padding: '7px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                />
              </label>
              {groupError && (
                <div style={{ marginTop: 8, padding: '6px 8px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 10.5 }}>
                  {groupError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 12 }}>
                <button type="button" onClick={() => setShowGroupForm(false)} disabled={savingGroup} style={{ padding: '5px 13px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#424242', fontSize: 11, cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={savingGroup} style={{ padding: '5px 16px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: savingGroup ? 'wait' : 'pointer', opacity: savingGroup ? 0.7 : 1 }}>
                  {savingGroup ? 'Đang lưu...' : 'Thêm nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
