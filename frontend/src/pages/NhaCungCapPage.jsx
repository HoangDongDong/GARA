import SupplierFormModal from '../components/SupplierFormModal';
import { openDocumentPrint } from '../components/DocumentPrintDialog';
import { useEffect, useMemo, useState } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { suppliers } from '../services';
import './NhaCungCapPage.css';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const shortDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const EMPTY_FORM = {
  NAME: '', MANHACUNGCAP: '', DNHOMNHACUNGCAPID: '',
  DIENTHOAI: '', EMAIL: '', DIACHI: '', WEBSITE: '', NOTE: '',
};

export default function NhaCungCapPage() {
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'detail' | 'stats'
  const [supplierList, setSupplierList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const loadSuppliers = async (preferredId) => {
    setLoading(true);
    try {
      const [items, groups] = await Promise.all([suppliers.list(), suppliers.groups()]);
      const nextItems = Array.isArray(items) ? items : [];
      setSupplierList(nextItems);
      setGroupList(Array.isArray(groups) ? groups : []);
      setSelected((current) => {
        const id = preferredId || current?.ID;
        return nextItems.find((item) => item.ID === id) || nextItems[0] || null;
      });
    } catch (error) {
      console.error('Load suppliers error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const openAddForm = () => {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setFormMode('add');
  };

  const openEditForm = (supplier) => {
    if (!supplier) return;
    setForm({
      NAME: supplier.NAME || '',
      MANHACUNGCAP: supplier.MANHACUNGCAP || '',
      DNHOMNHACUNGCAPID: supplier.DNHOMNHACUNGCAPID || '',
      DIENTHOAI: supplier.DIENTHOAI || '',
      EMAIL: supplier.EMAIL || '',
      DIACHI: supplier.DIACHI || '',
      WEBSITE: supplier.WEBSITE || '',
      NOTE: supplier.NOTE || '',
    });
    setFormError('');
    setFormMode('edit');
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.NAME.trim();
    const code = form.MANHACUNGCAP.trim();
    if (!name || !code) {
      setFormError('Vui lòng nhập tên và mã nhà cung cấp.');
      return;
    }

    const editingId = formMode === 'edit' ? selected?.ID : null;
    const duplicate = supplierList.some((item) =>
      item.ID !== editingId
      && String(item.MANHACUNGCAP || '').trim().toUpperCase() === code.toUpperCase()
    );
    if (duplicate) {
      setFormError('Mã nhà cung cấp đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() || null])
    );
    try {
      if (formMode === 'edit') {
        await suppliers.update(selected.ID, payload);
        await loadSuppliers(selected.ID);
      } else {
        const result = await suppliers.create(payload);
        await loadSuppliers(result?.id);
      }
      setFormMode(null);
    } catch (error) {
      setFormError(error?.response?.data?.error || error.message || 'Không thể lưu nhà cung cấp.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier) => {
    if (!supplier?.ID || deletingId) return;
    if (!window.confirm(`Bạn có chắc muốn xóa nhà cung cấp "${supplier.NAME}"?`)) return;
    setDeletingId(supplier.ID);
    try {
      await suppliers.remove(supplier.ID);
      await loadSuppliers();
    } catch (error) {
      window.alert(error?.response?.data?.error || error.message || 'Không thể xóa nhà cung cấp.');
    } finally {
      setDeletingId(null);
    }
  };

  const openGroupForm = (group = null) => {
    setEditingGroup(group);
    setNewGroupName(group?.NAME || '');
    setGroupError('');
    setShowGroupForm(true);
  };

  const handleAddGroup = async (event) => {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      setGroupError('Vui lòng nhập tên nhóm nhà cung cấp.');
      return;
    }
    if (groupList.some((group) => group.ID !== editingGroup?.ID && String(group.NAME || '').trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) {
      setGroupError('Nhóm nhà cung cấp này đã tồn tại.');
      return;
    }

    setSavingGroup(true);
    setGroupError('');
    try {
      const result = editingGroup
        ? await suppliers.updateGroup(editingGroup.ID, { NAME: name })
        : await suppliers.createGroup({ NAME: name });
      const refreshedGroups = await suppliers.groups();
      setGroupList(Array.isArray(refreshedGroups) ? refreshedGroups : []);
      setForm((current) => ({ ...current, DNHOMNHACUNGCAPID: editingGroup?.ID || result?.id || '' }));
      setShowGroupForm(false);
      setEditingGroup(null);
    } catch (error) {
      setGroupError(error?.response?.data?.error || error.message || 'Không thể thêm nhóm nhà cung cấp.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!group?.ID || deletingGroupId) return;
    if (!window.confirm(`Bạn có chắc muốn xóa nhóm nhà cung cấp "${group.NAME}"?`)) return;
    setDeletingGroupId(group.ID);
    try {
      await suppliers.removeGroup(group.ID);
      const refreshedGroups = await suppliers.groups();
      setGroupList(Array.isArray(refreshedGroups) ? refreshedGroups : []);
      if (form.DNHOMNHACUNGCAPID === group.ID) {
        setForm((current) => ({ ...current, DNHOMNHACUNGCAPID: '' }));
      }
    } catch (error) {
      window.alert(error?.response?.data?.error || error.message || 'Không thể xóa nhóm nhà cung cấp.');
    } finally {
      setDeletingGroupId(null);
    }
  };

  useEffect(() => {
    if (!selected?.ID) {
      setTransactions([]);
      return;
    }
    suppliers.transactions(selected.ID)
      .then((items) => setTransactions(Array.isArray(items) ? items : []))
      .catch((error) => {
        console.error('Load supplier transactions error', error);
        setTransactions([]);
      });
  }, [selected?.ID]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return supplierList.filter((item) => {
      if (groupFilter && item.DNHOMNHACUNGCAPID !== groupFilter) return false;
      if (statusFilter !== '' && String(item.STATUS) !== statusFilter) return false;
      if (!keyword) return true;
      return [item.NAME, item.MANHACUNGCAP, item.DIENTHOAI]
        .some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword));
    });
  }, [supplierList, search, groupFilter, statusFilter]);

  useEffect(() => {
    if (!filtered.some((item) => item.ID === selected?.ID)) {
      setSelected(filtered[0] || null);
    }
  }, [filtered, selected?.ID]);

  const groupStats = useMemo(() => groupList.map((group) => ({
    ...group,
    count: supplierList.filter((item) => item.DNHOMNHACUNGCAPID === group.ID).length,
  })), [groupList, supplierList]);

  const totalDebt = supplierList.reduce((sum, item) => sum + Number(item.TOTAL_DEBT || 0), 0);
  const activeCount = supplierList.filter((item) => Number(item.STATUS) === 1).length;
  const inactiveCount = supplierList.length - activeCount;
  const debtLeaders = [...supplierList]
    .filter((item) => Number(item.TOTAL_DEBT) > 0)
    .sort((a, b) => Number(b.TOTAL_DEBT) - Number(a.TOTAL_DEBT));
  const topDebt = debtLeaders.slice(0, 3);
  const otherDebt = debtLeaders.slice(3).reduce((sum, item) => sum + Number(item.TOTAL_DEBT || 0), 0);
  const debtPalette = ['#F44336', '#FF9800', '#2196F3', '#4CAF50'];
  let debtOffset = 0;
  const debtSegments = [...topDebt.map((item) => ({ name: item.NAME, value: Number(item.TOTAL_DEBT || 0) })), ...(otherDebt > 0 ? [{ name: 'Khác', value: otherDebt }] : [])]
    .map((item, index) => {
      const length = totalDebt > 0 ? (item.value / totalDebt) * 88 : 0;
      const segment = { ...item, color: debtPalette[index], length, offset: debtOffset };
      debtOffset += length;
      return segment;
    });

  return (
    <div className="ncc-page-container">
      {/* Page Header */}
      <div className="ncc-header">
        <h1 className="ncc-header-title">
          <span className="page-icon">🏢</span>
          Nhà cung cấp
        </h1>
        <div className="ncc-actions-group">
          <button onClick={openAddForm} className="ncc-btn-add">
            <Plus size={16} /> Thêm nhà cung cấp
          </button>
          <div className="ncc-actions-row-mobile">
            <button 
              type="button" 
              className="ncc-btn-outline" 
              onClick={() => alert('Chức năng Import dữ liệu từ Excel')}
            >
              <FileSpreadsheet size={15} /> Import Excel
            </button>
            <button 
              type="button" 
              className="ncc-btn-outline" 
              onClick={() => alert('Đã xuất danh sách nhà cung cấp ra file Excel')}
            >
              <FileSpreadsheet size={15} /> Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="ncc-filter-bar">
        <div className="ncc-search-box">
          <input 
            type="text" 
            placeholder="Tìm theo tên NCC, mã NCC, SĐT..." 
            value={search} 
            onChange={(event) => setSearch(event.target.value)} 
            className="ncc-search-input"
          />
        </div>
        <div className="ncc-filter-select-row">
          <div className="ncc-filter-item">
            <label className="ncc-filter-label">Nhóm NCC</label>
            <select 
              value={groupFilter} 
              onChange={(event) => setGroupFilter(event.target.value)} 
              className="ncc-filter-select"
            >
              <option value="">Tất cả</option>
              {groupList.map((group) => (
                <option key={group.ID} value={group.ID}>{group.NAME}</option>
              ))}
            </select>
          </div>
          <div className="ncc-filter-item">
            <label className="ncc-filter-label">Trạng thái</label>
            <select 
              value={statusFilter} 
              onChange={(event) => setStatusFilter(event.target.value)} 
              className="ncc-filter-select"
            >
              <option value="">Tất cả</option>
              <option value="1">Đang hoạt động</option>
              <option value="0">Tạm ngưng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Tabs Switcher */}
      <div className="ncc-mobile-tabs">
        <button
          type="button"
          className={`ncc-tab-btn ${mobileTab === 'list' ? 'active' : ''}`}
          onClick={() => setMobileTab('list')}
        >
          🏢 Danh sách ({filtered.length})
        </button>
        <button
          type="button"
          className={`ncc-tab-btn ${mobileTab === 'detail' ? 'active' : ''}`}
          onClick={() => setMobileTab('detail')}
        >
          📋 Chi tiết
        </button>
        <button
          type="button"
          className={`ncc-tab-btn ${mobileTab === 'stats' ? 'active' : ''}`}
          onClick={() => setMobileTab('stats')}
        >
          📊 Nhóm & Thống kê
        </button>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="ncc-main-grid">
        {/* CỘT TRÁI (BẢNG CHÍNH + 3 CARDS ĐÁY) */}
        <div className="ncc-left-col">
          {/* Main Table: on mobile hidden if mobileTab !== 'list' */}
          <div 
            className={`card ${mobileTab !== 'list' ? 'ncc-mobile-hidden' : ''}`} 
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <div className="card-body no-padding ncc-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table" style={{ border: 'none', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: 'center' }}>STT</th>
                    <th style={{ width: 95 }}>Mã NCC</th>
                    <th>Tên nhà cung cấp</th>
                    <th>Nhóm NCC</th>
                    <th>Điện thoại</th>
                    <th>Địa chỉ</th>
                    <th>Trạng thái</th>
                    <th style={{ width: 85, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>Đang tải dữ liệu...</td></tr>}
                  {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16 }}>Chưa có nhà cung cấp</td></tr>}
                  {!loading && filtered.map((item, index) => (
                    <tr 
                      key={item.ID} 
                      onClick={() => {
                        setSelected(item);
                        setMobileTab('detail');
                      }} 
                      style={{ background: selected?.ID === item.ID ? '#FFF3E0' : undefined, cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ fontWeight: 600, color: '#E65100' }}>{item.MANHACUNGCAP || '—'}</td>
                      <td style={{ fontWeight: 600, color: '#1E293B' }}>{item.NAME || '—'}</td>
                      <td>{item.GROUP_NAME || '—'}</td>
                      <td>{item.DIENTHOAI || '—'}</td>
                      <td>{item.DIACHI || '—'}</td>
                      <td>
                        <span className={Number(item.STATUS) === 1 ? 'badge badge-success' : 'badge badge-neutral'}>
                          {Number(item.STATUS) === 1 ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()} style={{ textAlign: 'center' }}>
                        <button 
                          type="button" 
                          title="Xem" 
                          onClick={() => {
                            setSelected(item);
                            setMobileTab('detail');
                          }} 
                          style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer' }}
                        >
                          👁️
                        </button>
                        <button 
                          type="button" 
                          title="Sửa" 
                          onClick={() => { setSelected(item); openEditForm(item); }} 
                          style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                        <button 
                          type="button" 
                          title="Xóa" 
                          onClick={() => handleDelete(item)} 
                          disabled={Boolean(deletingId)} 
                          style={{ border: 0, background: 'transparent', padding: 4, cursor: deletingId ? 'wait' : 'pointer', opacity: deletingId === item.ID ? 0.45 : 1 }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Tổng cộng: <b>{filtered.length}</b> nhà cung cấp</span>
              <div className="pagination">
                <button className="btn btn-ghost">&lt;</button>
                <button className="btn active" style={{ background: '#E65100', color: 'white', border: 'none' }}>1</button>
                <button className="btn btn-ghost">&gt;</button>
              </div>
            </div>
          </div>

          {/* 3 Bottom Cards: on mobile hidden if mobileTab !== 'stats' */}
          <div className={`ncc-bottom-cards-row ${mobileTab !== 'stats' ? 'ncc-mobile-hidden' : ''}`}>
            {/* Card 1: Nhóm NCC */}
            <div className="card ncc-sub-card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 13 }}><span className="icon">📂</span> Nhóm nhà cung cấp</h3>
                <button 
                  onClick={() => openGroupForm()} 
                  className="link-btn" 
                  style={{ border: '1px solid #E65100', color: '#E65100', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}
                >
                  + Thêm
                </button>
              </div>
              <div className="card-body no-padding" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="table" style={{ border: 'none', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                      <th>Nhóm NCC</th>
                      <th className="text-center" style={{ width: 60 }}>SL</th>
                      <th className="text-center" style={{ width: 60 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map((group, index) => (
                      <tr key={group.ID}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: 500 }}>{group.NAME}</td>
                        <td className="text-center">{group.count}</td>
                        <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                          <button type="button" title="Sửa nhóm" onClick={() => openGroupForm(group)} style={{ border: 0, background: 'transparent', padding: 2, cursor: 'pointer' }}>✏️</button>
                          <button type="button" title="Xóa nhóm" onClick={() => handleDeleteGroup(group)} disabled={Boolean(deletingGroupId)} style={{ border: 0, background: 'transparent', padding: 2, cursor: deletingGroupId ? 'wait' : 'pointer', opacity: deletingGroupId === group.ID ? 0.45 : 1 }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {!loading && groupStats.length === 0 && <tr><td colSpan={4} className="text-center" style={{ padding: 12 }}>Chưa có nhóm nhà cung cấp</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 2: Thống kê NCC */}
            <div className="card ncc-sub-card">
              <div className="card-header"><h3 style={{ margin: 0, fontSize: 13 }}><span className="icon">📊</span> Thống kê nhà cung cấp</h3></div>
              <div className="card-body" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10 }}>
                <div style={{ background: '#FFF3E0', borderRadius: 8, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#E65100', fontSize: 18 }}>🏢</div>
                  <div style={{ fontSize: 10, color: '#757575', marginTop: 2 }}>Tổng số NCC</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#E65100' }}>{supplierList.length}</div>
                </div>
                <div style={{ background: '#E8F5E9', borderRadius: 8, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#4CAF50', fontSize: 18 }}>✔️</div>
                  <div style={{ fontSize: 10, color: '#757575', marginTop: 2 }}>Đang hoạt động</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2E7D32' }}>{activeCount}</div>
                </div>
                <div style={{ background: '#E3F2FD', borderRadius: 8, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#2196F3', fontSize: 18 }}>⏸️</div>
                  <div style={{ fontSize: 10, color: '#757575', marginTop: 2 }}>Tạm ngưng</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1565C0' }}>{inactiveCount}</div>
                </div>
                <div style={{ background: '#F3E5F5', borderRadius: 8, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#9C27B0', fontSize: 18 }}>💰</div>
                  <div style={{ fontSize: 10, color: '#757575', marginTop: 2 }}>Tổng công nợ</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7B1FA2' }}>{money(totalDebt)}</div>
                </div>
              </div>
            </div>

            {/* Card 3: Công nợ theo NCC */}
            <div className="card ncc-sub-card">
              <div className="card-header"><h3 style={{ margin: 0, fontSize: 13 }}><span className="icon">🍩</span> Công nợ theo nhà cung cấp</h3></div>
              <div className="card-body" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: 10 }}>
                <div style={{ width: 90, height: 90, position: 'relative', flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#E0E0E0" strokeWidth="4"/>
                    {debtSegments.map((segment) => (
                      <circle key={segment.name} cx="18" cy="18" r="14" fill="none" stroke={segment.color} strokeWidth="4" strokeDasharray={`${segment.length} 88`} strokeDashoffset={-segment.offset} strokeLinecap="round"/>
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#E65100' }}>{money(totalDebt)}</div>
                    <div style={{ fontSize: 7.5, color: '#757575' }}>Tổng công nợ</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, minWidth: 0 }}>
                  {debtSegments.map((segment) => (
                    <div key={segment.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: segment.color, marginRight: 4 }}>●</span> 
                      <span style={{ color: '#475569' }}>{segment.name}</span>
                      <br/>
                      <b style={{ color: '#1E293B', marginLeft: 12 }}>{money(segment.value)}</b>
                    </div>
                  ))}
                  {debtSegments.length === 0 && <div style={{ color: '#757575', fontSize: 11 }}>Chưa phát sinh công nợ</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (CHI TIẾT NHÀ CUNG CẤP): on mobile hidden if mobileTab !== 'detail' */}
        <div className={`ncc-right-col ${mobileTab !== 'detail' ? 'ncc-mobile-hidden' : ''}`}>
          <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button 
                  type="button"
                  className="link-btn"
                  onClick={() => setMobileTab('list')}
                  style={{ border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: 4, fontSize: 11, color: '#475569' }}
                  id="ncc-back-to-list-btn"
                >
                  ← Quay lại
                </button>
                <h3 style={{ margin: 0, fontSize: 13 }}><span className="icon">🏢</span> Thông tin nhà cung cấp</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" disabled={!selected} onClick={()=>openDocumentPrint({type:'MauCongNoNhaCungCap',id:selected?.ID})}>In công nợ</button><button onClick={() => openEditForm(selected)} disabled={!selected} className="btn btn-ghost btn-sm" style={{ border: '1px solid #E65100', color: '#E65100', borderRadius: 4, opacity: selected ? 1 : 0.5 }}>✏️ Sửa</button>
                <button onClick={() => handleDelete(selected)} disabled={!selected || Boolean(deletingId)} className="btn btn-ghost btn-sm" style={{ border: '1px solid #D32F2F', color: '#D32F2F', borderRadius: 4, opacity: selected && !deletingId ? 1 : 0.5 }}>🗑️ Xóa</button>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header chi tiết */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, background: '#FF5722', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏢</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', wordBreak: 'break-word' }}>{selected?.NAME || 'Chưa chọn nhà cung cấp'}</div>
                </div>
                <div>
                  <span className={Number(selected?.STATUS) === 1 ? 'badge badge-success' : 'badge badge-neutral'}>
                    {selected ? (Number(selected.STATUS) === 1 ? 'Đang hoạt động' : 'Tạm ngưng') : '—'}
                  </span>
                </div>
              </div>

              {/* Chi tiết liên hệ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="detail-row"><div className="detail-label" style={{ width: 95 }}>Mã NCC</div><div className="detail-value" style={{ fontWeight: 600 }}>{selected?.MANHACUNGCAP || '—'}</div></div>
                <div className="detail-row"><div className="detail-label" style={{ width: 95 }}>Nhóm NCC</div><div className="detail-value">{selected?.GROUP_NAME || '—'}</div></div>
                <div className="detail-row">
                  <div className="detail-label" style={{ width: 95 }}>Điện thoại</div>
                  <div className="detail-value">
                    {selected?.DIENTHOAI ? <a href={`tel:${selected.DIENTHOAI}`} style={{ color: '#E65100', fontWeight: 600 }}>{selected.DIENTHOAI}</a> : '—'}
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label" style={{ width: 95 }}>Email</div>
                  <div className="detail-value">
                    {selected?.EMAIL ? <a href={`mailto:${selected.EMAIL}`} style={{ color: '#2563EB' }}>{selected.EMAIL}</a> : '—'}
                  </div>
                </div>
                <div className="detail-row"><div className="detail-label" style={{ width: 95 }}>Địa chỉ</div><div className="detail-value">{selected?.DIACHI || '—'}</div></div>
                <div className="detail-row"><div className="detail-label" style={{ width: 95 }}>Người liên hệ</div><div className="detail-value">—</div></div>
                <div className="detail-row"><div className="detail-label" style={{ width: 95 }}>Ghi chú</div><div className="detail-value" style={{ fontSize: 12, fontWeight: 400 }}>{selected?.NOTE || '—'}</div></div>
              </div>

              {/* Thẻ công nợ */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 calc(33% - 6px)', minWidth: 100, border: '1px solid #FFCDD2', background: '#FFEBEE', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: '#C62828', marginBottom: 2 }}>📉 Tổng công nợ</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#C62828' }}>{money(selected?.TOTAL_DEBT)}</div>
                </div>
                <div style={{ flex: '1 1 calc(33% - 6px)', minWidth: 100, border: '1px solid #C8E6C9', background: '#E8F5E9', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: '#2E7D32', marginBottom: 2 }}>✔️ Đã thanh toán</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#2E7D32' }}>{money(selected?.TOTAL_PAID)}</div>
                </div>
                <div style={{ flex: '1 1 calc(33% - 6px)', minWidth: 100, border: '1px solid #BBDEFB', background: '#E3F2FD', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: '#1565C0', marginBottom: 2 }}>📊 Hạn mức nợ</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1565C0' }}>—</div>
                </div>
              </div>
              
              {/* Lịch sử giao dịch */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #E0E0E0', borderRadius: 8, overflow: 'hidden', minHeight: 180 }}>
                <div style={{ padding: '8px 12px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <span style={{ color: '#E65100' }}>📝</span> Lịch sử giao dịch gần đây
                  </h4>
                </div>
                <div className="ncc-table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="table" style={{ border: 'none', width: '100%', minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Số chứng từ</th>
                        <th>Loại giao dịch</th>
                        <th style={{ textAlign: 'right' }}>Giá trị</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((item) => (
                        <tr key={item.ID}>
                          <td>{shortDate(item.NGAY)}</td>
                          <td style={{ fontWeight: 600 }}>{item.NAME || '—'}</td>
                          <td>{Number(item.LOAI) === 1 ? 'Nhập trả' : Number(item.LOAI) === 2 ? 'Chuyển kho' : 'Nhập hàng'}</td>
                          <td className="text-right" style={{ fontWeight: 600 }}>{money(item.TONGCONG)}</td>
                          <td>
                            <span className={Number(item.CONGNO) > 0 ? 'badge badge-neutral' : 'badge badge-success'}>
                              {Number(item.CONGNO) > 0 ? 'Còn nợ' : 'Đã thanh toán'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>Chưa có giao dịch</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {formMode && <SupplierFormModal formMode={formMode} form={form} setForm={setForm} saving={saving} formError={formError} groupList={groupList} closeForm={closeForm} handleSubmit={handleSubmit} openGroupForm={openGroupForm} />}

      {showGroupForm && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingGroup) setShowGroupForm(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: 410, maxWidth: '100%', background: 'white', borderRadius: 7, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.28)' }}>
            <div style={{ background: '#E65100', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>📂 {editingGroup ? 'SỬA NHÓM NHÀ CUNG CẤP' : 'THÊM NHÓM NHÀ CUNG CẤP'}</div>
              <button type="button" onClick={() => !savingGroup && setShowGroupForm(false)} disabled={savingGroup} style={{ border: 0, background: 'transparent', color: 'white', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleAddGroup} style={{ padding: 15 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                Tên nhóm nhà cung cấp <span style={{ color: '#D32F2F' }}>*</span>
                <input autoFocus value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Nhập tên nhóm nhà cung cấp..." style={{ width: '100%', marginTop: 4, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
              </label>
              {groupError && <div style={{ marginTop: 9, padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{groupError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 13 }}>
                <button type="button" onClick={() => setShowGroupForm(false)} disabled={savingGroup} style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#424242', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingGroup} style={{ padding: '6px 18px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: savingGroup ? 'wait' : 'pointer', opacity: savingGroup ? 0.7 : 1 }}>
                  {savingGroup ? 'Đang lưu...' : (editingGroup ? 'Lưu thay đổi' : 'Thêm nhóm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
