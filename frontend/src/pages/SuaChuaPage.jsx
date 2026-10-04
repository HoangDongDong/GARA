import { openDocumentPrint } from '../components/DocumentPrintDialog';
import useDocumentNumber from '../hooks/useDocumentNumber';
import DocumentNumberField from '../components/DocumentNumberField';
import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Wrench, Calendar, Search, CheckSquare, Square, Check, XCircle, RotateCcw, 
  Send, Printer, Bookmark, CheckCircle, ChevronDown, Sparkles, Filter, 
  Disc, Zap, Thermometer, BatteryCharging, MoreHorizontal, Settings as SettingsIcon,
  CircleDot, FileText, Car, Plus, UserPlus, Images, ImagePlus, Trash2
} from 'lucide-react';
import { customers, employees, invoices, masterData, parts as partsApi, repairOrders, vehicles, workflow } from '../services';
import VehicleProfileModal from '../components/VehicleProfileModal';
import EmployeeFormModal from '../components/EmployeeFormModal';
import './SuaChuaPage.css';

const MAX_WORKFLOW_IMAGES = 12;

const compressWorkflowImage = (file) => new Promise((resolve, reject) => {
  if (!file?.type?.startsWith('image/')) return reject(new Error('Tệp đã chọn không phải hình ảnh.'));
  const objectUrl = URL.createObjectURL(file);
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
      URL.revokeObjectURL(objectUrl);
      resolve({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    }
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error(`Không đọc được ảnh ${file.name}.`));
  };
  image.src = objectUrl;
});

export default function SuaChuaPage() {
  // Toast thông báo
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Thông tin phiếu tiếp nhận sửa chữa
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleId: '', customerId: '',
    plate: '51A-123.45',
    date: '2025-09-30',
    status: 'Đang kiểm tra',
    customer: 'Nguyễn Văn A',
    staff: 'admin',
    currentKm: '68.500',
    carModel: 'Toyota Vios',
    receiptCode: '',
    note: ''
  });

  // Ghi chú khi sửa chữa
  const [repairNotes, setRepairNotes] = useState(
    'Vui lòng kiểm tra kỹ trước khi thay thế.\nLiên hệ khách hàng nếu có phát sinh thêm.'
  );

  // Danh mục dịch vụ / phụ tùng (14 dòng chuẩn xác theo ảnh mẫu)
  const [services, setServices] = useState([
    {
      id: 1,
      group: 'Bảo dưỡng',
      iconType: 'gear',
      groupColor: '#1976D2',
      groupBg: '#E3F2FD',
      name: 'Thay dầu động cơ',
      unit: 'Lần',
      price: 350000,
      note: 'Thay dầu 5W-30',
      checked: true
    },
    {
      id: 2,
      group: 'Lọc',
      iconType: 'filter',
      groupColor: '#2E7D32',
      groupBg: '#E8F5E9',
      name: 'Thay lọc dầu',
      unit: 'Cái',
      price: 80000,
      note: 'Lọc dầu chính hãng',
      checked: true
    },
    {
      id: 3,
      group: 'Lọc',
      iconType: 'filter',
      groupColor: '#2E7D32',
      groupBg: '#E8F5E9',
      name: 'Thay lọc gió động cơ',
      unit: 'Cái',
      price: 120000,
      note: 'Kiểm tra đường gió',
      checked: true
    },
    {
      id: 4,
      group: 'Lọc',
      iconType: 'filter',
      groupColor: '#2E7D32',
      groupBg: '#E8F5E9',
      name: 'Thay lọc gió điều hòa',
      unit: 'Cái',
      price: 180000,
      note: 'Vệ sinh dàn lạnh',
      checked: false
    },
    {
      id: 5,
      group: 'Phanh',
      iconType: 'disc',
      groupColor: '#C62828',
      groupBg: '#FFEBEE',
      name: 'Thay má phanh trước',
      unit: 'Bộ',
      price: 1200000,
      note: 'Bảo hành 6 tháng',
      checked: true
    },
    {
      id: 6,
      group: 'Phanh',
      iconType: 'disc',
      groupColor: '#C62828',
      groupBg: '#FFEBEE',
      name: 'Thay đĩa phanh trước',
      unit: 'Cái',
      price: 2800000,
      note: 'Kiểm tra độ mòn',
      checked: false
    },
    {
      id: 7,
      group: 'Lốp',
      iconType: 'circle-dot',
      groupColor: '#1565C0',
      groupBg: '#E3F2FD',
      name: 'Thay lốp trước (2 lốp)',
      unit: 'Cái',
      price: 2600000,
      note: 'Lốp 205/55R16',
      checked: true
    },
    {
      id: 8,
      group: 'Lốp',
      iconType: 'circle-dot',
      groupColor: '#1565C0',
      groupBg: '#E3F2FD',
      name: 'Cân bằng động',
      unit: 'Lần',
      price: 200000,
      note: 'Cân bằng 4 bánh',
      checked: false
    },
    {
      id: 9,
      group: 'Ắc quy',
      iconType: 'battery',
      groupColor: '#D84315',
      groupBg: '#FBE9E7',
      name: 'Thay ắc quy',
      unit: 'Cái',
      price: 2500000,
      note: '12V - 60Ah',
      checked: false
    },
    {
      id: 10,
      group: 'Điện',
      iconType: 'zap',
      groupColor: '#EF6C00',
      groupBg: '#FFF3E0',
      name: 'Thay bugi',
      unit: 'Bộ',
      price: 750000,
      note: '4 bugi',
      checked: true
    },
    {
      id: 11,
      group: 'Hệ thống làm mát',
      iconType: 'thermometer',
      groupColor: '#6A1B9A',
      groupBg: '#F3E5F5',
      name: 'Thay nước làm mát',
      unit: 'Lít',
      price: 250000,
      note: 'Dùng nước làm mát chính hãng',
      checked: false
    },
    {
      id: 12,
      group: 'Hệ thống điện',
      iconType: 'zap',
      groupColor: '#EF6C00',
      groupBg: '#FFF3E0',
      name: 'Kiểm tra bình điện',
      unit: 'Lần',
      price: 150000,
      note: 'Kiểm tra điện áp',
      checked: false
    },
    {
      id: 13,
      group: 'Khác',
      iconType: 'more',
      groupColor: '#455A64',
      groupBg: '#ECEFF1',
      name: 'Vệ sinh nội thất',
      unit: 'Lần',
      price: 300000,
      note: 'Theo yêu cầu khách hàng',
      checked: false
    },
    {
      id: 14,
      group: 'Khác',
      iconType: 'more',
      groupColor: '#455A64',
      groupBg: '#ECEFF1',
      name: 'Đánh bóng xe',
      unit: 'Lần',
      price: 500000,
      note: 'Tùy chọn',
      checked: false
    }
  ]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [savingProcess, setSavingProcess] = useState(false);
  const [repairFlow, setRepairFlow] = useState({ repairId: null, workflowId: null, receptionId: null, workflowState: null });
  const draftNumber=useDocumentNumber('LenhSuaChua',!repairFlow.repairId,vehicleInfo.plate);
  const [vehicleFlowOptions, setVehicleFlowOptions] = useState([]);
  const vehicleSelectionRequest = useRef(0);
  const [showRepairConfirmation, setShowRepairConfirmation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [workflowImages, setWorkflowImages] = useState([]);
  const [draftWorkflowImages, setDraftWorkflowImages] = useState([]);
  const [selectedImageState, setSelectedImageState] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const workflowImageInputRef = useRef(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [savingVehicleMaster, setSavingVehicleMaster] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [showAddCustomerGroup, setShowAddCustomerGroup] = useState(false);
  const [savingCustomerGroup, setSavingCustomerGroup] = useState(false);
  const [newCustomerGroupName, setNewCustomerGroupName] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    NAME: '', DNHOMKHACHHANGID: '', MAKHACH: '', DIENTHOAI: '',
    EMAIL: '', MASOTHUE: '', DIACHI: '',
  });
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeRoleOptions, setEmployeeRoleOptions] = useState([
    { key: '1', label: 'Kỹ thuật viên' }, { key: '2', label: 'Cố vấn dịch vụ' },
    { key: '4', label: 'Thu ngân' }, { key: '0', label: 'Lễ tân' }, { key: '3', label: 'Thủ kho' },
  ]);
  const [employeeDepartmentOptions, setEmployeeDepartmentOptions] = useState(['Sửa chữa', 'Dịch vụ', 'Kế toán', 'Kho hàng', 'Văn phòng']);
  const [showAddEmployeeOption, setShowAddEmployeeOption] = useState(false);
  const [employeeOptionType, setEmployeeOptionType] = useState('role');
  const [newEmployeeOptionName, setNewEmployeeOptionName] = useState('');
  const [newEmployee, setNewEmployee] = useState({
    NAME: '', CODE: '', DIENTHOAI: '', EMAIL: '', DIACHI: '', DEPARTMENT: 'Dịch vụ',
    CERT: '', CHUYENMON: '', LOAINHANVIEN: '1', ROLEKEY: '1', ROLELABEL: 'Kỹ thuật viên',
  });
  const [newVehicle, setNewVehicle] = useState({
    BIENSO: '', DKHACHHANGID: '', DHANGXEID: '', DDONGXEID: '', PHIENBAN: '',
    NAMSANXUAT: '', MAUXE: '', SOKHUNG: '', SOMAY: '', ODO: '0',
    NHIENLIEU: '', MUCNHIENLIEU: '50', GHICHU: '',
  });

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const [vehicleRows, serviceRows, partRows, employeeRows, customerRows, vehicleMeta, customerGroupRows] = await Promise.all([
          vehicles.list(), masterData.services(), partsApi.list(), employees.list(),
          customers.list(), vehicles.meta(), masterData.customerGroups(),
        ]);
        const availableVehicles = Array.isArray(vehicleRows) ? vehicleRows : [];
        setVehicleOptions(availableVehicles);
        setEmployeeOptions(Array.isArray(employeeRows) ? employeeRows : []);
        setCustomerOptions(Array.isArray(customerRows) ? customerRows : []);
        setCustomerGroups(Array.isArray(customerGroupRows) ? customerGroupRows : []);
        setVehicleBrands(Array.isArray(vehicleMeta?.brands) ? vehicleMeta.brands : []);
        setVehicleModels(Array.isArray(vehicleMeta?.models) ? vehicleMeta.models : []);
        const catalog = [
          ...(Array.isArray(serviceRows) ? serviceRows : []).map((item) => ({
            id: `DV-${item.ID}`, sourceId: item.ID, sourceType: 1,
            group: item.CATEGORY_NAME || 'Dịch vụ', iconType: 'gear',
            groupColor: '#1976D2', groupBg: '#E3F2FD', name: item.NAME,
            unit: 'Lần', unitId: null, quantity: 1, price: Number(item.GIA || 0),
            note: item.NOTE || item.CODE || 'Dịch vụ sửa chữa', checked: false,
          })),
          ...(Array.isArray(partRows) ? partRows : []).map((item) => ({
            id: `PT-${item.ID}`, sourceId: item.ID, sourceType: 0,
            group: item.NHOM || 'Phụ tùng', iconType: 'more',
            groupColor: '#E65100', groupBg: '#FFF3E0', name: item.NAME,
            unit: item.DONVI || 'Cái', unitId: item.DDONVITINHID || null,
            quantity: 1, price: Number(item.GIABAN || 0),
            note: `${item.CODE || 'Phụ tùng'} • Tồn: ${Number(item.TON_KHO || 0)}`, checked: false,
          })),
        ];
        setServices(catalog);
        const first = availableVehicles[0];
        if (first) {
          setVehicleInfo((current) => ({
            ...current, vehicleId: first.ID, customerId: first.DKHACHHANGID || '',
            plate: first.BIENSO || '', customer: first.TEN_KH || '',
            currentKm: Number(first.ODO || 0).toLocaleString('vi-VN'),
            carModel: [first.HANG_XE, first.DONG_XE, first.PHIENBAN].filter(Boolean).join(' '),
            date: new Date().toISOString().slice(0, 10),
            receiptCode: '',
          }));
          const flowRows = await workflow.byVehicleAll(first.ID).catch(() => []);
          const flowOptions = Array.isArray(flowRows) ? flowRows : [];
          setVehicleFlowOptions(flowOptions);
          const activeFlow = flowOptions[0] || null;
          if (activeFlow) {
            setRepairFlow({
              repairId: activeFlow.TLENHSUACHUAID || null,
              workflowId: activeFlow.ID || null,
              receptionId: activeFlow.TTIEPNHANXEID || null,
              workflowState: Number(activeFlow.TRANGTHAI),
            });
            setVehicleInfo((current) => ({
              ...current,
              receiptCode: activeFlow.SOPHIEU || activeFlow.SOPHIEUTIEPNHAN || current.receiptCode,
            }));
            if (activeFlow.TLENHSUACHUAID) {
              const order = await repairOrders.get(activeFlow.TLENHSUACHUAID).catch(() => null);
              const detailIds = new Set((order?.details || []).map((detail) => detail.DMATHANGID || detail.DDICHVUID));
              setServices(catalog.map((item) => ({ ...item, checked: detailIds.has(item.sourceId) })));
            }
          }
        }
      } catch (error) {
        showToast(error?.response?.data?.error || 'Không thể tải dữ liệu sửa chữa từ database.');
      }
    };
    loadDatabase();
  }, []);

  useEffect(() => {
    const customRoles = [];
    const customDepartments = [];
    employeeOptions.forEach((employee) => {
      try {
        const note = JSON.parse(employee.NOTE || '{}');
        if (note.chucVu) customRoles.push(note.chucVu);
        if (note.phongBan) customDepartments.push(note.phongBan);
      } catch {}
    });
    if (customRoles.length) setEmployeeRoleOptions((current) => {
      const labels = new Set(current.map((item) => item.label.toLocaleLowerCase('vi')));
      return [...current, ...[...new Set(customRoles)].filter((label) => !labels.has(label.toLocaleLowerCase('vi'))).map((label) => ({ key: `custom:${label}`, label }))];
    });
    if (customDepartments.length) setEmployeeDepartmentOptions((current) => [...new Set([...current, ...customDepartments])]);
  }, [employeeOptions]);

  // Bộ lọc tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');

  // Lọc danh sách dịch vụ
  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const q = searchTerm.toLowerCase();
    return services.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.group.toLowerCase().includes(q) || 
      s.note.toLowerCase().includes(q)
    );
  }, [services, searchTerm]);

  // Danh sách đã chọn (tính toán tự động)
  const selectedServices = useMemo(() => {
    return services.filter(s => s.checked);
  }, [services]);

  // Tổng cộng tiền
  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.price * (s.quantity || 1)), 0);
  }, [selectedServices]);

  const businessStage = Math.max(0, Math.min(4, Number(repairFlow.workflowState ?? 0)));
  const isFlowCompleted = Number(repairFlow.workflowState) === 4;
  const isServiceSelectionLocked = Boolean(repairFlow.repairId)
    && Number(repairFlow.workflowState) >= 2;
  const activeVehicleFlow = vehicleFlowOptions.find((flow) => Number(flow.TRANGTHAI) < 4) || null;
  const processLabels = ['Tiếp nhận & Báo giá', 'Xác nhận sửa chữa', 'Đang sửa', 'Giao xe', 'Hoàn thành'];
  const shortProcessLabels = ['Báo giá', 'Xác nhận', 'Đang sửa', 'Giao xe', 'Hoàn tất'];

  const refreshWorkflowImages = async (workflowId = repairFlow.workflowId) => {
    if (!workflowId) {
      setWorkflowImages([]);
      return [];
    }
    const rows = await workflow.images(workflowId);
    const list = Array.isArray(rows) ? rows : [];
    setWorkflowImages(list);
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    if (!repairFlow.workflowId) {
      setWorkflowImages([]);
      return undefined;
    }
    workflow.images(repairFlow.workflowId)
      .then((rows) => { if (!cancelled) setWorkflowImages(Array.isArray(rows) ? rows : []); })
      .catch((error) => { if (!cancelled) showToast(error?.response?.data?.error || 'Không thể tải ảnh trạng thái.'); });
    return () => { cancelled = true; };
  }, [repairFlow.workflowId]);

  useEffect(() => {
    setSelectedImageState(businessStage);
  }, [repairFlow.workflowId, repairFlow.workflowState]);

  const handleWorkflowImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const currentCount = repairFlow.workflowId
      ? workflowImages.filter((item) => Number(item.TRANGTHAI) === selectedImageState).length
      : draftWorkflowImages.length;
    const available = MAX_WORKFLOW_IMAGES - currentCount;
    if (available <= 0) return showToast(`Mỗi trạng thái lưu tối đa ${MAX_WORKFLOW_IMAGES} ảnh.`);

    setUploadingImages(true);
    try {
      const prepared = await Promise.all(files.slice(0, available).map(compressWorkflowImage));
      if (!repairFlow.workflowId) {
        if (selectedImageState !== 0) return showToast('Hãy lưu Tiếp nhận & Báo giá trước khi thêm ảnh cho bước này.');
        setDraftWorkflowImages((current) => [...current, ...prepared]);
        showToast(`Đã chọn ${prepared.length} ảnh; ảnh sẽ lưu cùng phiếu tiếp nhận.`);
        return;
      }
      await workflow.uploadImages({
        TTRANGTHAIXEID: repairFlow.workflowId,
        DXEID: vehicleInfo.vehicleId,
        TLENHSUACHUAID: repairFlow.repairId,
        TRANGTHAI: selectedImageState,
        images: prepared,
      });
      await refreshWorkflowImages(repairFlow.workflowId);
      showToast(`Đã lưu ${prepared.length} ảnh cho bước ${processLabels[selectedImageState]}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể lưu ảnh trạng thái.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteWorkflowImage = async (image) => {
    try {
      await workflow.deleteImage(image.ID);
      await refreshWorkflowImages(repairFlow.workflowId);
      showToast('Đã xóa ảnh khỏi trạng thái.');
    } catch (error) {
      showToast(error?.response?.data?.error || 'Không thể xóa ảnh trạng thái.');
    }
  };

  const visibleWorkflowImages = repairFlow.workflowId
    ? workflowImages.filter((item) => Number(item.TRANGTHAI) === selectedImageState)
    : selectedImageState === 0 ? draftWorkflowImages : [];

  const loadRepairFlow = async (flow, requestId = vehicleSelectionRequest.current, catalog = null) => {
    if (!flow) return;
    setRepairFlow({
      repairId: flow.TLENHSUACHUAID || null,
      workflowId: flow.ID || null,
      receptionId: flow.TTIEPNHANXEID || null,
      workflowState: Number(flow.TRANGTHAI),
    });
    setVehicleInfo((current) => ({
      ...current,
      receiptCode: flow.SOPHIEU || flow.SOPHIEUTIEPNHAN || current.receiptCode,
    }));
    setServices((current) => (catalog || current).map((item) => ({ ...item, checked: false })));
    if (!flow.TLENHSUACHUAID) return;
    const order = await repairOrders.get(flow.TLENHSUACHUAID).catch((error) => {
      showToast(error?.response?.data?.error || 'Không thể tải lại các hạng mục của số phiếu đã chọn.');
      return null;
    });
    if (requestId !== vehicleSelectionRequest.current || !order) return;
    const detailIds = new Set((order.details || []).map((detail) => detail.DMATHANGID || detail.DDICHVUID));
    setServices((current) => (catalog || current).map((item) => ({ ...item, checked: detailIds.has(item.sourceId) })));
  };

  const handleSelectRepairFlow = async (workflowId) => {
    const flow = vehicleFlowOptions.find((item) => String(item.ID) === String(workflowId));
    if (!flow || String(flow.ID) === String(repairFlow.workflowId)) return;
    const requestId = ++vehicleSelectionRequest.current;
    setWorkflowImages([]);
    setDraftWorkflowImages([]);
    setSelectedImageState(Math.max(0, Math.min(4, Number(flow.TRANGTHAI || 0))));
    await loadRepairFlow(flow, requestId);
  };

  const updateSelectedFlowState = (state) => {
    setVehicleFlowOptions((current) => current.map((flow) => (
      String(flow.ID) === String(repairFlow.workflowId)
        ? { ...flow, TRANGTHAI: state, TRANGTHAI_TEN: processLabels[state] }
        : flow
    )));
  };

  const selectVehicle = async (vehicleId, source = vehicleOptions) => {
    const selected = source.find((item) => item.ID === vehicleId);
    if (!selected) return;
    const requestId = ++vehicleSelectionRequest.current;
    setRepairFlow({ repairId: null, workflowId: null, receptionId: null, workflowState: null });
    setVehicleFlowOptions([]);
    setWorkflowImages([]);
    setDraftWorkflowImages([]);
    setSelectedImageState(0);
    setServices((current) => current.map((item) => ({ ...item, checked: false })));
    setVehicleInfo((current) => ({
      ...current, vehicleId: selected.ID, customerId: selected.DKHACHHANGID || '',
      plate: selected.BIENSO || '', customer: selected.TEN_KH || '',
      currentKm: Number(selected.ODO || 0).toLocaleString('vi-VN'),
      carModel: [selected.HANG_XE, selected.DONG_XE, selected.PHIENBAN].filter(Boolean).join(' '),
      receiptCode: '',
    }));
    const flowRows = await workflow.byVehicleAll(selected.ID).catch(() => []);
    if (requestId !== vehicleSelectionRequest.current) return;
    const flowOptions = Array.isArray(flowRows) ? flowRows : [];
    setVehicleFlowOptions(flowOptions);
    const activeFlow = flowOptions[0] || null;
    if (activeFlow) {
      await loadRepairFlow(activeFlow, requestId);
    }
  };

  const openAddVehicle = () => {
    setNewVehicle({
      BIENSO: '', DKHACHHANGID: '', DHANGXEID: '', DDONGXEID: '', PHIENBAN: '',
      NAMSANXUAT: '', MAUXE: '', SOKHUNG: '', SOMAY: '', ODO: '0',
      NHIENLIEU: '', MUCNHIENLIEU: '50', GHICHU: '',
    });
    setShowAddVehicle(true);
  };

  const updateNewVehicle = (field, value) => {
    setNewVehicle((current) => ({ ...current, [field]: value, ...(field === 'DHANGXEID' ? { DDONGXEID: '' } : {}) }));
  };

  const openAddCustomer = () => {
    const retailGroup = customerGroups.find((group) => String(group.NAME || '').toLocaleLowerCase('vi').replace(/\s/g, '').includes('kháchlẻ'));
    setNewCustomer({
      NAME: '', DNHOMKHACHHANGID: retailGroup?.ID || '', MAKHACH: '',
      DIENTHOAI: '', EMAIL: '', MASOTHUE: '', DIACHI: '',
    });
    setShowAddCustomer(true);
  };

  const handleCreateCustomer = async (event) => {
    event.preventDefault();
    if (!newCustomer.NAME.trim()) return showToast('Vui lòng nhập tên khách hàng.');
    const normalizedCode = newCustomer.MAKHACH.trim().toUpperCase();
    if (normalizedCode && customerOptions.some((customer) => String(customer.MAKHACH || '').trim().toUpperCase() === normalizedCode)) {
      return showToast('Mã khách hàng đã tồn tại.');
    }
    setSavingCustomer(true);
    try {
      const result = await customers.create({
        ...newCustomer,
        NAME: newCustomer.NAME.trim(),
        MAKHACH: normalizedCode || null,
      });
      const rows = await customers.list();
      const list = Array.isArray(rows) ? rows : [];
      setCustomerOptions(list);
      updateNewVehicle('DKHACHHANGID', result.id);
      setShowAddCustomer(false);
      showToast(`Đã thêm và chọn khách hàng ${newCustomer.NAME.trim()}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thêm khách hàng.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const openAddCustomerGroup = () => {
    setNewCustomerGroupName('');
    setShowAddCustomerGroup(true);
  };

  const handleCreateCustomerGroup = async (event) => {
    event.preventDefault();
    const name = newCustomerGroupName.trim();
    if (!name) return showToast('Vui lòng nhập tên nhóm khách hàng.');
    const existed = customerGroups.find((group) => String(group.NAME || '').trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
    if (existed) {
      setNewCustomer((current) => ({ ...current, DNHOMKHACHHANGID: existed.ID }));
      setShowAddCustomerGroup(false);
      return showToast('Nhóm khách hàng đã tồn tại và đã được chọn.');
    }
    setSavingCustomerGroup(true);
    try {
      const result = await masterData.create('customer_groups', { NAME: name, SORTORDER: customerGroups.length + 1 });
      const rows = await masterData.customerGroups();
      const list = Array.isArray(rows) ? rows : [];
      setCustomerGroups(list);
      setNewCustomer((current) => ({ ...current, DNHOMKHACHHANGID: result.id }));
      setShowAddCustomerGroup(false);
      showToast(`Đã thêm nhóm khách hàng ${name}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thêm nhóm khách hàng.');
    } finally {
      setSavingCustomerGroup(false);
    }
  };

  const openAddBrand = () => {
    setNewBrandName('');
    setShowAddBrand(true);
  };

  const openAddModel = () => {
    if (!newVehicle.DHANGXEID) return showToast('Vui lòng chọn hãng xe trước khi thêm dòng xe.');
    setNewModelName('');
    setShowAddModel(true);
  };

  const handleCreateBrand = async (event) => {
    event.preventDefault();
    const name = newBrandName.trim();
    if (!name) return showToast('Vui lòng nhập tên hãng xe.');
    const existed = vehicleBrands.find((brand) => brand.NAME?.trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
    if (existed) {
      updateNewVehicle('DHANGXEID', existed.ID);
      setShowAddBrand(false);
      return showToast('Hãng xe đã tồn tại và đã được chọn.');
    }
    setSavingVehicleMaster(true);
    try {
      const result = await masterData.create('brands', { NAME: name, CODE: name.toUpperCase().replace(/\s+/g, '-'), SORTORDER: vehicleBrands.length + 1 });
      const meta = await vehicles.meta();
      setVehicleBrands(Array.isArray(meta?.brands) ? meta.brands : []);
      setVehicleModels(Array.isArray(meta?.models) ? meta.models : []);
      updateNewVehicle('DHANGXEID', result.id);
      setShowAddBrand(false);
      showToast(`Đã thêm hãng xe ${name}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thêm hãng xe.');
    } finally {
      setSavingVehicleMaster(false);
    }
  };

  const handleCreateModel = async (event) => {
    event.preventDefault();
    const name = newModelName.trim();
    if (!name) return showToast('Vui lòng nhập tên dòng xe.');
    const existed = vehicleModels.find((model) => model.DHANGXEID === newVehicle.DHANGXEID && model.NAME?.trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
    if (existed) {
      updateNewVehicle('DDONGXEID', existed.ID);
      setShowAddModel(false);
      return showToast('Dòng xe đã tồn tại và đã được chọn.');
    }
    setSavingVehicleMaster(true);
    try {
      const result = await masterData.create('models', {
        NAME: name, CODE: name.toUpperCase().replace(/\s+/g, '-'),
        DHANGXEID: newVehicle.DHANGXEID, SORTORDER: vehicleModels.filter((model) => model.DHANGXEID === newVehicle.DHANGXEID).length + 1,
      });
      const meta = await vehicles.meta();
      setVehicleBrands(Array.isArray(meta?.brands) ? meta.brands : []);
      setVehicleModels(Array.isArray(meta?.models) ? meta.models : []);
      updateNewVehicle('DDONGXEID', result.id);
      setShowAddModel(false);
      showToast(`Đã thêm dòng xe ${name}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thêm dòng xe.');
    } finally {
      setSavingVehicleMaster(false);
    }
  };

  const handleCreateVehicle = async (event) => {
    event.preventDefault();
    if (!newVehicle.BIENSO.trim()) return showToast('Vui lòng nhập biển số xe.');
    if (!newVehicle.DKHACHHANGID) return showToast('Vui lòng chọn khách hàng/chủ xe.');
    if (!newVehicle.DHANGXEID || !newVehicle.DDONGXEID) return showToast('Vui lòng chọn hãng xe và dòng xe.');
    setSavingVehicle(true);
    try {
      const result = await vehicles.create({
        ...newVehicle,
        BIENSO: newVehicle.BIENSO.trim().toUpperCase(),
        NAMSANXUAT: newVehicle.NAMSANXUAT ? Number(newVehicle.NAMSANXUAT) : null,
        ODO: Math.max(0, Number(newVehicle.ODO) || 0),
        MUCNHIENLIEU: Math.max(0, Math.min(100, Number(newVehicle.MUCNHIENLIEU) || 0)),
      });
      const rows = await vehicles.list();
      const list = Array.isArray(rows) ? rows : [];
      setVehicleOptions(list);
      setShowAddVehicle(false);
      await selectVehicle(result.id, list);
      showToast(`Đã thêm xe ${newVehicle.BIENSO.trim().toUpperCase()} thành công.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thêm xe.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const openAddEmployee = () => {
    setNewEmployee({
      NAME: '', CODE: '', DIENTHOAI: '', EMAIL: '', DIACHI: '', DEPARTMENT: 'Dịch vụ',
      CERT: '', CHUYENMON: '', LOAINHANVIEN: '1', ROLEKEY: '1', ROLELABEL: 'Kỹ thuật viên',
    });
    setShowAddEmployee(true);
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    if (!newEmployee.NAME.trim()) return showToast('Vui lòng nhập họ tên nhân viên.');
    if (!newEmployee.DIENTHOAI.trim()) return showToast('Vui lòng nhập số điện thoại nhân viên.');
    setSavingEmployee(true);
    try {
      const result = await employees.create({
        ...newEmployee,
        NAME: newEmployee.NAME.trim(),
        CODE: newEmployee.CODE.trim().toUpperCase(),
        DIENTHOAI: newEmployee.DIENTHOAI.trim(),
        LOAINHANVIEN: Number(newEmployee.LOAINHANVIEN),
        NOTE: JSON.stringify({
          chucVu: newEmployee.ROLELABEL,
          phongBan: newEmployee.DEPARTMENT,
          email: newEmployee.EMAIL.trim(),
          chungChi: newEmployee.CERT.trim(),
        }),
      });
      const rows = await employees.list();
      const list = Array.isArray(rows) ? rows : [];
      setEmployeeOptions(list);
      setVehicleInfo((current) => ({ ...current, staff: result.id }));
      setShowAddEmployee(false);
      showToast(`Đã thêm và chọn nhân viên ${newEmployee.NAME.trim()}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thêm nhân viên.');
    } finally {
      setSavingEmployee(false);
    }
  };

  const openAddEmployeeDropdownOption = (type) => {
    setEmployeeOptionType(type);
    setNewEmployeeOptionName('');
    setShowAddEmployeeOption(true);
  };

  const handleAddEmployeeDropdownOption = (event) => {
    event.preventDefault();
    const name = newEmployeeOptionName.trim();
    if (!name) return showToast(`Vui lòng nhập tên ${employeeOptionType === 'role' ? 'chức vụ' : 'phòng ban'}.`);
    if (employeeOptionType === 'role') {
      const existing = employeeRoleOptions.find((item) => item.label.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
      const option = existing || { key: `custom:${name}`, label: name };
      if (!existing) setEmployeeRoleOptions((current) => [...current, option]);
      setNewEmployee((current) => ({ ...current, ROLEKEY: option.key, ROLELABEL: option.label, LOAINHANVIEN: option.key.startsWith('custom:') ? '0' : option.key }));
    } else {
      const existing = employeeDepartmentOptions.find((item) => item.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
      const value = existing || name;
      if (!existing) setEmployeeDepartmentOptions((current) => [...current, value]);
      setNewEmployee((current) => ({ ...current, DEPARTMENT: value }));
    }
    setShowAddEmployeeOption(false);
    showToast(`Đã thêm ${employeeOptionType === 'role' ? 'chức vụ' : 'phòng ban'} ${name}.`);
  };

  const handleProcessAction = async () => {
    if (!vehicleInfo.vehicleId || !vehicleInfo.customerId) return showToast('Vui lòng chọn xe có khách hàng/chủ xe.');
    if (!repairFlow.repairId && !selectedServices.length) return showToast('Vui lòng chọn ít nhất 1 dịch vụ hoặc phụ tùng.');
    setSavingProcess(true);
    try {
      if (!repairFlow.repairId) {
        let receptionId = repairFlow.receptionId;
        if (!receptionId) {
          const reception = await repairOrders.createReception({
            NGAY: vehicleInfo.date, DXEID: vehicleInfo.vehicleId, DKHACHHANGID: vehicleInfo.customerId,
            DNHANVIENCOOVANID: vehicleInfo.staff || null,
            ODO: Number(String(vehicleInfo.currentKm).replace(/\D/g, '')) || 0,
            TINHTRANGXE: vehicleInfo.status, YEUCAUKHACH: repairNotes,
            PHUKIENDETRENKXE: vehicleInfo.note,
          });
          receptionId = reception.id;
        }
        const result = await repairOrders.create({
          DXEID: vehicleInfo.vehicleId, DKHACHHANGID: vehicleInfo.customerId,
          TTIEPNHANXEID: receptionId, NGAY: vehicleInfo.date, NOTE: repairNotes,
          items: selectedServices.map((item) => ({
            LOAI: item.sourceType, DMATHANGID: item.sourceType === 0 ? item.sourceId : null,
            DDICHVUID: item.sourceType === 1 ? item.sourceId : null,
            DDONVITINHID: item.unitId, SOLUONG: item.quantity || 1,
            DONGIA: item.price, NOTE: item.note,
          })),
        });
        const savedWorkflowState = Number(result.workflowState ?? 1);
        setRepairFlow({ repairId: result.id, workflowId: result.workflowId || repairFlow.workflowId, receptionId, workflowState: savedWorkflowState });
        setVehicleInfo((current) => ({ ...current, receiptCode: result.code || current.receiptCode }));
        const createdWorkflowId = result.workflowId || repairFlow.workflowId;
        const refreshedFlows = await workflow.byVehicleAll(vehicleInfo.vehicleId).catch(() => []);
        if (Array.isArray(refreshedFlows)) setVehicleFlowOptions(refreshedFlows);
        if (createdWorkflowId && draftWorkflowImages.length) {
          try {
            await workflow.uploadImages({
              TTRANGTHAIXEID: createdWorkflowId,
              DXEID: vehicleInfo.vehicleId,
              TLENHSUACHUAID: result.id,
              TRANGTHAI: 0,
              images: draftWorkflowImages,
            });
            setDraftWorkflowImages([]);
            await refreshWorkflowImages(createdWorkflowId);
            showToast(`Đã lưu Tiếp nhận & Báo giá cùng ${draftWorkflowImages.length} ảnh. Hồ sơ đang chờ xác nhận sửa chữa.`);
          } catch (imageError) {
            showToast(imageError?.response?.data?.error || 'Phiếu đã lưu nhưng chưa thể lưu ảnh trạng thái.');
          }
        } else {
          showToast('Đã hoàn tất Tiếp nhận & Báo giá. Hồ sơ đã chuyển sang Xác nhận sửa chữa.');
        }
        setShowRepairConfirmation(true);
      } else if (repairFlow.workflowState === 0 || repairFlow.workflowState === 1) {
        setShowRepairConfirmation(true);
      } else if (repairFlow.workflowState < 3) {
        const nextState = repairFlow.workflowState + 1;
        const nextLabel = processLabels[nextState];
        await workflow.transition({
          DXEID: vehicleInfo.vehicleId, TRANGTHAI: nextState,
          DNHANVIENID: vehicleInfo.staff || 'SYSTEM',
          LYDO: `Chuyển sang bước ${nextLabel}`, GHICHU: repairNotes,
        });
        setRepairFlow((current) => ({ ...current, workflowState: nextState }));
        updateSelectedFlowState(nextState);
        showToast(`Đã chuyển sang: ${nextLabel}.`);
      } else if (repairFlow.workflowState === 3) {
        setPaymentMethod('cash');
        setShowPayment(true);
      } else {
        showToast('Phiếu sửa chữa đã hoàn thành.');
      }
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể cập nhật quy trình.');
    } finally {
      setSavingProcess(false);
    }
  };

  const handleConfirmRepair = async () => {
    setSavingProcess(true);
    try {
      // Ho tro phieu cu van con o buoc Tiep nhan & Bao gia.
      if (Number(repairFlow.workflowState) === 0) {
        await workflow.transition({
          DXEID: vehicleInfo.vehicleId, TRANGTHAI: 1,
          DNHANVIENID: vehicleInfo.staff || 'SYSTEM',
          LYDO: 'Hoan tat tiep nhan va bao gia, cho xac nhan sua chua',
          GHICHU: repairNotes,
        });
      }
      await workflow.transition({
        DXEID: vehicleInfo.vehicleId, TRANGTHAI: 2,
        DNHANVIENID: vehicleInfo.staff || 'SYSTEM',
        LYDO: 'Bat dau sua chua sau khi khach hang xac nhan',
        GHICHU: repairNotes,
      });
      setRepairFlow((current) => ({ ...current, workflowState: 2 }));
      updateSelectedFlowState(2);
      setShowRepairConfirmation(false);
      showToast('Đã xác nhận và chuyển sang Đang sửa.');
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể xác nhận sửa chữa.');
    } finally {
      setSavingProcess(false);
    }
  };

  const handlePayment = async () => {
    if (!repairFlow.repairId) return showToast('Không tìm thấy lệnh sửa chữa để thanh toán.');
    if (totalAmount <= 0) return showToast('Tổng tiền thanh toán phải lớn hơn 0.');
    setSavingProcess(true);
    try {
      const invoiceRows = await invoices.list();
      const existing = (Array.isArray(invoiceRows) ? invoiceRows : []).find(
        (item) => item.TLENHSUACHUAID === repairFlow.repairId
      );
      const payable = Number(existing?.TONGCONG || totalAmount);
      const amounts = {
        TIENMAT: paymentMethod === 'cash' ? payable : 0,
        CHUYENKHOAN: paymentMethod === 'transfer' ? payable : 0,
        THE: paymentMethod === 'card' ? payable : 0,
      };

      if (existing) {
        await invoices.pay(existing.ID, amounts);
      } else {
        await invoices.create({
          TLENHSUACHUAID: repairFlow.repairId,
          NGAY: new Date().toISOString().slice(0, 10),
          TILETHUE: 0,
          TILEGIAMGIA: 0,
          TIENGIAMGIA: 0,
          ...amounts,
        });
      }

      setRepairFlow((current) => ({ ...current, workflowState: 4 }));
      updateSelectedFlowState(4);
      setShowPayment(false);
      showToast('Thanh toán thành công. Phiếu đã chuyển sang Hoàn thành.');
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể thanh toán phiếu sửa chữa.');
    } finally {
      setSavingProcess(false);
    }
  };

  const handleStartNewRepairVisit = () => {
    // Giữ nguyên hồ sơ xe/khách hàng, chỉ tách khỏi lượt sửa chữa đã hoàn thành.
    // Lượt mới sẽ được ghi thành phiếu tiếp nhận, lệnh sửa chữa và workflow mới
    // khi người dùng chọn hạng mục rồi bấm Lưu Tiếp nhận & Báo giá.
    vehicleSelectionRequest.current += 1;
    setRepairFlow({ repairId: null, workflowId: null, receptionId: null, workflowState: null });
    setWorkflowImages([]);
    setDraftWorkflowImages([]);
    setSelectedImageState(0);
    setServices((current) => current.map((item) => ({ ...item, checked: false, quantity: 1 })));
    setSearchTerm('');
    setShowPayment(false);
    setShowRepairConfirmation(false);
    setVehicleInfo((current) => ({
      ...current,
      date: new Date().toISOString().slice(0, 10),
      status: 'Đang kiểm tra',
      staff: '',
      receiptCode: '',
      note: '',
    }));
    setRepairNotes('Vui lòng kiểm tra kỹ trước khi thay thế.\nLiên hệ khách hàng nếu có phát sinh thêm.');
    showToast(`Đã mở lượt sửa chữa mới cho xe ${vehicleInfo.plate}.`);
  };

  // Format tiền tệ
  const formatMoney = (val) => {
    return (val || 0).toLocaleString('vi-VN') + 'đ';
  };

  const formatNumber = (val) => {
    return (val || 0).toLocaleString('vi-VN');
  };

  // Toggle chọn 1 dịch vụ
  const handleToggle = (id) => {
    if (isServiceSelectionLocked) return;
    setServices(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  // Chọn tất cả
  const handleSelectAll = () => {
    if (isServiceSelectionLocked) return;
    setServices(prev => prev.map(s => ({ ...s, checked: true })));
    showToast('Đã chọn tất cả dịch vụ');
  };

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    if (isServiceSelectionLocked) return;
    setServices(prev => prev.map(s => ({ ...s, checked: false })));
    showToast('Đã bỏ chọn tất cả dịch vụ');
  };

  // Làm mới về mặc định
  const handleReset = () => {
    setSearchTerm('');
    setServices(prev => prev.map((s, idx) => ({
      ...s,
      checked: [1, 2, 3, 5, 7, 10].includes(s.id)
    })));
    showToast('Đã làm mới danh sách dịch vụ');
  };

  // Render icon nhóm
  const renderGroupIcon = (type, color) => {
    switch (type) {
      case 'gear':
        return <SettingsIcon size={12} color={color} />;
      case 'filter':
        return <Filter size={12} color={color} />;
      case 'disc':
        return <Disc size={12} color={color} />;
      case 'circle-dot':
        return <CircleDot size={12} color={color} />;
      case 'battery':
        return <BatteryCharging size={12} color={color} />;
      case 'zap':
        return <Zap size={12} color={color} />;
      case 'thermometer':
        return <Thermometer size={12} color={color} />;
      default:
        return <MoreHorizontal size={12} color={color} />;
    }
  };

  return (
    <div className="page-responsive-container suachua-page-container" style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      boxSizing: 'border-box',
      gap: 'clamp(4px, 0.7vh, 8px)',
      fontSize: 'clamp(10.5px, 0.8vw, 12.5px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Toast thông báo */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 15,
          right: 20,
          background: '#2E7D32',
          color: '#fff',
          padding: '7px 16px',
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

      {/* Header trang: Bảng kê các dịch vụ cần thay thế / sửa chữa */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0
      }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 4,
          background: '#E65100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <Wrench size={16} />
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(14px, 1.15vw, 17px)', fontWeight: 700, color: '#0F172A' }}>
          Bảng kê các dịch vụ cần thay thế / sửa chữa
        </h1>
      </div>

      <div className="repair-process-stepper">
        {processLabels.map((label, index) => {
          const stepCompleted = index < businessStage || (isFlowCompleted && index === businessStage);
          const stepActive = index === businessStage && !isFlowCompleted;
          return (
          <div key={label} className="repair-process-step">
            <div className="step-content" style={{ display: 'flex', alignItems: 'center', gap: 5, color: stepCompleted ? '#2E7D32' : stepActive ? '#E65100' : '#94A3B8', fontWeight: stepCompleted || stepActive ? 800 : 600 }}>
              <span className="step-circle" style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: stepCompleted ? '#2E7D32' : stepActive ? '#E65100' : '#F1F5F9', color: stepCompleted || stepActive ? '#fff' : '#94A3B8', fontSize: 10, flexShrink: 0 }}>
                {stepCompleted ? <Check size={12} /> : index + 1}
              </span>
              <span className="step-label-full">{label}</span>
              <span className="step-label-short">{shortProcessLabels[index]}</span>
            </div>
            {index < processLabels.length - 1 && <ChevronDown size={13} className="step-arrow" style={{ margin: '0 8px', transform: 'rotate(-90deg)', color: index < businessStage ? '#2E7D32' : '#CBD5E1', flexShrink: 0 }} />}
          </div>
          );
        })}
      </div>

      {/* Card Thông tin phiếu xe phía trên */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 6,
        border: '1px solid #E0E0E0',
        padding: 'clamp(6px, 1vh, 10px) clamp(8px, 1vw, 14px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(4px, 0.6vh, 8px)',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Lưới thông tin phiếu xe (3 cột trên desktop như cũ, 1 cột thẳng hàng tăm tắp trên mobile) */}
        <div className="responsive-grid-3" style={{ alignItems: 'center', gap: 8 }}>
          {/* 1. Biển số xe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Biển số xe
            </label>
            <div style={{ display: 'flex', flex: 1, minWidth: 0, gap: 6 }}>
              <select
                value={vehicleInfo.vehicleId}
                onChange={(e) => selectVehicle(e.target.value)}
                style={{
                  flex: 1, minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF', cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Chọn xe --</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.ID} value={vehicle.ID}>{vehicle.BIENSO} - {vehicle.TEN_KH || 'Chưa có chủ xe'}</option>
                ))}
              </select>
              <button type="button" onClick={openAddVehicle} style={{ height: 'clamp(28px, 3.2vh, 31px)', padding: '0 11px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 'inherit', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>＋ Thêm</button>
            </div>
          </div>

          {/* 2. Ngày tiếp nhận */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Ngày tiếp nhận
            </label>
            <input
              type="date"
              value={vehicleInfo.date}
              onChange={(e) => setVehicleInfo({ ...vehicleInfo, date: e.target.value })}
              style={{
                flex: 1, minWidth: 0,
                height: 'clamp(28px, 3.2vh, 31px)',
                padding: '0 8px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 'inherit',
                outline: 'none',
                background: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 4. Khách hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Khách hàng
            </label>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <input
                type="text"
                value={vehicleInfo.customer}
                readOnly
                style={{
                  width: '100%',
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 26px 0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#F8FAFC'
                }}
              />
              <Search
                size={13}
                color="#64748B"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* 5. NV tiếp nhận */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              NV tiếp nhận
            </label>
            <div style={{ display: 'flex', flex: 1, minWidth: 0, gap: 6 }}>
              <select
                value={vehicleInfo.staff}
                onChange={(e) => setVehicleInfo({ ...vehicleInfo, staff: e.target.value })}
                style={{
                  flex: 1, minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Chọn nhân viên --</option>
                {employeeOptions.map((employee) => <option key={employee.ID} value={employee.ID}>{employee.NAME}</option>)}
              </select>
              <button type="button" onClick={openAddEmployee} style={{ height: 'clamp(28px, 3.2vh, 31px)', padding: '0 11px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 'inherit', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>＋ Thêm</button>
            </div>
          </div>

          {/* 6. Km hiện tại */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Km hiện tại
            </label>
            <input
              type="number"
              min="0"
              value={vehicleInfo.currentKm}
              onChange={(e) => setVehicleInfo({ ...vehicleInfo, currentKm: e.target.value })}
              style={{
                flex: 1, minWidth: 0,
                height: 'clamp(28px, 3.2vh, 31px)',
                padding: '0 8px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 'inherit',
                outline: 'none',
                background: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 7. Loại xe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Loại xe
            </label>
            <input
              type="text"
              value={vehicleInfo.carModel}
              readOnly
              style={{
                flex: 1, minWidth: 0,
                height: 'clamp(28px, 3.2vh, 31px)',
                padding: '0 8px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 'inherit',
                outline: 'none',
                background: '#F8FAFC',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 8. Số phiếu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Số phiếu
            </label>
            {vehicleFlowOptions.length > 1 ? (
              <select
                value={repairFlow.workflowId || ''}
                onChange={(event) => handleSelectRepairFlow(event.target.value)}
                style={{
                  flex: 1, minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  background: '#FFFFFF',
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {!repairFlow.workflowId && <option value="">Phiếu mới</option>}
                {vehicleFlowOptions.map((flow) => (
                  <option key={flow.ID} value={flow.ID}>
                    {flow.SOPHIEU || flow.SOPHIEUTIEPNHAN || 'Chưa có số phiếu'} - {processLabels[Number(flow.TRANGTHAI)] || flow.TRANGTHAI_TEN}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={vehicleInfo.receiptCode || (!repairFlow.repairId ? draftNumber.code : '')}
                placeholder={draftNumber.error?'Không tải được số phiếu':'Đang tải số phiếu…'}
                title={repairFlow.repairId?'Số phiếu đã lưu':'Số lệnh dự kiến; cấp chính thức khi lưu.'}
                readOnly
                style={{
                  flex: 1, minWidth: 0,
                  height: 'clamp(28px, 3.2vh, 31px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  background: '#F8FAFC',
                  color: '#64748B',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* 9. Ghi chú */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ width: 95, minWidth: 95, flexShrink: 0, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Ghi chú
            </label>
            <input
              type="text"
              placeholder="Ghi chú thêm..."
              value={vehicleInfo.note}
              onChange={(e) => setVehicleInfo({ ...vehicleInfo, note: e.target.value })}
              style={{
                flex: 1, minWidth: 0,
                height: 'clamp(28px, 3.2vh, 31px)',
                padding: '0 8px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 'inherit',
                outline: 'none',
                background: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Vùng thân trang: 2 cột (Trái ~71% Bảng kê, Phải ~29% Đã chọn & Ghi chú) */}
      <div className="responsive-2col suachua-main-split" style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        gap: 'clamp(6px, 0.8vw, 10px)'
      }}>
        {/* CỘT TRÁI (~71%): Toolbar + Bảng danh sách dịch vụ */}
        <div className="suachua-left-col" style={{
          flex: '1 1 71%',
          minWidth: 0,
          background: '#FFFFFF',
          borderRadius: 6,
          border: '1px solid #E0E0E0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Toolbar tìm kiếm & các nút thao tác nhanh */}
          <div style={{
            padding: 'clamp(4px, 0.7vh, 8px) 10px',
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexShrink: 0,
            background: '#FAFAFA'
          }}>
            {/* Ô tìm kiếm */}
            <div style={{ position: 'relative', width: 'clamp(180px, 20vw, 280px)' }}>
              <input
                type="text"
                placeholder="Tìm dịch vụ, phụ tùng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: 'clamp(24px, 3vh, 28px)',
                  padding: '0 24px 0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
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

            {/* Cụm 3 nút: Chọn tất cả, Bỏ chọn tất cả, Làm mới */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {isServiceSelectionLocked && (
                <span style={{ color: '#64748B', fontSize: '10.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Đã khóa sau khi xác nhận
                </span>
              )}
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isServiceSelectionLocked}
                title={isServiceSelectionLocked ? 'Không thể thay đổi hạng mục sau khi xác nhận sửa chữa' : 'Chọn tất cả'}
                style={{
                  height: 'clamp(24px, 3vh, 28px)',
                  padding: '0 12px',
                  background: '#E65100',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: isServiceSelectionLocked ? 'not-allowed' : 'pointer',
                  opacity: isServiceSelectionLocked ? 0.45 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                <Check size={14} strokeWidth={2.5} />
                Chọn tất cả
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={isServiceSelectionLocked}
                title={isServiceSelectionLocked ? 'Không thể thay đổi hạng mục sau khi xác nhận sửa chữa' : 'Bỏ chọn tất cả'}
                style={{
                  height: 'clamp(24px, 3vh, 28px)',
                  padding: '0 10px',
                  background: '#FFFFFF',
                  color: '#E65100',
                  border: '1px solid #E65100',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: isServiceSelectionLocked ? 'not-allowed' : 'pointer',
                  opacity: isServiceSelectionLocked ? 0.45 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                <XCircle size={14} />
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          {/* Bảng kê chi tiết 14 dịch vụ */}
          <div className="table-responsive" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 'inherit' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                  <th style={{ padding: '6px 4px', textAlign: 'center', width: 32, borderBottom: '1px solid #FFCC80' }}>
                    <input
                      type="checkbox"
                      checked={services.length > 0 && services.every(s => s.checked)}
                      disabled={isServiceSelectionLocked}
                      onChange={(e) => {
                        if (isServiceSelectionLocked) return;
                        const checked = e.target.checked;
                        setServices(prev => prev.map(s => ({ ...s, checked })));
                      }}
                      title={isServiceSelectionLocked ? 'Danh sách đã khóa sau khi xác nhận sửa chữa' : ''}
                      style={{ cursor: isServiceSelectionLocked ? 'not-allowed' : 'pointer', accentColor: '#E65100', width: 15, height: 15 }}
                    />
                  </th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', width: 38, borderBottom: '1px solid #FFCC80' }}>STT</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: 125, borderBottom: '1px solid #FFCC80' }}>Nhóm</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFCC80' }}>Dịch vụ / Hạng mục</th>
                  <th style={{ padding: '6px 6px', textAlign: 'center', width: 55, borderBottom: '1px solid #FFCC80' }}>Đơn vị</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: 105, borderBottom: '1px solid #FFCC80' }}>Đơn giá (VNĐ)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: 170, borderBottom: '1px solid #FFCC80' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={() => handleToggle(row.id)}
                    style={{
                      background: row.checked ? '#FFF8E1' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                      borderBottom: '1px solid #F1F5F9',
                      cursor: isServiceSelectionLocked ? 'default' : 'pointer',
                      transition: 'background 0.12s'
                    }}
                    onMouseEnter={(e) => {
                      if (!row.checked) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!row.checked) e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.checked}
                        disabled={isServiceSelectionLocked}
                        onChange={() => {}} // handled by row click
                        title={isServiceSelectionLocked ? 'Hạng mục đã khóa sau khi xác nhận sửa chữa' : ''}
                        style={{ cursor: isServiceSelectionLocked ? 'not-allowed' : 'pointer', pointerEvents: 'none', accentColor: '#E65100', width: 15, height: 15 }}
                      />
                    </td>

                    {/* STT */}
                    <td style={{ padding: '4px 4px', textAlign: 'center', color: '#64748B' }}>
                      {idx + 1}
                    </td>

                    {/* Nhóm dịch vụ (Badge) */}
                    <td style={{ padding: '4px 8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: row.groupBg,
                        color: row.groupColor,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: '10.5px'
                      }}>
                        {renderGroupIcon(row.iconType, row.groupColor)}
                        {row.group}
                      </span>
                    </td>

                    {/* Dịch vụ / Hạng mục */}
                    <td style={{ padding: '4px 8px', fontWeight: 600, color: '#1E293B' }}>
                      {row.name}
                    </td>

                    {/* Đơn vị */}
                    <td style={{ padding: '4px 6px', textAlign: 'center', color: '#475569' }}>
                      {row.unit}
                    </td>

                    {/* Đơn giá */}
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>
                      {formatNumber(row.price)}
                    </td>

                    {/* Ghi chú */}
                    <td style={{ padding: '4px 8px', color: '#64748B', fontSize: '10.5px' }}>
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer hiển thị số bản ghi */}
          <div style={{
            padding: '4px 10px',
            borderTop: '1px solid #E0E0E0',
            background: '#F8FAFC',
            fontSize: '11px',
            color: '#64748B',
            fontWeight: 500,
            flexShrink: 0
          }}>
            Hiển thị 1 - {filteredServices.length} / {services.length} bản ghi
          </div>
        </div>

        {/* CỘT PHẢI (~29%): Danh sách đã chọn + Ghi chú sửa chữa + Cụm nút hành động */}
        <div className="suachua-right-col" style={{
          flex: '0 0 29%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(5px, 0.8vh, 8px)',
          overflow: 'hidden'
        }}>
          {/* Card: Danh sách đã chọn */}
          <div style={{
            flex: '1 1 58%',
            minHeight: 0,
            background: '#FFFFFF',
            borderRadius: 6,
            border: '1px solid #E0E0E0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Header: Danh sách đã chọn */}
            <div style={{
              padding: 'clamp(4px, 0.6vh, 6px) 10px',
              borderBottom: '1px solid #E0E0E0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FAFAFA',
              flexShrink: 0
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <CheckSquare size={12} />
              </div>
              <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 'clamp(11.5px, 0.85vw, 13px)' }}>
                Danh sách đã chọn
              </span>
            </div>

            {/* Bảng các mục đã chọn */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#F8FAFC', color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '4px', textAlign: 'center', width: 28 }}>STT</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>Dịch vụ / Hạng mục</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', width: 68 }}>Đơn giá</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', width: 72 }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedServices.map((it, idx) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '4px', textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 500, color: '#1E293B' }}>{it.name}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#475569' }}>{formatNumber(it.price)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>{formatNumber(it.price)}</td>
                    </tr>
                  ))}
                  {selectedServices.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                        Chưa chọn dịch vụ nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Dòng Tổng cộng */}
            <div style={{
              padding: '6px 12px',
              borderTop: '1px solid #FFE0B2',
              background: '#FFF3E0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontWeight: 700, color: '#BF360C', fontSize: '11.5px' }}>Tổng cộng</span>
              <span style={{ fontSize: 'clamp(13px, 1vw, 15px)', fontWeight: 800, color: '#E65100' }}>
                {formatMoney(totalAmount)}
              </span>
            </div>
          </div>

          {/* Card: Ghi chú khi sửa chữa */}
          <div style={{
            flex: '0 0 auto',
            background: '#FFFFFF',
            borderRadius: 6,
            border: '1px solid #E0E0E0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Header: Ghi chú khi sửa chữa */}
            <div style={{
              padding: 'clamp(4px, 0.6vh, 6px) 10px',
              borderBottom: '1px solid #E0E0E0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FAFAFA'
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <FileText size={12} />
              </div>
              <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 'clamp(11.5px, 0.85vw, 13px)' }}>
                Ghi chú khi sửa chữa
              </span>
            </div>

            <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column' }}>
              <textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                maxLength={500}
                rows={2}
                style={{
                  width: '100%',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  padding: '6px',
                  fontSize: '11px',
                  color: '#334155',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: '1.4'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '10px', color: '#94A3B8', marginTop: 2 }}>
                {repairNotes.length}/500
              </div>
            </div>
          </div>

          {/* Cụm cố định ở cuối trang trên mobile: Ảnh theo trạng thái + Nút hành động */}
          <div className="suachua-bottom-action-panel">
            {/* Ảnh được lưu riêng theo từng trạng thái của lượt sửa chữa */}
            <div className="workflow-card" style={{ flex: '0 0 auto', background: '#fff', borderRadius: 6, border: '1px solid #E0E0E0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '5px 8px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#1E293B', fontSize: 11.5 }}>
                <Images size={14} color="#E65100" /> Ảnh theo trạng thái
              </span>
              <button type="button" disabled={uploadingImages} onClick={() => workflowImageInputRef.current?.click()} style={{ height: 24, padding: '0 8px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: uploadingImages ? 'wait' : 'pointer', opacity: uploadingImages ? 0.65 : 1 }}>
                <ImagePlus size={12} /> {uploadingImages ? 'Đang lưu...' : 'Thêm ảnh'}
              </button>
              <input ref={workflowImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleWorkflowImageFiles} />
            </div>

            <div style={{ padding: '5px 7px' }}>
              <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
                {processLabels.map((label, state) => {
                  const reached = state <= businessStage;
                  if (!reached) return null;
                  const count = repairFlow.workflowId
                    ? workflowImages.filter((image) => Number(image.TRANGTHAI) === state).length
                    : state === 0 ? draftWorkflowImages.length : 0;
                  const selected = selectedImageState === state;
                  return (
                    <button key={label} type="button" onClick={() => setSelectedImageState(state)} style={{ flex: '0 0 auto', height: 23, padding: '0 7px', border: `1px solid ${selected ? '#E65100' : '#CBD5E1'}`, borderRadius: 12, background: selected ? '#FFF3E0' : '#fff', color: selected ? '#C2410C' : '#64748B', fontSize: 9.5, fontWeight: selected ? 700 : 600, cursor: 'pointer' }}>
                      {shortProcessLabels[state]} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="workflow-images-scroll" style={{ minHeight: 48, maxHeight: 100, overflowY: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                {visibleWorkflowImages.length === 0 ? (
                  <button type="button" onClick={() => workflowImageInputRef.current?.click()} style={{ width: '100%', height: 45, border: '1px dashed #CBD5E1', borderRadius: 5, background: '#F8FAFC', color: '#94A3B8', fontSize: 10.5, cursor: 'pointer' }}>
                    Chưa có ảnh ở bước {processLabels[selectedImageState]} · Bấm để thêm nhiều ảnh
                  </button>
                ) : visibleWorkflowImages.map((image, index) => {
                  const source = image.ID ? workflow.imageUrl(image.ID) : image.data;
                  return (
                    <div key={image.ID || `${image.name}-${index}`} style={{ position: 'relative', flex: '0 0 54px', width: 54, height: 48, borderRadius: 5, overflow: 'hidden', border: '1px solid #CBD5E1', background: '#F1F5F9' }}>
                      <img src={source} alt={image.TENFILE || image.name || 'Ảnh trạng thái'} onClick={() => setPreviewImage(source)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                      <button type="button" title="Xóa ảnh" onClick={() => image.ID ? handleDeleteWorkflowImage(image) : setDraftWorkflowImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ position: 'absolute', top: 2, right: 2, width: 17, height: 17, padding: 0, border: 0, borderRadius: '50%', background: 'rgba(185,28,28,.88)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cụm 3 nút hành động: 1 hàng duy nhất (Nửa trái: In phiếu + Lưu tạm, Nửa phải: Lưu Tiếp nhận & Báo giá) */}
          <div className="suachua-action-buttons-row" style={{ display: 'flex', alignItems: 'stretch', gap: 6, width: '100%', flexShrink: 0 }}>
            {/* Nửa bên trái (50%): 2 nút In phiếu & Lưu tạm */}
            <div style={{ display: 'flex', flex: '1 1 50%', minWidth: 0, gap: 5 }}>
              <button
                type="button"
                onClick={() => {
                  openDocumentPrint({ type: 'MauPhieuSuaChua', id: repairFlow.repairId });
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(32px, 4vh, 38px)',
                  background: '#FFFFFF',
                  color: '#E65100',
                  border: '1px solid #CBD5E1',
                  borderRadius: 5,
                  fontWeight: 600,
                  fontSize: 'clamp(10.5px, 0.8vw, 12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '0 4px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Printer size={13} color="#E65100" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>In phiếu</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('Đã lưu tạm bảng kê dịch vụ')}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(32px, 4vh, 38px)',
                  background: '#FFFFFF',
                  color: '#E65100',
                  border: '1px solid #CBD5E1',
                  borderRadius: 5,
                  fontWeight: 600,
                  fontSize: 'clamp(10.5px, 0.8vw, 12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '0 4px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Bookmark size={13} color="#E65100" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Lưu tạm</span>
              </button>
            </div>

            {/* Nửa bên phải (50%): Nút chuyển trạng thái / Lưu Tiếp nhận & Báo giá */}
            <button
              type="button"
              onClick={isFlowCompleted
                ? (activeVehicleFlow ? () => handleSelectRepairFlow(activeVehicleFlow.ID) : handleStartNewRepairVisit)
                : handleProcessAction}
              disabled={savingProcess}
              style={{
                flex: '1 1 50%',
                minWidth: 0,
                height: 'clamp(32px, 4vh, 38px)',
                background: isFlowCompleted ? '#2E7D32' : '#E65100',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 'clamp(11px, 0.85vw, 12.5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                cursor: savingProcess ? 'wait' : 'pointer',
                boxShadow: isFlowCompleted ? '0 2px 6px rgba(46,125,50,0.25)' : '0 2px 6px rgba(230,81,0,0.25)',
                padding: '0 6px',
                whiteSpace: 'nowrap'
              }}
            >
              {isFlowCompleted ? (activeVehicleFlow ? <RotateCcw size={14} style={{ flexShrink: 0 }} /> : <Plus size={14} style={{ flexShrink: 0 }} />) : <Send size={14} style={{ flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {savingProcess
                  ? 'Đang xử lý...'
                  : !repairFlow.repairId
                    ? 'Lưu Tiếp nhận & Báo giá'
                    : repairFlow.workflowState === 0
                      ? 'Xác nhận sửa chữa'
                      : repairFlow.workflowState === 1
                        ? 'Bắt đầu sửa chữa'
                        : repairFlow.workflowState === 2
                          ? 'Giao xe'
                          : repairFlow.workflowState === 3
                            ? 'Thanh toán'
                            : activeVehicleFlow ? 'Mở phiếu đang xử lý' : 'Tạo lượt sửa chữa mới'}
              </span>
            </button>
          </div>
          </div> {/* End suachua-bottom-action-panel */}
        </div>
      </div>

      <EmployeeFormModal
        open={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        notify={showToast}
        onCreated={(id, rows) => {
          setEmployeeOptions(rows);
          setVehicleInfo((current) => ({ ...current, staff: id }));
        }}
      />

      {false && showAddEmployee && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEmployee) setShowAddEmployee(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <form
            onSubmit={handleCreateEmployee}
            style={{ width: 'min(560px, 96vw)', maxHeight: '92vh', background: '#fff', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ background: '#E65100', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <UserPlus size={16} /> + THÊM NHÂN VIÊN MỚI
              </div>
              <button type="button" disabled={savingEmployee} onClick={() => setShowAddEmployee(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                <XCircle size={16} />
              </button>
            </div>

            <div style={{ padding: 15, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161', gridColumn: '1 / -1' }}>
                  <span>Họ và tên <b style={{ color: '#D32F2F' }}>*</b></span>
                  <input autoFocus maxLength={200} value={newEmployee.NAME} onChange={(e) => setNewEmployee((current) => ({ ...current, NAME: e.target.value }))} placeholder="Nhập họ và tên..." style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 8px', fontSize: 11, fontWeight: 600, outlineColor: '#E65100' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161' }}>
                  Chức vụ
                  <select value={newEmployee.ROLEKEY} onChange={(e) => {
                    if (e.target.value === '__ADD__') return openAddEmployeeDropdownOption('role');
                    const option = employeeRoleOptions.find((item) => item.key === e.target.value);
                    setNewEmployee((current) => ({ ...current, ROLEKEY: e.target.value, ROLELABEL: option?.label || '', LOAINHANVIEN: e.target.value.startsWith('custom:') ? '0' : e.target.value }));
                  }} style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 6px', fontSize: 11, background: '#fff' }}>
                    {employeeRoleOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    <option disabled>──────────</option><option value="__ADD__">＋ Thêm chức vụ mới</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161' }}>
                  Phòng ban
                  <select value={newEmployee.DEPARTMENT} onChange={(e) => {
                    if (e.target.value === '__ADD__') return openAddEmployeeDropdownOption('department');
                    setNewEmployee((current) => ({ ...current, DEPARTMENT: e.target.value }));
                  }} style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 6px', fontSize: 11, background: '#fff' }}>
                    {employeeDepartmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    <option disabled>──────────</option><option value="__ADD__">＋ Thêm phòng ban mới</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161' }}>
                  <span>Số điện thoại <b style={{ color: '#D32F2F' }}>*</b></span>
                  <input maxLength={30} value={newEmployee.DIENTHOAI} onChange={(e) => setNewEmployee((current) => ({ ...current, DIENTHOAI: e.target.value }))} placeholder="09xx xxx xxx" style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 8px', fontSize: 11 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161' }}>
                  Email
                  <input type="email" maxLength={200} value={newEmployee.EMAIL} onChange={(e) => setNewEmployee((current) => ({ ...current, EMAIL: e.target.value }))} placeholder="email@..." style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 8px', fontSize: 11 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161', gridColumn: '1 / -1' }}>
                  Chứng chỉ
                  <input maxLength={500} value={newEmployee.CERT} onChange={(e) => setNewEmployee((current) => ({ ...current, CERT: e.target.value }))} placeholder="Chứng chỉ kỹ thuật ô tô..." style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 8px', fontSize: 11 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, fontWeight: 600, color: '#616161', gridColumn: '1 / -1' }}>
                  Kỹ năng chuyên môn
                  <input maxLength={1000} value={newEmployee.CHUYENMON} onChange={(e) => setNewEmployee((current) => ({ ...current, CHUYENMON: e.target.value }))} placeholder="Động cơ, gầm hộp số, điện ô tô..." style={{ height: 29, border: '1px solid #ccc', borderRadius: 4, padding: '0 8px', fontSize: 11 }} />
                </label>
              </div>
            </div>

            <div style={{ padding: '9px 14px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingEmployee} onClick={() => setShowAddEmployee(false)} style={{ height: 30, padding: '0 14px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 4, color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button type="submit" disabled={savingEmployee} style={{ height: 30, padding: '0 15px', background: savingEmployee ? '#FDBA74' : '#E65100', color: '#fff', border: 0, borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: savingEmployee ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                {savingEmployee ? <RotateCcw size={13} /> : <UserPlus size={13} />} {savingEmployee ? 'Đang lưu...' : 'Lưu nhân viên'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddEmployeeOption && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddEmployeeOption(false); }} style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(0,0,0,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleAddEmployeeDropdownOption} style={{ width: 'min(420px, 96vw)', background: '#fff', borderRadius: 7, overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.3)' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '10px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ fontSize: 13 }}>＋ THÊM {employeeOptionType === 'role' ? 'CHỨC VỤ' : 'PHÒNG BAN'} MỚI</b>
              <button type="button" onClick={() => setShowAddEmployeeOption(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}><XCircle size={17} /></button>
            </div>
            <div style={{ padding: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                Tên {employeeOptionType === 'role' ? 'chức vụ' : 'phòng ban'} <span style={{ color: '#D32F2F' }}>*</span>
                <input autoFocus value={newEmployeeOptionName} onChange={(e) => setNewEmployeeOptionName(e.target.value)} placeholder={`Nhập tên ${employeeOptionType === 'role' ? 'chức vụ' : 'phòng ban'}...`} style={{ height: 32, padding: '0 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, outlineColor: '#E65100' }} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 13 }}>
                <button type="button" onClick={() => setShowAddEmployeeOption(false)} style={{ padding: '5px 13px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#424242', fontSize: 11 }}>Hủy</button>
                <button type="submit" style={{ padding: '5px 15px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700 }}>Thêm mới</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <VehicleProfileModal
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        notify={showToast}
        onCreated={async (id, rows) => {
          setVehicleOptions(rows);
          await selectVehicle(id, rows);
        }}
      />

      {false && showAddVehicle && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingVehicle) setShowAddVehicle(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <form
            onSubmit={handleCreateVehicle}
            style={{ width: 'min(900px, 97vw)', maxHeight: '92vh', background: '#fff', borderRadius: 9, boxShadow: '0 20px 55px rgba(15,23,42,0.34)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ background: '#E65100', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15 }}>
                <Car size={19} /> THÊM XE MỚI
              </div>
              <button type="button" disabled={savingVehicle} onClick={() => setShowAddVehicle(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#C2410C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={14} /> Thông tin hồ sơ và chủ xe
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 11, marginBottom: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Biển số xe <span style={{ color: '#DC2626' }}>*</span>
                  <input autoFocus maxLength={30} value={newVehicle.BIENSO} onChange={(e) => updateNewVehicle('BIENSO', e.target.value.toUpperCase())} placeholder="Ví dụ: 51A-123.45" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, outlineColor: '#E65100', textTransform: 'uppercase' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Khách hàng / Chủ xe <span style={{ color: '#DC2626' }}>*</span>
                  <select value={newVehicle.DKHACHHANGID} onChange={(e) => {
                    if (e.target.value === '__ADD_CUSTOMER__') return openAddCustomer();
                    updateNewVehicle('DKHACHHANGID', e.target.value);
                  }} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: '#fff', outlineColor: '#E65100' }}>
                    <option value="">-- Chọn khách hàng / chủ xe --</option>
                    {customerOptions.map((customer) => (
                      <option key={customer.ID} value={customer.ID}>{customer.MAKHACH ? `${customer.MAKHACH} - ` : ''}{customer.NAME}{customer.DIENTHOAI ? ` - ${customer.DIENTHOAI}` : ''}</option>
                    ))}
                    <option disabled>────────────────────</option>
                    <option value="__ADD_CUSTOMER__">＋ Thêm khách hàng mới</option>
                  </select>
                </label>
              </div>

              <div style={{ fontWeight: 800, fontSize: 12, color: '#C2410C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wrench size={14} /> Thông số kỹ thuật
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 11 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Hãng xe <span style={{ color: '#DC2626' }}>*</span>
                  <select value={newVehicle.DHANGXEID} onChange={(e) => {
                    if (e.target.value === '__ADD_BRAND__') return openAddBrand();
                    updateNewVehicle('DHANGXEID', e.target.value);
                  }} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: '#fff' }}>
                    <option value="">-- Chọn hãng xe --</option>
                    {vehicleBrands.map((brand) => <option key={brand.ID} value={brand.ID}>{brand.NAME}</option>)}
                    <option disabled>────────────────────</option>
                    <option value="__ADD_BRAND__">＋ Thêm hãng xe mới</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Dòng xe <span style={{ color: '#DC2626' }}>*</span>
                  <select value={newVehicle.DDONGXEID} disabled={!newVehicle.DHANGXEID} onChange={(e) => {
                    if (e.target.value === '__ADD_MODEL__') return openAddModel();
                    updateNewVehicle('DDONGXEID', e.target.value);
                  }} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: newVehicle.DHANGXEID ? '#fff' : '#F8FAFC' }}>
                    <option value="">-- Chọn dòng xe --</option>
                    {vehicleModels.filter((model) => model.DHANGXEID === newVehicle.DHANGXEID).map((model) => <option key={model.ID} value={model.ID}>{model.NAME}</option>)}
                    <option disabled>────────────────────</option>
                    <option value="__ADD_MODEL__">＋ Thêm dòng xe mới cho hãng này</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Phiên bản
                  <input maxLength={100} value={newVehicle.PHIENBAN} onChange={(e) => updateNewVehicle('PHIENBAN', e.target.value)} placeholder="Ví dụ: 2.4G (AT)" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Năm sản xuất
                  <input type="number" min="1900" max="2100" value={newVehicle.NAMSANXUAT} onChange={(e) => updateNewVehicle('NAMSANXUAT', e.target.value)} placeholder="2026" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Màu xe
                  <input maxLength={50} value={newVehicle.MAUXE} onChange={(e) => updateNewVehicle('MAUXE', e.target.value)} placeholder="Trắng, đen, bạc..." style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Số khung (VIN)
                  <input maxLength={100} value={newVehicle.SOKHUNG} onChange={(e) => updateNewVehicle('SOKHUNG', e.target.value.toUpperCase())} placeholder="Nhập số khung" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, textTransform: 'uppercase' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Số máy
                  <input maxLength={100} value={newVehicle.SOMAY} onChange={(e) => updateNewVehicle('SOMAY', e.target.value.toUpperCase())} placeholder="Nhập số máy" style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12, textTransform: 'uppercase' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  ODO hiện tại (km)
                  <input type="number" min="0" step="1" value={newVehicle.ODO} onChange={(e) => updateNewVehicle('ODO', e.target.value)} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 10px', fontSize: 12 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Nhiên liệu
                  <select value={newVehicle.NHIENLIEU} onChange={(e) => updateNewVehicle('NHIENLIEU', e.target.value)} style={{ height: 34, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 8px', fontSize: 12, background: '#fff' }}>
                    <option value="">-- Chọn nhiên liệu --</option>
                    <option value="Xăng">Xăng</option><option value="Dầu">Dầu</option><option value="Điện">Điện</option><option value="Hybrid">Hybrid</option><option value="LPG">LPG</option><option value="Khác">Khác</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mức nhiên liệu (%)
                  <div style={{ height: 34, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min="0" max="100" step="5" value={newVehicle.MUCNHIENLIEU} onChange={(e) => updateNewVehicle('MUCNHIENLIEU', e.target.value)} style={{ flex: 1, accentColor: '#E65100' }} />
                    <input type="number" min="0" max="100" value={newVehicle.MUCNHIENLIEU} onChange={(e) => updateNewVehicle('MUCNHIENLIEU', e.target.value)} style={{ width: 56, height: 30, border: '1px solid #CBD5E1', borderRadius: 5, padding: '0 6px', fontSize: 12, textAlign: 'right' }} />
                  </div>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569', marginTop: 11 }}>
                Ghi chú hồ sơ xe
                <textarea rows={3} maxLength={1000} value={newVehicle.GHICHU} onChange={(e) => updateNewVehicle('GHICHU', e.target.value)} placeholder="Nhập tình trạng, đặc điểm nhận diện hoặc lưu ý về xe..." style={{ border: '1px solid #CBD5E1', borderRadius: 5, padding: '8px 10px', fontSize: 12, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }} />
              </label>
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingVehicle} onClick={() => setShowAddVehicle(false)} style={{ height: 34, padding: '0 16px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 5, color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button type="submit" disabled={savingVehicle} style={{ height: 34, padding: '0 18px', background: savingVehicle ? '#FDBA74' : '#E65100', color: '#fff', border: 0, borderRadius: 5, fontWeight: 700, cursor: savingVehicle ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {savingVehicle ? <RotateCcw size={14} /> : <Plus size={14} />} {savingVehicle ? 'Đang lưu...' : 'Thêm xe và chọn xe'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddCustomer && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && !savingCustomer) setShowAddCustomer(false); }} style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateCustomer} style={{ width: 'min(560px, 96vw)', background: '#fff', borderRadius: 7, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700 }}><UserPlus size={16} /> THÊM KHÁCH HÀNG</div>
              <button type="button" disabled={savingCustomer} onClick={() => setShowAddCustomer(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex' }}><XCircle size={17} /></button>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Tên khách hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input autoFocus value={newCustomer.NAME} onChange={(e) => setNewCustomer((current) => ({ ...current, NAME: e.target.value }))} placeholder="Nhập tên khách hàng..." style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>
                <label style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Nhóm khách hàng
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <select value={newCustomer.DNHOMKHACHHANGID} onChange={(e) => setNewCustomer((current) => ({ ...current, DNHOMKHACHHANGID: e.target.value }))} style={{ flex: 1, minWidth: 0, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, background: '#fff' }}>
                      <option value="">-- Chọn nhóm khách hàng --</option>
                      {customerGroups.map((group) => <option key={group.ID} value={group.ID}>{group.NAME}</option>)}
                    </select>
                    <button type="button" onClick={openAddCustomerGroup} title="Thêm nhóm khách hàng" style={{ width: 34, border: '1px solid #E65100', borderRadius: 4, background: '#FFF3E0', color: '#E65100', fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>+</button>
                  </div>
                </label>
                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Mã khách hàng
                  <input value={newCustomer.MAKHACH} onChange={(e) => setNewCustomer((current) => ({ ...current, MAKHACH: e.target.value.toUpperCase() }))} placeholder="Ví dụ: KH001" style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, textTransform: 'uppercase' }} />
                </label>
                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Số điện thoại
                  <input value={newCustomer.DIENTHOAI} onChange={(e) => setNewCustomer((current) => ({ ...current, DIENTHOAI: e.target.value }))} placeholder="Nhập số điện thoại..." style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>
                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Email
                  <input type="email" value={newCustomer.EMAIL} onChange={(e) => setNewCustomer((current) => ({ ...current, EMAIL: e.target.value }))} placeholder="email@example.com" style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>
                <label style={{ fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  CCCD / Mã số thuế
                  <input value={newCustomer.MASOTHUE} onChange={(e) => setNewCustomer((current) => ({ ...current, MASOTHUE: e.target.value }))} placeholder="Nhập CCCD hoặc mã số thuế..." style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>
                <label style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                  Địa chỉ
                  <textarea rows={3} value={newCustomer.DIACHI} onChange={(e) => setNewCustomer((current) => ({ ...current, DIACHI: e.target.value }))} placeholder="Nhập địa chỉ..." style={{ width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, resize: 'vertical', fontFamily: 'inherit' }} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 12 }}>
                <button type="button" disabled={savingCustomer} onClick={() => setShowAddCustomer(false)} style={{ padding: '5px 13px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#424242', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingCustomer} style={{ padding: '5px 15px', border: 0, borderRadius: 4, background: savingCustomer ? '#FDBA74' : '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: savingCustomer ? 'wait' : 'pointer' }}>{savingCustomer ? 'Đang lưu...' : 'Thêm khách hàng'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showAddCustomerGroup && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && !savingCustomerGroup) setShowAddCustomerGroup(false); }} style={{ position: 'fixed', inset: 0, zIndex: 10030, background: 'rgba(0,0,0,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateCustomerGroup} style={{ width: 'min(420px, 96vw)', background: '#fff', borderRadius: 7, overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.3)' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700 }}><Plus size={16} /> THÊM NHÓM KHÁCH HÀNG</div>
              <button type="button" disabled={savingCustomerGroup} onClick={() => setShowAddCustomerGroup(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}><XCircle size={17} /></button>
            </div>
            <div style={{ padding: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, fontWeight: 600, color: '#424242' }}>
                Tên nhóm khách hàng <span style={{ color: '#D32F2F' }}>*</span>
                <input autoFocus value={newCustomerGroupName} onChange={(e) => setNewCustomerGroupName(e.target.value)} placeholder="Ví dụ: Khách lẻ, Khách VIP..." style={{ height: 32, padding: '0 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, outlineColor: '#E65100' }} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 13 }}>
                <button type="button" disabled={savingCustomerGroup} onClick={() => setShowAddCustomerGroup(false)} style={{ padding: '5px 13px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#424242', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingCustomerGroup} style={{ padding: '5px 15px', border: 0, borderRadius: 4, background: savingCustomerGroup ? '#FDBA74' : '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: savingCustomerGroup ? 'wait' : 'pointer' }}>{savingCustomerGroup ? 'Đang lưu...' : 'Thêm nhóm'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showAddBrand && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && !savingVehicleMaster) setShowAddBrand(false); }} style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(15,23,42,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateBrand} style={{ width: 'min(440px, 96vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 18px 45px rgba(15,23,42,0.35)' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}><Plus size={17} /> THÊM HÃNG XE MỚI</b>
              <button type="button" disabled={savingVehicleMaster} onClick={() => setShowAddBrand(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}><XCircle size={18} /></button>
            </div>
            <div style={{ padding: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#475569', fontSize: 11, fontWeight: 600 }}>
                Tên hãng xe <span style={{ color: '#DC2626' }}>*</span>
                <input autoFocus maxLength={200} value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="Ví dụ: Toyota, Honda, Ford..." style={{ height: 35, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 5, fontSize: 12, outlineColor: '#E65100' }} />
              </label>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingVehicleMaster} onClick={() => setShowAddBrand(false)} style={{ height: 32, padding: '0 14px', border: '1px solid #CBD5E1', borderRadius: 5, background: '#fff', color: '#475569', cursor: 'pointer' }}>Hủy</button>
              <button type="submit" disabled={savingVehicleMaster} style={{ height: 32, padding: '0 16px', border: 0, borderRadius: 5, background: savingVehicleMaster ? '#FDBA74' : '#E65100', color: '#fff', fontWeight: 700, cursor: savingVehicleMaster ? 'wait' : 'pointer' }}>{savingVehicleMaster ? 'Đang lưu...' : 'Thêm hãng xe'}</button>
            </div>
          </form>
        </div>
      )}

      {showAddModel && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && !savingVehicleMaster) setShowAddModel(false); }} style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(15,23,42,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreateModel} style={{ width: 'min(440px, 96vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 18px 45px rgba(15,23,42,0.35)' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}><Plus size={17} /> THÊM DÒNG XE MỚI</b>
              <button type="button" disabled={savingVehicleMaster} onClick={() => setShowAddModel(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}><XCircle size={18} /></button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#475569', fontSize: 11, fontWeight: 600 }}>
                Hãng xe
                <input readOnly value={vehicleBrands.find((brand) => brand.ID === newVehicle.DHANGXEID)?.NAME || ''} style={{ height: 35, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 5, fontSize: 12, background: '#F8FAFC', color: '#334155' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#475569', fontSize: 11, fontWeight: 600 }}>
                Tên dòng xe <span style={{ color: '#DC2626' }}>*</span>
                <input autoFocus maxLength={200} value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Ví dụ: Vios, Fortuner, CR-V..." style={{ height: 35, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 5, fontSize: 12, outlineColor: '#E65100' }} />
              </label>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingVehicleMaster} onClick={() => setShowAddModel(false)} style={{ height: 32, padding: '0 14px', border: '1px solid #CBD5E1', borderRadius: 5, background: '#fff', color: '#475569', cursor: 'pointer' }}>Hủy</button>
              <button type="submit" disabled={savingVehicleMaster} style={{ height: 32, padding: '0 16px', border: 0, borderRadius: 5, background: savingVehicleMaster ? '#FDBA74' : '#E65100', color: '#fff', fontWeight: 700, cursor: savingVehicleMaster ? 'wait' : 'pointer' }}>{savingVehicleMaster ? 'Đang lưu...' : 'Thêm dòng xe'}</button>
            </div>
          </form>
        </div>
      )}

      {previewImage && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewImage(null); }} style={{ position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(2,6,23,.86)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button type="button" onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: 16, right: 18, width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,.45)', background: 'rgba(15,23,42,.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><XCircle size={22} /></button>
          <img src={previewImage} alt="Ảnh trạng thái sửa chữa" style={{ maxWidth: '94vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 7, boxShadow: '0 18px 60px rgba(0,0,0,.5)' }} />
        </div>
      )}

      {showPayment && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProcess) setShowPayment(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: 'min(460px, 96vw)', background: '#fff', borderRadius: 8, boxShadow: '0 18px 45px rgba(15,23,42,0.32)', overflow: 'hidden' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '11px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 14 }}>
                <CheckCircle size={17} /> THANH TOÁN SỬA CHỮA
              </div>
              <button type="button" disabled={savingProcess} onClick={() => setShowPayment(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                <XCircle size={18} />
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}><DocumentNumberField type="HoaDonSuaChua" label="Số hóa đơn sửa chữa"/></div>
              <div style={{ padding: 12, borderRadius: 6, background: '#FFF7ED', border: '1px solid #FED7AA', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Xe / Phiếu sửa chữa</div>
                <div style={{ marginTop: 3, fontWeight: 700, color: '#334155' }}>{vehicleInfo.plate} · {vehicleInfo.receiptCode}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#9A3412' }}>Tổng thanh toán</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#E65100' }}>{formatMoney(totalAmount)}</span>
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#475569', fontSize: 11, fontWeight: 700 }}>
                Phương thức thanh toán
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={savingProcess} style={{ height: 36, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 5, background: '#fff', fontSize: 12 }}>
                  <option value="cash">Tiền mặt</option>
                  <option value="transfer">Chuyển khoản</option>
                  <option value="card">Thẻ</option>
                </select>
              </label>

              <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 5, background: '#EFF6FF', color: '#1E40AF', fontSize: 11 }}>
                Xác nhận thanh toán đủ sẽ tự động chuyển phiếu sang <b>Hoàn thành</b>.
              </div>
            </div>

            <div style={{ padding: '10px 15px', background: '#FAFAFA', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingProcess} onClick={() => setShowPayment(false)} style={{ height: 34, padding: '0 14px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 5, color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                Hủy
              </button>
              <button type="button" disabled={savingProcess} onClick={handlePayment} style={{ height: 34, padding: '0 16px', background: savingProcess ? '#FDBA74' : '#E65100', color: '#fff', border: 0, borderRadius: 5, fontWeight: 700, cursor: savingProcess ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> {savingProcess ? 'Đang thanh toán...' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRepairConfirmation && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProcess) setShowRepairConfirmation(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: 'min(760px, 96vw)', maxHeight: '90vh', background: '#fff', borderRadius: 8, boxShadow: '0 18px 45px rgba(15,23,42,0.32)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '11px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 14 }}>
                <CheckSquare size={17} /> XÁC NHẬN SỬA CHỮA
              </div>
              <button type="button" disabled={savingProcess} onClick={() => setShowRepairConfirmation(false)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                <XCircle size={18} />
              </button>
            </div>

            <div style={{ padding: 15, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 11.5 }}>
                <div><span style={{ color: '#64748B' }}>Số phiếu:</span> <b>{vehicleInfo.receiptCode}</b></div>
                <div><span style={{ color: '#64748B' }}>Biển số:</span> <b style={{ color: '#E65100' }}>{vehicleInfo.plate}</b></div>
                <div><span style={{ color: '#64748B' }}>Khách hàng:</span> <b>{vehicleInfo.customer}</b></div>
                <div><span style={{ color: '#64748B' }}>Loại xe:</span> <b>{vehicleInfo.carModel}</b></div>
                <div><span style={{ color: '#64748B' }}>ODO:</span> <b>{vehicleInfo.currentKm} km</b></div>
                <div><span style={{ color: '#64748B' }}>Ngày tiếp nhận:</span> <b>{vehicleInfo.date}</b></div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '7px 10px', background: '#F8FAFC', fontWeight: 700, color: '#334155', borderBottom: '1px solid #E2E8F0' }}>
                  Hạng mục khách hàng xác nhận ({selectedServices.length})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: '#FFE0B2', color: '#BF360C' }}>
                    <th style={{ padding: 6, textAlign: 'center', width: 38 }}>STT</th>
                    <th style={{ padding: 6, textAlign: 'left' }}>Dịch vụ / Phụ tùng</th>
                    <th style={{ padding: 6, textAlign: 'center', width: 70 }}>SL</th>
                    <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Đơn giá</th>
                    <th style={{ padding: 6, textAlign: 'right', width: 120 }}>Thành tiền</th>
                  </tr></thead>
                  <tbody>
                    {selectedServices.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: 6, textAlign: 'center', color: '#64748B' }}>{index + 1}</td>
                        <td style={{ padding: 6 }}><b>{item.name}</b><div style={{ color: '#64748B', fontSize: 9.5 }}>{item.group} • {item.note}</div></td>
                        <td style={{ padding: 6, textAlign: 'center' }}>{item.quantity || 1} {item.unit}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{formatMoney(item.price)}</td>
                        <td style={{ padding: 6, textAlign: 'right', fontWeight: 700 }}>{formatMoney(item.price * (item.quantity || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '9px 12px', background: '#FFF3E0', display: 'flex', justifyContent: 'space-between', color: '#BF360C', fontWeight: 800, fontSize: 13 }}>
                  <span>TỔNG BÁO GIÁ</span><span>{formatMoney(totalAmount)}</span>
                </div>
              </div>

              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 5, background: '#EFF6FF', color: '#1E40AF', fontSize: 11 }}>
                Khi nhấn <b>Xác nhận sửa chữa</b>, hệ thống sẽ ghi lịch sử xác nhận của khách hàng và tự động chuyển xe sang bước <b>Đang sửa</b>.
              </div>
            </div>

            <div style={{ padding: '10px 15px', background: '#FAFAFA', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={savingProcess} onClick={() => setShowRepairConfirmation(false)} style={{ height: 34, padding: '0 14px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 5, color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                Chưa xác nhận
              </button>
              <button type="button" disabled={savingProcess} onClick={handleConfirmRepair} style={{ height: 34, padding: '0 16px', background: savingProcess ? '#FDBA74' : '#E65100', color: '#fff', border: 0, borderRadius: 5, fontWeight: 700, cursor: savingProcess ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> {savingProcess ? 'Đang xác nhận...' : 'Xác nhận sửa chữa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
