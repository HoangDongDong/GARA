import { useEffect, useRef, useState } from 'react';
import { Camera, Car, FileText, ImageUp, ScanLine, Wrench, XCircle } from 'lucide-react';
import { customers, masterData, vehicles } from '../services';

const EMPTY_FORM = {
  BIENSO: '', DKHACHHANGID: '', DHANGXEID: '', DDONGXEID: '', PHIENBAN: '',
  NAMSANXUAT: '', MAUXE: '', SOKHUNG: '', SOMAY: '', ODO: '0',
  NHIENLIEU: '', MUCNHIENLIEU: '50', GHICHU: '',
};

const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' };
const fieldInput = { height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, outlineColor: '#E65100' };
const addButtonStyle = { height: 34, padding: '0 12px', border: 0, borderRadius: 5, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };

const prepareVehicleImage = (source, name = 'anh-ho-so-xe.jpg') => new Promise((resolve, reject) => {
  if (source instanceof Blob && !source.type.startsWith('image/')) return reject(new Error('Tệp đã chọn không phải hình ảnh.'));
  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : null;
  const image = new Image();
  image.onload = () => {
    try {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.82);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve({ name: name.replace(/\.[^.]+$/, '') + '.jpg', data });
    } catch (error) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(error);
    }
  };
  image.onerror = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    reject(new Error('Không thể đọc ảnh đã chọn.'));
  };
  image.src = objectUrl || source;
});

export default function VehicleProfileModal({ open, onClose, onCreated, onUpdated, notify = () => {}, editingVehicle = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [customersList, setCustomersList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [existingVehicles, setExistingVehicles] = useState([]);
  const [fuelOptions, setFuelOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subForm, setSubForm] = useState(null);
  const [subName, setSubName] = useState('');
  const [savingSub, setSavingSub] = useState(false);
  const [customerForm, setCustomerForm] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [scanning, setScanning] = useState(false);
  const [vehicleImage, setVehicleImage] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const vehicleImageInputRef = useRef(null);

  const isEditing = Boolean(editingVehicle);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value, ...(field === 'DHANGXEID' ? { DDONGXEID: '' } : {}) }));

  const reloadOptions = async () => {
    const [customerRows, groupRows, meta, vehicleRows] = await Promise.all([
      customers.list(), masterData.customerGroups(), vehicles.meta(), vehicles.list(),
    ]);
    setCustomersList(Array.isArray(customerRows) ? customerRows : []);
    setGroups(Array.isArray(groupRows) ? groupRows : []);
    setBrands(Array.isArray(meta?.brands) ? meta.brands : []);
    setModels(Array.isArray(meta?.models) ? meta.models : []);
    setExistingVehicles(Array.isArray(vehicleRows) ? vehicleRows : []);
    setFuelOptions(Array.isArray(meta?.fuels) ? meta.fuels : []);
    return { customerRows, groupRows, meta };
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    setSubForm(null);
    setCustomerForm(null);
    setVehicleImage(null);

    let active = true;
    (async () => {
      try {
        const { customerRows, meta } = await reloadOptions();
        if (!active) return;
        if (editingVehicle) {
          const raw = editingVehicle.rawVehicle || editingVehicle;
          let dhangxeid = raw.DHANGXEID || '';
          let ddongxeid = raw.DDONGXEID || '';
          if (!dhangxeid && ddongxeid && meta?.models) {
            const foundModel = meta.models.find((m) => m.ID === ddongxeid);
            if (foundModel) dhangxeid = foundModel.DHANGXEID;
          }
          if (!dhangxeid && editingVehicle.brand && meta?.brands) {
            const foundBrand = meta.brands.find((b) => b.NAME?.trim().toLowerCase() === String(editingVehicle.brand).trim().toLowerCase());
            if (foundBrand) dhangxeid = foundBrand.ID;
          }
          if (!ddongxeid && editingVehicle.model && meta?.models) {
            const foundModel = meta.models.find((m) => (!dhangxeid || m.DHANGXEID === dhangxeid) && m.NAME?.trim().toLowerCase() === String(editingVehicle.model).trim().toLowerCase());
            if (foundModel) ddongxeid = foundModel.ID;
          }
          let dkhachhangid = raw.DKHACHHANGID || '';
          if (!dkhachhangid && editingVehicle.owner?.name && customerRows) {
            const foundCust = customerRows.find((c) => c.NAME?.trim().toLowerCase() === String(editingVehicle.owner.name).trim().toLowerCase());
            if (foundCust) dkhachhangid = foundCust.ID;
          }

          setForm({
            BIENSO: raw.BIENSO || editingVehicle.plate || '',
            DKHACHHANGID: dkhachhangid || '',
            DHANGXEID: dhangxeid || '',
            DDONGXEID: ddongxeid || '',
            PHIENBAN: raw.PHIENBAN || (editingVehicle.variant !== '—' ? editingVehicle.variant : '') || '',
            NAMSANXUAT: raw.NAMSANXUAT != null && raw.NAMSANXUAT !== '—' ? String(raw.NAMSANXUAT) : (editingVehicle.year !== '—' ? String(editingVehicle.year) : ''),
            MAUXE: raw.MAUXE || (editingVehicle.color !== '—' ? editingVehicle.color : '') || '',
            SOKHUNG: raw.SOKHUNG || (editingVehicle.vin !== '—' ? editingVehicle.vin : '') || '',
            SOMAY: raw.SOMAY || (editingVehicle.engine !== '—' ? editingVehicle.engine : '') || '',
            ODO: String(raw.ODO != null ? raw.ODO : (parseInt(String(editingVehicle.odo).replace(/\D/g, ''), 10) || 0)),
            NHIENLIEU: raw.NHIENLIEU || (editingVehicle.fuel !== '—' ? editingVehicle.fuel : '') || '',
            MUCNHIENLIEU: String(raw.MUCNHIENLIEU != null ? raw.MUCNHIENLIEU : 50),
            GHICHU: raw.GHICHU || (editingVehicle.notes?.[0]?.content) || '',
          });
        } else {
          setForm(EMPTY_FORM);
        }
      } catch (e) {
        if (active) setError(e?.response?.data?.error || 'Không thể tải dữ liệu hồ sơ xe.');
      }
    })();

    return () => {
      active = false;
    };
  }, [open, editingVehicle]);

  useEffect(() => {
    if (cameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
    return () => cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraOpen, cameraStream]);

  if (!open) return null;

  const createMaster = async (event) => {
    event.preventDefault();
    const name = subName.trim();
    if (!name) return notify('Vui lòng nhập tên.');
    setSavingSub(true);
    try {
      if (subForm === 'brand') {
        const existing = brands.find((item) => item.NAME?.trim().toLowerCase() === name.toLowerCase());
        const id = existing?.ID || (await masterData.create('brands', { NAME: name, CODE: name.toUpperCase().replace(/\s+/g, '-'), SORTORDER: brands.length + 1 })).id;
        await reloadOptions(); update('DHANGXEID', id); notify(existing ? 'Hãng xe đã tồn tại và đã được chọn.' : `Đã thêm hãng xe ${name}.`);
      } else if (subForm === 'model') {
        const existing = models.find((item) => item.DHANGXEID === form.DHANGXEID && item.NAME?.trim().toLowerCase() === name.toLowerCase());
        const id = existing?.ID || (await masterData.create('models', { NAME: name, CODE: name.toUpperCase().replace(/\s+/g, '-'), DHANGXEID: form.DHANGXEID, SORTORDER: models.filter((item) => item.DHANGXEID === form.DHANGXEID).length + 1 })).id;
        await reloadOptions(); update('DDONGXEID', id); notify(existing ? 'Dòng xe đã tồn tại và đã được chọn.' : `Đã thêm dòng xe ${name}.`);
      } else if (subForm === 'fuel') {
        update('NHIENLIEU', name);
        setFuelOptions((current) => [...new Set([...current, name])]);
        notify(`Đã thêm loại nhiên liệu ${name}.`);
      } else {
        const existing = groups.find((item) => item.NAME?.trim().toLowerCase() === name.toLowerCase());
        const id = existing?.ID || (await masterData.create('customer_groups', { NAME: name, SORTORDER: groups.length + 1 })).id;
        await reloadOptions(); setCustomerForm((current) => ({ ...current, DNHOMKHACHHANGID: id })); notify(existing ? 'Nhóm khách hàng đã tồn tại và đã được chọn.' : `Đã thêm nhóm khách hàng ${name}.`);
      }
      setSubForm(null);
    } catch (e) { notify(e?.response?.data?.error || e.message || 'Không thể lưu dữ liệu.'); }
    finally { setSavingSub(false); }
  };

  const openCustomer = () => {
    const retail = groups.find((item) => String(item.NAME || '').toLowerCase().replace(/\s/g, '').includes('kháchlẻ'));
    setCustomerForm({ NAME: '', DNHOMKHACHHANGID: retail?.ID || '', MAKHACH: '', DIENTHOAI: '', EMAIL: '', MASOTHUE: '', DIACHI: '' });
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    if (!customerForm.NAME.trim()) return notify('Vui lòng nhập tên khách hàng.');
    setSavingSub(true);
    try {
      const result = await customers.create({ ...customerForm, NAME: customerForm.NAME.trim(), MAKHACH: customerForm.MAKHACH.trim().toUpperCase() || null });
      await reloadOptions(); update('DKHACHHANGID', result.id); setCustomerForm(null); notify(`Đã thêm khách hàng ${customerForm.NAME.trim()}.`);
    } catch (e) { notify(e?.response?.data?.error || e.message || 'Không thể thêm khách hàng.'); }
    finally { setSavingSub(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    const plate = form.BIENSO.trim().toUpperCase();
    if (!plate) return setError('Vui lòng nhập biển số xe.');
    if (!form.DHANGXEID || !form.DDONGXEID) return setError('Vui lòng chọn hãng xe và dòng xe.');
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        BIENSO: plate,
        NAMSANXUAT: form.NAMSANXUAT ? Number(form.NAMSANXUAT) : null,
        ODO: Math.max(0, Number(form.ODO) || 0),
        MUCNHIENLIEU: Math.max(0, Math.min(100, Number(form.MUCNHIENLIEU) || 0)),
        ...(vehicleImage?.data ? { ANHXE: vehicleImage.data } : {}),
      };
      if (isEditing) {
        const vehicleId = editingVehicle.id || editingVehicle.ID || editingVehicle.rawVehicle?.ID;
        await vehicles.update(vehicleId, payload);
        const rows = await vehicles.list();
        await onUpdated?.(vehicleId, Array.isArray(rows) ? rows : []);
        onClose();
        notify(`Đã cập nhật hồ sơ xe ${plate}.`);
      } else {
        const result = await vehicles.create(payload);
        const rows = await vehicles.list();
        await onCreated?.(result.id, Array.isArray(rows) ? rows : []);
        onClose();
        notify(`Đã tạo hồ sơ xe ${plate}.`);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || (isEditing ? 'Không thể cập nhật hồ sơ xe.' : 'Không thể tạo hồ sơ xe.'));
    } finally {
      setSaving(false);
    }
  };

  const openMaster = (type) => { setSubName(''); setSubForm(type); };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const compactText = (value) => normalizeText(value).replace(/[^A-Z0-9]/g, '');
  const formatPlate = (raw) => {
    const normalized = normalizeText(raw);
    const separated = normalized.match(/([1-9][0-9])\s*[-.]?\s*([A-Z4])\s*[-.]?\s*([0-9]{3})\s*[.]\s*([0-9]{2})/);
    let value = separated ? `${separated[1]}${separated[2]}${separated[3]}${separated[4]}` : compactText(raw);
    value = value.replace(/^([1-9][0-9])4(?=[0-9]{5}$)/, '$1A');
    const match = value.match(/([1-9][0-9][A-Z]{1,2}[0-9]{4,5})/);
    if (!match) return '';
    const plate = match[1];
    const prefix = plate.match(/^([0-9]{2}[A-Z]{1,2})([0-9]+)$/);
    if (!prefix) return plate;
    const digits = prefix[2];
    return `${prefix[1]}-${digits.length > 3 ? `${digits.slice(0, 3)}.${digits.slice(3)}` : digits}`;
  };

  const applyVehicleAnalysis = (analysis) => {
    const plate = formatPlate(analysis?.plate || '');
    const normalizedPlate = compactText(plate);
    const knownVehicle = existingVehicles.find((item) => compactText(item.BIENSO) === normalizedPlate);
    const brandId = knownVehicle?.DHANGXEID || analysis?.brandId || '';
    const modelId = knownVehicle?.DDONGXEID || analysis?.modelId || '';
    const detectedFuel = analysis?.fuel || knownVehicle?.NHIENLIEU || '';
    if (detectedFuel) setFuelOptions((current) => [...new Set([...current, detectedFuel])]);

    setForm((current) => ({
      ...current,
      ...(plate ? { BIENSO: plate } : {}),
      ...(brandId ? { DHANGXEID: brandId } : {}),
      ...(modelId ? { DDONGXEID: modelId } : {}),
      ...((knownVehicle?.PHIENBAN || analysis?.variant) ? { PHIENBAN: knownVehicle?.PHIENBAN || analysis.variant } : {}),
      ...((knownVehicle?.NAMSANXUAT || analysis?.year) ? { NAMSANXUAT: String(knownVehicle?.NAMSANXUAT || analysis.year) } : {}),
      ...((knownVehicle?.MAUXE || analysis?.color) ? { MAUXE: knownVehicle?.MAUXE || analysis.color } : {}),
      ...(detectedFuel ? { NHIENLIEU: detectedFuel } : {}),
    }));

    const identified = [analysis?.brand, analysis?.model, analysis?.variant].filter(Boolean).join(' ');
    const confidence = Math.round(Number(analysis?.confidence || 0) * 100);
    const catalogWarning = analysis?.brand && !brandId
      ? ' Hãng xe chưa có trong danh mục.'
      : analysis?.model && !modelId ? ' Dòng xe chưa có trong danh mục.' : '';
    const estimatedFields = [
      analysis?.variant && analysis?.variantEstimated
        ? `phiên bản (${Math.round(Number(analysis.variantConfidence || 0) * 100)}%)` : '',
      analysis?.year && analysis?.yearEstimated
        ? `năm sản xuất (${Math.round(Number(analysis.yearConfidence || 0) * 100)}%)` : '',
    ].filter(Boolean);
    const estimateWarning = estimatedFields.length
      ? ` ${estimatedFields.join(' và ')} là kết quả ước đoán từ ngoại hình, vui lòng xác nhận trước khi lưu.`
      : '';
    if (knownVehicle) return `Gemini nhận diện ${plate} và đã đối chiếu hồ sơ xe hiện có.`;
    if (!plate && !identified) return 'Gemini chưa đủ thông tin để nhận diện xe. Hãy dùng ảnh rõ đầu/đuôi xe và biển số.';
    return `Gemini đã nhận diện${plate ? ` ${plate}` : ''}${identified ? ` · ${identified}` : ''} (${confidence}%).${catalogWarning}${estimateWarning}${analysis?.notes ? ` ${analysis.notes}` : ''}`;
  };

  const scanVehicleImage = async (imageSource) => {
    setScanning(true); setScanProgress(10); setScanStatus('Đang gửi ảnh đến Google Gemini...'); setCameraError('');
    try {
      let image = imageSource;
      if (imageSource instanceof Blob) {
        image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
          reader.readAsDataURL(imageSource);
        });
      }
      setScanProgress(45); setScanStatus('Gemini đang nhận diện thông tin xe...');
      const analysis = await vehicles.analyzeImage(image);
      if (analysis?.catalogCreated?.brand || analysis?.catalogCreated?.model) await reloadOptions();
      setScanProgress(90);
      const message = applyVehicleAnalysis(analysis || {});
      setScanProgress(100); setScanStatus(message); notify(message);
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Không thể nhận dạng ảnh xe bằng Gemini.';
      setCameraError(message); setScanStatus(message); notify(message);
    } finally { setScanning(false); }
  };

  const openCamera = async () => {
    const hasGetUserMedia = Boolean(navigator?.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Trên điện thoại (đặc biệt iPhone Safari) truy cập mạng LAN qua HTTP (http://192.168.x.x:5173),
    // Safari cấm navigator.mediaDevices do thiếu HTTPS nên trình duyệt không thèm hiện hộp thoại hỏi quyền.
    // Chuyển sang kích hoạt máy ảnh native (capture="environment") để điện thoại bật camera và hỏi cấp quyền camera chuẩn của máy!
    if (!hasGetUserMedia || !isSecure) {
      cameraInputRef.current?.click();
      return;
    }

    setCameraError(''); setScanStatus(''); setScanProgress(0); setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      setCameraStream(stream);
    } catch (error) {
      stopCamera();
      cameraInputRef.current?.click();
    }
  };

  const captureAndScan = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return setCameraError('Camera chưa sẵn sàng.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    try {
      const prepared = await prepareVehicleImage(image, 'anh-nhan-dien-xe.jpg');
      setVehicleImage(prepared);
      await scanVehicleImage(prepared.data);
    } catch (error) { notify(error.message || 'Không thể xử lý ảnh chụp xe.'); }
  };

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    stopCamera();
    try {
      const prepared = await prepareVehicleImage(file, file.name);
      setVehicleImage(prepared);
      await scanVehicleImage(prepared.data);
    } catch (error) { notify(error.message || 'Không thể xử lý ảnh xe.'); }
  };

  const chooseProfileImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const prepared = await prepareVehicleImage(file, file.name);
      setVehicleImage(prepared);
      await scanVehicleImage(prepared.data);
    } catch (error) {
      notify(error.message || 'Không thể xử lý ảnh xe.');
    }
  };

  return <>
    <div onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ width: 'min(900px,97vw)', maxHeight: '92vh', background: '#fff', borderRadius: 9, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 55px rgba(15,23,42,.34)' }}>
        <div style={{ background: '#E65100', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 15 }}><Car size={19}/> {isEditing ? 'CHỈNH SỬA HỒ SƠ XE' : 'TẠO HỒ SƠ XE MỚI'}</b><button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer' }}><XCircle size={20}/></button></div>
        <div style={{ padding: 16, overflowY: 'auto' }}>
          {error && <div style={{ marginBottom: 10, padding: 8, background: '#FFEBEE', color: '#C62828', borderRadius: 5 }}>{error}</div>}
          <div style={{ color: '#C2410C', fontWeight: 800, marginBottom: 8, display: 'flex', gap: 5 }}><FileText size={14}/> Thông tin hồ sơ và chủ xe</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 11, marginBottom: 16 }}>
            <label style={fieldLabel}>Biển số xe <span style={{color:'#DC2626'}}>*</span><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><input autoFocus value={form.BIENSO} onChange={(e)=>update('BIENSO',e.target.value.toUpperCase())} placeholder="Ví dụ: 51A-123.45" style={{...fieldInput,flex:1,minWidth:140}}/><button type="button" disabled={scanning} onClick={openCamera} title="Chụp xe và nhận diện bằng Gemini" style={{...addButtonStyle,display:'flex',alignItems:'center',gap:5,opacity:scanning ? 0.65 : 1}}><Camera size={15}/> {scanning?'Đang nhận diện':'Quét xe'}</button><button type="button" disabled={scanning} onClick={()=>fileInputRef.current?.click()} title="Chọn ảnh để Gemini nhận diện thông tin xe" style={{...addButtonStyle,display:'flex',alignItems:'center',gap:5,background:'#fff',color:'#E65100',border:'1px solid #E65100',opacity:scanning ? 0.65 : 1}}><ImageUp size={15}/> Chọn ảnh</button><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={chooseImage} hidden/><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={chooseImage} hidden/></div></label>
            <label style={fieldLabel}>Khách hàng / Chủ xe <span style={{ color: '#94A3B8', fontWeight: 400 }}>(không bắt buộc)</span><div style={{display:'flex',gap:6}}><select value={form.DKHACHHANGID} onChange={(e)=>update('DKHACHHANGID',e.target.value)} style={{...fieldInput,background:'#fff',flex:1,minWidth:0}}><option value="">-- Chưa có chủ xe --</option>{customersList.map(x=><option key={x.ID} value={x.ID}>{x.MAKHACH?`${x.MAKHACH} - `:''}{x.NAME}{x.DIENTHOAI?` - ${x.DIENTHOAI}`:''}</option>)}</select><button type="button" onClick={openCustomer} style={addButtonStyle}>＋ Thêm</button></div></label>
          </div>
          {(scanning || scanStatus) && <div style={{margin:'-7px 0 12px',padding:'7px 9px',borderRadius:5,background:'#FFF7ED',border:'1px solid #FED7AA',color:'#9A3412',fontSize:11}}><div style={{display:'flex',alignItems:'center',gap:6,fontWeight:700}}><ScanLine size={14}/>{scanStatus || 'Đang nhận dạng...'}</div>{scanning&&<div style={{height:4,marginTop:6,borderRadius:4,background:'#FFEDD5',overflow:'hidden'}}><div style={{width:`${scanProgress}%`,height:'100%',background:'#E65100',transition:'width .2s'}}/></div>}</div>}
          <div style={{ color: '#C2410C', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ImageUp size={14}/> Ảnh hồ sơ xe</span>
            <button type="button" onClick={() => vehicleImageInputRef.current?.click()} style={{...addButtonStyle,display:'flex',alignItems:'center',gap:5,height:30}}><ImageUp size={14}/> {vehicleImage ? 'Thay ảnh' : 'Thêm ảnh'}</button>
            <input ref={vehicleImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={chooseProfileImage} hidden />
          </div>
          <div style={{ marginBottom: 15, minHeight: 74, border: '1px dashed #FDBA74', borderRadius: 6, background: '#FFF7ED', padding: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            {vehicleImage ? (
              <>
                <div style={{ position: 'relative', width: 116, height: 70, flexShrink: 0 }}>
                  <img src={vehicleImage.data} alt="Ảnh hồ sơ xe" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5, border: '1px solid #FED7AA' }} />
                  <button type="button" onClick={() => setVehicleImage(null)} title="Xóa ảnh đã chọn" style={{ position: 'absolute', top: -6, right: -6, width: 21, height: 21, borderRadius: '50%', border: '2px solid #fff', background: '#DC2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}><XCircle size={14}/></button>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicleImage.name}</div>
                  <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>Ảnh này sẽ được lưu làm ảnh đại diện của hồ sơ xe.</div>
                  <div style={{ fontSize: 10.5, color: '#2E7D32', marginTop: 2 }}>Ảnh dùng để quét biển số cũng tự động xuất hiện tại đây.</div>
                </div>
              </>
            ) : (
              <div style={{ width: '100%', textAlign: 'center', color: '#94A3B8', fontSize: 11 }}>Chưa chọn ảnh hồ sơ xe. Khi thêm ảnh, Gemini sẽ tự nhận diện biển số và thông tin xe.</div>
            )}
          </div>
          <div style={{ color: '#C2410C', fontWeight: 800, marginBottom: 8, display: 'flex', gap: 5 }}><Wrench size={14}/> Thông số kỹ thuật</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:11 }}>
            <label style={fieldLabel}>Hãng xe *<div style={{display:'flex',gap:6}}><select value={form.DHANGXEID} onChange={(e)=>update('DHANGXEID',e.target.value)} style={{...fieldInput,background:'#fff',flex:1,minWidth:0}}><option value="">-- Chọn hãng xe --</option>{brands.map(x=><option key={x.ID} value={x.ID}>{x.NAME}</option>)}</select><button type="button" onClick={()=>openMaster('brand')} style={addButtonStyle}>＋ Thêm</button></div></label>
            <label style={fieldLabel}>Dòng xe *<div style={{display:'flex',gap:6}}><select disabled={!form.DHANGXEID} value={form.DDONGXEID} onChange={(e)=>update('DDONGXEID',e.target.value)} style={{...fieldInput,background:form.DHANGXEID?'#fff':'#F8FAFC',flex:1,minWidth:0}}><option value="">-- Chọn dòng xe --</option>{models.filter(x=>x.DHANGXEID===form.DHANGXEID).map(x=><option key={x.ID} value={x.ID}>{x.NAME}</option>)}</select><button type="button" disabled={!form.DHANGXEID} onClick={()=>openMaster('model')} style={{...addButtonStyle,opacity:form.DHANGXEID?1:.5,cursor:form.DHANGXEID?'pointer':'not-allowed'}}>＋ Thêm</button></div></label>
            {[['PHIENBAN','Phiên bản'],['NAMSANXUAT','Năm sản xuất'],['MAUXE','Màu xe'],['SOKHUNG','Số khung (VIN)'],['SOMAY','Số máy'],['ODO','ODO hiện tại (km)']].map(([key,label])=><label key={key} style={fieldLabel}>{label}<input type={key==='NAMSANXUAT'||key==='ODO'?'number':'text'} value={form[key]} onChange={(e)=>update(key,e.target.value)} style={fieldInput}/></label>)}
            <label style={fieldLabel}>Nhiên liệu<div style={{display:'flex',gap:6}}><select value={form.NHIENLIEU} onChange={(e)=>update('NHIENLIEU',e.target.value)} style={{...fieldInput,background:'#fff',flex:1,minWidth:0}}><option value="">-- Chọn nhiên liệu --</option>{fuelOptions.map(x=><option key={x}>{x}</option>)}</select><button type="button" onClick={()=>openMaster('fuel')} style={addButtonStyle}>＋ Thêm</button></div></label>
            <label style={fieldLabel}>Mức nhiên liệu (%)<div style={{height:34,display:'flex',alignItems:'center',gap:8}}><input type="range" min="0" max="100" step="5" value={form.MUCNHIENLIEU} onChange={(e)=>update('MUCNHIENLIEU',e.target.value)} style={{flex:1,accentColor:'#E65100'}}/><input type="number" min="0" max="100" value={form.MUCNHIENLIEU} onChange={(e)=>update('MUCNHIENLIEU',e.target.value)} style={{...fieldInput,width:56}}/></div></label>
          </div>
          <label style={{...fieldLabel,marginTop:11}}>Ghi chú hồ sơ xe<textarea rows={3} value={form.GHICHU} onChange={(e)=>update('GHICHU',e.target.value)} style={{border:'1px solid #CBD5E1',borderRadius:5,padding:8,fontFamily:'inherit'}}/></label>
        </div>
        <div style={{padding:'10px 16px',borderTop:'1px solid #E2E8F0',display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" onClick={onClose}>Hủy</button><button type="submit" disabled={saving} style={{background:'#E65100',color:'#fff',border:0,borderRadius:5,padding:'0 18px',height:34,fontWeight:700}}>{saving ? 'Đang lưu...' : (isEditing ? 'Lưu thay đổi' : 'Tạo hồ sơ xe')}</button></div>
      </form>
    </div>
    {cameraOpen && <div onMouseDown={(event)=>event.target===event.currentTarget&&stopCamera()} style={{position:'fixed',inset:0,zIndex:10040,background:'rgba(0,0,0,.78)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div style={{width:'min(760px,97vw)',background:'#fff',borderRadius:9,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.45)'}}><div style={{background:'#E65100',color:'#fff',padding:'11px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><b style={{display:'flex',alignItems:'center',gap:7}}><Camera size={18}/> QUÉT ĐẦU XE</b><button type="button" onClick={stopCamera} style={{border:0,background:'transparent',color:'#fff',display:'flex',cursor:'pointer'}}><XCircle size={20}/></button></div><div style={{padding:14}}><div style={{position:'relative',aspectRatio:'16/9',background:'#111827',borderRadius:7,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>{cameraStream?<video ref={videoRef} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{color:'#CBD5E1',textAlign:'center',padding:20}}><Camera size={38} style={{marginBottom:8}}/><div>{cameraError||'Đang mở camera...'}</div></div>}<div style={{position:'absolute',left:'25%',right:'25%',bottom:'15%',height:'22%',border:'2px solid #FB923C',borderRadius:7,boxShadow:'0 0 0 999px rgba(0,0,0,.12)',pointerEvents:'none'}}/></div><div style={{fontSize:11,color:'#64748B',marginTop:8}}>Đặt đầu xe trong khung, giữ rõ biển số và logo/tên xe. Hệ thống ưu tiên đối chiếu hồ sơ đã có theo biển số.</div>{cameraError&&<div style={{marginTop:8,color:'#C62828',fontSize:11}}>{cameraError}</div>}<div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12,flexWrap:'wrap'}}><button type="button" onClick={()=>{stopCamera(); cameraInputRef.current?.click();}} style={{height:35,padding:'0 14px',border:'1px solid #E65100',color:'#E65100',borderRadius:5,background:'#FFF7ED',display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontWeight:600}}><Camera size={15}/> Mở máy ảnh</button><button type="button" onClick={()=>{stopCamera(); fileInputRef.current?.click();}} style={{height:35,padding:'0 14px',border:'1px solid #CBD5E1',borderRadius:5,background:'#fff',display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}><ImageUp size={15}/> Chọn ảnh</button><button type="button" disabled={!cameraStream} onClick={captureAndScan} style={{height:35,padding:'0 16px',border:0,borderRadius:5,background:'#E65100',color:'#fff',fontWeight:700,display:'flex',alignItems:'center',gap:5,cursor:cameraStream?'pointer':'not-allowed',opacity:cameraStream?1:.55}}><Camera size={15}/> Chụp và nhận diện</button></div></div></div></div>}
    {subForm && <div style={{position:'fixed',inset:0,zIndex:10030,background:'rgba(0,0,0,.58)',display:'flex',alignItems:'center',justifyContent:'center'}}><form onSubmit={createMaster} style={{width:420,background:'#fff',borderRadius:7,overflow:'hidden'}}><div style={{background:'#E65100',color:'#fff',padding:11,fontWeight:700}}>THÊM {subForm==='brand'?'HÃNG XE':subForm==='model'?'DÒNG XE':subForm==='fuel'?'LOẠI NHIÊN LIỆU':'NHÓM KHÁCH HÀNG'}</div><div style={{padding:14}}>{subForm==='model'&&<input readOnly value={brands.find(x=>x.ID===form.DHANGXEID)?.NAME||''} style={{...fieldInput,width:'100%',marginBottom:10,background:'#F8FAFC'}}/>}<input autoFocus value={subName} onChange={(e)=>setSubName(e.target.value)} placeholder="Nhập tên..." style={{...fieldInput,width:'100%'}}/><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}><button type="button" onClick={()=>setSubForm(null)}>Hủy</button><button type="submit" disabled={savingSub}>Lưu</button></div></div></form></div>}
    {customerForm && <div style={{position:'fixed',inset:0,zIndex:10025,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><form onSubmit={saveCustomer} style={{width:'min(560px,96vw)',background:'#fff',borderRadius:7,overflow:'hidden'}}><div style={{background:'#E65100',color:'#fff',padding:11,fontWeight:700}}>THÊM KHÁCH HÀNG</div><div style={{padding:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><label style={{...fieldLabel,gridColumn:'1/-1'}}>Tên khách hàng *<input autoFocus value={customerForm.NAME} onChange={(e)=>setCustomerForm({...customerForm,NAME:e.target.value})} style={fieldInput}/></label><label style={{...fieldLabel,gridColumn:'1/-1'}}>Nhóm khách hàng<div style={{display:'flex',gap:6}}><select value={customerForm.DNHOMKHACHHANGID} onChange={(e)=>setCustomerForm({...customerForm,DNHOMKHACHHANGID:e.target.value})} style={{...fieldInput,flex:1,minWidth:0,background:'#fff'}}><option value="">-- Chọn nhóm --</option>{groups.map(x=><option key={x.ID} value={x.ID}>{x.NAME}</option>)}</select><button type="button" onClick={()=>openMaster('group')} style={addButtonStyle}>＋ Thêm</button></div></label>{[['MAKHACH','Mã khách hàng'],['DIENTHOAI','Số điện thoại'],['EMAIL','Email'],['MASOTHUE','CCCD / Mã số thuế']].map(([key,label])=><label key={key} style={fieldLabel}>{label}<input value={customerForm[key]} onChange={(e)=>setCustomerForm({...customerForm,[key]:e.target.value})} style={fieldInput}/></label>)}<label style={{...fieldLabel,gridColumn:'1/-1'}}>Địa chỉ<textarea rows={3} value={customerForm.DIACHI} onChange={(e)=>setCustomerForm({...customerForm,DIACHI:e.target.value})}/></label><div style={{gridColumn:'1/-1',display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" onClick={()=>setCustomerForm(null)}>Hủy</button><button type="submit" disabled={savingSub}>Thêm khách hàng</button></div></div></form></div>}
  </>;
}
