import { X } from 'lucide-react';

// Form dùng chung, được tách từ NhaCungCapPage.jsx.
export default function SupplierFormModal({ formMode, form, setForm, saving, formError, groupList, closeForm, handleSubmit, openGroupForm }) {
  return (
<div
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div role="dialog" aria-modal="true" style={{ width: 620, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'white', borderRadius: 7, boxShadow: '0 10px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ background: '#E65100', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>🏢 {formMode === 'add' ? 'THÊM NHÀ CUNG CẤP' : 'SỬA NHÀ CUNG CẤP'}</div>
              <button type="button" onClick={closeForm} disabled={saving} style={{ border: 0, background: 'transparent', color: 'white', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Tên nhà cung cấp <span style={{ color: '#D32F2F' }}>*</span>
                  <input autoFocus value={form.NAME} onChange={(event) => setForm({ ...form, NAME: event.target.value })} placeholder="Nhập tên nhà cung cấp..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Mã nhà cung cấp <span style={{ color: '#D32F2F' }}>*</span>
                  <input value={form.MANHACUNGCAP} onChange={(event) => setForm({ ...form, MANHACUNGCAP: event.target.value })} placeholder="Ví dụ: NCC001" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Nhóm nhà cung cấp
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <select value={form.DNHOMNHACUNGCAPID} onChange={(event) => setForm({ ...form, DNHOMNHACUNGCAPID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, background: 'white' }}>
                      <option value="">-- Chọn nhóm nhà cung cấp --</option>
                      {groupList.map((group) => <option key={group.ID} value={group.ID}>{group.NAME}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => openGroupForm()}
                      title="Thêm nhóm nhà cung cấp"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 10px',
                        background: '#E65100',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      + Thêm
                    </button>
                  </div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Số điện thoại
                  <input value={form.DIENTHOAI} onChange={(event) => setForm({ ...form, DIENTHOAI: event.target.value })} placeholder="Nhập số điện thoại..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Email
                  <input type="email" value={form.EMAIL} onChange={(event) => setForm({ ...form, EMAIL: event.target.value })} placeholder="email@example.com" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Website
                  <input value={form.WEBSITE} onChange={(event) => setForm({ ...form, WEBSITE: event.target.value })} placeholder="https://..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Địa chỉ
                  <input value={form.DIACHI} onChange={(event) => setForm({ ...form, DIACHI: event.target.value })} placeholder="Nhập địa chỉ..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Ghi chú
                  <textarea value={form.NOTE} onChange={(event) => setForm({ ...form, NOTE: event.target.value })} placeholder="Nhập ghi chú..." rows={3} style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, resize: 'vertical' }} />
                </label>
              </div>

              {formError && <div style={{ marginTop: 10, padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{formError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={closeForm} disabled={saving} style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#424242', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={saving} style={{ padding: '6px 18px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Đang lưu...' : (formMode === 'add' ? 'Thêm nhà cung cấp' : 'Lưu thay đổi')}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
