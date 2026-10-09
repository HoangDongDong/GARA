import RatePolicyField from './RatePolicyField';
import CommissionConfig from './CommissionConfig';
import { Package, ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { preparePartImage } from '../utils/partImage';

// Form dùng chung, được tách từ NhapKhoPage.jsx.
export default function PartFormModal({ partForm, setPartForm, savingPart: savingRecord, partFormError, partMeta, setShowAddPartModal, handleCreatePart, openAddPartOption, formMode = "add", imagePreview = "" }) {
  const [processingImage, setProcessingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState('');
  const [imageError, setImageError] = useState('');
  const processing = useRef(false);
  const savingPart = savingRecord || processingImage;
  const handlePartImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || processing.current) return;
    processing.current = true;
    setProcessingImage(true);
    setImageError('');
    try {
      const image = await preparePartImage(file, setImageProgress);
      setPartForm((current) => ({ ...current, ANH: image }));
      setImageProgress('Đã tách nền · ảnh sẽ được lưu với nền trắng.');
    } catch (error) {
      setImageError(error.message?.startsWith('Chọn ảnh') || error.message?.startsWith('Ảnh sau')
        ? error.message : 'Không thể tách nền ảnh. Vui lòng thử lại hoặc chọn ảnh khác.');
      setImageProgress('');
    } finally {
      processing.current = false;
      setProcessingImage(false);
    }
  };
  const displayImage = partForm.ANH === undefined ? imagePreview : partForm.ANH;
  return (
<div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingPart) setShowAddPartModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10020, padding: 16 }}
        >
          <div role="dialog" aria-modal="true" style={{ width: 720, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 1, background: '#E65100', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700 }}><Package size={17} /> {formMode === 'edit' ? 'SỬA MẶT HÀNG' : 'THÊM MỚI MẶT HÀNG'}</div>
              <button type="button" onClick={() => !savingPart && setShowAddPartModal(false)} disabled={savingPart} style={{ border: 0, background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={19} /></button>
            </div>

            <form onSubmit={(event) => {
              if (savingRecord || processing.current || imageError) { event.preventDefault(); return; }
              handleCreatePart(event);
            }} style={{ padding: 15 }}>
              <div className="responsive-grid-2" style={{ gap: 10 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Tên mặt hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input autoFocus value={partForm.NAME} onChange={(event) => setPartForm({ ...partForm, NAME: event.target.value })} placeholder="Nhập tên mặt hàng..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Ảnh mặt hàng
                  <div style={{ marginTop: 4, minHeight: 104, padding: 9, border: '1px dashed #CBD5E1', borderRadius: 6, background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {displayImage ? (
                      <img src={displayImage} alt="Ảnh mặt hàng xem trước" style={{ width: 122, height: 86, objectFit: 'contain', borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff' }} />
                    ) : (
                      <div style={{ width: 122, height: 86, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <ImagePlus size={23} />
                        <span style={{ fontSize: 10, fontWeight: 500 }}>Chưa có ảnh</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7 }}>
                      <label style={{ padding: '7px 12px', borderRadius: 4, background: '#E65100', color: '#fff', fontWeight: 700, cursor: savingPart ? 'not-allowed' : 'pointer', opacity: savingPart ? 0.7 : 1 }}>
                        <ImagePlus size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                        {displayImage ? 'Đổi ảnh' : 'Chọn ảnh'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={savingPart} onChange={handlePartImageChange} style={{ display: 'none' }} />
                      </label>
                      <span style={{ color: '#64748B', fontWeight: 400 }}>JPG, PNG hoặc WebP · tự nén ≤ 300 KB, tối đa 1200 px</span>
                      <span style={{ color: '#64748B', fontWeight: 400 }}>Tự động tách nền và lưu ảnh nền trắng.</span>
                      {imageProgress && <span role="status" aria-live="polite" style={{ color: '#E65100', fontWeight: 500 }}>{imageProgress}</span>}
                      {imageError && <span role="alert" style={{ color: '#C62828', fontWeight: 500 }}>{imageError}</span>}
                      {displayImage && (
                        <button type="button" disabled={savingPart} onClick={() => {
                          setPartForm((current) => ({ ...current, ANH: '' }));
                          setImageError('');
                          setImageProgress('');
                        }} style={{ padding: 0, border: 0, background: 'transparent', color: '#D32F2F', fontSize: 11, cursor: 'pointer' }}>
                          Xóa ảnh đã chọn
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mã mặt hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input value={partForm.CODE} onChange={(event) => setPartForm({ ...partForm, CODE: event.target.value })} placeholder="Ví dụ: PT009" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mã vạch
                  <input value={partForm.BARCODE} onChange={(event) => setPartForm({ ...partForm, BARCODE: event.target.value })} placeholder="Nhập mã vạch..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mã OEM
                  <input value={partForm.MAOEM} onChange={(event) => setPartForm({ ...partForm, MAOEM: event.target.value })} placeholder="Nhập mã OEM..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Nhóm mặt hàng
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DNHOMMATHANGID} onChange={(event) => setPartForm({ ...partForm, DNHOMMATHANGID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn nhóm mặt hàng --</option>
                    {partMeta.nhom.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('group')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Đơn vị tính
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DDONVITINHID} onChange={(event) => setPartForm({ ...partForm, DDONVITINHID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn đơn vị tính --</option>
                    {partMeta.dvt.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('unit')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Hãng sản xuất
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DHANGSANXUATID} onChange={(event) => setPartForm({ ...partForm, DHANGSANXUATID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn hãng sản xuất --</option>
                    {partMeta.hangsx.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('manufacturer')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Vị trí kho
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DVITRIKHOID} onChange={(event) => setPartForm({ ...partForm, DVITRIKHOID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn vị trí kho --</option>
                    {partMeta.vitri.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('location')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Giá nhập
                  <input type="number" min="0" value={partForm.GIANHAP} onChange={(event) => setPartForm({ ...partForm, GIANHAP: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Giá bán
                  <input type="number" min="0" value={partForm.GIABAN} onChange={(event) => setPartForm({ ...partForm, GIABAN: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>
                <CommissionConfig form={partForm} setForm={setPartForm} disabled={savingPart} />

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Bảo hành (tháng)
                  <input type="number" min="0" value={partForm.BAOHANH} onChange={(event) => setPartForm({ ...partForm, BAOHANH: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Tồn tối thiểu
                  <input type="number" min="0" value={partForm.TONTOITHIEU} onChange={(event) => setPartForm({ ...partForm, TONTOITHIEU: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Tồn tối đa
                  <input type="number" min="0" value={partForm.TONTOIDA} onChange={(event) => setPartForm({ ...partForm, TONTOIDA: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>
                <RatePolicyField label="Thuế" value={partForm.THUESUATRIENG} disabled={savingPart}
                  onChange={value => setPartForm({ ...partForm, THUESUATRIENG: value })} inheritLabel="Theo nhóm mặt hàng"
                  inheritedRate={partMeta.nhom.find(group => group.ID === partForm.DNHOMMATHANGID)?.THUESUATRIENG}
                  inheritedSource={partMeta.nhom.find(group => group.ID === partForm.DNHOMMATHANGID)?.THUESUATRIENG != null ? partMeta.nhom.find(group => group.ID === partForm.DNHOMMATHANGID)?.NAME : 'Theo cấu hình (nhóm chưa đặt riêng)'} />
              </div>

              {partFormError && <div style={{ marginTop: 10, padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{partFormError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddPartModal(false)} disabled={savingPart} style={{ padding: '6px 14px', border: '1px solid #CBD5E1', borderRadius: 4, background: 'white', color: '#475569', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingPart || !!imageError} style={{ padding: '6px 18px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: savingPart ? 'wait' : 'pointer', opacity: savingPart ? 0.7 : 1 }}>
                  {processingImage ? 'Đang tách nền...' : savingPart ? 'Đang lưu...' : (formMode === 'edit' ? 'Lưu thay đổi' : 'Thêm mặt hàng')}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
