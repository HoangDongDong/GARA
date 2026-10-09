import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Edit3, KeyRound, Plus, Save, Shield, Trash2, UserCog, Users, X } from 'lucide-react';
import { accessControl } from '../services';
import './QuanTriPage.css';
import { functionMasks } from '../utils/permissions';

const BITS = [
  ['Xem', 1], ['Thêm', 2], ['Sửa', 4], ['Xóa', 8], ['In', 16],
];

const errorText = (error) => error?.response?.data?.error || error?.message || 'Có lỗi xảy ra.';
const isAdminOnlyFunction = (code) => code === 'ADMIN' || code === 'SETTINGS';

function Modal({ title, onClose, children }) {
  return <div className="qt-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="qt-modal">
      <div className="qt-modal-head"><b>{title}</b><button type="button" onClick={onClose}><X size={18}/></button></div>
      {children}
    </div>
  </div>;
}

export default function QuanTriPage() {
  const [data, setData] = useState({ groups: [], users: [], functions: [], employees: [] });
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [groupForm, setGroupForm] = useState(null);
  const [userForm, setUserForm] = useState(null);

  const notify = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const reload = useCallback(async (preferredGroupId) => {
    setLoading(true);
    try {
      const next = await accessControl.overview();
      const safe = next || { groups: [], users: [], functions: [], employees: [] };
      setData(safe);
      setSelectedGroupId((current) => preferredGroupId || current || safe.groups?.[0]?.ID || '');
    } catch (error) { notify(errorText(error), 'error'); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!selectedGroupId) { setPermissions([]); return; }
    accessControl.permissions(selectedGroupId).then(setPermissions).catch((error) => notify(errorText(error), 'error'));
  }, [selectedGroupId, notify]);

  const selectedGroup = data.groups.find((item) => item.ID === selectedGroupId);
  // Special access belongs to ISADMIN accounts, never to a group's name.
  const availableEmployees = useMemo(() => data.employees.filter((employee) => !employee.USERID), [data.employees]);

  const togglePermission = (functionId, bit) => {
    if (isAdminOnlyFunction(permissions.find((item) => item.FUNCTIONID === functionId)?.CODE)) return;
    setPermissions((current) => current.map((item) => item.FUNCTIONID !== functionId ? item : {
      ...item, MODE: ((Number(item.MODE) & bit) ? Number(item.MODE) & ~bit : Number(item.MODE) | bit) & (functionMasks[item.CODE] ?? 31),
    }));
  };

  const toggleAll = (functionId) => {
    if (isAdminOnlyFunction(permissions.find((item) => item.FUNCTIONID === functionId)?.CODE)) return;
    setPermissions((current) => current.map((item) => item.FUNCTIONID === functionId ? { ...item, MODE: (Number(item.MODE) & (functionMasks[item.CODE] ?? 31)) === (functionMasks[item.CODE] ?? 31) ? 0 : (functionMasks[item.CODE] ?? 31) } : item));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await accessControl.savePermissions(selectedGroupId, permissions.map((item) => ({ functionId: item.FUNCTIONID, mode: isAdminOnlyFunction(item.CODE) ? 0 : Number(item.MODE) })));
      notify(`Đã lưu quyền cho chức vụ ${selectedGroup?.NAME}.`);
    } catch (error) { notify(errorText(error), 'error'); }
    finally { setSaving(false); }
  };

  const saveGroup = async (event) => {
    event.preventDefault();
    try {
      if (groupForm.ID) await accessControl.updateGroup(groupForm.ID, { name: groupForm.NAME, note: groupForm.NOTE });
      else await accessControl.createGroup({ name: groupForm.NAME, note: groupForm.NOTE });
      const keep = groupForm.ID || '';
      setGroupForm(null); await reload(keep); notify('Đã lưu chức vụ.');
    } catch (error) { notify(errorText(error), 'error'); }
  };

  const removeGroup = async (group) => {
    if (!window.confirm(`Xóa chức vụ “${group.NAME}”?`)) return;
    try { await accessControl.removeGroup(group.ID); await reload(); notify('Đã xóa chức vụ.'); }
    catch (error) { notify(errorText(error), 'error'); }
  };

  const openCreateUser = () => setUserForm({ employeeId: availableEmployees[0]?.ID || '', username: '', password: '', email: availableEmployees[0]?.EMAIL || '', groupId: selectedGroupId || data.groups[0]?.ID || '' });
  const openEditUser = (user) => setUserForm({ ID: user.ID, employeeId: user.DNHANVIENID || '', employeeName: user.EMPLOYEENAME || user.NAME, username: user.USERNAME, password: '', email: user.EMAIL || '', groupId: user.SGROUPUSERID || '' });

  const saveUser = async (event) => {
    event.preventDefault();
    try {
      if (userForm.ID) await accessControl.updateUser(userForm.ID, userForm);
      else await accessControl.createUser(userForm);
      setUserForm(null); await reload(selectedGroupId); notify(userForm.ID ? 'Đã cập nhật tài khoản.' : 'Đã cấp tài khoản cho nhân viên.');
    } catch (error) { notify(errorText(error), 'error'); }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Khóa tài khoản “${user.USERNAME}”?`)) return;
    try { await accessControl.removeUser(user.ID); await reload(selectedGroupId); notify('Đã khóa tài khoản.'); }
    catch (error) { notify(errorText(error), 'error'); }
  };

  return <div className="qt-page">
    {toast && <div className={`qt-toast ${toast.type}`}>{toast.type === 'ok' ? <Check size={16}/> : <X size={16}/>} {toast.message}</div>}
    <div className="qt-titlebar">
      <div><h1><Shield size={22}/> Quản trị người dùng & phân quyền</h1><p>Chức vụ quyết định quyền; tài khoản được cấp sau khi đã có hồ sơ nhân viên.</p></div>
      <button className="qt-primary" onClick={openCreateUser} disabled={!availableEmployees.length || !data.groups.length}><Plus size={16}/> Thêm tài khoản</button>
    </div>

    <div className="qt-stats">
      <div><Users/><span><b>{data.groups.length}</b> Chức vụ</span></div>
      <div><KeyRound/><span><b>{data.users.length}</b> Tài khoản</span></div>
      <div><UserCog/><span><b>{availableEmployees.length}</b> Nhân viên chưa có tài khoản</span></div>
    </div>

    <section className="qt-card qt-accounts">
      <div className="qt-card-head"><div><b>Danh sách tài khoản</b><small>SUSER liên kết trực tiếp với DNHANVIEN và SGROUPUSER</small></div><button onClick={openCreateUser} disabled={!availableEmployees.length}><Plus size={15}/> Cấp tài khoản</button></div>
      <div className="qt-table-wrap"><table><thead><tr><th>Tài khoản</th><th>Nhân viên</th><th>Email</th><th>Chức vụ</th><th>Trạng thái</th><th style={{ textAlign: 'center', width: 140 }}>Thao tác</th></tr></thead>
        <tbody>{data.users.map((user) => <tr key={user.ID}><td><b>{user.USERNAME}</b>{Number(user.ISADMIN) === 1 && <em>Hệ thống</em>}</td><td>{user.EMPLOYEENAME || user.NAME || '—'}</td><td>{user.EMAIL || '—'}</td><td><span className="qt-role-badge">{user.GROUPNAME || 'Chưa gán'}</span></td><td><span className="qt-active">Đang hoạt động</span></td><td className="qt-actions"><button type="button" className="qt-action-btn qt-btn-edit" title="Sửa thông tin hoặc đặt lại mật khẩu" onClick={() => openEditUser(user)}><Edit3 size={13}/> Sửa</button><button type="button" className="qt-action-btn qt-btn-danger" title={Number(user.ISADMIN) === 1 ? 'Không thể khóa tài khoản hệ thống' : 'Khóa tài khoản'} onClick={() => removeUser(user)} disabled={Number(user.ISADMIN) === 1}><Trash2 size={13}/> Khóa</button></td></tr>)}</tbody>
      </table>{!loading && !data.users.length && <div className="qt-empty">Chưa có tài khoản.</div>}</div>
    </section>

    <div className="qt-permission-layout">
      <section className="qt-card qt-groups">
        <div className="qt-card-head"><div><b>Chức vụ / Nhóm người dùng</b><small>SGROUPUSER</small></div><button onClick={() => setGroupForm({ NAME: '', NOTE: '' })}><Plus size={15}/> Thêm chức vụ</button></div>
        <div className="qt-group-list">{data.groups.map((group) => <div key={group.ID} className={`qt-group ${selectedGroupId === group.ID ? 'selected' : ''}`} onClick={() => setSelectedGroupId(group.ID)}>
          <div className="qt-group-icon"><Users size={17}/></div><div className="qt-group-text"><b>{group.NAME}</b><small>{group.NOTE || 'Chưa có mô tả'} · {group.USERCOUNT} tài khoản</small></div>
          <div className="qt-actions"><button type="button" className="qt-action-btn qt-btn-edit" title="Sửa tên chức vụ và mô tả" onClick={(event) => { event.stopPropagation(); setGroupForm(group); }}><Edit3 size={12}/> Sửa</button><button type="button" className="qt-action-btn qt-btn-danger" title={group.NAME.toLocaleLowerCase('vi') === 'admin' ? 'Không thể xóa nhóm Admin' : 'Xóa chức vụ này'} disabled={group.NAME.toLocaleLowerCase('vi') === 'admin'} onClick={(event) => { event.stopPropagation(); removeGroup(group); }}><Trash2 size={12}/> Xóa</button></div>
        </div>)}</div>
      </section>

      <section className="qt-card qt-matrix">
        <div className="qt-card-head"><div><b>Quyền chức năng — {selectedGroup?.NAME || 'Chọn chức vụ'}</b><small>{'Quyền đặc biệt dùng cột Sửa để cho phép thao tác; Xem để cho phép đọc/xuất. Tài khoản hệ thống Admin luôn có toàn quyền.'}</small></div><button className="qt-primary" onClick={savePermissions} disabled={!selectedGroupId || saving}><Save size={15}/> {saving ? 'Đang lưu' : 'Lưu quyền'}</button></div>
        <div className="qt-table-wrap"><table className="qt-permission-table"><thead><tr><th>Nhóm</th><th>Chức năng</th>{BITS.map(([name]) => <th key={name}>{name}</th>)}<th>Tất cả</th></tr></thead>
          <tbody>{permissions.map((item) => { const locked = isAdminOnlyFunction(item.CODE); const mask = functionMasks[item.CODE] ?? 31; return <tr key={item.FUNCTIONID} className={locked ? 'qt-locked-row' : ''}><td>{item.GROUPNAME}</td><td><b>{item.NAME}</b>{locked && <small className="qt-admin-only">Chỉ Admin</small>}</td>{BITS.map(([name, bit]) => <td key={name}><input type="checkbox" checked={(!locked && !!(mask & bit) && (Number(item.MODE) & bit) === bit)} disabled={locked || !(mask & bit)} title={!(mask & bit) ? 'Thao tác không áp dụng' : name} onChange={() => togglePermission(item.FUNCTIONID, bit)}/></td>)}<td><input type="checkbox" checked={(!locked && (Number(item.MODE) & mask) === mask)} disabled={locked} onChange={() => toggleAll(item.FUNCTIONID)}/></td></tr>; })}</tbody>
        </table></div>
      </section>
    </div>

    {groupForm && <Modal title={groupForm.ID ? 'Sửa chức vụ' : 'Thêm chức vụ'} onClose={() => setGroupForm(null)}><form onSubmit={saveGroup} className="qt-form"><label>Tên chức vụ *<input autoFocus value={groupForm.NAME} onChange={(event) => setGroupForm({ ...groupForm, NAME: event.target.value })} required/></label><label>Mô tả<textarea rows="3" value={groupForm.NOTE || ''} onChange={(event) => setGroupForm({ ...groupForm, NOTE: event.target.value })}/></label><div className="qt-form-actions"><button type="button" onClick={() => setGroupForm(null)}>Hủy</button><button className="qt-primary" type="submit"><Save size={15}/> Lưu</button></div></form></Modal>}

    {userForm && <Modal title={userForm.ID ? 'Sửa tài khoản' : 'Cấp tài khoản cho nhân viên'} onClose={() => setUserForm(null)}><form onSubmit={saveUser} className="qt-form">
      <label>Nhân viên *{userForm.ID ? <input value={userForm.employeeName || 'Tài khoản hệ thống'} disabled/> : <select value={userForm.employeeId} onChange={(event) => { const employee = availableEmployees.find((item) => item.ID === event.target.value); setUserForm({ ...userForm, employeeId: event.target.value, email: employee?.EMAIL || '' }); }} required><option value="">Chọn nhân viên...</option>{availableEmployees.map((employee) => <option key={employee.ID} value={employee.ID}>{employee.NAME} — {employee.DIENTHOAI || 'không SĐT'}</option>)}</select>}</label>
      <div className="qt-form-grid"><label>Tên đăng nhập *<input value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} required/></label><label>{userForm.ID ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu *'}<input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required={!userForm.ID} minLength={userForm.password ? 6 : undefined}/></label></div>
      <label>Email<input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}/></label>
      <label>Chức vụ / Nhóm quyền *<select value={userForm.groupId} onChange={(event) => setUserForm({ ...userForm, groupId: event.target.value })} required><option value="">Chọn chức vụ...</option>{data.groups.map((group) => <option key={group.ID} value={group.ID}>{group.NAME}</option>)}</select></label>
      <div className="qt-form-actions"><button type="button" onClick={() => setUserForm(null)}>Hủy</button><button className="qt-primary" type="submit"><Save size={15}/> Lưu tài khoản</button></div>
    </form></Modal>}
  </div>;
}
