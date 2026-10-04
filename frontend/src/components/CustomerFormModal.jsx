import { User, X } from 'lucide-react';

// Form dùng chung, được tách từ KhachHangPage.jsx.
export default function CustomerFormModal({ formMode, form, setForm, saving, formError, customerGroups, closeForm, handleFormSubmit, openGroupForm }) {
  return (
<div
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10020,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div role="dialog" aria-modal="true" style={{ width: 560, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'white', borderRadius: 7, boxShadow: '0 10px 32px rgba(0,0,0,0.25)' }}>
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
  );
}
