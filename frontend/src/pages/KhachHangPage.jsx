import { can, canQuickCreate } from '../utils/permissions';
import CustomerFormModal from '../components/CustomerFormModal';
import { openDocumentPrint } from '../components/DocumentPrintDialog';
import { useEffect, useState, useMemo } from 'react';
import {
  Users, Plus, FileSpreadsheet, MoreVertical,
  User, Edit, Phone, Mail, MapPin, Edit3, Eye, Clock,
  Car, CircleDollarSign, X, Trash2, ArrowLeft
} from 'lucide-react';
import { customers, masterData, vehicles } from '../services';
import './KhachHangPage.css';
import { discountPolicy } from '../utils/pricingPolicy';

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
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'detail' | 'history'
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
    DNHOMKHACHHANGID: '', GIAMGIARIENG: '',
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
    if (!can('CUSTOMERS',2)) return;
    setForm({ NAME: '', MAKHACH: '', DIENTHOAI: '', EMAIL: '', DIACHI: '', MASOTHUE: '', DNHOMKHACHHANGID: '', GIAMGIARIENG: '' });
    setFormError('');
    setFormMode('add');
  };

  const openEditForm = (customer) => {
    if (!can('CUSTOMERS',4)) return;
    if (!customer) return;
    setForm({
      NAME: customer.NAME || customer.TENKH || customer.HOTEN || '',
      MAKHACH: customer.MAKHACH || customer.MAKH || customer.CODE || '',
      DIENTHOAI: customer.DIENTHOAI || customer.SDT || customer.SODT || '',
      EMAIL: customer.EMAIL || customer.MAIL || '',
      DIACHI: customer.DIACHI || customer.ADDRESS || '',
      MASOTHUE: customer.MASOTHUE || customer.CCCD || '',
      DNHOMKHACHHANGID: customer.DNHOMKHACHHANGID || '', GIAMGIARIENG: customer.GIAMGIARIENG == null ? '' : String(customer.GIAMGIARIENG),
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
    if (!can('CUSTOMERS',8)) return;
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
    <div className="kh-page-container">
      {/* Page Header */}
      <div className="kh-header">
        <h1 className="kh-header-title">
          <span style={{ display: 'flex', alignItems: 'center' }}><Users size={20} color="#E65100" /></span>
          Khách hàng
        </h1>
        <div className="kh-actions-group">
          <button disabled={!can('CUSTOMERS',2)} onClick={openAddForm} className="kh-btn-add">
            <Plus size={14} /> Thêm khách hàng
          </button>
          <div className="kh-actions-row-mobile">
            <button
              type="button"
              className="kh-btn-outline"
              onClick={() => alert('Chức năng Import Excel')}
            >
              <FileSpreadsheet size={14} color="#4CAF50" /> Import Excel
            </button>
            <button
              type="button"
              className="kh-btn-outline"
              onClick={() => alert('Chức năng Xuất Excel')}
            >
              <FileSpreadsheet size={14} color="#2196F3" /> Xuất Excel
            </button>
            <button
              type="button"
              className="kh-btn-outline"
              style={{ padding: '6px 8px' }}
            >
              <MoreVertical size={14} color="#424242" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="kh-filter-bar">
        <div className="kh-search-box">
          <input
            type="text"
            className="kh-search-input"
            placeholder="Tìm theo tên, SĐT, CCCD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="kh-filter-select-row">
          <div className="kh-filter-item">
            <span className="kh-filter-label">Nhóm</span>
            <select
              className="kh-filter-select"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {customerGroups.map((g) => <option key={g.ID} value={g.ID}>{g.NAME}</option>)}
              <option value="__none__">Chưa phân nhóm</option>
            </select>
          </div>
          <div className="kh-filter-item">
            <span className="kh-filter-label">Trạng thái</span>
            <select
              className="kh-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="1">Đang HĐ</option>
              <option value="0">Ngừng HĐ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Segmented Tabs */}
      <div className="kh-mobile-tabs">
        <button
          type="button"
          className={`kh-mobile-tab-btn ${mobileTab === 'list' ? 'active' : ''}`}
          onClick={() => setMobileTab('list')}
        >
          <Users size={14} /> Danh sách ({filtered.length})
        </button>
        <button
          type="button"
          className={`kh-mobile-tab-btn ${mobileTab === 'detail' ? 'active' : ''}`}
          onClick={() => setMobileTab('detail')}
        >
          <User size={14} /> Chi tiết & Xe
        </button>
        <button
          type="button"
          className={`kh-mobile-tab-btn ${mobileTab === 'history' ? 'active' : ''}`}
          onClick={() => setMobileTab('history')}
        >
          <Clock size={14} /> Lịch sử & Công nợ
        </button>
      </div>

      <div className="kh-main-grid">

        {/* Cột trái: Danh sách KH & Lịch sử */}
        <div className="kh-left-col">
          {/* Card Danh sách khách hàng */}
          <div className={`card ${mobileTab !== 'list' ? 'kh-mobile-hidden' : ''}`} style={{ flex: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
            <div className="kh-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="kh-table-customer">
                <thead>
                  <tr>
                    <th style={{ width: 34, textAlign: 'center' }}>STT</th>
                    <th style={{ width: 70 }}>Mã KH</th>
                    <th style={{ minWidth: 120 }}>Tên khách hàng</th>
                    <th style={{ width: 95 }}>Số điện thoại</th>
                    <th style={{ width: 90 }}>Nhóm KH</th>
                    <th style={{ width: 85, textAlign: 'right' }}>Công nợ</th>
                    <th style={{ width: 85, textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 14, color: '#757575' }}>Đang tải...</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 14, color: '#757575' }}>Chưa có khách hàng</td></tr>
                  )}
                  {!loading && filtered.map((c, idx) => {
                    const isActive = (selected?.DKHACHHANGID || selected?.ID) === (c.DKHACHHANGID || c.ID);
                    const stt = customerStatus(c);
                    return (
                      <tr
                        key={c.DKHACHHANGID || c.ID || idx}
                        onClick={() => {
                          setSelected(c);
                          if (window.innerWidth <= 768) {
                            setMobileTab('detail');
                          }
                        }}
                        style={{
                          background: isActive ? '#FFE0B2' : (idx % 2 === 0 ? '#FFF3E0' : 'white'),
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{customerCode(c)}</td>
                        <td style={{ fontWeight: 600, color: '#1E293B' }}>{customerName(c)}</td>
                        <td>{customerPhone(c) || '—'}</td>
                        <td style={{ color: customerGroup(c) ? '#1E293B' : '#9E9E9E' }}>{customerGroup(c) || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: customerDebt(c) > 0 ? 700 : 400, color: customerDebt(c) > 0 ? '#D32F2F' : '#424242' }}>
                          {fmtMoney(customerDebt(c))}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={Number(stt) === 1 ? 'badge badge-success' : 'badge badge-secondary'}
                            style={{ fontSize: 9.5, padding: '2px 5px' }}
                          >
                            {Number(stt) === 1 ? 'Đang HĐ' : 'Ngừng HĐ'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={13} title="Xem" style={{ cursor: 'pointer', color: '#757575' }} onClick={() => { setSelected(c); setMobileTab('detail'); }} />
                            <Edit size={13} title="Sửa" style={{ cursor: 'pointer', color: '#E65100' }} onClick={() => { setSelected(c); openEditForm(c); }} />
                            <Trash2 size={13} title="Xóa" style={{ cursor: deletingId ? 'wait' : 'pointer', color: '#D32F2F', opacity: deletingId === (c.ID || c.DKHACHHANGID) ? 0.45 : 1 }} onClick={() => handleDeleteCustomer(c)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="kh-pagination-bar">
              <span style={{ color: '#475569' }}>Tổng cộng: <b>{filtered.length} khách hàng</b></span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button type="button" className="kh-pagination-btn">&lt;</button>
                <button type="button" className="kh-pagination-btn active">1</button>
                <button type="button" className="kh-pagination-btn">&gt;</button>
              </div>
            </div>
          </div>

          {/* Card Lịch sử giao dịch */}
          <div className={`card ${mobileTab !== 'history' ? 'kh-mobile-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
            <div className="card-header" style={{ padding: '8px 12px', borderBottom: '1px solid #eee', background: '#F8FAFC', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1E293B' }}>
                <Clock size={15} color="#E65100" /> Lịch sử giao dịch gần đây
              </h3>
            </div>
            <div className="kh-table-responsive" style={{ overflowY: 'auto', flex: 1 }}>
              <table className="table kh-table-tx" style={{ border: 'none', width: '100%', fontSize: 11, margin: 0 }}>
                <thead>
                  <tr style={{ background: '#E65100' }}>
                    <th style={{ color: 'white', padding: '6px 8px' }}>Ngày</th>
                    <th style={{ color: 'white', padding: '6px 8px' }}>Loại giao dịch</th>
                    <th style={{ color: 'white', padding: '6px 8px' }}>Nội dung</th>
                    <th style={{ color: 'white', padding: '6px 8px', textAlign: 'right' }}>Số tiền</th>
                    <th style={{ color: 'white', padding: '6px 8px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16, color: '#757575' }}>Chưa có giao dịch</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin chi tiết + Xe + Công nợ */}
        <div className="kh-right-col">

          {/* Thông tin khách hàng */}
          <div className={`card kh-detail-card ${mobileTab !== 'detail' ? 'kh-mobile-hidden' : ''}`}>
            <div className="kh-detail-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="kh-mobile-back-btn"
                  onClick={() => setMobileTab('list')}
                >
                  <ArrowLeft size={12} /> Danh sách
                </button>
                <h3 style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1E293B' }}>
                  <User size={16} color="#E65100" /> Thông tin khách hàng
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" disabled={!selected} onClick={()=>openDocumentPrint({type:'MauCongNoKhachHang',id:selected?.DKHACHHANGID||selected?.ID})}>In công nợ</button><button onClick={() => openEditForm(selected)} disabled={!can('CUSTOMERS',4) || !selected} className="btn btn-ghost btn-sm" style={{ border: '1px solid #FF9800', color: '#E65100', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, opacity: selected ? 1 : 0.5 }}>
                  <Edit size={12} /> Sửa
                </button>
                <button onClick={() => handleDeleteCustomer(selected)} disabled={!can('CUSTOMERS',8) || !selected || Boolean(deletingId)} className="btn btn-ghost btn-sm" style={{ border: '1px solid #D32F2F', color: '#D32F2F', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, opacity: selected && !deletingId ? 1 : 0.5 }}>
                  <Trash2 size={12} /> Xóa
                </button>
              </div>
            </div>

            {!selected ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#757575', fontSize: 11 }}>Chọn khách hàng để xem chi tiết</div>
            ) : (
              <div className="kh-detail-split">
                <div className="kh-detail-left-info">
                  <div className="kh-detail-main-info">
                    <div className="kh-detail-avatar"><User size={24} /></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{customerName(selected)}</span>
                        {customerGroup(selected) ? (
                          <span className="badge" style={{ background: '#FFCC80', color: '#E65100', padding: '2px 8px', borderRadius: 10, fontSize: 10.5, fontWeight: 600 }}>{customerGroup(selected)}</span>
                        ) : (
                          <span className="badge" style={{ background: '#F1F5F9', color: '#94A3B8', padding: '2px 8px', borderRadius: 10, fontSize: 10.5 }}>Chưa phân nhóm</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>Mã KH: <b style={{ color: '#1E293B' }}>{customerCode(selected)}</b></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                    <div className="kh-detail-row">
                      <div className="kh-detail-label">Số điện thoại</div>
                      <div className="kh-detail-value">
                        {customerPhone(selected) ? (
                          <a href={`tel:${customerPhone(selected)}`} style={{ color: '#E65100', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {customerPhone(selected)} <Phone size={13} color="#E65100" />
                          </a>
                        ) : '—'}
                      </div>
                    </div>
                    <div className="kh-detail-row">
                      <div className="kh-detail-label">Email</div>
                      <div className="kh-detail-value">
                        {customerEmail(selected) ? (
                          <a href={`mailto:${customerEmail(selected)}`} style={{ color: '#1565C0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Mail size={13} color="#1565C0" /> {customerEmail(selected)}
                          </a>
                        ) : '—'}
                      </div>
                    </div>
                    <div className="kh-detail-row">
                      <div className="kh-detail-label">Địa chỉ</div>
                      <div className="kh-detail-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={13} color="#E65100" style={{ flexShrink: 0 }} /> {customerAddr(selected) || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="kh-detail-right-stats">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#64748B', fontSize: 11 }}>Ngày tạo:</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1E293B' }}>{customerCreated(selected) ? new Date(customerCreated(selected)).toLocaleDateString('vi-VN') : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#64748B', fontSize: 11 }}>Trạng thái:</div>
                    <div>
                      <span
                        className={Number(customerStatus(selected)) === 1 ? 'badge badge-success' : 'badge badge-secondary'}
                        style={{ padding: '2px 7px', borderRadius: 10, fontSize: 9.5 }}
                      >
                        {Number(customerStatus(selected)) === 1 ? 'Đang HĐ' : 'Ngừng HĐ'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <div style={{ color: '#64748B', fontSize: 11 }}>Công nợ:</div>
                    <div style={{ color: customerDebt(selected) > 0 ? '#E65100' : '#1E293B', fontWeight: 800, fontSize: 12.5 }}>{fmtMoney(customerDebt(selected))}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <div style={{ color: '#64748B', fontSize: 11 }}>Chi tiêu:</div>
                    <div style={{ fontWeight: 800, fontSize: 12.5, color: '#1E293B' }}>{fmtMoney(customerSpent(selected))}</div>
                  </div>
                </div>
              </div>
            )}

            {selected && <div style={{padding: "8px 12px", color: "#c2410c", fontSize: 12}}>Giảm giá {discountPolicy(selected).discountRate}% · {discountPolicy(selected).discountSource}</div>}
            {selected && customerNote(selected) && (
              <div style={{ marginTop: 8, padding: '7px 10px', background: '#FFF8E1', borderRadius: 6, border: '1px solid #FFE0B2', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E65100', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Edit3 size={12} /> Ghi chú:
                </div>
                <div style={{ fontSize: 11.5, color: '#334155' }}>{customerNote(selected)}</div>
              </div>
            )}
          </div>

          {/* Danh sách xe của khách hàng */}
          <div className={`card ${mobileTab !== 'detail' ? 'kh-mobile-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 120 }}>
            <div className="card-header" style={{ padding: '8px 12px', borderBottom: '1px solid #eee', background: '#F8FAFC', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, color: '#1E293B', fontWeight: 700 }}>
                <Car size={15} color="#E65100" /> Danh sách xe của khách hàng
              </h3>
              <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #FF9800', color: '#E65100', borderRadius: 4, padding: '2px 8px', fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Thêm xe
              </button>
            </div>
            <div className="kh-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="kh-table-vehicle" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#FFF3E0' }}>
                    <th style={{ color: '#E65100', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFE0B2' }}>Biển số</th>
                    <th style={{ color: '#E65100', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFE0B2' }}>Hãng xe</th>
                    <th style={{ color: '#E65100', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFE0B2' }}>Dòng xe</th>
                    <th style={{ color: '#E65100', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFE0B2' }}>Màu</th>
                    <th style={{ color: '#E65100', padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #FFE0B2' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {!selected && (
                    <tr><td colSpan={5} style={{ padding: 14, textAlign: 'center', color: '#757575' }}>Chọn khách hàng</td></tr>
                  )}
                  {selected && selectedVehicles.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 14, textAlign: 'center', color: '#757575' }}>Chưa có xe</td></tr>
                  )}
                  {selected && selectedVehicles.map((v, idx) => (
                    <tr key={v.DXEID || v.ID || idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '6px 8px', color: '#002147', fontWeight: 600 }}>{v.BIENSO || v.PLATE || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#424242' }}>{v.HANGXE || v.BRAND || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#424242' }}>{v.DONGXE || v.MODEL || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#424242' }}>{v.MAU || v.COLOR || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#424242', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Eye size={13} style={{ cursor: 'pointer', color: '#757575' }} />
                          <Edit size={13} style={{ cursor: 'pointer', color: '#757575' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Công nợ */}
          <div className={`card ${mobileTab !== 'history' ? 'kh-mobile-hidden' : ''}`} style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 160 }}>
            <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid #eee', background: '#F8FAFC', flexShrink: 0 }}>
              <div style={{ padding: '4px 10px', background: '#FF3D00', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <CircleDollarSign size={13} /> Công nợ
              </div>
              <div style={{ padding: '4px 10px', background: 'white', color: '#002147', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Lịch hẹn
              </div>
              <div style={{ padding: '4px 10px', background: 'white', color: '#002147', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                Ghi chú
              </div>
            </div>
            <div className="card-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 calc(33% - 6px)', minWidth: 100, background: '#FFF3E0', borderRadius: 6, padding: '8px', border: '1px solid #FFE0B2', textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: '#E65100', fontWeight: 600, marginBottom: 2 }}>Tổng công nợ</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#D32F2F' }}>{fmtMoney(selected ? customerDebt(selected) : 0)}</div>
                </div>
                <div style={{ flex: '1 1 calc(33% - 6px)', minWidth: 100, background: 'white', borderRadius: 6, padding: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: '#757575', marginBottom: 2 }}>Nợ hiện tại</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#002147' }}>{fmtMoney(selected ? customerDebt(selected) : 0)}</div>
                </div>
                <div style={{ flex: '1 1 calc(33% - 6px)', minWidth: 100, background: 'white', borderRadius: 6, padding: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: '#757575', marginBottom: 2 }}>Hạn thanh toán</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#002147' }}>—</div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 11, color: '#002147' }}>Chi tiết công nợ</h4>
                <div className="kh-table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, border: '1px solid #eee', minWidth: 360 }}>
                    <thead>
                      <tr style={{ background: '#FFF3E0' }}>
                        <th style={{ color: '#E65100', padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Ngày</th>
                        <th style={{ color: '#E65100', padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Nội dung</th>
                        <th style={{ color: '#E65100', padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>Số tiền</th>
                        <th style={{ color: '#E65100', padding: '5px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Trạng thái</th>
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
      </div>

      {formMode && <CustomerFormModal formMode={formMode} form={form} setForm={setForm} saving={saving} formError={formError} customerGroups={customerGroups} closeForm={closeForm} handleFormSubmit={handleFormSubmit} openGroupForm={openGroupForm} />}

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
