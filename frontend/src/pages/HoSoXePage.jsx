import { openDocumentPrint } from '../components/DocumentPrintDialog';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, Search, FileSpreadsheet, Plus, MoreHorizontal, FileText, ClipboardList,
  User, Building2, History, Image as ImageIcon, Calendar, Edit3, Printer, Edit, Trash2, Tag,
  Wrench, Shield, CheckCircle, Copy, ChevronRight, ChevronDown, X, Eye, Download, AlertTriangle, Check, Clock, Award, FileCheck, Filter, ArrowRight,
  Phone, Mail, MapPin, Gauge, Fuel, Hash, Cog, Sliders, Palette, Zap, Fingerprint, Layers, CheckCircle2, Sparkles, UserCheck, ShieldCheck,
  Wallet, CalendarClock, Activity
} from 'lucide-react';
import { customers, vehicles, protectedMediaUrl } from '../services';
import VehicleProfileModal from '../components/VehicleProfileModal';
import './HoSoXePage.css';

const getColorDot = (colorStr) => {
  if (!colorStr || colorStr === '—' || !String(colorStr).trim()) return null;
  const s = String(colorStr).toLowerCase().trim();
  if (s.includes('trắng')) return '#F8FAFC';
  if (s.includes('đen')) return '#1E293B';
  if (s.includes('đỏ')) return '#EF4444';
  if (s.includes('xanh lam') || s.includes('xanh dương')) return '#3B82F6';
  if (s.includes('xanh lá')) return '#10B981';
  if (s.includes('bạc')) return '#CBD5E1';
  if (s.includes('xám')) return '#64748B';
  if (s.includes('vàng')) return '#F59E0B';
  if (s.includes('nâu')) return '#78350F';
  if (s.includes('cam')) return '#F97316';
  return null;
};

const EMPTY_VEHICLE_PROFILE = {
  id: '', plate: '—', modelName: 'CHƯA CÓ HỒ SƠ XE', brand: '—', model: '—', variant: '—',
  year: '—', color: '—', fuel: '—', vin: '—', engine: '—', odo: '0 km',
  status: 'Chưa có dữ liệu', statusColor: '#64748B', statusBg: '#F1F5F9',
  owner: { name: '—', phone: '—', email: '—', address: '—', note: '' },
  company: { name: '—', taxCode: '—', address: '—', phone: '—', contact: '—' },
  ownerHistory: [], avatar: '', thumbnails: [],
  repairs: [], replacedParts: [], warranties: [], appointments: [], media: [], notes: [],
};

const EMPTY_VEHICLE_FORM = {
  BIENSO: '', DKHACHHANGID: '', DHANGXEID: '', DDONGXEID: '',
  PHIENBAN: '', NAMSANXUAT: '', MAUXE: '', SOKHUNG: '', SOMAY: '',
  ODO: '0', NHIENLIEU: '', MUCNHIENLIEU: '50', GHICHU: '',
};

const formatProfileDate = (value, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const repairStatus = (workflowState) => [
  'Tiếp nhận & Báo giá',
  'Xác nhận sửa chữa',
  'Đang sửa',
  'Giao xe',
  'Hoàn thành',
][workflowStageIndex(workflowState)];

const VEHICLE_PROCESS_STAGES = [
  'Tiếp nhận & Báo giá',
  'Xác nhận sửa chữa',
  'Đang sửa',
  'Giao xe',
  'Hoàn thành',
];

const workflowStageIndex = (state) => {
  return Math.max(0, Math.min(4, Number(state ?? 0)));
};

const derivedWorkflowState = (repairState) => {
  const value = Number(repairState || 0);
  if (value === 3) return 4;
  if (value === 5) return 3;
  if (value >= 1) return 2;
  return 0;
};

const mapVehicleSummary = (row) => ({
  id: row.ID,
  plate: row.BIENSO || '—',
  modelName: [row.HANG_XE, row.DONG_XE, row.PHIENBAN].filter(Boolean).join(' ').toUpperCase() || row.BIENSO || '—',
  brand: row.HANG_XE || '—', model: row.DONG_XE || '—', variant: row.PHIENBAN || '—',
  year: row.NAMSANXUAT || '—', color: row.MAUXE || '—', fuel: row.NHIENLIEU || '—',
  vin: row.SOKHUNG || '—', engine: row.SOMAY || '—', odo: `${Number(row.ODO || 0).toLocaleString('vi-VN')} km`,
  owner: { name: row.TEN_KH || '—', phone: row.DIENTHOAI || '—', email: '—', address: '—', note: '' },
  avatar: Number(row.CO_ANHXE) === 1 ? vehicles.imageUrl(row.ID) : '', thumbnails: [],
});

const mapVehicleProfile = (data) => {
  const row = data?.vehicle || {};
  const summary = mapVehicleSummary(row);
  const repairs = (data?.repairs || []).map((repair) => {
    const items = repair.ITEMS || [];
    const itemNames = items.map((item) => item.TEN_HANG_MUC || item.NOTE).filter(Boolean);
    const workflow = repair.WORKFLOW || null;
    const invoice = repair.INVOICE || null;
    const workflowState = workflow ? Number(workflow.TRANGTHAI || 0) : derivedWorkflowState(repair.TRANGTHAI);
    const processHistory = (workflow?.HISTORY || []).map((event) => ({
      id: event.ID,
      from: event.TRANGTHAI_CU == null ? 'Bắt đầu' : VEHICLE_PROCESS_STAGES[workflowStageIndex(event.TRANGTHAI_CU)],
      to: VEHICLE_PROCESS_STAGES[workflowStageIndex(event.TRANGTHAI_MOI)],
      technicalFrom: event.TEN_CU || '', technicalTo: event.TEN_MOI || '',
      date: formatProfileDate(event.NGAY, true), employee: event.TEN_NV || event.DNHANVIENID || 'Hệ thống',
      reason: event.LYDO || '', note: event.GHICHU || '',
    }));
    if (!processHistory.length && repair.NGAY) {
      processHistory.push({
        id: `${repair.ID}-tiep-nhan`, from: 'Bắt đầu', to: VEHICLE_PROCESS_STAGES[0],
        date: formatProfileDate(repair.NGAY, true), employee: repair.TEN_COVAN || 'Hệ thống',
        reason: repair.YEUCAUKHACH || 'Đã tiếp nhận xe và lập thông tin sửa chữa', note: '',
      });
    }
    return {
      id: repair.NAME || repair.ID,
      recordId: repair.ID,
      date: formatProfileDate(repair.NGAY), dateOut: formatProfileDate(repair.KETTHUC),
      plate: summary.plate, odo: `${Number(repair.ODO || row.ODO || 0).toLocaleString('vi-VN')} km`,
      service: repair.NOTE || repair.YEUCAUKHACH || itemNames.join(' + ') || 'Sửa chữa / bảo dưỡng xe',
      tech: repair.TEN_KTV || '—', advisor: repair.TEN_COVAN || '—',
      partCost: Number(repair.TONGTIENPHUTUNG || 0), laborCost: Number(repair.TONGTIENCONG || 0),
      total: Number(repair.TONGCONG || 0), status: repairStatus(workflowState),
      paymentStatus: Number(invoice?.DATHANHTOAN || 0) === 1 ? 'Đã thanh toán' : 'Chờ thanh toán', items: itemNames,
      workflowState, processStage: workflowStageIndex(workflowState), processHistory,
    };
  });
  const replacedParts = (data?.replacedParts || []).map((part) => ({
    id: part.ID, date: formatProfileDate(part.NGAYXUAT), code: part.CODE || '—',
    name: part.TEN_MATHANG || '—', qty: Number(part.SOLUONG || 0), unit: part.DONVI || '—',
    price: Number(part.DONGIA || 0), total: Number(part.THANHTIEN || 0),
    odo: `${Number(part.ODO || row.ODO || 0).toLocaleString('vi-VN')} km`,
    repairId: part.SO_PHIEU || part.TLENHSUACHUAID || '—',
    warranty: part.BAOHANH ? `${part.BAOHANH} tháng` : 'Không bảo hành',
    warrantyStatus: part.BAOHANH ? 'active' : 'expired',
  }));
  const warranties = (data?.warranties || []).map((item) => {
    const end = item.NGAYKETTHUC ? new Date(item.NGAYKETTHUC) : null;
    const days = end && !Number.isNaN(end.getTime()) ? Math.ceil((end - new Date()) / 86400000) : null;
    return {
      id: item.NAME || item.ID, recordId: item.ID, item: item.TEN_MATHANG || item.TEN_DICHVU || item.NOTE || 'Hạng mục bảo hành',
      type: Number(item.LOAI) === 1 ? 'Dịch vụ' : 'Phụ tùng thay thế',
      startDate: formatProfileDate(item.NGAYBATDAU), endDate: formatProfileDate(item.NGAYKETTHUC),
      duration: item.NGAYKETTHUC ? 'Theo thời hạn phiếu' : '—', odoStart: summary.odo,
      odoLimit: 'Theo chính sách bảo hành', status: days == null || days >= 0 ? 'Còn hiệu lực' : 'Hết hiệu lực',
      daysLeft: days == null ? '—' : days >= 0 ? `Còn ${days} ngày` : 'Hết BH', supplier: 'KAZUKO AUTO', note: item.NOTE || '',
    };
  });
  const appointments = (data?.appointments || []).map((item) => {
    const dueDate = item.NGAY_DUKIEN ? new Date(item.NGAY_DUKIEN) : null;
    const days = dueDate && !Number.isNaN(dueDate.getTime()) ? Math.ceil((dueDate - new Date()) / 86400000) : null;
    const status = days == null ? 'Chưa xác định' : days < 0 ? 'Đến hạn' : days <= 7 ? 'Sắp đến' : 'Chưa đến';
    return {
      id: item.ID,
      date: formatProfileDate(item.NGAY_DUKIEN),
      service: item.LOAIBAODUONG || item.NAME || 'Bảo dưỡng',
      content: item.NOTE || (item.ODO_DUKIEN ? `Dự kiến ${Number(item.ODO_DUKIEN).toLocaleString('vi-VN')} km` : 'Nhắc lịch bảo dưỡng'),
      status,
      statusColor: status === 'Đến hạn' ? '#C62828' : status === 'Sắp đến' ? '#E65100' : '#0288D1',
      statusBg: status === 'Đến hạn' ? '#FFEBEE' : status === 'Sắp đến' ? '#FFF3E0' : '#E1F5FE',
    };
  });
  const receptionMedia = (data?.media || []).map((item) => ({
    id: item.ID, title: item.MOTA || 'Hình ảnh tiếp nhận xe',
    category: Number(item.LOAIHINH) === 2 ? 'sau' : Number(item.LOAIHINH) === 1 ? 'trong' : 'truoc',
    repairId: item.SO_PHIEU || '',
    mediaType: 'image',
    date: formatProfileDate(item.TIMECREATED, true),
    odo: `${Number(item.ODO || row.ODO || 0).toLocaleString('vi-VN')} km`, url: summary.avatar,
  }));
  const workflowMedia = (data?.workflowMedia || []).map((item) => {
    const state = workflowStageIndex(item.TRANGTHAI);
    return {
      id: item.ID,
      title: item.MOTA || `${VEHICLE_PROCESS_STAGES[state]}${item.SO_PHIEU ? ` · ${item.SO_PHIEU}` : ''}`,
      category: state <= 1 ? 'truoc' : state === 2 ? 'trong' : 'sau',
      workflowState: state,
      workflowLabel: item.TRANGTHAI_TEN || VEHICLE_PROCESS_STAGES[state],
      repairId: item.SO_PHIEU || item.TLENHSUACHUAID || '',
      mediaType: String(item.MIME || '').toLowerCase().startsWith('video/') ? 'video' : 'image',
      date: formatProfileDate(item.TIMECREATED, true),
      odo: `${Number(item.ODO || row.ODO || 0).toLocaleString('vi-VN')} km`,
      url: protectedMediaUrl(item.URL || `/api/workflow/images/${item.ID}/content`),
    };
  });
  const media = [...workflowMedia, ...receptionMedia];
  const noteList = row.GHICHU ? [{ id: `vehicle-${row.ID}`, priority: 'info', author: 'Hệ thống', date: formatProfileDate(row.TIMECREATED, true), content: row.GHICHU }] : [];
  return {
    ...EMPTY_VEHICLE_PROFILE, ...summary,
    rawVehicle: row,
    status: repairs[0] && repairs[0].status !== 'Hoàn thành' ? repairs[0].status : 'Đang hoạt động',
    owner: { name: row.TEN_KH || '—', phone: row.DIENTHOAI || '—', email: row.EMAIL || '—', address: row.DIACHI || '—', note: row.GHICHU_KH || '' },
    company: { name: row.NHOM_KH || row.TEN_KH || '—', taxCode: row.MASOTHUE || '—', address: row.DIACHI || '—', phone: row.DIENTHOAI || '—', contact: row.TEN_KH || '—' },
    ownerHistory: row.TEN_KH ? [{ period: `${row.NAMSANXUAT || '—'} - Hiện tại`, name: `${row.TEN_KH} (Chủ hiện tại)`, active: true }] : [],
    repairs, replacedParts, warranties, appointments, media, notes: noteList,
  };
};

export default function HoSoXePage() {
  const navigate = useNavigate();
  const openRepairPayment = repair => navigate(`/sua-chua?vehicleId=${encodeURIComponent(currentVehicle.id)}&repairId=${encodeURIComponent(repair.recordId)}&payment=1`);
  const [selectedPlate, setSelectedPlate] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('plate') || '';
    } catch (e) {}
    return '';
  });
  const [vehicleList, setVehicleList] = useState([]);
  const [currentVehicle, setCurrentVehicle] = useState(EMPTY_VEHICLE_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('thong-tin-chung');
  const [copiedCode, setCopiedCode] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('all');
  const [expandedMediaRepairs, setExpandedMediaRepairs] = useState([]);
  const [repairSearch, setRepairSearch] = useState('');
  const [searchPlateQuery, setSearchPlateQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [vehicleFormError, setVehicleFormError] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);

  // Ghi chú mới trong phiên làm việc; ghi chú gốc được tải từ Firebird.
  const [vehicleNotes, setVehicleNotes] = useState({});

  const [newNoteText, setNewNoteText] = useState('');
  const [newNotePriority, setNewNotePriority] = useState('info');

  const searchBoxRef = useRef(null);

  const currentNotes = vehicleNotes[currentVehicle.plate] || currentVehicle.notes || [];
  const sideVehicleGallery = [
    ...(currentVehicle.id ? [{
      id: `vehicle-${currentVehicle.id}`,
      title: 'Ảnh hồ sơ xe',
      label: 'Ảnh hồ sơ',
      url: currentVehicle.avatar,
      date: '',
      odo: currentVehicle.odo,
    }] : []),
    ...currentVehicle.media.map((item) => ({
      ...item,
      label: item.category === 'truoc' ? 'Trước sửa chữa' : item.category === 'trong' ? 'Đang sửa chữa' : 'Sau hoàn thiện',
    })),
  ].slice(0, 7);
  const mediaRepairGroups = currentVehicle.repairs.map((repair) => {
    const allMedia = currentVehicle.media.filter((item) => item.repairId === repair.id);
    const media = allMedia.filter((item) => mediaFilter === 'all' || item.category === mediaFilter);
    return { repair, allMedia, media };
  });

  // Lắng nghe click bên ngoài để đóng dropdown tìm kiếm
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const loadVehicleProfile = async (vehicle, notify = false) => {
    if (!vehicle?.id) return;
    setLoadingProfile(true);
    try {
      const data = await vehicles.profile(vehicle.id);
      const profile = mapVehicleProfile(data);
      setCurrentVehicle(profile);
      setSelectedPlate(profile.plate);
      setMediaFilter('all');
      const firstRepairWithMedia = profile.repairs.find((repair) => profile.media.some((item) => item.repairId === repair.id));
      setExpandedMediaRepairs(firstRepairWithMedia ? [firstRepairWithMedia.id] : []);
      if (notify) showToast('Đã tải hồ sơ xe: ' + profile.plate + ' (' + profile.model + ')');
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể tải hồ sơ xe.');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [rows, meta, customerRows] = await Promise.all([
          vehicles.list(),
          vehicles.meta().catch(() => ({ brands: [], models: [] })),
          customers.list().catch(() => []),
        ]);
        const mapped = (Array.isArray(rows) ? rows : []).map(mapVehicleSummary);
        setVehicleList(mapped);
        setVehicleBrands(Array.isArray(meta?.brands) ? meta.brands : []);
        setVehicleModels(Array.isArray(meta?.models) ? meta.models : []);
        setCustomerOptions(Array.isArray(customerRows) ? customerRows : []);
        const requestedPlate = selectedPlate.toLowerCase();
        const selected = mapped.find((vehicle) => vehicle.plate.toLowerCase() === requestedPlate) || mapped[0];
        if (selected) {
          await loadVehicleProfile(selected);
        } else {
          setCurrentVehicle(EMPTY_VEHICLE_PROFILE);
          setSelectedPlate('');
        }
      } catch (error) {
        showToast(error?.response?.data?.error || error.message || 'Không thể tải danh sách xe.');
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, []);

  const handleSelectVehicle = async (vehicle) => {
    setSelectedPlate(vehicle.plate);
    setIsSearchOpen(false);
    setIsCarModalOpen(false);
    setSearchPlateQuery('');
    await loadVehicleProfile(vehicle, true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('plate', vehicle.plate);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  const openCreateVehicleForm = () => {
    setEditingVehicle(null);
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setVehicleFormError('');
    setIsCreateVehicleOpen(true);
  };

  const closeCreateVehicleForm = () => {
    if (savingVehicle) return;
    setIsCreateVehicleOpen(false);
    setVehicleFormError('');
  };

  const updateVehicleForm = (field, value) => {
    setVehicleForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'DHANGXEID' ? { DDONGXEID: '' } : {}),
    }));
  };

  const handleCreateVehicle = async (event) => {
    event.preventDefault();
    const plate = vehicleForm.BIENSO.trim().toUpperCase();
    if (!plate) return setVehicleFormError('Vui lòng nhập biển số xe.');
    if (!vehicleForm.DKHACHHANGID) return setVehicleFormError('Vui lòng chọn khách hàng/chủ xe.');
    if (!vehicleForm.DHANGXEID) return setVehicleFormError('Vui lòng chọn hãng xe.');
    if (!vehicleForm.DDONGXEID) return setVehicleFormError('Vui lòng chọn dòng xe.');
    if (vehicleList.some((item) => item.plate.replace(/\s/g, '').toUpperCase() === plate.replace(/\s/g, ''))) {
      return setVehicleFormError('Biển số xe đã tồn tại trong hệ thống.');
    }

    setSavingVehicle(true);
    setVehicleFormError('');
    try {
      const payload = {
        ...vehicleForm,
        BIENSO: plate,
        NAMSANXUAT: vehicleForm.NAMSANXUAT ? Number(vehicleForm.NAMSANXUAT) : null,
        ODO: Math.max(0, Number(vehicleForm.ODO) || 0),
        MUCNHIENLIEU: Math.max(0, Math.min(100, Number(vehicleForm.MUCNHIENLIEU) || 0)),
      };
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === 'string') payload[key] = payload[key].trim() || null;
      });
      const result = await vehicles.create(payload);
      const rows = await vehicles.list();
      const mapped = (Array.isArray(rows) ? rows : []).map(mapVehicleSummary);
      setVehicleList(mapped);
      const created = mapped.find((item) => item.id === result.id)
        || mapped.find((item) => item.plate.toUpperCase() === plate);
      setIsCreateVehicleOpen(false);
      if (created) {
        await handleSelectVehicle(created);
      }
      showToast(`Đã tạo hồ sơ xe ${plate} thành công.`);
    } catch (error) {
      setVehicleFormError(error?.response?.data?.error || error.message || 'Không thể tạo hồ sơ xe.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(label);
    showToast('Đã sao chép ' + label + ': ' + text);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote = {
      id: Date.now(),
      priority: newNotePriority,
      author: 'admin',
      date: new Date().toLocaleString('vi-VN'),
      content: newNoteText.trim()
    };
    setVehicleNotes({
      ...vehicleNotes,
      [currentVehicle.plate]: [newNote, ...currentNotes]
    });
    setNewNoteText('');
    showToast('Đã thêm ghi chú mới cho xe ' + currentVehicle.plate);
  };

  const handleDeleteNote = (id) => {
    setVehicleNotes({
      ...vehicleNotes,
      [currentVehicle.plate]: currentNotes.filter(n => n.id !== id)
    });
    showToast('Đã xóa ghi chú');
  };

  // Lọc danh sách xe khi gõ tìm kiếm
  const filteredVehicles = vehicleList.filter(v => {
    if (!searchPlateQuery.trim()) return true;
    const q = searchPlateQuery.toLowerCase().trim();
    return (
      v.plate.toLowerCase().includes(q) ||
      v.modelName.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q) ||
      v.engine.toLowerCase().includes(q) ||
      v.owner.name.toLowerCase().includes(q) ||
      v.owner.phone.includes(q)
    );
  });

  // 3 Chỉ số tổng quan rút gọn cho xe
  const totalRepairCount = currentVehicle.repairs?.length || 0;
  const totalSpent = (currentVehicle.repairs || []).reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const formattedTotalSpent = totalSpent > 0 
    ? totalSpent >= 1000000 
      ? `${(totalSpent / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr` 
      : `${totalSpent.toLocaleString('vi-VN')} đ`
    : '0 đ';

  const activeWarrantyCount = (currentVehicle.warranties || []).filter(w => w.status === 'Còn hiệu lực').length;
  const customerTier = totalSpent >= 20000000 ? 'Khách VIP' : totalRepairCount >= 3 ? 'Khách quen' : 'Tiêu chuẩn';
  const odoNum = parseInt(String(currentVehicle.odo || '0').replace(/\D/g, ''), 10) || 0;
  const prevMilestone = Math.floor(odoNum / 5000) * 5000;
  const odoProgressPercent = Math.min(100, Math.max(15, Math.round(((odoNum - prevMilestone) / 5000) * 100)));

  const upcomingAppt = (currentVehicle.appointments || []).find(a => a.status !== 'Đã xong');
  let nextServiceBadge = '5.000 km';
  let nextServiceText = 'Bảo dưỡng định kỳ 5.000 km';
  if (upcomingAppt?.date) {
    nextServiceBadge = upcomingAppt.date;
    nextServiceText = `${upcomingAppt.service} (${upcomingAppt.date})`;
  } else {
    const nextOdo = (Math.floor(odoNum / 5000) + 1) * 5000;
    nextServiceBadge = `${nextOdo.toLocaleString('vi-VN')} km`;
    nextServiceText = `Bảo dưỡng cấp ${nextOdo.toLocaleString('vi-VN')} km`;
  }

  const tabs = [
    { id: 'thong-tin-chung', label: 'Thông tin chung', icon: FileText, count: null },
    { id: 'lich-su-sua-chua', label: 'Lịch sử sửa chữa', icon: ClipboardList, count: currentVehicle.repairs.length },
    { id: 'phu-tung-thay', label: 'Phụ tùng đã thay', icon: Wrench, count: currentVehicle.replacedParts.length },
    { id: 'bao-hanh', label: 'Bảo hành', icon: Shield, count: currentVehicle.warranties.length },
    { id: 'hinh-anh', label: 'Hình ảnh & Video', icon: ImageIcon, count: currentVehicle.media.length },
    { id: 'ghi-chu', label: 'Ghi chú', icon: Edit3, count: currentNotes.length },
  ];

  return (
    <div className="page-responsive-container hsx-page-container" style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      boxSizing: 'border-box',
      gap: 'clamp(3px, 0.6vh, 6px)',
      fontSize: 'clamp(10px, 0.75vw, 12px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Toast thông báo */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 14,
          right: 18,
          background: '#2E7D32',
          color: '#fff',
          padding: '6px 14px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          fontSize: 12
        }}>
          <CheckCircle size={15} />
          {toastMessage}
        </div>
      )}

      {/* Header thanh công cụ (Page Header) */}
      {/* Header thanh công cụ (Page Header) */}
      <div className="hsx-header-bar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 8,
        flexWrap: 'wrap',
        minHeight: 'clamp(28px, 3.6vh, 32px)'
      }}>
        {/* Tiêu đề trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            background: '#E65100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Car size={16} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(15px, 1.1vw, 17px)', fontWeight: 800, color: '#1E293B' }}>
            Hồ sơ xe
          </h1>
        </div>

        {/* Cụm tìm kiếm và nút thao tác */}
        <div className="hsx-top-actions" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, minWidth: 0 }}>
          
          {/* Ô tìm kiếm biển số xe với Dropdown gợi ý */}
          <div ref={searchBoxRef} className="hsx-search-wrap" style={{ position: 'relative', width: 'clamp(240px, 22vw, 320px)' }}>
            <div style={{ position: 'relative', width: '100%', height: 'clamp(26px, 3vh, 30px)' }}>
              <input
                type="text"
                placeholder="Biển số xe, số khung, số máy, VIN..."
                value={searchPlateQuery}
                onChange={(e) => {
                  setSearchPlateQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '0 26px 0 10px',
                  border: isSearchOpen ? '1px solid #E65100' : '1px solid #CBD5E1',
                  borderRadius: 5,
                  fontSize: '11px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#FFFFFF'
                }}
              />
              <Search
                size={13}
                color="#64748B"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>

            {/* Dropdown danh sách gợi ý xe */}
            {isSearchOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                zIndex: 1000,
                maxHeight: 280,
                overflowY: 'auto'
              }}>
                <div style={{ padding: '4px 8px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>KẾT QUẢ TÌM XE ({filteredVehicles.length})</span>
                  <span>Nhấp để chọn xe</span>
                </div>
                {filteredVehicles.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
                    Không tìm thấy xe nào khớp với từ khóa
                  </div>
                ) : (
                  filteredVehicles.map(v => {
                    const isCurrent = v.id === currentVehicle.id;
                    return (
                      <div
                        key={v.id || v.plate}
                        onClick={() => handleSelectVehicle(v)}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          background: isCurrent ? '#FFF3E0' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = '#F8FAFC'; }}
                        onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = '#FFFFFF'; }}
                      >
                        <img
                          src={v.avatar}
                          alt={v.model}
                          style={{ width: 34, height: 26, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, color: '#E65100', fontSize: '11.5px' }}>{v.plate}</span>
                            <span style={{ fontSize: '10px', color: '#334155', fontWeight: 600 }}>{v.modelName}</span>
                          </div>
                          <div style={{ fontSize: '9.5px', color: '#64748B', display: 'flex', gap: 6, marginTop: 1 }}>
                            <span>Chủ xe: <b>{v.owner.name}</b></span>
                            <span>• {v.owner.phone}</span>
                            <span>• ODO: {v.odo}</span>
                          </div>
                        </div>
                        {isCurrent && (
                          <span style={{ background: '#2E7D32', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                            Đang xem
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Nhóm nút thao tác */}
          <div className="hsx-btn-group" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={openCreateVehicleForm}
              style={{
                height: 'clamp(26px, 3.2vh, 30px)',
                padding: '0 12px',
                background: '#E65100',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(230, 81, 0, 0.3)'
              }}
            >
              <Plus size={14} />
              Tạo hồ sơ xe
            </button>

            <button
              type="button"
              onClick={() => showToast('Import hồ sơ từ Excel')}
              style={{
                height: 'clamp(26px, 3.2vh, 30px)',
                padding: '0 10px',
                background: '#fff',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: 5,
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <FileSpreadsheet size={13} color="#2E7D32" />
              Import Excel
            </button>

            <button
              type="button"
              onClick={() => showToast('Đã xuất dữ liệu ra file Excel')}
              style={{
                height: 'clamp(26px, 3.2vh, 30px)',
                padding: '0 10px',
                background: '#fff',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: 5,
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <FileSpreadsheet size={13} color="#1565C0" />
              Xuất Excel
            </button>

            {/* Nút tùy chọn thêm (...) */}
            <button
              type="button"
              onClick={() => setIsCarModalOpen(true)}
              title="Danh sách xe / Thêm tùy chọn"
              style={{
                height: 'clamp(26px, 3.2vh, 30px)',
                width: 'clamp(26px, 3.2vh, 30px)',
                padding: 0,
                background: '#fff',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Vùng nội dung chính của Hồ sơ xe dạng 2 cột */}
      {!currentVehicle.id ? <section role="status" style={{padding:32,textAlign:"center",background:"#fff",borderRadius:8}}><Car size={36} color="#94A3B8"/><h2>{loadingProfile?"Đang tải hồ sơ xe…":"Chưa có hồ sơ xe"}</h2><p>Tạo hồ sơ xe hoặc chọn một xe để xem thông tin và lịch sử.</p><button type="button" onClick={()=>setIsCreateVehicleOpen(true)}>Tạo hồ sơ xe</button></section> : <div className="hsx-main-content">
        <div className="hsx-two-col-layout">
          {/* CỘT TRÁI: THÔNG TIN XE, TABS & BẢNG NỘI DUNG */}
          <div className="hsx-col-main">
            {/* Card thông tin xe tổng quan trên cùng */}
            <div className="hsx-vehicle-card">
          <div className="hsx-mobile-top-block">
            {/* Ảnh xe và 4 thumbnail */}
            <div className="hsx-media-col">
              <div className="hsx-main-avatar">
                {currentVehicle.avatar?<img src={currentVehicle.avatar} alt={currentVehicle.modelName}/>:<Car size={42} color="#94A3B8" aria-label="Chưa có ảnh xe"/>}
              </div>
              <div className="hsx-thumbnails-row">
                {currentVehicle.thumbnails.map((thumb, idx) => (
                  <img
                    key={idx}
                    src={thumb}
                    alt={idx + 1}
                  />
                ))}
              </div>
            </div>

            {/* Thông số kỹ thuật & Biển số xe ở giữa */}
            <div className="hsx-specs-col">
              <div className="hsx-model-title">
                <span className="hsx-model-icon-badge">
                  <Car size={13} color="#FFFFFF" />
                </span>
                <span>{currentVehicle.modelName || 'HỒ SƠ PHƯƠNG TIỆN'}</span>
              </div>

              <div className="hsx-plate-badge-row">
                <div className="hsx-plate-badge" title="Biển số phương tiện">
                  <span className="hsx-plate-dot" />
                  <span>{currentVehicle.plate}</span>
                </div>
                <span className="hsx-status-registered">
                  <CheckCircle2 size={11} color="#059669" />
                  Đăng ký
                </span>

                {/* Dòng Số khung & Số máy */}
                <div className="hsx-vin-pill">
                  <Fingerprint size={12} color="#64748B" />
                  <span>Số khung:</span>
                  <b style={{ color: '#0F172A', letterSpacing: 0.3 }}>{currentVehicle.vin || '—'}</b>
                  {currentVehicle.vin && (
                    <span
                      className="hsx-copy-btn"
                      onClick={() => handleCopy(currentVehicle.vin, 'Số khung')}
                      title="Sao chép số khung"
                    >
                      {copiedCode === 'Số khung' ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                    </span>
                  )}
                </div>
                <div className="hsx-vin-pill">
                  <Cog size={12} color="#64748B" />
                  <span>Số máy:</span>
                  <b style={{ color: '#0F172A', letterSpacing: 0.3 }}>{currentVehicle.engine || '—'}</b>
                  {currentVehicle.engine && (
                    <span
                      className="hsx-copy-btn"
                      onClick={() => handleCopy(currentVehicle.engine, 'Số máy')}
                      title="Sao chép số máy"
                    >
                      {copiedCode === 'Số máy' ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông số kỹ thuật nhanh */}
              <div className="hsx-specs-grid">
                <div className="hsx-spec-item" title={`Hãng xe: ${currentVehicle.brand || '—'}`}>
                  <div className="hsx-spec-icon-box" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <ShieldCheck size={12} />
                  </div>
                  <div className="hsx-spec-texts">
                    <div className="spec-label">Hãng xe</div>
                    <div className="spec-value">{currentVehicle.brand || '—'}</div>
                  </div>
                </div>
                <div className="hsx-spec-item" title={`Dòng xe: ${currentVehicle.model || '—'}`}>
                  <div className="hsx-spec-icon-box" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                    <Layers size={12} />
                  </div>
                  <div className="hsx-spec-texts">
                    <div className="spec-label">Dòng xe</div>
                    <div className="spec-value">{currentVehicle.model || '—'}</div>
                  </div>
                </div>
                <div className="hsx-spec-item" title={`Phiên bản: ${currentVehicle.variant || '—'}`}>
                  <div className="hsx-spec-icon-box" style={{ background: '#ECFEFF', color: '#0891B2' }}>
                    <Sliders size={12} />
                  </div>
                  <div className="hsx-spec-texts">
                    <div className="spec-label">Phiên bản</div>
                    <div className="spec-value">{currentVehicle.variant || '—'}</div>
                  </div>
                </div>
                <div className="hsx-spec-item" title={`Năm sản xuất: ${currentVehicle.year || '—'}`}>
                  <div className="hsx-spec-icon-box" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    <Calendar size={12} />
                  </div>
                  <div className="hsx-spec-texts">
                    <div className="spec-label">Năm SX</div>
                    <div className="spec-value">{currentVehicle.year || '—'}</div>
                  </div>
                </div>
                <div className="hsx-spec-item" title={`Màu xe: ${currentVehicle.color || '—'}`}>
                  <div className="hsx-spec-icon-box" style={{ background: '#FCE7F3', color: '#DB2777' }}>
                    <Palette size={12} />
                  </div>
                  <div className="hsx-spec-texts">
                    <div className="spec-label">Màu xe</div>
                    <div className="spec-value" style={{ display: 'flex', alignItems: 'center' }}>
                      {currentVehicle.color && getColorDot(currentVehicle.color) && (
                        <span className="hsx-color-dot" style={{ backgroundColor: getColorDot(currentVehicle.color) }} />
                      )}
                      <span>{currentVehicle.color || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="hsx-spec-item" title={`Nhiên liệu: ${currentVehicle.fuel || '—'}`}>
                  <div className="hsx-spec-icon-box" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <Fuel size={12} />
                  </div>
                  <div className="hsx-spec-texts">
                    <div className="spec-label">Nhiên liệu</div>
                    <div className="spec-value">{currentVehicle.fuel || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Thông tin chủ xe tóm tắt trên mobile */}
              <div className="hsx-mobile-owner-summary" style={{ fontSize: '11px', color: '#475569', marginTop: 2 }}>
                <span>Chủ xe: <b style={{ color: '#1565C0' }}>{currentVehicle.owner?.name || 'Chưa có'}</b></span>
                {currentVehicle.owner?.phone && <span>SĐT: <b>{currentVehicle.owner.phone}</b></span>}
              </div>
            </div>
          </div>

          {/* Chủ xe & địa chỉ bên phải (Desktop) */}
          <div className="hsx-owner-col">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
              <span className="hsx-status-live-badge" style={{ background: currentVehicle.statusBg, color: currentVehicle.statusColor }}>
                <span className="hsx-live-dot" style={{ background: currentVehicle.statusColor }} />
                {currentVehicle.status}
              </span>
            </div>
            <div className="hsx-owner-info-line">
              <User size={12} className="hsx-owner-icon" style={{ color: '#2563EB' }} />
              <span style={{ color: '#64748B' }}>Chủ xe:</span>
              <span style={{ fontWeight: 700, color: '#1D4ED8', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentVehicle.owner?.name || '—'}
              </span>
            </div>
            <div className="hsx-owner-info-line">
              <Phone size={12} className="hsx-owner-icon" style={{ color: '#059669' }} />
              <span style={{ color: '#64748B' }}>SĐT:</span>
              {currentVehicle.owner?.phone ? (
                <a href={`tel:${currentVehicle.owner.phone}`} style={{ fontWeight: 600, color: '#1E293B', textDecoration: 'none' }} title="Gọi chủ xe">
                  {currentVehicle.owner.phone}
                </a>
              ) : (
                <span style={{ fontWeight: 600, color: '#1E293B' }}>—</span>
              )}
            </div>
            <div className="hsx-owner-info-line" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Building2 size={12} className="hsx-owner-icon" style={{ color: '#6366F1' }} />
              <span style={{ color: '#64748B' }}>Khách hàng:</span>
              <span style={{ fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentVehicle.company?.name || 'Khách lẻ'}
              </span>
            </div>
            <div className="hsx-owner-info-line" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '9.5px', color: '#64748B' }}>
              <MapPin size={11} className="hsx-owner-icon" style={{ color: '#F59E0B' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentVehicle.owner?.address || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Dải Tabs & Nút tác vụ nhanh */}
        <div className="hsx-tabs-bar">
          {/* 6 Tabs trượt ngang mượt mà */}
          <div className="hsx-tabs-scroll">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="hsx-tab-btn"
                  style={{
                    padding: 'clamp(4px, 0.55vh, 6px) clamp(8px, 0.8vw, 12px)',
                    background: isActive ? '#E65100' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#334155',
                    border: `1px solid ${isActive ? '#E65100' : '#CBD5E1'}`,
                    borderRadius: 4,
                    fontSize: 'clamp(10px, 0.75vw, 11.5px)',
                    fontWeight: isActive ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 1px 3px rgba(230, 81, 0, 0.25)' : 'none',
                    flexShrink: 0
                  }}
                >
                  <Icon size={13} color={isActive ? '#FFFFFF' : '#E65100'} />
                  {tab.label}
                  {tab.count !== null && (
                    <span style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                      color: isActive ? '#fff' : '#64748B',
                      padding: '0 5px',
                      borderRadius: 10,
                      fontSize: '9.5px',
                      fontWeight: 600
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: THÔNG TIN CHUNG */}
        {activeTab === 'thong-tin-chung' && (
          <>
            {/* 4 Cards dạng lưới 2x2 */}
            <div className="hsx-cards-grid">
              {/* Card 1: Thông tin xe */}
              <div className="hsx-modern-card">
                <div className="hsx-modern-card-header">
                  <div className="hsx-header-title-group">
                    <div className="hsx-header-icon-box" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)' }}>
                      <Car size={13} color="#FFFFFF" />
                    </div>
                    <span className="hsx-header-title">Thông tin xe</span>
                  </div>
                  <span className="hsx-header-tag" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FFEDD5' }}>
                    Kỹ thuật
                  </span>
                </div>
                <table className="hsx-modern-table">
                  <tbody>
                    <tr>
                      <td className="hsx-label-cell" style={{ width: '25%' }}>
                        <span className="hsx-label-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          <Hash size={11} />
                        </span>
                        Biển số xe
                      </td>
                      <td className="hsx-value-cell" style={{ width: '25%' }}>
                        <span className="hsx-plate-badge" style={{ fontSize: '11px', padding: '1px 6px' }}>
                          <span className="hsx-plate-dot" />
                          {currentVehicle.plate}
                        </span>
                      </td>
                      <td className="hsx-label-cell" style={{ width: '25%', borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          <ShieldCheck size={11} />
                        </span>
                        Hãng xe
                      </td>
                      <td className="hsx-value-cell" style={{ width: '25%' }}>
                        {currentVehicle.brand || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                          <Layers size={11} />
                        </span>
                        Dòng xe
                      </td>
                      <td className="hsx-value-cell">{currentVehicle.model || '—'}</td>
                      <td className="hsx-label-cell" style={{ borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#ECFEFF', color: '#0891B2' }}>
                          <Sliders size={11} />
                        </span>
                        Phiên bản
                      </td>
                      <td className="hsx-value-cell">{currentVehicle.variant || '—'}</td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          <Calendar size={11} />
                        </span>
                        Năm sản xuất
                      </td>
                      <td className="hsx-value-cell">{currentVehicle.year || '—'}</td>
                      <td className="hsx-label-cell" style={{ borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#FCE7F3', color: '#DB2777' }}>
                          <Palette size={11} />
                        </span>
                        Màu xe
                      </td>
                      <td className="hsx-value-cell">
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {currentVehicle.color && getColorDot(currentVehicle.color) && (
                            <span className="hsx-color-dot" style={{ backgroundColor: getColorDot(currentVehicle.color) }} />
                          )}
                          <span>{currentVehicle.color || '—'}</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#F1F5F9', color: '#475569' }}>
                          <Fingerprint size={11} />
                        </span>
                        Số khung (VIN)
                      </td>
                      <td className="hsx-value-cell" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>{currentVehicle.vin || '—'}</span>
                          {currentVehicle.vin && (
                            <span
                              className="hsx-copy-btn"
                              onClick={() => handleCopy(currentVehicle.vin, 'Số khung')}
                              title="Sao chép số khung"
                            >
                              {copiedCode === 'Số khung' ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="hsx-label-cell" style={{ borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#F1F5F9', color: '#475569' }}>
                          <Cog size={11} />
                        </span>
                        Số máy
                      </td>
                      <td className="hsx-value-cell">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>{currentVehicle.engine || '—'}</span>
                          {currentVehicle.engine && (
                            <span
                              className="hsx-copy-btn"
                              onClick={() => handleCopy(currentVehicle.engine, 'Số máy')}
                              title="Sao chép số máy"
                            >
                              {copiedCode === 'Số máy' ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                          <Gauge size={11} />
                        </span>
                        ODO hiện tại
                      </td>
                      <td className="hsx-value-cell">
                        <span className="hsx-odo-badge">
                          <Gauge size={11} />
                          {currentVehicle.odo}
                        </span>
                      </td>
                      <td className="hsx-label-cell" style={{ borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                          <Fuel size={11} />
                        </span>
                        Nhiên liệu / Pin
                      </td>
                      <td className="hsx-value-cell">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {currentVehicle.fuel?.toLowerCase().includes('điện') ? (
                            <Zap size={12} color="#EAB308" />
                          ) : (
                            <Fuel size={12} color="#059669" />
                          )}
                          <span>{currentVehicle.fuel || '—'}</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Card 2: Chủ sở hữu */}
              <div className="hsx-modern-card">
                <div className="hsx-modern-card-header">
                  <div className="hsx-header-title-group">
                    <div className="hsx-header-icon-box" style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)' }}>
                      <UserCheck size={13} color="#FFFFFF" />
                    </div>
                    <span className="hsx-header-title">Chủ sở hữu</span>
                  </div>
                  <span className="hsx-header-tag" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                    Chính chủ
                  </span>
                </div>
                <table className="hsx-modern-table">
                  <tbody>
                    <tr>
                      <td className="hsx-label-cell" style={{ width: '25%' }}>
                        <span className="hsx-label-icon" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                          <User size={11} />
                        </span>
                        Họ tên
                      </td>
                      <td className="hsx-value-cell" style={{ color: '#1D4ED8', fontWeight: 700 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={12} color="#22C55E" />
                          {currentVehicle.owner?.name || '—'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                          <Phone size={11} />
                        </span>
                        SĐT
                      </td>
                      <td className="hsx-value-cell">
                        {currentVehicle.owner?.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <a href={`tel:${currentVehicle.owner.phone}`} style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
                              {currentVehicle.owner.phone}
                            </a>
                            <span
                              className="hsx-copy-btn"
                              onClick={() => handleCopy(currentVehicle.owner.phone, 'SĐT chủ xe')}
                              title="Sao chép SĐT"
                            >
                              <Copy size={10} />
                            </span>
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#F0F9FF', color: '#0284C7' }}>
                          <Mail size={11} />
                        </span>
                        Email
                      </td>
                      <td className="hsx-value-cell" style={{ color: '#0284C7' }}>
                        {currentVehicle.owner?.email ? (
                          <a href={`mailto:${currentVehicle.owner.email}`} style={{ color: '#0284C7', textDecoration: 'none' }}>
                            {currentVehicle.owner.email}
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          <MapPin size={11} />
                        </span>
                        Địa chỉ
                      </td>
                      <td className="hsx-value-cell" style={{ color: '#334155' }}>
                        {currentVehicle.owner?.address || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                          <FileText size={11} />
                        </span>
                        Ghi chú
                      </td>
                      <td className="hsx-value-cell">
                        {currentVehicle.owner?.note ? (
                          <span style={{ background: '#ECFDF5', color: '#065F46', padding: '1.5px 7px', borderRadius: 4, fontWeight: 600, fontSize: '10px' }}>
                            {currentVehicle.owner.note}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Card 3: Khách hàng */}
              <div className="hsx-modern-card">
                <div className="hsx-modern-card-header">
                  <div className="hsx-header-title-group">
                    <div className="hsx-header-icon-box" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' }}>
                      <Building2 size={13} color="#FFFFFF" />
                    </div>
                    <span className="hsx-header-title">Khách hàng</span>
                  </div>
                  <span className="hsx-header-tag" style={{ background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1' }}>
                    Đối tác
                  </span>
                </div>
                <table className="hsx-modern-table">
                  <tbody>
                    <tr>
                      <td className="hsx-label-cell" style={{ width: '25%' }}>
                        <span className="hsx-label-icon" style={{ background: '#F0FDFA', color: '#0D9488' }}>
                          <Building2 size={11} />
                        </span>
                        Tên công ty
                      </td>
                      <td className="hsx-value-cell" style={{ width: '25%', fontWeight: 700 }}>
                        {currentVehicle.company?.name || 'Khách lẻ'}
                      </td>
                      <td className="hsx-label-cell" style={{ width: '25%', borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#F1F5F9', color: '#475569' }}>
                          <Hash size={11} />
                        </span>
                        Mã số thuế
                      </td>
                      <td className="hsx-value-cell" style={{ width: '25%' }}>
                        {currentVehicle.company?.taxCode || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          <MapPin size={11} />
                        </span>
                        Địa chỉ
                      </td>
                      <td className="hsx-value-cell">{currentVehicle.company?.address || '—'}</td>
                      <td className="hsx-label-cell" style={{ borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                          <Phone size={11} />
                        </span>
                        Điện thoại
                      </td>
                      <td className="hsx-value-cell">
                        {currentVehicle.company?.phone ? (
                          <a href={`tel:${currentVehicle.company.phone}`} style={{ color: '#0F172A', textDecoration: 'none' }}>
                            {currentVehicle.company.phone}
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="hsx-label-cell">
                        <span className="hsx-label-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          <UserCheck size={11} />
                        </span>
                        Người liên hệ
                      </td>
                      <td className="hsx-value-cell" style={{ color: '#1D4ED8', fontWeight: 600 }}>
                        {currentVehicle.company?.contact || currentVehicle.owner?.name || '—'}
                      </td>
                      <td className="hsx-label-cell" style={{ borderLeft: '1px solid #F1F5F9' }}>
                        <span className="hsx-label-icon" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                          <FileText size={11} />
                        </span>
                        Ghi chú
                      </td>
                      <td className="hsx-value-cell">
                        {currentVehicle.owner?.note ? (
                          <span style={{ background: '#ECFDF5', color: '#065F46', padding: '1.5px 7px', borderRadius: 4, fontWeight: 600, fontSize: '10px' }}>
                            {currentVehicle.owner.note}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Card 4: Lịch sử chủ xe */}
              <div className="hsx-modern-card">
                <div className="hsx-modern-card-header">
                  <div className="hsx-header-title-group">
                    <div className="hsx-header-icon-box" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}>
                      <History size={13} color="#FFFFFF" />
                    </div>
                    <span className="hsx-header-title">Lịch sử chủ xe</span>
                  </div>
                  <span className="hsx-header-tag" style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                    {currentVehicle.ownerHistory.length} ĐỜI CHỦ
                  </span>
                </div>
                <div className="hsx-timeline-container">
                  {currentVehicle.ownerHistory.map((item, idx) => (
                    <div key={idx} className="hsx-timeline-row">
                      <div className={`hsx-timeline-dot ${item.active ? 'hsx-timeline-dot-active' : 'hsx-timeline-dot-past'}`} />
                      <div className={`hsx-timeline-period ${item.active ? 'active' : 'past'}`}>
                        {item.period}
                      </div>
                      <div className={`hsx-timeline-name ${item.active ? 'active' : 'past'}`}>
                        {item.active ? <CheckCircle2 size={13} color="#10B981" /> : <Clock size={12} color="#94A3B8" />}
                        <span>{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Lịch sử sửa chữa gần đây */}
            <div className="hsx-recent-repairs-card" style={{
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '3px 8px',
                borderBottom: '1px solid #E2E8F0',
                background: '#FAFAFA',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wrench size={13} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#1E293B' }}>
                    Lịch sử sửa chữa gần đây của xe {currentVehicle.plate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('lich-su-sua-chua')}
                  style={{
                    fontSize: '10px',
                    color: '#E65100',
                    border: '1px solid #FFCC80',
                    background: '#FFF3E0',
                    padding: '1px 6px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Xem tất cả ({currentVehicle.repairs.length})
                </button>
              </div>

              <div className="hsx-table-responsive" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', width: '15%' }}>Ngày tiếp nhận</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', width: '15%' }}>Biển số</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', width: '38%' }}>Loại dịch vụ</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right', width: '18%' }}>Tổng chi phí</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center', width: '14%' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVehicle.repairs.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          borderBottom: '1px solid #F1F5F9'
                        }}
                      >
                        <td style={{ padding: '3px 6px', color: '#334155' }}>{row.date}</td>
                        <td style={{ padding: '3px 6px', fontWeight: 600, color: '#1E293B' }}>{row.plate}</td>
                        <td style={{ padding: '3px 6px', color: '#334155' }}>{row.service}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: '#E65100' }}>{row.total.toLocaleString('vi-VN')}đ</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                          <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '1px 6px', borderRadius: 8, fontSize: '9.5px', fontWeight: 600 }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: LỊCH SỬ SỬA CHỮA */}
        {activeTab === 'lich-su-sua-chua' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            {/* Thống kê 4 card nhỏ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 6,
              flexShrink: 0
            }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E65100' }}>
                  <ClipboardList size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Lượt sửa chữa xe này</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{currentVehicle.repairs.length} lần</div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E7D32' }}>
                  <Award size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Tổng chi phí tích lũy</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#2E7D32' }}>
                    {currentVehicle.repairs.reduce((sum, r) => sum + r.total, 0).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1565C0' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Lần vào xưởng gần nhất</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                    {currentVehicle.repairs[0]?.date || 'Chưa có'} ({currentVehicle.odo})
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F57F17' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Tình trạng hiện tại</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: currentVehicle.statusColor }}>
                    {currentVehicle.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Bảng lịch sử sửa chữa */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* Header bảng & tìm kiếm */}
              <div style={{
                padding: '6px 10px',
                borderBottom: '1px solid #E2E8F0',
                background: '#FAFAFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={14} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
                    Danh sách hồ sơ phiếu sửa chữa của xe {currentVehicle.plate}
                  </span>
                  <span style={{ background: '#FFE0B2', color: '#BF360C', padding: '1px 6px', borderRadius: 10, fontSize: '10px', fontWeight: 700 }}>
                    {currentVehicle.repairs.length} phiếu
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 220 }}>
                    <input
                      type="text"
                      placeholder="Tìm mã phiếu, dịch vụ..."
                      value={repairSearch}
                      onChange={(e) => setRepairSearch(e.target.value)}
                      style={{
                        width: '100%',
                        height: 26,
                        padding: '0 24px 0 8px',
                        border: '1px solid #CBD5E1',
                        borderRadius: 4,
                        fontSize: '11px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Search size={12} color="#94A3B8" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)' }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast('Đã xuất lịch sử sửa chữa ra file Excel')}
                    style={{
                      height: 26,
                      padding: '0 8px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      color: '#334155',
                      fontWeight: 500
                    }}
                  >
                    <Download size={12} color="#1565C0" />
                    Xuất Excel
                  </button>
                </div>
              </div>

              {/* Bảng dữ liệu phiếu sửa chữa */}
              <div className="hsx-table-responsive" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '11%' }}>Mã phiếu</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '9%' }}>Ngày vào</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '8%' }}>Số Km (ODO)</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '28%' }}>Nội dung sửa chữa / Bảo dưỡng</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '14%' }}>Cố vấn / KTV</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: '12%' }}>Tổng chi phí</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '9%' }}>Trạng thái</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '9%' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVehicle.repairs.filter(r => !repairSearch || r.id.toLowerCase().includes(repairSearch.toLowerCase()) || r.service.toLowerCase().includes(repairSearch.toLowerCase())).map((row, idx) => (
                      <tr
                        key={row.id}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FFF8E1'}
                        onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}
                      >
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#E65100' }}>{row.id}</td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>{row.date}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1E293B' }}>{row.odo}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{row.service}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748B', marginTop: 2 }}>
                            {row.items.slice(0, 2).join(' • ')}{row.items.length > 2 ? ' (+' + (row.items.length - 2) + ' mục)' : ''}
                          </div>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>
                          <div><span style={{ color: '#64748B', fontSize: '10px' }}>CV:</span> {row.advisor}</div>
                          <div><span style={{ color: '#64748B', fontSize: '10px' }}>KTV:</span> {row.tech}</div>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#E65100', fontSize: '11.5px' }}>
                            {row.total.toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ fontSize: '9.5px', color: row.paymentStatus === 'Đã thanh toán' ? '#2E7D32' : '#E65100' }}>{row.paymentStatus}</div>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{ background: row.status === 'Hoàn thành' ? '#E8F5E9' : '#FFF3E0', color: row.status === 'Hoàn thành' ? '#2E7D32' : '#E65100', padding: '2px 8px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {row.workflowState === 3 && <button type="button" className="hsx-payment-button" onClick={() => openRepairPayment(row)}><Wallet size={12}/> Thanh toán</button>}
                            <button
                              type="button"
                              onClick={() => setSelectedRepair(row)}
                              title="Xem chi tiết phiếu sửa chữa"
                              style={{
                                background: '#FFF3E0',
                                border: '1px solid #FFCC80',
                                color: '#E65100',
                                borderRadius: 4,
                                padding: '2px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                fontSize: '10px',
                                fontWeight: 600
                              }}
                            >
                              <Eye size={11} /> Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => openDocumentPrint({ type: 'MauPhieuSuaChua', id: row.recordId })}
                              title="In phiếu sửa chữa"
                              style={{
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                color: '#475569',
                                borderRadius: 4,
                                padding: '2px 5px',
                                cursor: 'pointer'
                              }}
                            >
                              <Printer size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PHỤ TÙNG ĐÃ THAY */}
        {activeTab === 'phu-tung-thay' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            {/* Thống kê 3 card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 6,
              flexShrink: 0
            }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E65100' }}>
                  <Wrench size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Linh kiện phụ tùng xe này</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{currentVehicle.replacedParts.length} danh mục</div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E7D32' }}>
                  <Award size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Tổng giá trị vật tư đã thay</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#2E7D32' }}>
                    {currentVehicle.replacedParts.reduce((sum, p) => sum + p.total, 0).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1565C0' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Linh kiện còn bảo hành</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1565C0' }}>
                    {currentVehicle.replacedParts.filter(p => p.warrantyStatus === 'active').length} / {currentVehicle.replacedParts.length} mục
                  </div>
                </div>
              </div>
            </div>

            {/* Card Bảng danh mục phụ tùng */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '6px 10px',
                borderBottom: '1px solid #E2E8F0',
                background: '#FAFAFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wrench size={14} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
                    Lịch sử vật tư & phụ tùng đã thay thế cho xe {currentVehicle.plate}
                  </span>
                  <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '1px 6px', borderRadius: 10, fontSize: '10px', fontWeight: 700 }}>
                    100% Chính hãng / OEM đạt chuẩn
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => showToast('Đã xuất danh sách phụ tùng thay thế ra Excel')}
                  style={{
                    height: 26,
                    padding: '0 8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 4,
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  <Download size={12} color="#1565C0" />
                  Xuất Excel
                </button>
              </div>

              <div className="hsx-table-responsive" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '4%' }}>STT</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '13%' }}>Mã OEM / Part No</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '25%' }}>Tên phụ tùng & Thông số</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '7%' }}>SL</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: '11%' }}>Đơn giá</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: '12%' }}>Thành tiền</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '10%' }}>Ngày thay (ODO)</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '10%' }}>Mã phiếu SC</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '8%' }}>Bảo hành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVehicle.replacedParts.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FFF8E1'}
                        onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}
                      >
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1565C0' }}>{item.code}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>ĐVT: {item.unit} • Gói chính hãng</div>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>{item.qty}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#475569' }}>{item.price.toLocaleString('vi-VN')}đ</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#E65100' }}>{item.total.toLocaleString('vi-VN')}đ</td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>
                          <div>{item.date}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>{item.odo}</div>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span
                            onClick={() => {
                              const found = currentVehicle.repairs.find(r => r.id === item.repairId);
                              if (found) setSelectedRepair(found);
                              else showToast('Xem phiếu ' + item.repairId);
                            }}
                            style={{ color: '#E65100', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {item.repairId}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          {item.warrantyStatus === 'active' ? (
                            <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '2px 6px', borderRadius: 8, fontSize: '9.5px', fontWeight: 600 }}>
                              {item.warranty}
                            </span>
                          ) : (
                            <span style={{ background: '#F1F5F9', color: '#94A3B8', padding: '2px 6px', borderRadius: 8, fontSize: '9.5px' }}>
                              Hết BH
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BẢO HÀNH */}
        {activeTab === 'bao-hanh' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            {/* Banner Chính sách bảo hành tổng thể xe */}
            <div style={{
              background: 'linear-gradient(135deg, #FFF8E1 0%, #FFE0B2 100%)',
              border: '1px solid #FFCC80',
              borderRadius: 6,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0
                }}>
                  <Shield size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#BF360C' }}>
                      SỔ BẢO HÀNH ĐIỆN TỬ - KAZUKO AUTO CARE
                    </h3>
                    <span style={{ background: '#2E7D32', color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                      Kích hoạt hệ thống
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#5D4037', marginTop: 2 }}>
                    Cam kết bảo hành chính hãng phụ tùng thay thế và chất lượng dịch vụ sửa chữa theo tiêu chuẩn nhà sản xuất {currentVehicle.brand} & Kazuko.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Đang bảo hành</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{currentVehicle.warranties.length} hạng mục</div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Mở form tạo mới thẻ/phiếu bảo hành')}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: '#E65100',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={12} /> Cấp bảo hành mới
                </button>
              </div>
            </div>

            {/* Bảng chi tiết các hạng mục còn bảo hành */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={14} color="#E65100" />
                <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
                  Danh mục linh kiện & hạng mục dịch vụ đang được bảo hành cho xe {currentVehicle.plate}
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '11%' }}>Mã bảo hành</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '18%' }}>Hạng mục bảo hành</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '12%' }}>Hệ thống</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '13%' }}>Thời gian hiệu lực</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '12%' }}>Giới hạn ODO</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '16%' }}>Đơn vị bảo hành</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '10%' }}>Thời hạn còn</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '8%' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVehicle.warranties.map((bh, idx) => (
                      <tr
                        key={bh.id}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FFF8E1'}
                        onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}
                      >
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#E65100' }}>{bh.id}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{bh.item}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>{bh.note}</div>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>
                          <span style={{ background: '#E2E8F0', color: '#334155', padding: '1px 6px', borderRadius: 4, fontSize: '10px' }}>
                            {bh.type}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>
                          <div>{bh.startDate} ➔ {bh.endDate}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>Gói: {bh.duration}</div>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#334155', fontSize: '10.5px' }}>{bh.odoLimit}</td>
                        <td style={{ padding: '6px 8px', color: '#475569', fontSize: '10.5px' }}>{bh.supplier}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '2px 8px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                            {bh.daysLeft}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openDocumentPrint({ type: 'MauPhieuBaoHanh', id: bh.recordId })}
                            style={{
                              background: '#FFF3E0',
                              border: '1px solid #FFCC80',
                              color: '#E65100',
                              borderRadius: 4,
                              padding: '2px 6px',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2
                            }}
                          >
                            <Printer size={11} /> In thẻ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: HÌNH ẢNH & VIDEO - nhóm theo từng hồ sơ phiếu sửa chữa */}
        {activeTab === 'hinh-anh' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minHeight: 0 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '7px 10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={14} color="#E65100" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>
                    HÌNH ẢNH &amp; VIDEO ({currentVehicle.media.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Mở hộp thoại tải lên ảnh/video thực tế của xe ' + currentVehicle.plate)}
                  style={{ height: 27, padding: '0 11px', background: '#E65100', color: '#FFFFFF', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                  <Plus size={12} /> Tải ảnh / Video
                </button>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'truoc', label: 'Trước sửa chữa' },
                  { id: 'trong', label: 'Trong quá trình' },
                  { id: 'sau', label: 'Sau hoàn thiện' },
                ].map((filter) => {
                  const isSelected = mediaFilter === filter.id;
                  const count = filter.id === 'all' ? currentVehicle.media.length : currentVehicle.media.filter((item) => item.category === filter.id).length;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setMediaFilter(filter.id)}
                      style={{ padding: '4px 11px', background: isSelected ? '#E65100' : '#F1F5F9', color: isSelected ? '#FFFFFF' : '#475569', border: 'none', borderRadius: 4, fontSize: '11px', fontWeight: isSelected ? 700 : 500, cursor: 'pointer' }}
                    >
                      {filter.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {mediaRepairGroups.map(({ repair, allMedia, media }) => {
                const expanded = expandedMediaRepairs.includes(repair.id);
                const imageCount = allMedia.filter((item) => item.mediaType !== 'video').length;
                const videoCount = allMedia.filter((item) => item.mediaType === 'video').length;
                return (
                  <section key={repair.id} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedMediaRepairs((current) => expanded ? current.filter((id) => id !== repair.id) : [...current, repair.id])}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setExpandedMediaRepairs((current) => expanded ? current.filter((id) => id !== repair.id) : [...current, repair.id]);
                        }
                      }}
                      style={{ padding: '8px 10px', cursor: 'pointer', background: expanded ? '#FFF7ED' : '#FFFFFF', borderBottom: expanded ? '1px solid #FED7AA' : 'none' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.8fr) minmax(180px, 1fr) auto', gap: 12, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          {expanded ? <ChevronDown size={15} color="#E65100" /> : <ChevronRight size={15} color="#64748B" />}
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#E65100' }}>{repair.id}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#475569' }}>{repair.date} • {repair.odo}</div>
                        <div style={{ fontSize: '10.5px', color: '#334155', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {imageCount} ảnh{videoCount ? ` • ${videoCount} video` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4, paddingLeft: 21 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {repair.items.slice(0, 3).join(' + ') || repair.service}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setSelectedRepair(repair); }}
                          style={{ border: 'none', background: 'transparent', color: '#1565C0', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Xem hồ sơ →
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div style={{ padding: 9 }}>
                        {media.length ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 9 }}>
                            {media.map((item) => (
                              <div key={item.id} onClick={() => setPreviewImage(item)} style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden', background: '#FAFAFA', cursor: 'pointer' }}>
                                <div style={{ position: 'relative', width: '100%', height: 118, background: '#CBD5E1', overflow: 'hidden' }}>
                                  {item.mediaType === 'video' ? (
                                    <video src={item.url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  )}
                                  <span style={{ position: 'absolute', top: 6, left: 6, background: item.category === 'truoc' ? '#1565C0' : item.category === 'trong' ? '#E65100' : '#2E7D32', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                                    {item.category === 'truoc' ? 'Trước SC' : item.category === 'trong' ? 'Đang làm' : 'Hoàn thiện'}
                                  </span>
                                  <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Eye size={10} /> Phóng to
                                  </span>
                                </div>
                                <div style={{ padding: '6px 8px' }}>
                                  <div style={{ fontWeight: 600, fontSize: '10.5px', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: '9.5px', color: '#64748B' }}>
                                    <span>{item.date}</span><span>{item.odo}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: 18, textAlign: 'center', color: '#94A3B8', fontSize: '11px', border: '1px dashed #CBD5E1', borderRadius: 5, background: '#F8FAFC' }}>
                            Phiếu này chưa có ảnh/video thuộc nhóm đang lọc.
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
              {!mediaRepairGroups.length && (
                <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: 6 }}>Xe chưa có hồ sơ phiếu sửa chữa.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: GHI CHÚ */}
        {activeTab === 'ghi-chu' && (
          <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
            {/* Cột trái: Form nhập ghi chú & Lịch hẹn sắp tới */}
            <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              {/* Form tạo ghi chú nhanh */}
              <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #E0E0E0', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={14} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
                    Thêm ghi chú kỹ thuật cho xe {currentVehicle.plate}
                  </span>
                </div>
                <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 8,
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#64748B' }}>Mức độ:</span>
                      <select
                        value={newNotePriority}
                        onChange={(e) => setNewNotePriority(e.target.value)}
                        style={{
                          padding: '2px 6px',
                          border: '1px solid #CBD5E1',
                          borderRadius: 4,
                          fontSize: '10.5px',
                          outline: 'none'
                        }}
                      >
                        <option value="info">Thông tin chung</option>
                        <option value="warning">Cảnh báo / Nhắc hẹn</option>
                        <option value="urgent">Quan trọng / Khẩn cấp</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      style={{
                        height: 26,
                        padding: '0 12px',
                        background: '#E65100',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Plus size={12} /> Lưu ghi chú
                    </button>
                  </div>
                </form>
              </div>

              {/* Bảng Lịch hẹn & nhắc việc sắp tới */}
              <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #E0E0E0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} color="#E65100" />
                    <span style={{ fontWeight: 700, fontSize: '11px', color: '#1E293B' }}>Lịch hẹn dịch vụ & Nhắc việc</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Mở form tạo mới lịch hẹn dịch vụ')}
                    style={{
                      fontSize: '10px',
                      color: '#E65100',
                      border: '1px solid #FFCC80',
                      background: '#FFF3E0',
                      padding: '1px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    + Thêm lịch hẹn
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                    <thead>
                      <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Ngày hẹn</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Loại DV</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Nội dung</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentVehicle.appointments.map((it) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '5px 6px', color: '#334155' }}>{it.date}</td>
                          <td style={{ padding: '5px 6px', fontWeight: 600 }}>{it.service}</td>
                          <td style={{ padding: '5px 6px', color: '#64748B' }}>{it.content}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                            <span style={{ background: it.statusBg, color: it.statusColor, padding: '2px 6px', borderRadius: 8, fontSize: '9.5px', fontWeight: 600 }}>
                              {it.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!currentVehicle.appointments.length && (
                        <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#94A3B8' }}>Chưa có lịch hẹn hoặc nhắc việc cho xe này.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cột phải: Timeline danh sách ghi chú */}
            <div style={{
              flex: '1 1 420px',
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0
            }}>
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
                  Lịch sử ghi chú & Nhật ký xe ({currentNotes.length})
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentNotes.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>
                    Chưa có ghi chú nào cho xe này.
                  </div>
                ) : (
                  currentNotes.map(note => {
                    const isUrgent = note.priority === 'urgent';
                    const isWarning = note.priority === 'warning';
                    return (
                      <div
                        key={note.id}
                        style={{
                          background: isUrgent ? '#FFF5F5' : isWarning ? '#FFFBEB' : '#F8FAFC',
                          border: '1px solid ' + (isUrgent ? '#FEB2B2' : isWarning ? '#FDE68A' : '#E2E8F0'),
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              background: isUrgent ? '#E53E3E' : isWarning ? '#D97706' : '#2563EB',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 3
                            }}>
                              {isUrgent ? 'KHẨN CẤP' : isWarning ? 'CẢNH BÁO' : 'THÔNG TIN'}
                            </span>
                            <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '11px' }}>{note.author}</span>
                            <span style={{ fontSize: '10px', color: '#94A3B8' }}>• {note.date}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Xóa ghi chú"
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.4 }}>
                          {note.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
          </div> {/* End hsx-col-main */}

          {/* CỘT PHẢI: HÌNH ẢNH XE, LỊCH HẸN & NHẮC VIỆC, GHI CHÚ, NÚT TÁC VỤ */}
          <div className="hsx-col-side">
            {/* Card 1: Hình ảnh xe */}
            <div className="hsx-side-card">
              <div className="hsx-side-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ImageIcon size={13} color="#E65100" />
                  <span className="hsx-side-card-title">Hình ảnh xe</span>
                </div>
                <button
                  type="button"
                  className="hsx-side-btn-outline"
                  onClick={() => setActiveTab('hinh-anh')}
                >
                  + Thêm ảnh
                </button>
              </div>
              <div className="hsx-side-gallery">
                <div className="hsx-gallery-row-top">
                  {sideVehicleGallery.slice(0, 3).map((img) => (
                    <div
                      key={img.id}
                      className="hsx-gallery-thumb"
                      onClick={() => setPreviewImage(img)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                      />
                      <span>{img.label}</span>
                    </div>
                  ))}
                </div>
                <div className="hsx-gallery-row-bottom">
                  {sideVehicleGallery.slice(3, 7).map((img) => (
                    <div
                      key={img.id}
                      className="hsx-gallery-thumb"
                      onClick={() => setPreviewImage(img)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                      />
                      <span>{img.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Lịch hẹn & nhắc việc */}
            <div className="hsx-side-card">
              <div className="hsx-side-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} color="#E65100" />
                  <span className="hsx-side-card-title">Lịch hẹn & nhắc việc</span>
                </div>
                <button
                  type="button"
                  className="hsx-side-btn-outline"
                  onClick={() => showToast('Mở tạo mới lịch hẹn')}
                >
                  + Thêm lịch hẹn
                </button>
              </div>
              <div className="hsx-side-table-wrap">
                <table className="hsx-side-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Ngày hẹn</th>
                      <th style={{ width: '26%' }}>Loại dịch vụ</th>
                      <th style={{ width: '32%' }}>Nội dung</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVehicle.appointments.map((item) => (
                      <tr key={item.id}>
                        <td style={{ color: '#334155' }}>{item.date}</td>
                        <td style={{ fontWeight: 600, color: '#1E293B' }}>{item.service}</td>
                        <td style={{ color: '#64748B' }}>{item.content}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: item.statusBg,
                            color: item.statusColor,
                            padding: '1px 5px',
                            borderRadius: 6,
                            fontSize: '9px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!currentVehicle.appointments.length && (
                      <tr>
                        <td colSpan={4} style={{ padding: '12px 8px', textAlign: 'center', color: '#94A3B8' }}>Xe này chưa có lịch hẹn hoặc nhắc việc.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 3: Ghi chú */}
            <div className="hsx-side-card">
              <div className="hsx-side-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Edit3 size={13} color="#E65100" />
                  <span className="hsx-side-card-title">Ghi chú</span>
                </div>
                <button
                  type="button"
                  className="hsx-side-btn-outline"
                  onClick={() => setActiveTab('ghi-chu')}
                >
                  + Thêm ghi chú
                </button>
              </div>
              <div className="hsx-side-notes-list">
                {currentNotes.slice(0, 3).map((n) => (
                  <div key={n.id} className="hsx-side-note-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: n.priority === 'urgent' ? '#C62828' : n.priority === 'warning' ? '#E65100' : '#1565C0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '8.5px',
                        fontWeight: 700
                      }}>
                        {n.author.charAt(0).toUpperCase()}
                      </div>
                      <b style={{ fontSize: '10.5px', color: '#1E293B' }}>{n.author}</b>
                      <span style={{ fontSize: '9px', color: '#94A3B8' }}>{n.date}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.35 }}>
                      {n.content}
                    </div>
                  </div>
                ))}
                {!currentNotes.length && (
                  <div style={{ padding: '14px 8px', textAlign: 'center', color: '#94A3B8', fontSize: '10.5px' }}>Xe này chưa có ghi chú.</div>
                )}
              </div>
            </div>

            {/* Cụm 4 nút tác vụ */}
            <div className="hsx-side-actions">
              <button
                type="button"
                className="hsx-side-action-btn"
                onClick={() => openDocumentPrint({ type: 'MauHoSoXe', id: currentVehicle.id })}
              >
                <Printer size={12} color="#E65100" />
                <span>In phiếu xe</span>
              </button>
              <button
                type="button"
                className="hsx-side-action-btn"
                onClick={() => {
                  setEditingVehicle(currentVehicle);
                  setIsCreateVehicleOpen(true);
                }}
              >
                <Edit size={12} color="#E65100" />
                <span>Sửa thông tin</span>
              </button>
              <button
                type="button"
                className="hsx-side-action-btn"
                onClick={() => showToast('Chức năng xóa hồ sơ')}
              >
                <Trash2 size={12} color="#C62828" />
                <span>Xóa hồ sơ</span>
              </button>
              <button
                type="button"
                className="hsx-side-action-btn-primary"
                onClick={() => showToast('Mở lập phiếu tiếp nhận sửa chữa')}
              >
                <span>Lập phiếu tiếp nhận</span>
              </button>
            </div>

            {/* Card 4: Tổng quan hoạt động xe (Lấp đầy khoảng trống) */}
            {currentVehicle.repairs.filter(repair => repair.workflowState === 3).map(repair => <div key={repair.recordId} className="hsx-ready-payment"><div><b>Chờ giao xe · {repair.id}</b><small>{repair.paymentStatus} · {repair.total.toLocaleString('vi-VN')} đ</small></div><button type="button" className="hsx-payment-button" onClick={() => openRepairPayment(repair)}><Wallet size={14}/> Thanh toán</button></div>)}
            <div className="hsx-side-overview-card">
              <div className="hsx-side-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={13} color="#E65100" />
                  <span className="hsx-side-card-title">Tổng quan hoạt động xe</span>
                </div>
                <span style={{
                  background: '#FFF3E0',
                  color: '#E65100',
                  border: '1px solid #FFE0B2',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '9px',
                  fontWeight: 700
                }}>
                  VẬN HÀNH
                </span>
              </div>

              <div className="hsx-overview-body">
                {/* 4 Chỉ số KPI dạng lưới 2x2 */}
                <div className="hsx-overview-kpi-grid">
                  <div className="hsx-ov-kpi-box" title={`Tổng số lượt vào xưởng: ${totalRepairCount} lần`}>
                    <div className="hsx-ov-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                      <Wrench size={13} />
                    </div>
                    <div className="hsx-ov-content">
                      <span className="hsx-ov-label">LƯỢT VÀO XƯỞNG</span>
                      <span className="hsx-ov-val" style={{ color: '#C2410C' }}>
                        {totalRepairCount} <small>lần</small>
                      </span>
                    </div>
                  </div>

                  <div className="hsx-ov-kpi-box" title={`Tổng chi tiêu dịch vụ & phụ tùng: ${totalSpent.toLocaleString('vi-VN')} đ`}>
                    <div className="hsx-ov-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      <Wallet size={13} />
                    </div>
                    <div className="hsx-ov-content">
                      <span className="hsx-ov-label">TỔNG CHI TIÊU</span>
                      <span className="hsx-ov-val" style={{ color: '#1D4ED8' }}>
                        {formattedTotalSpent}
                      </span>
                    </div>
                  </div>

                  <div className="hsx-ov-kpi-box" title={`Bảo hành phụ tùng/dịch vụ còn hiệu lực: ${activeWarrantyCount} mục`}>
                    <div className="hsx-ov-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                      <ShieldCheck size={13} />
                    </div>
                    <div className="hsx-ov-content">
                      <span className="hsx-ov-label">BẢO HÀNH CÒN HẠN</span>
                      <span className="hsx-ov-val" style={{ color: '#059669' }}>
                        {activeWarrantyCount} <small>mục</small>
                      </span>
                    </div>
                  </div>

                  <div className="hsx-ov-kpi-box" title={`Phân hạng xe / khách hàng: ${customerTier}`}>
                    <div className="hsx-ov-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                      <Award size={13} />
                    </div>
                    <div className="hsx-ov-content">
                      <span className="hsx-ov-label">PHÂN HẠNG XE</span>
                      <span className="hsx-ov-val" style={{ color: '#7C3AED' }}>
                        {customerTier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thanh tiến trình chu kỳ bảo dưỡng kế tiếp */}
                <div className="hsx-ov-progress-block">
                  <div className="hsx-ov-progress-header">
                    <span className="hsx-ov-progress-title">
                      <Gauge size={11} color="#2563EB" />
                      Chu kỳ bảo dưỡng kế tiếp
                    </span>
                    <span className="hsx-ov-progress-tag">
                      {nextServiceBadge}
                    </span>
                  </div>
                  <div className="hsx-progress-bar-bg" title={`Tiến độ đến mốc kế tiếp: ${odoProgressPercent}%`}>
                    <div className="hsx-progress-bar-fill" style={{ width: `${odoProgressPercent}%` }} />
                  </div>
                  <div className="hsx-ov-progress-footer">
                    <span>Hiện tại: <b>{currentVehicle.odo}</b></span>
                    <span>Kế hoạch: <b>{nextServiceBadge}</b></span>
                  </div>
                </div>

                {/* Các dòng tóm tắt thông tin quan trọng */}
                <div className="hsx-ov-info-list">
                  <div className="hsx-ov-info-row">
                    <span className="hsx-ov-info-key">
                      <Clock size={11} color="#64748B" />
                      Lần vào xưởng gần nhất:
                    </span>
                    <span className="hsx-ov-info-val">
                      {currentVehicle.repairs[0] ? (
                        <span>{currentVehicle.repairs[0].date} ({currentVehicle.repairs[0].odo})</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Chưa có hồ sơ</span>
                      )}
                    </span>
                  </div>

                  <div className="hsx-ov-info-row">
                    <span className="hsx-ov-info-key">
                      <CalendarClock size={11} color="#64748B" />
                      Nhắc bảo dưỡng:
                    </span>
                    <span className="hsx-ov-info-val" style={{ color: '#059669', fontWeight: 700 }}>
                      {nextServiceText}
                    </span>
                  </div>

                  <div className="hsx-ov-info-row">
                    <span className="hsx-ov-info-key">
                      <CheckCircle2 size={11} color="#16A34A" />
                      Trạng thái kỹ thuật:
                    </span>
                    <span className="hsx-ov-info-val" style={{ color: currentVehicle.statusColor }}>
                      {currentVehicle.status} • Biển {currentVehicle.plate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div> {/* End hsx-col-side */}
        </div> {/* End hsx-two-col-layout */}
      </div>}

      <VehicleProfileModal
        open={isCreateVehicleOpen}
        editingVehicle={editingVehicle}
        onClose={() => {
          setIsCreateVehicleOpen(false);
          setEditingVehicle(null);
        }}
        notify={showToast}
        onCreated={async (id, rows) => {
          const mapped = rows.map(mapVehicleSummary);
          setVehicleList(mapped);
          const created = mapped.find((item) => item.id === id);
          if (created) await handleSelectVehicle(created);
        }}
        onUpdated={async (id, rows) => {
          const mapped = rows.map(mapVehicleSummary);
          setVehicleList(mapped);
          const updated = mapped.find((item) => item.id === id);
          if (updated) {
            await handleSelectVehicle(updated);
          } else {
            await loadVehicleProfile({ id }, true);
          }
        }}
      />

      {/* Biểu mẫu cũ giữ tạm để đối chiếu, không còn hiển thị. */}
      {false && isCreateVehicleOpen && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateVehicleForm(); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.58)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <form
            onSubmit={handleCreateVehicle}
            style={{
              background: '#FFFFFF', borderRadius: 9, width: 'min(900px, 96vw)', maxHeight: '92vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 18px 45px rgba(15, 23, 42, 0.3)',
            }}
          >
            <div style={{
              padding: '11px 16px', background: '#E65100', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Car size={18} />
                <span style={{ fontSize: 15, fontWeight: 800 }}>TẠO HỒ SƠ XE</span>
              </div>
              <button
                type="button"
                disabled={savingVehicle}
                onClick={closeCreateVehicleForm}
                aria-label="Đóng"
                style={{ border: 0, background: 'transparent', color: '#fff', padding: 2, cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div style={{
                background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6,
                padding: '8px 10px', color: '#9A3412', fontSize: 11, marginBottom: 14,
              }}>
                Nhập thông tin nhận dạng, chủ sở hữu và thông số kỹ thuật của xe. Các trường có dấu <b style={{ color: '#DC2626' }}>*</b> là bắt buộc.
              </div>

              {vehicleFormError && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
                  borderRadius: 5, padding: '7px 10px', fontSize: 11, fontWeight: 600, marginBottom: 12,
                }}>
                  {vehicleFormError}
                </div>
              )}

              <div style={{ fontWeight: 800, fontSize: 12, color: '#C2410C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={14} /> Thông tin hồ sơ và chủ xe
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 11, marginBottom: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Biển số xe <span style={{ color: '#DC2626' }}>*</span>
                  <input
                    autoFocus maxLength={30} value={vehicleForm.BIENSO}
                    onChange={(e) => updateVehicleForm('BIENSO', e.target.value.toUpperCase())}
                    placeholder="Ví dụ: 51A-123.45"
                    style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, outlineColor: '#E65100', textTransform: 'uppercase' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Khách hàng / Chủ xe <span style={{ color: '#DC2626' }}>*</span>
                  <select
                    value={vehicleForm.DKHACHHANGID}
                    onChange={(e) => updateVehicleForm('DKHACHHANGID', e.target.value)}
                    style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: '#fff', outlineColor: '#E65100' }}
                  >
                    <option value="">-- Chọn khách hàng / chủ xe --</option>
                    {customerOptions.map((customer) => (
                      <option key={customer.ID} value={customer.ID}>
                        {customer.MAKHACH ? `${customer.MAKHACH} - ` : ''}{customer.NAME}{customer.DIENTHOAI ? ` - ${customer.DIENTHOAI}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ fontWeight: 800, fontSize: 12, color: '#C2410C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wrench size={14} /> Thông số kỹ thuật
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 11 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Hãng xe <span style={{ color: '#DC2626' }}>*</span>
                  <select value={vehicleForm.DHANGXEID} onChange={(e) => updateVehicleForm('DHANGXEID', e.target.value)} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: '#fff' }}>
                    <option value="">-- Chọn hãng xe --</option>
                    {vehicleBrands.map((brand) => <option key={brand.ID} value={brand.ID}>{brand.NAME}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Dòng xe <span style={{ color: '#DC2626' }}>*</span>
                  <select value={vehicleForm.DDONGXEID} disabled={!vehicleForm.DHANGXEID} onChange={(e) => updateVehicleForm('DDONGXEID', e.target.value)} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: vehicleForm.DHANGXEID ? '#fff' : '#F8FAFC' }}>
                    <option value="">-- Chọn dòng xe --</option>
                    {vehicleModels.filter((model) => model.DHANGXEID === vehicleForm.DHANGXEID).map((model) => <option key={model.ID} value={model.ID}>{model.NAME}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Phiên bản
                  <input maxLength={100} value={vehicleForm.PHIENBAN} onChange={(e) => updateVehicleForm('PHIENBAN', e.target.value)} placeholder="Ví dụ: 2.4G (AT)" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Năm sản xuất
                  <input type="number" min="1900" max="2100" value={vehicleForm.NAMSANXUAT} onChange={(e) => updateVehicleForm('NAMSANXUAT', e.target.value)} placeholder="2026" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Màu xe
                  <input maxLength={50} value={vehicleForm.MAUXE} onChange={(e) => updateVehicleForm('MAUXE', e.target.value)} placeholder="Trắng, đen, bạc..." style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Số khung (VIN)
                  <input maxLength={100} value={vehicleForm.SOKHUNG} onChange={(e) => updateVehicleForm('SOKHUNG', e.target.value.toUpperCase())} placeholder="Nhập số khung" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, textTransform: 'uppercase' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Số máy
                  <input maxLength={100} value={vehicleForm.SOMAY} onChange={(e) => updateVehicleForm('SOMAY', e.target.value.toUpperCase())} placeholder="Nhập số máy" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, textTransform: 'uppercase' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  ODO hiện tại (km)
                  <input type="number" min="0" step="1" value={vehicleForm.ODO} onChange={(e) => updateVehicleForm('ODO', e.target.value)} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Nhiên liệu
                  <select value={vehicleForm.NHIENLIEU} onChange={(e) => updateVehicleForm('NHIENLIEU', e.target.value)} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: '#fff' }}>
                    <option value="">-- Chọn nhiên liệu --</option>
                    <option value="Xăng">Xăng</option><option value="Dầu">Dầu</option>
                    <option value="Điện">Điện</option><option value="Hybrid">Hybrid</option>
                    <option value="LPG">LPG</option><option value="Khác">Khác</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mức nhiên liệu (%)
                  <div style={{ height: 34, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min="0" max="100" step="5" value={vehicleForm.MUCNHIENLIEU} onChange={(e) => updateVehicleForm('MUCNHIENLIEU', e.target.value)} style={{ flex: 1, accentColor: '#E65100' }} />
                    <input type="number" min="0" max="100" value={vehicleForm.MUCNHIENLIEU} onChange={(e) => updateVehicleForm('MUCNHIENLIEU', e.target.value)} style={{ width: 56, height: 30, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 6px', fontSize: 12, textAlign: 'right' }} />
                  </div>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', marginTop: 11 }}>
                Ghi chú hồ sơ xe
                <textarea
                  rows={3} maxLength={1000} value={vehicleForm.GHICHU}
                  onChange={(e) => updateVehicleForm('GHICHU', e.target.value)}
                  placeholder="Nhập tình trạng, đặc điểm nhận diện hoặc lưu ý về xe..."
                  style={{ border: '1px solid #CBD5E1', borderRadius: 5, padding: '8px 10px', fontSize: 12, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
                />
              </label>
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingVehicle} onClick={closeCreateVehicleForm} style={{ height: 34, padding: '0 16px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 5, color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                Hủy
              </button>
              <button type="submit" disabled={savingVehicle} style={{ height: 34, padding: '0 18px', background: savingVehicle ? '#FDBA74' : '#E65100', color: '#fff', border: 0, borderRadius: 5, fontWeight: 700, cursor: savingVehicle ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {savingVehicle ? <Clock size={14} /> : <CheckCircle size={14} />}
                {savingVehicle ? 'Đang lưu...' : 'Tạo hồ sơ xe'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DANH SÁCH TẤT CẢ XE TRONG GARAGE */}
      {isCarModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 8,
            width: '100%',
            maxWidth: 780,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              padding: '10px 14px',
              background: '#E65100',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Car size={16} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  DANH SÁCH XE TRONG GARAGE ({vehicleList.length} XE)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCarModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 12, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Ảnh</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Biển số</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tên dòng xe</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Chủ xe & SĐT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>ODO</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleList.map(v => {
                    const isSelected = v.id === currentVehicle.id;
                    return (
                      <tr
                      key={v.id || v.plate}
                        style={{
                          background: isSelected ? '#FFF8E1' : '#FFFFFF',
                          borderBottom: '1px solid #E2E8F0'
                        }}
                      >
                        <td style={{ padding: '6px 8px' }}>
                          <img src={v.avatar} alt={v.model} style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 800, color: '#E65100', fontSize: '12px' }}>
                          {v.plate}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{v.modelName}</div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>VIN: {v.vin}</div>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: '#1565C0' }}>{v.owner.name}</div>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>{v.owner.phone}</div>
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#334155' }}>
                          {v.odo}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{ background: v.statusBg, color: v.statusColor, padding: '2px 8px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                            {v.status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleSelectVehicle(v)}
                            style={{
                              background: isSelected ? '#2E7D32' : '#E65100',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '3px 8px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2
                            }}
                          >
                            {isSelected ? 'Đang mở' : 'Mở hồ sơ'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '8px 14px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsCarModalOpen(false)}
                style={{
                  height: 28,
                  padding: '0 12px',
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHIẾU SỬA CHỮA */}
      {selectedRepair && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 8,
            width: '100%',
            maxWidth: 640,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '10px 14px',
              background: '#E65100',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClipboardList size={16} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  CHI TIẾT PHIẾU SỬA CHỮA: {selectedRepair.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRepair(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, fontSize: '11px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, background: '#F8FAFC', padding: 10, borderRadius: 6 }}>
                <div><span style={{ color: '#64748B' }}>Biển số xe:</span> <b>{selectedRepair.plate}</b></div>
                <div><span style={{ color: '#64748B' }}>Ngày tiếp nhận:</span> <b>{selectedRepair.date}</b></div>
                <div><span style={{ color: '#64748B' }}>Số Km lúc vào (ODO):</span> <b>{selectedRepair.odo}</b></div>
                <div><span style={{ color: '#64748B' }}>Ngày hoàn thành:</span> <b>{selectedRepair.dateOut}</b></div>
                <div><span style={{ color: '#64748B' }}>Cố vấn dịch vụ:</span> <b>{selectedRepair.advisor}</b></div>
                <div><span style={{ color: '#64748B' }}>Kỹ thuật viên chính:</span> <b>{selectedRepair.tech}</b></div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '7px 10px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#9A3412' }}>
                  <History size={14} /> Quá trình tiếp nhận và sửa chữa
                </div>
                <div style={{ padding: '14px 12px 10px', overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 570 }}>
                    {VEHICLE_PROCESS_STAGES.map((stage, index) => {
                      const done = index < selectedRepair.processStage;
                      const current = index === selectedRepair.processStage;
                      return (
                        <div key={stage} style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                            <div style={{
                              width: 25, height: 25, borderRadius: '50%', margin: '0 auto 5px',
                              background: done ? '#2E7D32' : current ? '#E65100' : '#F1F5F9',
                              color: done || current ? '#fff' : '#94A3B8',
                              border: current ? '3px solid #FFCC80' : `1px solid ${done ? '#2E7D32' : '#CBD5E1'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxSizing: 'border-box', fontWeight: 800, position: 'relative', zIndex: 2,
                            }}>
                              {done ? <Check size={13} /> : index + 1}
                            </div>
                            <div style={{ fontSize: 9.5, lineHeight: 1.25, fontWeight: current || done ? 700 : 500, color: current ? '#E65100' : done ? '#2E7D32' : '#94A3B8', padding: '0 3px' }}>
                              {stage}
                            </div>
                            {index < VEHICLE_PROCESS_STAGES.length - 1 && (
                              <div style={{
                                position: 'absolute', top: 12, left: 'calc(50% + 13px)', width: 'calc(100% - 26px)', height: 2,
                                background: done ? '#2E7D32' : '#CBD5E1', zIndex: 1,
                              }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', padding: '8px 10px', background: '#FAFAFA' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6 }}>Lịch sử ghi nhận</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {selectedRepair.processHistory.map((event) => (
                      <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '118px minmax(0, 1fr)', gap: 8, padding: '6px 8px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 5 }}>
                        <div style={{ color: '#64748B', fontSize: 10 }}>{event.date}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontWeight: 700, color: '#1E293B' }}>
                            <span style={{ color: '#64748B', fontWeight: 500 }}>{event.from}</span>
                            <ChevronRight size={12} color="#94A3B8" />
                            <span style={{ color: '#E65100' }}>{event.to}</span>
                          </div>
                          <div style={{ color: '#64748B', fontSize: 9.5, marginTop: 2 }}>
                            Người thực hiện: <b style={{ color: '#334155' }}>{event.employee}</b>
                            {event.reason ? ` • ${event.reason}` : ''}
                            {event.note ? ` • ${event.note}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>Hạng mục công việc & Phụ tùng:</div>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                  {selectedRepair.items.map((item, idx) => (
                    <div key={idx} style={{ padding: '6px 8px', borderBottom: idx < selectedRepair.items.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={12} color="#2E7D32" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#FFF8E1', border: '1px solid #FFE0B2', borderRadius: 6, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#5D4037' }}>Tiền phụ tùng / vật tư:</span>
                  <b>{selectedRepair.partCost.toLocaleString('vi-VN')}đ</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#5D4037' }}>Tiền công sửa chữa:</span>
                  <b>{selectedRepair.laborCost.toLocaleString('vi-VN')}đ</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #FFCC80', paddingTop: 6, fontSize: '13px' }}>
                  <span style={{ fontWeight: 700, color: '#BF360C' }}>TỔNG CHI PHÍ:</span>
                  <span style={{ fontWeight: 800, color: '#E65100', fontSize: '14px' }}>
                    {selectedRepair.total.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '8px 14px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              {selectedRepair.workflowState === 3 && <button type="button" className="hsx-payment-button" onClick={() => openRepairPayment(selectedRepair)}><Wallet size={14}/> Thanh toán & hoàn tất</button>}
              <button
                type="button"
                onClick={() => {
                  openDocumentPrint({ type: 'MauPhieuSuaChua', id: selectedRepair.recordId });
                  setSelectedRepair(null);
                }}
                style={{
                  height: 28,
                  padding: '0 12px',
                  background: '#E65100',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Printer size={12} /> In phiếu sửa chữa
              </button>
              <button
                type="button"
                onClick={() => setSelectedRepair(null)}
                style={{
                  height: 28,
                  padding: '0 12px',
                  background: '#FFFFFF',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO HÌNH ẢNH */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0F172A',
              borderRadius: 8,
              maxWidth: 720,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', borderBottom: '1px solid #334155' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={previewImage.url}
                alt={previewImage.title}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '10.5px' }}>
              <span>Thời gian chụp: {previewImage.date}</span>
              <span>Số Km ghi nhận: {previewImage.odo}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
