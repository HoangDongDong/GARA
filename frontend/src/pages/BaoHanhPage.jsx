import { openDocumentPrint } from '../components/DocumentPrintDialog';
import DocumentNumberField from '../components/DocumentNumberField';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, Search, Plus, FileSpreadsheet, MoreVertical, 
  Car, Eye, Edit, Calendar, Gauge, Wrench, User, Phone, 
  Mail, MapPin, Printer, CheckCircle, Clock, FileText, Image as ImageIcon, X
} from 'lucide-react';

const API = 'http://localhost:4000';

// Helper: tinh trang thai bao hanh tu ngay ket thuc
function calcStatus(ngayKetThuc) {
  if (!ngayKetThuc) return { status: 'Không xác định', statusColor: '#9E9E9E', statusBg: '#F5F5F5' };
  const end = new Date(ngayKetThuc);
  if (end.getFullYear() < 2000) return { status: 'Hết hạn', statusColor: '#C62828', statusBg: '#FFEBEE' };
  const diffDays = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'Hết hạn', statusColor: '#C62828', statusBg: '#FFEBEE' };
  if (diffDays <= 30) return { status: 'Sắp hết hạn', statusColor: '#E65100', statusBg: '#FFF3E0' };
  if (diffDays <= 90) return { status: 'Sắp hết hạn', statusColor: '#F57C00', statusBg: '#FFF8E1' };
  return { status: 'Còn hạn', statusColor: '#2E7D32', statusBg: '#E8F5E9' };
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (dt.getFullYear() < 2000) return '—';
  return dt.toLocaleDateString('vi-VN');
}

// Map 1 ban ghi TBAOHANH tu API -> format UI
function mapApiRow(bh, idx) {
  const st = calcStatus(bh.NGAYKETTHUC);
  return {
    id: bh.NAME || `BH-${idx}`,
    plate: bh.BIENSO || '—',
    customer: bh.TEN_KH || '—',
    phone: bh.DIENTHOAI || '',
    email: '',
    address: '',
    vehicle: [bh.HANG_XE, bh.DONG_XE].filter(Boolean).join(' ') || '—',
    fullVehicle: [bh.HANG_XE, bh.DONG_XE].filter(Boolean).join(' ') || '—',
    brand: bh.HANG_XE || '',
    year: '',
    capacity: '',
    vin: '',
    engine: '',
    startDate: fmtDate(bh.NGAYBATDAU),
    endDate: fmtDate(bh.NGAYKETTHUC),
    currentKm: '',
    warrantyKm: '',
    content: [bh.TEN_MATHANG, bh.TEN_DICHVU].filter(Boolean).join(', ') || bh.NOTE || '',
    soPhieu: bh.SO_PHIEU || '',
    ketQuaXuLy: bh.KETQUAXULY || '',
    ...st,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
    history: [],
    note: bh.NOTE || '',
    creator: '',
    createdDate: fmtDate(bh.NGAYBATDAU),
    _raw: bh,
  };
}

export default function BaoHanhPage() {
  // Danh sách bảo hành (10 dòng chuẩn xác như ảnh mẫu)
  const [warrantyList, setWarrantyList] = useState([
    {
      id: 'BH000125',
      plate: '51A-123.45',
      customer: 'Nguyễn Văn A',
      phone: '0903 123 456',
      email: 'nguyenvana@gmail.com',
      address: '123 Lê Lợi, Q.1, TP.HCM',
      vehicle: 'Toyota Fortuner',
      fullVehicle: 'Toyota Fortuner 2.4G (AT)',
      brand: 'Toyota',
      year: '2020',
      capacity: '2.4G (AT)',
      vin: 'MROBA3FSX00123456',
      engine: '2GD1234567',
      startDate: '30/09/2025',
      endDate: '30/09/2026',
      currentKm: '8.500 km',
      warrantyKm: '20.000 km',
      content: 'Bảo hành động cơ, hộp số, hệ thống điện (thời gian: 12 tháng hoặc 20.000 km).',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
      history: [
        { time: '30/09/2025 14:20', title: 'Tiếp nhận bảo hành', desc: 'Tiếp nhận xe và kiểm tra lỗi.', ktv: 'Nguyễn Văn A', color: '#E65100', icon: 'wrench' },
        { time: '30/09/2025 15:30', title: 'Đang xử lý', desc: 'Thay dầu, lọc dầu, kiểm tra tổng thể.', ktv: 'Trần Văn B', color: '#1976D2', icon: 'gear' },
        { time: '30/09/2025 17:45', title: 'Hoàn thành', desc: 'Bàn giao xe cho khách hàng.', ktv: 'Trần Văn B', color: '#2E7D32', icon: 'check' }
      ],
      note: '',
      creator: 'admin',
      createdDate: '30/09/2025 14:20'
    },
    {
      id: 'BH000124',
      plate: '61A-678.90',
      customer: 'Trần Thị B',
      phone: '0912 345 678',
      email: 'tranthib@gmail.com',
      address: '45 Nguyễn Huệ, Q.1, TP.HCM',
      vehicle: 'Honda Civic',
      fullVehicle: 'Honda Civic 1.5 Turbo RS',
      brand: 'Honda',
      year: '2021',
      capacity: '1.5 Turbo',
      vin: 'HNMCIVIC00987654',
      engine: 'L15BG-987654',
      startDate: '25/09/2025',
      endDate: '25/09/2026',
      currentKm: '12.300 km',
      warrantyKm: '25.000 km',
      content: 'Bảo hành hệ thống phanh ABS, hộp số CVT và thước lái.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=400',
      history: [
        { time: '25/09/2025 09:15', title: 'Tiếp nhận bảo hành', desc: 'Kiểm tra báo lỗi cảm biến ABS.', ktv: 'Lê Văn C', color: '#E65100' },
        { time: '25/09/2025 11:30', title: 'Hoàn thành', desc: 'Đã thay cảm biến ABS chính hãng và cân chỉnh.', ktv: 'Trần Văn B', color: '#2E7D32' }
      ],
      note: '',
      creator: 'admin',
      createdDate: '25/09/2025 09:15'
    },
    {
      id: 'BH000123',
      plate: '50A-456.78',
      customer: 'Lê Văn C',
      phone: '0923 456 789',
      email: 'levanc@gmail.com',
      address: '78 Trần Hưng Đạo, HN',
      vehicle: 'Mazda 3',
      fullVehicle: 'Mazda 3 Sport Luxury 1.5AT',
      brand: 'Mazda',
      year: '2022',
      capacity: '1.5L',
      vin: 'MZ3VN2022019283',
      engine: 'SKY15-281923',
      startDate: '20/09/2025',
      endDate: '20/09/2026',
      currentKm: '15.600 km',
      warrantyKm: '30.000 km',
      content: 'Bảo hành động cơ SkyActiv, dàn lạnh và hệ thống âm thanh.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
      history: [
        { time: '20/09/2025 10:00', title: 'Tiếp nhận', desc: 'Bảo hành hệ thống điều hòa rung nhẹ.', ktv: 'Vũ Đức Dũng', color: '#E65100' }
      ],
      note: '',
      creator: 'admin',
      createdDate: '20/09/2025 10:00'
    },
    {
      id: 'BH000122',
      plate: '72A-789.01',
      customer: 'Phạm Thị D',
      phone: '0934 567 890',
      email: 'phamthid@gmail.com',
      address: '99 Cách Mạng Tháng 8, Q.3, TP.HCM',
      vehicle: 'Kia Seltos',
      fullVehicle: 'Kia Seltos 1.4 Premium',
      brand: 'Kia',
      year: '2021',
      capacity: '1.4 Turbo',
      vin: 'KIASELTOS0012345',
      engine: 'G4LD-102938',
      startDate: '15/09/2025',
      endDate: '15/09/2026',
      currentKm: '18.200 km',
      warrantyKm: '20.000 km',
      content: 'Bảo hành hệ thống điện thân xe, camera lùi và cảm biến đỗ.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '15/09/2025'
    },
    {
      id: 'BH000121',
      plate: '51G-222.33',
      customer: 'Hoàng Văn E',
      phone: '0945 678 901',
      email: 'hoangvane@gmail.com',
      address: '15 Phan Xích Long, Bình Thạnh',
      vehicle: 'Hyundai Accent',
      fullVehicle: 'Hyundai Accent 1.4 AT Đặc Biệt',
      brand: 'Hyundai',
      year: '2021',
      capacity: '1.4L',
      vin: 'HYUNACCENT202199',
      engine: 'G4LC-992811',
      startDate: '10/09/2025',
      endDate: '10/09/2026',
      currentKm: '22.000 km',
      warrantyKm: '30.000 km',
      content: 'Bảo hành hộp số tự động 6 cấp và hệ thống lái MDPS.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '10/09/2025'
    },
    {
      id: 'BH000120',
      plate: '60A-333.44',
      customer: 'Vũ Thị F',
      phone: '0956 789 012',
      email: 'vuthif@gmail.com',
      address: 'Biên Hòa, Đồng Nai',
      vehicle: 'Ford Ranger',
      fullVehicle: 'Ford Ranger Wildtrak 2.0L Bi-Turbo 4x4',
      brand: 'Ford',
      year: '2022',
      capacity: '2.0 Bi-Turbo',
      vin: 'FORDRANGER991283',
      engine: 'YN2X-819283',
      startDate: '05/09/2025',
      endDate: '05/09/2026',
      currentKm: '34.000 km',
      warrantyKm: '50.000 km',
      content: 'Bảo hành hệ thống dẫn động 4 bánh, turbo tăng áp và giảm xóc.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '05/09/2025'
    },
    {
      id: 'BH000119',
      plate: '43A-555.66',
      customer: 'Đặng Văn G',
      phone: '0967 890 123',
      email: 'dangvang@gmail.com',
      address: 'Đà Nẵng',
      vehicle: 'Honda CR-V',
      fullVehicle: 'Honda CR-V 1.5L Turbo',
      brand: 'Honda',
      year: '2020',
      capacity: '1.5 Turbo',
      vin: 'HNDCRV20208192',
      engine: 'L15B7-192837',
      startDate: '01/09/2025',
      endDate: '01/09/2026',
      currentKm: '41.500 km',
      warrantyKm: '50.000 km',
      content: 'Bảo hành cụm đèn LED, radar Honda Sensing và bơm cao áp.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '01/09/2025'
    },
    {
      id: 'BH000118',
      plate: '29A-777.88',
      customer: 'Bùi Thị H',
      phone: '0978 901 234',
      email: 'buithih@gmail.com',
      address: 'Cầu Giấy, Hà Nội',
      vehicle: 'Toyota Vios',
      fullVehicle: 'Toyota Vios 1.5G CVT',
      brand: 'Toyota',
      year: '2019',
      capacity: '1.5L',
      vin: 'TYVIOS20199182',
      engine: '2NRFE-819283',
      startDate: '28/08/2025',
      endDate: '28/08/2026',
      currentKm: '49.200 km',
      warrantyKm: '50.000 km',
      content: 'Bảo hành thước lái và máy phát điện.',
      status: 'Sắp hết hạn',
      statusColor: '#0288D1',
      statusBg: '#E1F5FE',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '28/08/2025'
    },
    {
      id: 'BH000117',
      plate: '47A-999.00',
      customer: 'Ngô Văn I',
      phone: '0989 012 345',
      email: 'ngovani@gmail.com',
      address: 'Buôn Ma Thuột, Đắk Lắk',
      vehicle: 'Mazda CX5',
      fullVehicle: 'Mazda CX-5 2.0 Premium',
      brand: 'Mazda',
      year: '2021',
      capacity: '2.0L',
      vin: 'MZCX5202100918',
      engine: 'SKY20-192837',
      startDate: '20/08/2025',
      endDate: '20/08/2026',
      currentKm: '26.800 km',
      warrantyKm: '40.000 km',
      content: 'Bảo hành hệ thống i-Activsense và giảm chấn trước sau.',
      status: 'Còn hạn',
      statusColor: '#2E7D32',
      statusBg: '#E8F5E9',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '20/08/2025'
    },
    {
      id: 'BH000116',
      plate: '38A-111.22',
      customer: 'Đỗ Thị K',
      phone: '0990 123 456',
      email: 'dothik@gmail.com',
      address: 'Hà Tĩnh',
      vehicle: 'Kia Morning',
      fullVehicle: 'Kia Morning GT-Line 1.25',
      brand: 'Kia',
      year: '2018',
      capacity: '1.25L',
      vin: 'KIAMORNING20189',
      engine: 'G4LA-192837',
      startDate: '12/08/2025',
      endDate: '12/08/2026',
      currentKm: '68.000 km',
      warrantyKm: '60.000 km',
      content: 'Bảo hành hệ thống điều hòa và củ đề khởi động.',
      status: 'Đã hết hạn',
      statusColor: '#E65100',
      statusBg: '#FFF3E0',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=400',
      history: [],
      note: '',
      creator: 'admin',
      createdDate: '12/08/2025'
    }
  ]);

  // Bảng dịch vụ bảo hành
  const [serviceList] = useState([
    { stt: 1, id: 'BH000125-001', date: '30/09/2025', type: 'Bảo hành định kỳ', content: 'Thay dầu, lọc dầu', status: 'Đang xử lý', statusColor: '#E65100', statusBg: '#FFF3E0' },
    { stt: 2, id: 'BH000124-001', date: '25/09/2025', type: 'Sửa chữa bảo hành', content: 'Thay cảm biến ABS', status: 'Hoàn thành', statusColor: '#2E7D32', statusBg: '#E8F5E9' },
    { stt: 3, id: 'BH000123-001', date: '20/09/2025', type: 'Bảo hành động cơ', content: 'Sửa lỗi rung động', status: 'Hoàn thành', statusColor: '#2E7D32', statusBg: '#E8F5E9' },
    { stt: 4, id: 'BH000122-001', date: '15/09/2025', type: 'Bảo hành điện', content: 'Thay ắc quy', status: 'Hoàn thành', statusColor: '#2E7D32', statusBg: '#E8F5E9' },
    { stt: 5, id: 'BH000121-001', date: '10/09/2025', type: 'Bảo hành hộp số', content: 'Sửa hộp số tự động', status: 'Hoàn thành', statusColor: '#2E7D32', statusBg: '#E8F5E9' }
  ]);

  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiLoaded, setApiLoaded] = useState(false);

  // Load tu API khi mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    axios.get(`${API}/api/vehicles/warranties`)
      .then(res => {
        if (!active) return;
        const rows = res.data?.data;
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped = rows.map((bh, i) => mapApiRow(bh, i));
          setWarrantyList(mapped);
          setSelectedId(mapped[0]?.id || null);
          setApiLoaded(true);
        } else {
          // API tra ve mang rong -> giu data demo, chon default
          setSelectedId(warrantyList[0]?.id || null);
        }
      })
      .catch(() => {
        if (active) setSelectedId(warrantyList[0]?.id || null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedItem = warrantyList.find(w => w.id === selectedId) || warrantyList[0];

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals & Toast
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // State modal them moi
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365*24*3600*1000).toISOString().slice(0, 10);

  const EMPTY_TICKET = {
    plate: '', customer: '', phone: '', vehicle: '', brand: '',
    year: '', content: 'Bảo hành động cơ và hệ thống điện.',
    startDate: today, endDate: nextYear,
  };
  const [newTicket, setNewTicket] = useState(EMPTY_TICKET);
  const [foundVehicle, setFoundVehicle] = useState(null);
  const [vehicleList, setVehicleList] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');   // text filter
  const [showVehicleList, setShowVehicleList] = useState(false); // mo/dong dropdown
  const [searching, setSearching] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);

  // Load danh sach xe khi mo modal
  useEffect(() => {
    if (!showAddModal) return;
    if (vehicleList.length > 0) return; // da load roi
    setSearching(true);
    axios.get(`${API}/api/vehicles`)
      .then(res => {
        const data = res.data?.data || [];
        setVehicleList(data);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [showAddModal]);

  // Khi chon xe tu dropdown
  const handleSelectVehicle = (vehicleId) => {
    if (!vehicleId) {
      setFoundVehicle(null);
      setVehicleSearch('');
      setNewTicket(t => ({ ...t, plate: '', customer: '', phone: '', vehicle: '', brand: '', year: '' }));
      return;
    }
    const v = vehicleList.find(x => x.ID === vehicleId);
    if (!v) return;
    setFoundVehicle(v);
    setVehicleSearch('');
    setShowVehicleList(false);
    setNewTicket(t => ({
      ...t,
      plate: v.BIENSO || '',
      customer: v.TEN_KH || '',
      phone: v.DIENTHOAI || '',
      vehicle: [v.HANG_XE, v.DONG_XE].filter(Boolean).join(' '),
      brand: v.HANG_XE || '',
      year: v.NAMSANXUAT ? String(v.NAMSANXUAT) : '',
    }));
  };

  // Van giu ham tim theo bien so (fallback)
  const handleSearchPlate = async () => {
    const plate = newTicket.plate.trim();
    if (!plate) return;
    const found = vehicleList.find(v =>
      String(v.BIENSO || '').replace(/[-. ]/g, '').toUpperCase() ===
      plate.replace(/[-. ]/g, '').toUpperCase()
    );
    if (found) {
      handleSelectVehicle(found.ID);
      showToastMsg(`Đã tìm thấy xe ${found.BIENSO} - ${found.TEN_KH || 'chưa có khách hàng'}`);
    } else {
      showToastMsg(`Biển số ${plate} chưa có trong hồ sơ.`, 'warning');
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.plate.trim()) {
      showToastMsg('Vui lòng nhập Biển số xe!', 'error');
      return;
    }
    if (!newTicket.startDate || !newTicket.endDate) {
      showToastMsg('Vui lòng nhập ngày bắt đầu và ngày kết thúc bảo hành!', 'error');
      return;
    }
    setSavingTicket(true);
    try {
      const payload = {
        BIENSO: newTicket.plate.trim().toUpperCase(),
        DXEID: foundVehicle?.ID || null,
        NGAYBATDAU: newTicket.startDate,
        NGAYKETTHUC: newTicket.endDate,
        NOTE: newTicket.content || null,
        LOAI: 0,
      };
      const res = await axios.post(`${API}/api/vehicles/warranties`, payload);
      const newName = res.data.name || ('BH-' + newTicket.plate.replace(/[-. ]/g, ''));
      const st = calcStatus(newTicket.endDate);
      const newItem = {
        id: newName,
        plate: newTicket.plate.toUpperCase(),
        customer: newTicket.customer || foundVehicle?.TEN_KH || '—',
        phone: newTicket.phone || '',
        email: '', address: '',
        vehicle: newTicket.vehicle || '',
        fullVehicle: newTicket.vehicle || '',
        brand: newTicket.brand || '',
        year: newTicket.year || '',
        capacity: '', vin: '', engine: '',
        startDate: fmtDate(newTicket.startDate),
        endDate: fmtDate(newTicket.endDate),
        currentKm: '', warrantyKm: '',
        content: newTicket.content || '',
        ...st,
        image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
        history: [], note: '', creator: 'admin',
        createdDate: fmtDate(new Date().toISOString()),
      };
      setWarrantyList(prev => [newItem, ...prev]);
      setSelectedId(newName);
      setShowAddModal(false);
      setNewTicket(EMPTY_TICKET);
      setFoundVehicle(null);
      setVehicleSearch('');
      showToastMsg(`Đã tạo phiếu bảo hành [${newName}] và lưu vào database!`);
    } catch (err) {
      showToastMsg(err?.response?.data?.error || err.message || 'Lỗi khi tạo phiếu!', 'error');
    } finally {
      setSavingTicket(false);
    }
  };

  const filteredList = warrantyList.filter(item => {
    const matchSearch = searchTerm === '' || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);
    const matchBrand = brandFilter === '' || item.brand === brandFilter;
    const matchStatus = statusFilter === '' || item.status === statusFilter;
    return matchSearch && matchBrand && matchStatus;
  });

  // Custom th style matching the light peach header in image
  const tableHeaderThStyle = {
    background: '#FFE0B2',
    color: '#D84315',
    padding: '4px 6px',
    fontSize: '9.5px',
    fontWeight: 700,
    border: 'none',
    whiteSpace: 'nowrap'
  };

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 9999,
          background: toast.type === 'error' ? '#D32F2F' : '#2E7D32',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600
        }}>
          <CheckCircle size={16} />
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 4, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: '#E65100', color: 'white', width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
            🛡️
          </span>
          Bảo hành
          {loading ? (
            <span style={{ fontSize: 9, color: '#9E9E9E', fontWeight: 400, marginLeft: 4 }}>⏳ Đang tải...</span>
          ) : (
            <>
              <span style={{ fontSize: 10, color: '#757575', fontWeight: 400 }}>({warrantyList.length} phiếu)</span>
              {apiLoaded && (
                <span style={{ fontSize: 8, background: '#E8F5E9', color: '#2E7D32', padding: '1px 6px', borderRadius: 10, fontWeight: 600, border: '1px solid #C8E6C9' }}>
                  ✅ Từ DB
                </span>
              )}
            </>
          )}
        </h1>
        <div className="page-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ background: '#E65100', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            + Tạo phiếu bảo hành
          </button>
          <button 
            onClick={() => showToastMsg('Tính năng Import Excel sẵn sàng')}
            style={{ background: 'white', color: '#424242', border: '1px solid #E0E0E0', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={13} color="#4CAF50" /> Import Excel
          </button>
          <button 
            onClick={() => showToastMsg('Xuất file Excel danh sách bảo hành thành công!')}
            style={{ background: 'white', color: '#424242', border: '1px solid #E0E0E0', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={13} color="#1976D2" /> Xuất Excel
          </button>
          <button style={{ background: 'white', color: '#616161', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
            <MoreVertical size={13} color="#616161" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="responsive-filter-bar" style={{ background: 'white', padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E0E0', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ flex: 1.8, minWidth: 200 }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã xe, biển số, số điện thoại, mã bảo hành..." 
              style={{ width: '100%', padding: '4px 28px 4px 8px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
            />
            <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#757575' }} />
          </div>
        </div>

        <div style={{ minWidth: 90 }}>
          <label style={{ fontSize: 9, color: '#616161', display: 'block', marginBottom: 1 }}>Hãng xe</label>
          <select 
            value={brandFilter} 
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
          >
            <option value="">Tất cả</option>
            <option>Toyota</option>
            <option>Honda</option>
            <option>Mazda</option>
            <option>Kia</option>
            <option>Hyundai</option>
            <option>Ford</option>
          </select>
        </div>

        <div style={{ minWidth: 110 }}>
          <label style={{ fontSize: 9, color: '#616161', display: 'block', marginBottom: 1 }}>Trạng thái bảo hành</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }}
          >
            <option value="">Tất cả</option>
            <option>Còn hạn</option>
            <option>Sắp hết hạn</option>
            <option>Đã hết hạn</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div>
            <label style={{ fontSize: 9, color: '#616161', display: 'block', marginBottom: 1 }}>Thời gian</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input 
                type="text" 
                placeholder="Từ ngày" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ width: 75, padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }} 
              />
              <span style={{ fontSize: 10, color: '#757575' }}>-</span>
              <input 
                type="text" 
                placeholder="Đến ngày" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ width: 75, padding: '4px 6px', border: '1px solid #E0E0E0', borderRadius: 4, fontSize: 10 }} 
              />
            </div>
          </div>
        </div>

        <button 
          onClick={() => showToastMsg(`Đã lọc danh sách: ${filteredList.length} kết quả`)}
          style={{ background: '#E65100', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', height: 26 }}
        >
          <Search size={12} /> Tìm kiếm
        </button>
      </div>

      {/* Main Content: 2 Columns */}
      <div className="responsive-2col" style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        
        {/* Cột Trái (~58%): 2 Bảng (Danh sách bảo hành + Dịch vụ bảo hành) */}
        <div style={{ flex: 1.35, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          
          {/* Card 1: Danh sách bảo hành */}
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1.25, minHeight: 270, overflow: 'hidden' }}>
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ color: '#E65100', fontSize: 13 }}>🚗</span>
              <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Danh sách bảo hành</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ margin: 0, width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                    <th style={{ ...tableHeaderThStyle, width: 30, textAlign: 'center' }}>STT</th>
                    <th style={{ ...tableHeaderThStyle, width: 70 }}>Mã bảo hành</th>
                    <th style={{ ...tableHeaderThStyle, width: 75 }}>Biển số</th>
                    <th style={{ ...tableHeaderThStyle, width: 90 }}>Khách hàng</th>
                    <th style={{ ...tableHeaderThStyle, width: 90 }}>Xe</th>
                    <th style={{ ...tableHeaderThStyle, width: 75 }}>Ngày bảo hành</th>
                    <th style={{ ...tableHeaderThStyle, width: 75 }}>Hạn bảo hành</th>
                    <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ ...tableHeaderThStyle, width: 55, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <tr 
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        style={{ 
                          cursor: 'pointer',
                          background: isSelected ? '#FFF8E1' : (idx % 2 === 1 ? '#FAFAFA' : 'white'),
                          borderLeft: isSelected ? '3px solid #E65100' : '3px solid transparent',
                          borderBottom: '1px solid #F0F0F0'
                        }}
                      >
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontSize: 9.5 }}>{idx + 1}</td>
                        <td style={{ padding: '4px 6px', fontWeight: 600, color: '#1976D2', fontSize: 9.5 }}>{item.id}</td>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: '#212121', fontSize: 9.5 }}>{item.plate}</td>
                        <td style={{ padding: '4px 6px', fontWeight: 500, fontSize: 9.5 }}>{item.customer}</td>
                        <td style={{ padding: '4px 6px', color: '#616161', fontSize: 9.5 }}>{item.vehicle}</td>
                        <td style={{ padding: '4px 6px', fontSize: 9.5 }}>{item.startDate}</td>
                        <td style={{ padding: '4px 6px', fontSize: 9.5 }}>{item.endDate}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: 10,
                            fontSize: 8.5,
                            fontWeight: 600,
                            color: item.statusColor,
                            background: item.statusBg,
                            border: `1px solid ${item.statusColor}33`,
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            <Eye size={11} color="#1976D2" style={{ cursor: 'pointer' }} title="Xem chi tiết" />
                            <Edit size={11} color="#757575" style={{ cursor: 'pointer' }} title="Chỉnh sửa" />
                            <MoreVertical size={11} color="#9E9E9E" style={{ cursor: 'pointer' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div style={{ padding: '3px 8px', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9.5, color: '#616161', background: '#FAFAFA', flexShrink: 0 }}>
              <div>Tổng cộng: <b>{filteredList.length}</b> bảo hành</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={{ border: '1px solid #ccc', background: 'white', color: '#333', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>&lt;</button>
                <button style={{ border: 'none', background: '#E65100', color: 'white', borderRadius: 3, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>1</button>
                <button style={{ border: '1px solid #ccc', background: 'white', color: '#333', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>&gt;</button>
              </div>
            </div>
          </div>

          {/* Card 2: Dịch vụ bảo hành */}
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 0.95, minHeight: 180, overflow: 'hidden' }}>
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ color: '#E65100', fontSize: 13 }}>🚗</span>
              <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: '#212121' }}>Dịch vụ bảo hành</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ margin: 0, width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2', borderBottom: '1px solid #FFE0B2' }}>
                    <th style={{ ...tableHeaderThStyle, width: 30, textAlign: 'center' }}>STT</th>
                    <th style={{ ...tableHeaderThStyle, width: 85 }}>Mã phiếu</th>
                    <th style={{ ...tableHeaderThStyle, width: 80 }}>Ngày tiếp nhận</th>
                    <th style={{ ...tableHeaderThStyle, width: 100 }}>Loại bảo hành</th>
                    <th style={{ ...tableHeaderThStyle }}>Nội dung</th>
                    <th style={{ ...tableHeaderThStyle, width: 75, textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ ...tableHeaderThStyle, width: 55, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceList.map((srv) => (
                    <tr key={srv.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontSize: 9.5 }}>{srv.stt}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 600, color: '#1976D2', fontSize: 9.5 }}>{srv.id}</td>
                      <td style={{ padding: '4px 6px', fontSize: 9.5 }}>{srv.date}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 500, fontSize: 9.5 }}>{srv.type}</td>
                      <td style={{ padding: '4px 6px', color: '#424242', fontSize: 9.5 }}>{srv.content}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: 10,
                          fontSize: 8.5,
                          fontWeight: 600,
                          color: srv.statusColor,
                          background: srv.statusBg,
                          border: `1px solid ${srv.statusColor}33`,
                          display: 'inline-block'
                        }}>
                          {srv.status}
                        </span>
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                          <Eye size={11} color="#1976D2" style={{ cursor: 'pointer' }} />
                          <Edit size={11} color="#757575" style={{ cursor: 'pointer' }} />
                          <MoreVertical size={11} color="#9E9E9E" style={{ cursor: 'pointer' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div style={{ padding: '3px 8px', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9.5, color: '#616161', background: '#FAFAFA', flexShrink: 0 }}>
              <div>Tổng cộng: <b>{serviceList.length}</b> dịch vụ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={{ border: '1px solid #ccc', background: 'white', color: '#333', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>&lt;</button>
                <button style={{ border: 'none', background: '#E65100', color: 'white', borderRadius: 3, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>1</button>
                <button style={{ border: '1px solid #ccc', background: 'white', color: '#333', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>&gt;</button>
              </div>
            </div>
          </div>

        </div>

        {/* Cột Phải (~42%): Chi tiết bảo hành & Lịch sử & Ghi chú */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          
          {/* Card: Chi tiết bảo hành */}
          <div className="card" style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {/* Header Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#E65100', fontSize: 13 }}>🛡️</span>
                <h2 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: '#212121' }}>Chi tiết bảo hành</h2>
              </div>
              <span style={{
                background: selectedItem.statusBg,
                color: selectedItem.statusColor,
                padding: '1px 8px',
                borderRadius: 12,
                fontSize: 9.5,
                fontWeight: 600,
                border: `1px solid ${selectedItem.statusColor}33`
              }}>
                {selectedItem.status}
              </span>
            </div>

            {/* Thông tin Xe & Khách hàng */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Ảnh xe */}
              <div style={{ width: 110, height: 75, borderRadius: 4, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0, border: '1px solid #eee' }}>
                <img src={selectedItem.image} alt={selectedItem.vehicle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* Thông tin xe ở giữa */}
              <div style={{ flex: 1.15, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#212121' }}>{selectedItem.fullVehicle}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#212121' }}>{selectedItem.plate}</span>
                  <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: 7.5, padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>Đã bảo hành</span>
                </div>
                <div style={{ fontSize: 8.5, color: '#616161' }}>Số khung: <b style={{ color: '#333' }}>{selectedItem.vin}</b></div>
                <div style={{ fontSize: 8.5, color: '#616161' }}>Số máy: <b style={{ color: '#333' }}>{selectedItem.engine}</b></div>
              </div>

              {/* Thông tin khách hàng bên phải */}
              <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', gap: 1.5, borderLeft: '1px solid #f0f0f0', paddingLeft: 6, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8.5 }}>
                  <User size={10} color="#1976D2" />
                  <span style={{ color: '#757575' }}>Khách hàng:</span>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#212121' }}>{selectedItem.customer}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8.5, color: '#1976D2' }}>
                  <Phone size={9} /> {selectedItem.phone}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8.5, color: '#616161' }}>
                  <Mail size={9} /> {selectedItem.email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#757575' }}>
                  <MapPin size={9} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedItem.address}</span>
                </div>
              </div>
            </div>

            {/* Chi tiết thông số dòng xe */}
            <div style={{ display: 'flex', gap: 8, padding: '3px 8px', background: '#FAFAFA', borderRadius: 4, border: '1px solid #f0f0f0' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10 }}>🚗</span>
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Hãng xe</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600 }}>{selectedItem.brand}</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10 }}>📅</span>
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Đời xe</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600 }}>{selectedItem.year}</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10 }}>⚙️</span>
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Dung tích</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600 }}>{selectedItem.capacity}</div>
                </div>
              </div>
            </div>

            {/* Nội dung bảo hành */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: '#D32F2F' }}>
                <Wrench size={11} color="#D32F2F" /> Nội dung bảo hành
              </div>
              <div style={{ fontSize: 9.5, color: '#424242', lineHeight: 1.3, padding: '3px 6px', background: '#FFF8E1', borderRadius: 4, border: '1px solid #FFE082' }}>
                {selectedItem.content}
              </div>
            </div>

            {/* 4 Thống kê Thông số ngày & Km */}
            <div className="responsive-grid-4" style={{ gap: 4 }}>
              <div style={{ padding: '4px 6px', background: '#F8F9FA', borderRadius: 4, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} color="#E65100" />
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Ngày bắt đầu</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{selectedItem.startDate}</div>
                </div>
              </div>

              <div style={{ padding: '4px 6px', background: '#F8F9FA', borderRadius: 4, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} color="#E65100" />
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Ngày kết thúc</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{selectedItem.endDate}</div>
                </div>
              </div>

              <div style={{ padding: '4px 6px', background: '#F8F9FA', borderRadius: 4, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Gauge size={12} color="#D32F2F" />
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Số km hiện tại</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{selectedItem.currentKm}</div>
                </div>
              </div>

              <div style={{ padding: '4px 6px', background: '#F8F9FA', borderRadius: 4, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Wrench size={12} color="#D32F2F" />
                <div>
                  <div style={{ fontSize: 7.5, color: '#757575' }}>Số km bảo hành</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{selectedItem.warrantyKm}</div>
                </div>
              </div>
            </div>

            {/* Các nút thao tác */}
            <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
              <button 
                onClick={() => showToastMsg(`Đã gửi yêu cầu gia hạn bảo hành cho xe ${selectedItem.plate}`)}
                style={{ flex: 1.2, background: '#E65100', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 4, fontWeight: 600, fontSize: 9.5, cursor: 'pointer' }}
              >
                Gia hạn bảo hành
              </button>
              <button 
                onClick={() => showToastMsg('Mở form chỉnh sửa phiếu bảo hành')}
                style={{ flex: 1, background: 'white', color: '#333333', border: '1px solid #ccc', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, cursor: 'pointer' }}
              >
                <Edit size={11} color="#333" /> Chỉnh sửa
              </button>
              <button 
                onClick={() => openDocumentPrint({ type: 'MauPhieuBaoHanh', id: selectedItem?._raw?.ID })}
                style={{ flex: 1, background: 'white', color: '#333333', border: '1px solid #ccc', padding: '5px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, cursor: 'pointer' }}
              >
                <Printer size={11} color="#333" /> In phiếu
              </button>
            </div>
          </div>

          {/* 2 Sub-cards bên dưới: Lịch sử bảo hành (Trái) & Hình ảnh / Ghi chú (Phải) */}
          <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 0 }}>
            
            {/* Sub-card 1: Lịch sử bảo hành (Timeline) */}
            <div className="card" style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 3 }}>
                <span style={{ color: '#E65100', fontSize: 11 }}>🛡️</span>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0 }}>Lịch sử bảo hành</h3>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '3px 0' }}>
                {selectedItem.history && selectedItem.history.length > 0 ? (
                  selectedItem.history.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 5, position: 'relative' }}>
                      {/* Timeline dot & line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: step.color, marginTop: 2 }} />
                        {idx < selectedItem.history.length - 1 && (
                          <div style={{ width: 1, flex: 1, background: '#E0E0E0', margin: '2px 0' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 7.5, color: '#757575' }}>{step.time}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: step.color }}>{step.title}</div>
                        <div style={{ fontSize: 8.5, color: '#424242' }}>{step.desc}</div>
                        {step.ktv && (
                          <div style={{ fontSize: 8, color: '#616161', fontStyle: 'italic', marginTop: 1 }}>
                            Kỹ thuật viên: {step.ktv}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 8.5, color: '#9E9E9E', textAlign: 'center', padding: '10px 0' }}>
                    Chưa có lịch sử bảo hành cho xe này
                  </div>
                )}
              </div>
            </div>

            {/* Sub-card 2: Hình ảnh / Ghi chú */}
            <div className="card" style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E0E0E0', paddingBottom: 3 }}>
                <span style={{ color: '#E65100', fontSize: 11 }}>🖼️</span>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, margin: 0 }}>Hình ảnh / Ghi chú</h3>
              </div>

              {/* Grid 3 thumbnails + nút Thêm hình ảnh */}
              <div className="responsive-grid-4" style={{ gap: 3 }}>
                <div style={{ height: 36, borderRadius: 2, overflow: 'hidden', background: '#eee' }}>
                  <img src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150" alt="img1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ height: 36, borderRadius: 2, overflow: 'hidden', background: '#eee' }}>
                  <img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=150" alt="img2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ height: 36, borderRadius: 2, overflow: 'hidden', background: '#eee' }}>
                  <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=150" alt="img3" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div 
                  onClick={() => showToastMsg('Tải lên ảnh bảo hành')}
                  style={{ height: 36, border: '1px dashed #BDBDBD', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAFA' }}
                >
                  <Plus size={12} color="#757575" />
                  <span style={{ fontSize: 6, color: '#757575', textAlign: 'center' }}>Thêm hình ảnh</span>
                </div>
              </div>

              {/* Ghi chú */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontWeight: 700, color: '#E65100' }}>
                  <FileText size={10} color="#E65100" /> Ghi chú
                </div>
                <div style={{ fontSize: 8.5, color: '#424242', background: '#F5F5F5', padding: '3px 5px', borderRadius: 3, flex: 1, lineHeight: 1.25 }}>
                  {selectedItem.note}
                </div>
              </div>

              {/* Footer info */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: '#757575' }}>
                <div>Người tạo: <b>{selectedItem.creator}</b></div>
                <div>{selectedItem.createdDate}</div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modal Tạo phiếu bảo hành mới */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{ background: 'white', borderRadius: 8, width: 520, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '10px 14px', background: '#E65100', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} /> + TẠO PHIẾU BẢO HÀNH MỚI
              </div>
              <button onClick={() => { setShowAddModal(false); setFoundVehicle(null); setNewTicket(EMPTY_TICKET); }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DocumentNumberField type="BaoHanh" label="Số phiếu bảo hành"/>

              {/* COMBOBOX CHON XE - co the go de loc */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 3, color: '#E65100' }}>
                  Chọn xe có sẵn <span style={{color:'red'}}>*</span>
                  {vehicleList.length > 0 && <span style={{ fontWeight: 400, color: '#9E9E9E', marginLeft: 4 }}>({vehicleList.length} xe)</span>}
                </label>
                {/* Input loc */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={foundVehicle ? `${foundVehicle.BIENSO}${foundVehicle.HANG_XE ? ' — ' + foundVehicle.HANG_XE : ''}${foundVehicle.DONG_XE ? ' ' + foundVehicle.DONG_XE : ''}${foundVehicle.TEN_KH ? ' (' + foundVehicle.TEN_KH + ')' : ''}` : vehicleSearch}
                    onChange={(e) => {
                      if (foundVehicle) { handleSelectVehicle(''); } // bo chon neu dang co xe
                      setVehicleSearch(e.target.value);
                      setShowVehicleList(true);
                    }}
                    onFocus={() => setShowVehicleList(true)}
                    onBlur={() => setTimeout(() => setShowVehicleList(false), 180)}
                    placeholder={searching ? '⏳ Đang tải...' : '🔍 Gõ biển số, hãng xe hoặc tên khách hàng...'}
                    style={{
                      width: '100%', padding: '7px 36px 7px 10px',
                      border: `1.5px solid ${foundVehicle ? '#4CAF50' : '#E65100'}`,
                      borderRadius: 5, fontSize: 11, fontWeight: foundVehicle ? 700 : 400,
                      color: foundVehicle ? '#1B5E20' : '#333',
                      background: foundVehicle ? '#F1F8E9' : 'white',
                      outline: 'none',
                      boxShadow: foundVehicle ? '0 0 0 2px #C8E6C9' : '0 0 0 2px #FFE0B2',
                      boxSizing: 'border-box',
                    }}
                    readOnly={!!foundVehicle}
                    autoComplete="off"
                  />
                  {/* Icon mui ten / xoa */}
                  {foundVehicle ? (
                    <button type="button" onClick={() => { handleSelectVehicle(''); setVehicleSearch(''); }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#C62828', fontSize: 16, padding: 0, lineHeight: 1 }}
                      title="Bỏ chọn xe">×</button>
                  ) : (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#E65100', fontSize: 12 }}>&#9660;</span>
                  )}
                </div>

                {/* Dropdown list loc */}
                {showVehicleList && !foundVehicle && (() => {
                  const q = vehicleSearch.toLowerCase().replace(/[-. ]/g, '');
                  const filtered = vehicleList.filter(v =>
                    !q ||
                    String(v.BIENSO || '').toLowerCase().replace(/[-. ]/g, '').includes(q) ||
                    String(v.HANG_XE || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                    String(v.DONG_XE || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                    String(v.TEN_KH || '').toLowerCase().includes(vehicleSearch.toLowerCase())
                  ).slice(0, 40);
                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'white', border: '1.5px solid #E65100', borderTop: 'none',
                      borderRadius: '0 0 6px 6px', maxHeight: 200, overflowY: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                      {searching && (
                        <div style={{ padding: '8px 12px', fontSize: 10, color: '#9E9E9E' }}>⏳ Đang tải danh sách xe...</div>
                      )}
                      {!searching && filtered.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: 10, color: '#9E9E9E' }}>∅ Không tìm thấy xe nào</div>
                      )}
                      {filtered.map((v, i) => (
                        <div key={v.ID}
                          onMouseDown={() => { handleSelectVehicle(v.ID); setVehicleSearch(''); setShowVehicleList(false); }}
                          style={{
                            padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                            borderBottom: i < filtered.length - 1 ? '1px solid #F5F5F5' : 'none',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FFF3E0'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#E65100', marginRight: 6 }}>{v.BIENSO}</span>
                            <span style={{ color: '#424242' }}>{[v.HANG_XE, v.DONG_XE].filter(Boolean).join(' ')}</span>
                          </div>
                          <span style={{ fontSize: 10, color: '#757575' }}>{v.TEN_KH || ''}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Thong tin xe da chon */}
              {foundVehicle && (
                <div style={{ background: '#E8F5E9', border: '1px solid #C8E6C9', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#1B5E20', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b>Biển số:</b> <span style={{ color: '#E65100', fontWeight: 800 }}>{foundVehicle.BIENSO}</span>
                    &nbsp;&nbsp;<b>Xe:</b> {foundVehicle.HANG_XE} {foundVehicle.DONG_XE}
                    {foundVehicle.NAMSANXUAT && <span> ({foundVehicle.NAMSANXUAT})</span>}
                    <br/>
                    <b>Khách hàng:</b> {foundVehicle.TEN_KH || <i>Chưa có</i>}
                    {foundVehicle.DIENTHOAI && <span> — 📞 {foundVehicle.DIENTHOAI}</span>}
                  </div>
                  <button type="button" onClick={() => handleSelectVehicle('')}
                    style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                    title="Bỏ chọn xe">×</button>
                </div>
              )}


              {/* Thoi han bao hanh */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Ngày bắt đầu <span style={{color:'red'}}>*</span></label>
                  <input type="date" value={newTicket.startDate}
                    onChange={(e) => setNewTicket({...newTicket, startDate: e.target.value})}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Ngày kết thúc <span style={{color:'red'}}>*</span></label>
                  <input type="date" value={newTicket.endDate}
                    onChange={(e) => setNewTicket({...newTicket, endDate: e.target.value})}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }}
                    required
                  />
                </div>
              </div>

              {/* Noi dung bao hanh */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Nội dung cam kết bảo hành</label>
                <textarea value={newTicket.content}
                  onChange={(e) => setNewTicket({...newTicket, content: e.target.value})}
                  rows={3}
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, resize: 'none' }}
                  placeholder="Mô tả phạm vi bảo hành, hạng mục..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 9, color: '#9E9E9E' }}>
                  {foundVehicle ? '✅ Sẽ gắn vào hồ sơ xe trong DB' : '⚠️ Chưa gắn xe — nhấn Tìm xe trước'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button"
                    onClick={() => { setShowAddModal(false); setFoundVehicle(null); setNewTicket(EMPTY_TICKET); }}
                    style={{ padding: '5px 12px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#333', fontSize: 11, cursor: 'pointer' }}>
                    Hủy
                  </button>
                  <button type="submit" disabled={savingTicket}
                    style={{ padding: '5px 18px', background: savingTicket ? '#BDBDBD' : '#E65100', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: savingTicket ? 'not-allowed' : 'pointer' }}>
                    {savingTicket ? '⏳ Đang lưu...' : '💾 Tạo & Lưu DB'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In phiếu bảo hành */}

      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: 650,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '10px 16px', background: '#E65100', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={16} /> IN PHIẾU BẢO HÀNH XE
              </div>
              <button onClick={() => setShowPrintModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, fontSize: 11, color: '#333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #E65100', paddingBottom: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#E65100' }}>KAZUKO AUTO SERVICE</div>
                  <div style={{ fontSize: 10, color: '#555' }}>825/15 Âu Cơ, Tân Sơn Nhì, Q.Tân Phú, TP.HCM</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Hotline: 0917 66 4444</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#E65100' }}>{selectedItem.id}</div>
                  <div style={{ fontSize: 9, color: '#777' }}>Ngày cấp: {selectedItem.startDate}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0 16px 0' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>PHIẾU CAM KẾT BẢO HÀNH</h2>
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Khách hàng:</b> {selectedItem.customer} &nbsp;|&nbsp; <b>SĐT:</b> {selectedItem.phone} &nbsp;|&nbsp; <b>Đ/c:</b> {selectedItem.address}
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Biển số:</b> <span style={{ color: '#E65100', fontWeight: 800 }}>{selectedItem.plate}</span> &nbsp;|&nbsp; <b>Xe:</b> {selectedItem.fullVehicle} ({selectedItem.year})
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Số khung:</b> {selectedItem.vin} &nbsp;|&nbsp; <b>Số máy:</b> {selectedItem.engine}
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Thời hạn bảo hành:</b> Từ {selectedItem.startDate} đến {selectedItem.endDate} (hoặc {selectedItem.warrantyKm})
              </div>
              <div style={{ padding: '6px 10px', background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 4, marginBottom: 16 }}>
                <b>Phạm vi bảo hành:</b> {selectedItem.content}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, padding: '0 20px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>ĐẠI DIỆN KHÁCH HÀNG</div>
                  <div style={{ fontSize: 9, color: '#777', fontStyle: 'italic', marginBottom: 40 }}>(Ký và ghi rõ họ tên)</div>
                  <div>{selectedItem.customer}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>ĐẠI DIỆN KAZUKO AUTO</div>
                  <div style={{ fontSize: 9, color: '#777', fontStyle: 'italic', marginBottom: 40 }}>(Ký và đóng dấu)</div>
                  <div>Giám đốc dịch vụ</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '8px 16px', background: '#F5F5F5', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowPrintModal(false)} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#333', fontSize: 11, cursor: 'pointer' }}>Đóng</button>
              <button onClick={() => openDocumentPrint({ type: 'MauPhieuBaoHanh', id: selectedItem?._raw?.ID })} style={{ padding: '6px 16px', background: '#E65100', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <Printer size={14} /> In phiếu ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
