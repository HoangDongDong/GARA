import { useState, useEffect } from 'react';
import { 
  ClipboardList, User, Car, Activity, FileText, History, Notebook,
  Phone, Mail, MapPin, Search, Plus, Printer, Save, CheckCircle,
  FileSpreadsheet, X
} from 'lucide-react';
import axios from 'axios';

export default function TiepNhanXePage() {
  const [activeTab, setActiveTab] = useState('basic');
  const [historyTab, setHistoryTab] = useState('recent');
  const [toast, setToast] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [warrantyData, setWarrantyData] = useState([]);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [currentVehicleId, setCurrentVehicleId] = useState(null);

  // Danh sách khách hàng
  const [customerList, setCustomerList] = useState([
    { ID: 'kh001', NAME: 'Nguyễn Văn A', DIENTHOAI: '0901234567', DIACHI: '12 Lê Lợi, Q.1, TP.HCM', MASOTHUE: '0312456789' },
    { ID: 'kh002', NAME: 'Trần Thị B', DIENTHOAI: '0912345678', DIACHI: '45 Nguyễn Huệ, Q.1, TP.HCM', MASOTHUE: '0312345678' },
    { ID: 'kh003', NAME: 'Lê Văn C', DIENTHOAI: '0923456789', DIACHI: '78 Trần Hưng Đạo, Hoàn Kiếm, HN', MASOTHUE: '0313456789' },
    { ID: 'kh004', NAME: 'Phạm Thị D', DIENTHOAI: '0934567890', DIACHI: '99 Cách Mạng Tháng 8, Q.3, TP.HCM', MASOTHUE: '' },
    { ID: 'kh005', NAME: 'Hoàng Văn E', DIENTHOAI: '0945678901', DIACHI: '15 Phan Xích Long, Bình Thạnh, TP.HCM', MASOTHUE: '' },
    { ID: 'kh006', NAME: 'Nguyễn Văn Nam', DIENTHOAI: '0988123456', DIACHI: '123 Cách Mạng Tháng 8, P.10, Q.3, TP.HCM', MASOTHUE: '0312456789' }
  ]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('kh006');
  const selectedCustomer = customerList.find(c => (c.ID || c.id) === selectedCustomerId) || customerList[0] || {};

  // Khách hàng mới modal form
  const [newCustomer, setNewCustomer] = useState({
    NAME: '',
    DIENTHOAI: '',
    DIACHI: '',
    MASOTHUE: ''
  });

  // Dữ liệu xe
  const [vehicle, setVehicle] = useState({
    plate: '51H-123.45',
    brand: 'Toyota',
    model: 'Fortuner',
    version: '2.7AT 4x2',
    year: '2020',
    color: 'Trắng',
    vin: 'MR0KB8FSX00012345',
    engine: '2TR-A1234567',
    odo: '48,500',
    fuel: 'Dầu (60%)',
    condition: 'Bình thường',
    request: 'Xe kêu lạ khi tăng ga.'
  });

  // Dữ liệu tiếp nhận
  const [reception, setReception] = useState({
    ticketCode: 'TNX-20250930-001',
    checkinTime: '30/09/2025 14:28',
    advisor: 'Nguyễn Văn A',
    technician: 'Trần Văn B',
    statusText: 'Đang xử lý',
    creator: 'admin'
  });

  // Load danh sách khách hàng từ backend nếu có
  useEffect(() => {
    axios.get('http://localhost:4000/api/customers')
      .then(res => {
        if (res.data?.data && res.data.data.length > 0) {
          setCustomerList(res.data.data);
        }
      })
      .catch(err => {
        console.log('Using default customer list');
      });
  }, []);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper tinh trang thai bao hanh
  const getWarrantyStatus = (ngayKetThuc) => {
    if (!ngayKetThuc) return { label: 'Không xác định', color: '#9E9E9E', bg: '#F5F5F5' };
    const end = new Date(ngayKetThuc);
    const now = new Date();
    // Firebird NGAYKETTHUC co the bi sai neu null -> check nam hop le
    if (end.getFullYear() < 2000) return { label: 'Hết hạn', color: '#C62828', bg: '#FFEBEE' };
    const diffMs = end - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Hết hạn', color: '#C62828', bg: '#FFEBEE' };
    if (diffDays <= 30) return { label: `Còn ${diffDays} ngày`, color: '#E65100', bg: '#FFF3E0' };
    if (diffDays <= 90) return { label: `Còn ${diffDays} ngày`, color: '#F57C00', bg: '#FFF8E1' };
    return { label: 'Còn hiệu lực', color: '#2E7D32', bg: '#E8F5E9' };
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (date.getFullYear() < 2000) return 'Không xác định';
    return date.toLocaleDateString('vi-VN');
  };

  // Load bao hanh theo vehicle ID
  const loadWarrantyByVehicleId = async (vehicleId) => {
    if (!vehicleId) return;
    setWarrantyLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/vehicles/${vehicleId}/warranties`);
      setWarrantyData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      console.log('Warranty load error', e);
      setWarrantyData([]);
    } finally {
      setWarrantyLoading(false);
    }
  };

  // Tìm kiếm theo biển số xe
  const handleSearchVehicle = async () => {
    if (!vehicle.plate.trim()) {
      showToastMsg('Vui lòng nhập biển số xe', 'warning');
      return;
    }
    try {
      const res = await axios.get('http://localhost:4000/api/vehicles');
      const found = res.data.data?.find(v => 
        v.BIENSO?.toLowerCase().replace(/[-. ]/g, '') === vehicle.plate.toLowerCase().replace(/[-. ]/g, '')
      );
      if (found) {
        setVehicle(prev => ({
          ...prev,
          plate: found.BIENSO || prev.plate,
          brand: found.HANG_XE || prev.brand,
          model: found.DONG_XE || prev.model,
          year: found.NAMSANXUAT ? String(found.NAMSANXUAT) : prev.year,
          color: found.MAUXE || prev.color,
          vin: found.SOKHUNG || prev.vin,
          engine: found.SOMAY || prev.engine,
          odo: found.ODO ? Number(found.ODO).toLocaleString() : prev.odo,
          fuel: found.NHIENLIEU || prev.fuel
        }));
        if (found.DKHACHHANGID) {
          setSelectedCustomerId(found.DKHACHHANGID);
        }
        setCurrentVehicleId(found.ID);
        // Load bao hanh cua xe nay
        await loadWarrantyByVehicleId(found.ID);
        showToastMsg(`Đã tìm thấy xe ${found.BIENSO} của khách hàng ${found.TEN_KH || 'trong hệ thống'}!`);
        return;
      }
    } catch (e) {
      console.log('Search fallback', e);
    }
    setCurrentVehicleId(null);
    setWarrantyData([]);
    showToastMsg(`Biển số xe ${vehicle.plate} chưa có trong hệ thống, bạn có thể nhập mới.`, 'info');
  };

  // Thêm nhanh khách hàng mới
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    if (!newCustomer.NAME.trim() || !newCustomer.DIENTHOAI.trim()) {
      alert('Vui lòng nhập Họ tên và Số điện thoại khách hàng!');
      return;
    }
    const created = {
      ID: 'kh_' + Date.now(),
      ...newCustomer
    };
    setCustomerList(prev => [created, ...prev]);
    setSelectedCustomerId(created.ID);
    setShowAddCustomerModal(false);
    setNewCustomer({ NAME: '', DIENTHOAI: '', DIACHI: '', MASOTHUE: '' });
    showToastMsg(`Đã thêm khách hàng mới: ${created.NAME}`);
  };

  // Tạo phiếu mới
  const handleNewTicket = () => {
    const code = 'TNX-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    setReception(prev => ({
      ...prev,
      ticketCode: code,
      checkinTime: new Date().toLocaleString('vi-VN')
    }));
    setVehicle({
      plate: '',
      brand: 'Toyota',
      model: 'Vios',
      version: '1.5G',
      year: '2023',
      color: 'Trắng',
      vin: '',
      engine: '',
      odo: '0',
      fuel: 'Xăng (50%)',
      condition: 'Bình thường',
      request: ''
    });
    showToastMsg(`Đã tạo phiếu tiếp nhận mới: ${code}`);
  };

  // Lưu phiếu
  const handleSave = () => {
    if (!vehicle.plate.trim()) {
      showToastMsg('Vui lòng nhập Biển số xe!', 'error');
      return;
    }
    showToastMsg(`💾 Đã lưu thành công Phiếu tiếp nhận [${reception.ticketCode}] cho khách hàng ${selectedCustomer.NAME || ''}!`);
  };

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 9999,
          background: toast.type === 'error' ? '#D32F2F' : toast.type === 'warning' ? '#F57C00' : '#2E7D32',
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
      <div className="page-header" style={{ marginBottom: 4, flexShrink: 0 }}>
        <h1 style={{ fontSize: 14 }}>
          <span className="page-icon" style={{ color: '#E65100', width: 22, height: 22, fontSize: 12 }}>🏠</span>
          Tiếp nhận xe
        </h1>
        <div className="page-actions" style={{ flexWrap: 'wrap', gap: 4 }}>
          <button 
            className="btn" 
            onClick={handleNewTicket}
            style={{ background: '#E65100', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, fontWeight: 600, fontSize: 10, cursor: 'pointer' }}
          >
            + Tạo phiếu mới
          </button>
          <button 
            className="btn" 
            onClick={handleSave}
            style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}
          >
            💾 Lưu
          </button>
          <button 
            className="btn" 
            onClick={() => setShowPrintModal(true)}
            style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}
          >
            🖨️ In phiếu
          </button>
          <button 
            className="btn" 
            onClick={() => showToastMsg('Xuất file Excel thành công!')}
            style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}
          >
            📊 Xuất Excel
          </button>
          <button className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '4px 8px', borderRadius: 4, fontSize: 10 }}>...</button>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #E0E0E0', marginBottom: 4, background: 'white', padding: '0 16px', flexShrink: 0, overflowX: 'auto', minHeight: 24 }}>
        {[{id:'basic', label:'Thông tin cơ bản'}, {id:'images', label:'Hình ảnh & Video'}, {id:'history', label:'Lịch sử gần nhất'}, {id:'notes', label:'Ghi chú'}].map(t => (
          <div 
            key={t.id} 
            onClick={() => setActiveTab(t.id)}
            style={{ 
              padding: '4px 4px', 
              cursor: 'pointer', 
              fontSize: 11, 
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#E65100' : '#616161',
              borderBottom: activeTab === t.id ? '2px solid #E65100' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap'
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="responsive-2col" style={{ display: 'flex', gap: 6, flex: '1 0 auto', minWidth: 0 }}>
        
        {/* Left Area (Takes up remaining space) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, paddingRight: 4, flexShrink: 0 }}>
          
          {/* Top Row: 3 Cards */}
          <div className="responsive-2col tiepnhan-top-cards" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            
            {/* Card 1: Xe */}
            <div className="card" style={{ flex: 1.1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <div>
                  <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Biển số xe <span style={{color:'red'}}>*</span></label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input 
                      type="text" 
                      value={vehicle.plate} 
                      onChange={(e) => setVehicle({...vehicle, plate: e.target.value.toUpperCase()})}
                      style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, minWidth: 0, fontSize: 10, fontWeight: 700, color: '#E65100' }} 
                    />
                    <button 
                      type="button"
                      onClick={handleSearchVehicle}
                      style={{ background: '#E65100', color: 'white', border: 'none', borderRadius: 4, padding: '0 8px', fontSize: 9, fontWeight: 600, flexShrink: 0, cursor: 'pointer' }}
                    >
                      🔍 Tìm
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Hãng xe <span style={{color:'red'}}>*</span></label>
                  <select 
                    value={vehicle.brand} 
                    onChange={(e) => setVehicle({...vehicle, brand: e.target.value})}
                    style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }}
                  >
                    <option>Toyota</option>
                    <option>Honda</option>
                    <option>Hyundai</option>
                    <option>Kia</option>
                    <option>Mazda</option>
                    <option>Ford</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Dòng xe <span style={{color:'red'}}>*</span></label>
                  <select 
                    value={vehicle.model} 
                    onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
                    style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }}
                  >
                    <option>Fortuner</option>
                    <option>Innova</option>
                    <option>Vios</option>
                    <option>Camry</option>
                    <option>Corolla Cross</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Phiên bản</label>
                  <select 
                    value={vehicle.version} 
                    onChange={(e) => setVehicle({...vehicle, version: e.target.value})}
                    style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }}
                  >
                    <option>2.7AT 4x2</option>
                    <option>2.4MT 4x2</option>
                    <option>2.8AT 4x4</option>
                    <option>Legender</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Năm SX</label>
                    <select 
                      value={vehicle.year} 
                      onChange={(e) => setVehicle({...vehicle, year: e.target.value})}
                      style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }}
                    >
                      <option>2020</option>
                      <option>2021</option>
                      <option>2022</option>
                      <option>2023</option>
                      <option>2024</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Màu xe</label>
                    <select 
                      value={vehicle.color} 
                      onChange={(e) => setVehicle({...vehicle, color: e.target.value})}
                      style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }}
                    >
                      <option>Trắng</option>
                      <option>Đen</option>
                      <option>Bạc</option>
                      <option>Đỏ</option>
                      <option>Xám</option>
                    </select>
                  </div>
                </div>
                <div>
                   <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Số khung</label>
                   <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        value={vehicle.vin} 
                        onChange={(e) => setVehicle({...vehicle, vin: e.target.value})}
                        style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }} 
                      />
                   </div>
                </div>
                <div>
                   <label style={{ fontSize: 9, marginBottom: 1, display: 'block', fontWeight: 600 }}>Số máy</label>
                   <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        value={vehicle.engine} 
                        onChange={(e) => setVehicle({...vehicle, engine: e.target.value})}
                        style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }} 
                      />
                   </div>
                </div>
            </div>

            {/* Card 2: Tiep nhan (ĐÃ BỔ SUNG TRƯỜNG CHỌN KHÁCH HÀNG Ở ĐÂY) */}
            <div className="card" style={{ flex: 1.3, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, margin: '0 0 2px 0' }}>Thông tin tiếp nhận</h3>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0 }}>Vào xưởng <span style={{color:'red'}}>*</span></label>
                 <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <input 
                      type="text" 
                      value={reception.checkinTime} 
                      onChange={(e) => setReception({...reception, checkinTime: e.target.value})}
                      style={{ width: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 10 }} 
                    />
                 </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0 }}>Cố vấn DV <span style={{color:'red'}}>*</span></label>
                 <select 
                   value={reception.advisor} 
                   onChange={(e) => setReception({...reception, advisor: e.target.value})}
                   style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, minWidth: 0, fontSize: 10 }}
                 >
                   <option>Nguyễn Văn A</option>
                   <option>Lê Thị Mai</option>
                   <option>Phạm Văn Hùng</option>
                 </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0 }}>Kỹ thuật viên</label>
                 <select 
                   value={reception.technician} 
                   onChange={(e) => setReception({...reception, technician: e.target.value})}
                   style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, minWidth: 0, fontSize: 10 }}
                 >
                   <option>Trần Văn B</option>
                   <option>Hoàng Văn C</option>
                   <option>Vũ Đức Dũng</option>
                 </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0 }}>ODO <span style={{color:'red'}}>*</span></label>
                 <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <input 
                      type="text" 
                      value={vehicle.odo} 
                      onChange={(e) => setVehicle({...vehicle, odo: e.target.value})}
                      style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, minWidth: 0, fontSize: 10 }} 
                    />
                 </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0 }}>Nhiên liệu</label>
                 <select 
                   value={vehicle.fuel} 
                   onChange={(e) => setVehicle({...vehicle, fuel: e.target.value})}
                   style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, minWidth: 0, fontSize: 10 }}
                 >
                   <option>Dầu (60%)</option>
                   <option>Dầu (100%)</option>
                   <option>Dầu (25%)</option>
                   <option>Xăng (60%)</option>
                   <option>Xăng (100%)</option>
                   <option>Xăng (25%)</option>
                 </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0 }}>Tình trạng xe</label>
                 <select 
                   value={vehicle.condition} 
                   onChange={(e) => setVehicle({...vehicle, condition: e.target.value})}
                   style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, minWidth: 0, fontSize: 10 }}
                 >
                   <option>Bình thường</option>
                   <option>Trầy xước</option>
                   <option>Móp méo</option>
                   <option>Chết máy</option>
                 </select>
              </div>

              {/* TRƯỜNG CHỌN KHÁCH HÀNG (THEO ĐÚNG YÊU CẦU CỦA BẠN TẠI VỊ TRÍ NÀY) */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <label style={{ width: 100, fontSize: 9, margin: 0, fontWeight: 600, flexShrink: 0, color: '#E65100' }}>
                   Khách hàng <span style={{color:'red'}}>*</span>
                 </label>
                 <div style={{ flex: 1, display: 'flex', gap: 4, minWidth: 0 }}>
                    <select 
                      value={selectedCustomerId} 
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      style={{ flex: 1, padding: '2px 6px', border: '1px solid #E65100', borderRadius: 4, minWidth: 0, fontSize: 10, fontWeight: 600, background: '#FFF8E1' }}
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {customerList.map((c) => (
                        <option key={c.ID || c.id} value={c.ID || c.id}>
                          {c.NAME} - {c.DIENTHOAI} {c.DIACHI ? `(${c.DIACHI.split(',')[0]})` : ''}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      style={{ background: '#E65100', color: 'white', border: 'none', borderRadius: 4, padding: '0 10px', fontSize: 10, fontWeight: 700, flexShrink: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      title="Thêm khách hàng mới"
                    >
                      ＋ Thêm
                    </button>
                 </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1, flex: 1 }}>
                 <label style={{ fontSize: 9, margin: 0, fontWeight: 600 }}>Yêu cầu khách hàng</label>
                 <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                    <textarea 
                      value={vehicle.request} 
                      onChange={(e) => setVehicle({...vehicle, request: e.target.value})}
                      style={{ width: '100%', height: '100%', padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, resize: 'none', fontSize: 10 }}
                    />
                 </div>
              </div>
            </div>

            {/* Card 3: Hinh anh */}
            <div className="card" style={{ flex: 1.1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, margin: '0' }}>Hình ảnh tình trạng</h3>
              <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 50, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                 <img src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400" alt="Car" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 <div style={{ position: 'absolute', top: 2, left: 2, background: '#E65100', color: 'white', padding: '1px 3px', fontSize: 8, borderRadius: 2 }}>Ảnh chính</div>
              </div>
              <div style={{ display: 'flex', gap: 2, height: 26, flexShrink: 0 }}>
                {['Biển số', 'Trước xe', 'Sau xe', 'Nội thất', 'Trầy xước'].map((txt, i) => (
                   <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', minWidth: 0 }}>
                     <div style={{ width: '100%', flex: 1, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                        <img src={`https://images.unsplash.com/photo-${['1549317661-bd32c8ce0db2', '1533473359331-0135ef1b58bf', '1492144534655-ae79c964c9d7', '1514316454349-740a2fa3351f', '1580273916550-e323be2ae537'][i]}?auto=format&fit=crop&q=80&w=150`} alt={txt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                     <span style={{ fontSize: 7, textAlign: 'center', color: '#616161', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{txt}</span>
                   </div>
                ))}
              </div>
            </div>

          </div>

          {/* Lịch sử table card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, height: 'auto' }}>
            <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #E0E0E0', padding: '0 8px', background: '#FAFAFA', overflowX: 'auto', flexShrink: 0 }}>
              {[{id:'recent', label:'Lần sửa gần nhất', icon: '📝'}, {id:'parts', label:'Phụ tùng đã thay'}, {id:'warranty', label:'Bảo hành còn lại'}, {id:'history', label:'Lịch sử tiếp nhận'}].map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => setHistoryTab(t.id)}
                  style={{ 
                    padding: '4px 4px', 
                    cursor: 'pointer', 
                    fontSize: 10, 
                    fontWeight: historyTab === t.id ? 700 : 500,
                    color: historyTab === t.id ? '#E65100' : '#424242',
                    borderBottom: historyTab === t.id ? '2px solid #E65100' : '2px solid transparent',
                    marginBottom: -1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.icon && <span style={{ color: '#E65100' }}>{t.icon}</span>}
                  {t.label}
                </div>
              ))}
            </div>
            <div style={{ padding: 2, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {historyTab === 'warranty' ? (
                // ===== TAB BẢO HÀNH =====
                warrantyLoading ? (
                  <div style={{ padding: '12px 8px', textAlign: 'center', color: '#9E9E9E', fontSize: 10 }}>⏳ Đang tải dữ liệu bảo hành...</div>
                ) : !currentVehicleId ? (
                  <div style={{ padding: '12px 8px', textAlign: 'center', color: '#9E9E9E', fontSize: 10 }}>🔍 Tìm kiếm xe theo biển số để xem bảo hành.</div>
                ) : warrantyData.length === 0 ? (
                  <div style={{ padding: '12px 8px', textAlign: 'center', color: '#9E9E9E', fontSize: 10 }}>✅ Xe này không có phiếu bảo hành nào.</div>
                ) : (
                  <table className="table" style={{ border: 'none', margin: 0, minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Mã phiếu BH</th>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Hàng mục / Dịch vụ</th>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Phiếu SC</th>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Từ ngày</th>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Đến ngày</th>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Trạng thái</th>
                        <th style={{ padding: '2px 4px', fontSize: 9 }}>Kết quả xử lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warrantyData.map((bh) => {
                        const st = getWarrantyStatus(bh.NGAYKETTHUC);
                        return (
                          <tr key={bh.ID}>
                            <td style={{ padding: '2px 4px', fontSize: 9, fontWeight: 600, color: '#E65100' }}>{bh.NAME || '—'}</td>
                            <td style={{ padding: '2px 4px', fontSize: 9 }}>{bh.TEN_MATHANG || bh.TEN_DICHVU || '—'}</td>
                            <td style={{ padding: '2px 4px', fontSize: 9, color: '#1976D2' }}>{bh.SO_PHIEU || '—'}</td>
                            <td style={{ padding: '2px 4px', fontSize: 9 }}>{formatDate(bh.NGAYBATDAU)}</td>
                            <td style={{ padding: '2px 4px', fontSize: 9 }}>{formatDate(bh.NGAYKETTHUC)}</td>
                            <td style={{ padding: '2px 4px', fontSize: 9 }}>
                              <span style={{ background: st.bg, color: st.color, padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ padding: '2px 4px', fontSize: 9, color: '#757575' }}>{bh.KETQUAXULY || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                // ===== CÁC TAB KHÁC (giữ nguyên placeholder) =====
                <table className="table" style={{ border: 'none', margin: 0, minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>Ngày sửa</th>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>Biển số</th>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>ODO</th>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>Nội dung sửa chữa</th>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>Linh kiện thay</th>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>Chi phí</th>
                      <th style={{ padding: '2px 4px', fontSize: 9 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 4px', fontSize: 9 }}>15/08/2025</td>
                      <td style={{ padding: '2px 4px', fontSize: 9 }}>{vehicle.plate || '51H-123.45'}</td>
                      <td style={{ padding: '2px 4px', fontSize: 9 }}>42.000</td>
                      <td style={{ padding: '2px 4px', fontSize: 9 }}>Thay dầu, lọc gió</td>
                      <td style={{ padding: '2px 4px', fontSize: 9 }}>Dầu máy, lọc gió</td>
                      <td className="text-right" style={{ padding: '2px 4px', fontSize: 9 }}>3.500.000</td>
                      <td style={{ padding: '2px 4px', fontSize: 9 }}><span className="badge badge-success" style={{ fontSize: 8, padding: '1px 4px' }}>Hoàn thành</span></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          {/* Row 3 & 4: Danh sách hình ảnh + Summary (Left) & Phiếu tiếp nhận (Right) */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {/* Col A + Col B (flex: 2.4) */}
            <div style={{ flex: 2.4, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              {/* Danh sách hình ảnh card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, height: 'auto' }}>
                 <div style={{ padding: '2px 8px', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, flexShrink: 0 }}>
                    <h3 style={{ fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{color:'#E65100'}}>📝</span> Hình ảnh/Video</h3>
                    <div style={{ display: 'flex', gap: 2 }}>
                       <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #E65100', color: '#E65100', borderRadius: 4, fontSize: 8, padding: '1px 4px' }}>+ Ảnh</button>
                       <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #E65100', color: '#E65100', borderRadius: 4, fontSize: 8, padding: '1px 4px' }}>+ Video</button>
                    </div>
                 </div>
                 <div style={{ padding: '4px', display: 'flex', gap: 4, overflowX: 'auto', height: 60 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1, minWidth: 60, height: '100%' }}>
                       <div style={{ width: '100%', flex: 1, background: '#424242', borderRadius: 2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: 'white', fontWeight: 800, fontSize: 9 }}>{vehicle.plate || '51H-123.45'}</span>
                       </div>
                       <span style={{ fontSize: 8, color: '#616161' }}>Biển số xe</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1, minWidth: 60, height: '100%' }}>
                       <div style={{ width: '100%', flex: 1, background: '#e0e0e0', borderRadius: 2, position: 'relative' }}></div>
                       <span style={{ fontSize: 8, color: '#616161' }}>Toàn xe</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1, minWidth: 60, height: '100%' }}>
                       <div style={{ width: '100%', flex: 1, background: '#e0e0e0', borderRadius: 2, position: 'relative' }}></div>
                       <span style={{ fontSize: 8, color: '#616161' }}>Vị trí trầy</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1, minWidth: 60, height: '100%' }}>
                       <div style={{ width: '100%', flex: 1, background: '#e0e0e0', borderRadius: 2, position: 'relative' }}></div>
                       <span style={{ fontSize: 8, color: '#616161' }}>Nội thất</span>
                    </div>
                 </div>
              </div>
              
              {/* Summary Card */}
              <div className="card" style={{ background: '#FFF3E0', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, height: 'auto' }}>
                 <h3 style={{ fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{color:'#E65100'}}>📝</span> Tóm tắt</h3>
                 <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                   <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, minWidth: 90 }}>
                     <div style={{ fontSize: 14, color: '#E65100' }}>🔧</div>
                     <div>
                       <div style={{ fontSize: 8, color: '#757575' }}>Số lần sửa</div>
                       <div style={{ fontSize: 11, fontWeight: 700 }}>8 lần</div>
                     </div>
                   </div>
                   <div style={{ width: 1, background: '#FFE0B2', margin: '0 4px' }} className="hide-on-mobile"></div>
                   <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, minWidth: 100 }}>
                     <div style={{ fontSize: 14, color: '#E65100' }}>📄</div>
                     <div>
                       <div style={{ fontSize: 8, color: '#757575' }}>Chi phí</div>
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#E65100' }}>34.5M</div>
                     </div>
                   </div>
                   <div style={{ width: 1, background: '#FFE0B2', margin: '0 4px' }} className="hide-on-mobile"></div>
                   <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, minWidth: 90 }}>
                     <div style={{ fontSize: 14, color: '#E65100' }}>📦</div>
                     <div>
                       <div style={{ fontSize: 8, color: '#757575' }}>Linh kiện</div>
                       <div style={{ fontSize: 11, fontWeight: 700 }}>24 loại</div>
                     </div>
                   </div>
                   <div style={{ width: 1, background: '#FFE0B2', margin: '0 4px' }} className="hide-on-mobile"></div>
                   <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, minWidth: 100 }}>
                     <div style={{ fontSize: 14, color: '#E65100' }}>%</div>
                     <div>
                       <div style={{ fontSize: 8, color: '#757575' }}>Lần gần nhất</div>
                       <div style={{ fontSize: 11, fontWeight: 700 }}>15/08/2025</div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
            
            {/* Col C (flex: 1.1) */}
            <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ padding: '2px 8px', borderBottom: '1px solid #E0E0E0', minHeight: 22, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                   <h3 style={{ fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{color:'#E65100'}}>⏳</span> Trạng thái xử lý</h3>
                </div>
                <div style={{ padding: '4px 8px', flex: 1 }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                     <div style={{ display: 'flex', gap: 8 }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                         <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 6 }}>✓</div>
                         <div style={{ width: 2, flex: 1, background: '#4CAF50', margin: '1px 0', minHeight: 8 }}></div>
                       </div>
                       <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                         <div style={{ fontSize: 9, fontWeight: 700, color: '#424242' }}>Tiếp nhận xe</div>
                         <div style={{ fontSize: 8, color: '#9E9E9E' }}>14:28</div>
                       </div>
                     </div>
                     
                     <div style={{ display: 'flex', gap: 8 }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                         <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF9800' }}></div>
                         <div style={{ width: 2, flex: 1, background: '#E0E0E0', margin: '1px 0', minHeight: 8 }}></div>
                       </div>
                       <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
                         <div style={{ fontSize: 9, fontWeight: 700, color: '#FF9800' }}>Kiểm tra</div>
                         <div><span className="badge" style={{ background: '#FFF3E0', color: '#E65100', fontSize: 8, marginTop: 1, padding: '1px 4px' }}>Đang xử lý</span></div>
                       </div>
                     </div>

                     <div style={{ display: 'flex', gap: 8 }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                         <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E0E0E0' }}></div>
                         <div style={{ width: 2, flex: 1, background: '#E0E0E0', margin: '1px 0', minHeight: 8 }}></div>
                       </div>
                       <div style={{ flex: 1, color: '#9E9E9E' }}>
                         <div style={{ fontSize: 9, fontWeight: 500 }}>Báo giá</div>
                       </div>
                     </div>

                     <div style={{ display: 'flex', gap: 8 }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                         <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E0E0E0' }}></div>
                         <div style={{ width: 2, flex: 1, background: '#E0E0E0', margin: '1px 0', minHeight: 8 }}></div>
                       </div>
                       <div style={{ flex: 1, color: '#9E9E9E' }}>
                         <div style={{ fontSize: 9, fontWeight: 500 }}>Sửa chữa</div>
                       </div>
                     </div>
                     
                     <div style={{ display: 'flex', gap: 8 }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                         <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E0E0E0' }}></div>
                       </div>
                       <div style={{ flex: 1, color: '#9E9E9E' }}>
                         <div style={{ fontSize: 9, fontWeight: 500 }}>Nghiệm thu</div>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Sidebar (Fixed width on large screens) */}
        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, paddingRight: 4 }}>
          
          <div className="card">
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0' }}>
               <h3 style={{ fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{color:'#F44336'}}>📄</span> Thông tin xe</h3>
            </div>
            <div style={{ padding: '4px 8px' }}>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Biển số:</div><div className="detail-value" style={{ fontWeight: 700, fontSize: 9 }}>{vehicle.plate || '51H-123.45'}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Hãng xe:</div><div className="detail-value" style={{ fontSize: 9 }}>{vehicle.brand}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Dòng xe:</div><div className="detail-value" style={{ fontSize: 9 }}>{vehicle.model}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Năm SX:</div><div className="detail-value" style={{ fontSize: 9 }}>{vehicle.year}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Màu xe:</div><div className="detail-value" style={{ fontSize: 9 }}>{vehicle.color}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>ODO:</div><div className="detail-value" style={{ fontWeight: 600, fontSize: 9 }}>{vehicle.odo} km</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Nhiên liệu:</div><div className="detail-value" style={{ fontSize: 9 }}>{vehicle.fuel}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Số khung:</div><div className="detail-value" style={{ fontSize: 8 }}>{vehicle.vin}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, color: '#E65100', fontWeight: 600, fontSize: 9 }}>Số máy:</div><div className="detail-value" style={{ fontSize: 8 }}>{vehicle.engine}</div></div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0' }}>
               <h3 style={{ fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{color:'#F44336'}}>🚗</span> Trạng thái</h3>
            </div>
            <div style={{ padding: '4px 8px', display: 'flex', justifyContent: 'center' }}>
               <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '2px 8px', fontSize: 9, border: '1px solid #C8E6C9', borderRadius: 16, fontWeight: 600 }}>✔️ Đang sử dụng</span>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0' }}>
               <h3 style={{ fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{color:'#E65100'}}>📝</span> Phiếu tiếp nhận</h3>
            </div>
            <div style={{ padding: '4px 8px' }}>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, fontSize: 9 }}>Mã phiếu</div><div className="detail-value" style={{ color: '#E65100', fontWeight: 600, fontSize: 9 }}>{reception.ticketCode}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}>
                <div className="detail-label" style={{ width: 60, fontSize: 9 }}>Khách hàng</div>
                <div className="detail-value" style={{ fontWeight: 600, fontSize: 9, color: '#1976D2' }}>
                  {selectedCustomer.NAME || '-'}
                </div>
              </div>
              <div className="detail-row" style={{ padding: '1px 0' }}>
                <div className="detail-label" style={{ width: 60, fontSize: 9 }}>Điện thoại</div>
                <div className="detail-value" style={{ fontSize: 9 }}>
                  {selectedCustomer.DIENTHOAI || '-'}
                </div>
              </div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, fontSize: 9 }}>Ngày tạo</div><div className="detail-value" style={{ fontSize: 9 }}>{reception.checkinTime}</div></div>
              <div className="detail-row" style={{ padding: '1px 0' }}><div className="detail-label" style={{ width: 60, fontSize: 9 }}>Người tạo</div><div className="detail-value" style={{ fontSize: 9 }}>{reception.creator}</div></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button 
              onClick={() => setShowPrintModal(true)}
              style={{ flex: 1.2, background: '#E65100', color: 'white', padding: '6px 2px', borderRadius: 4, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9, cursor: 'pointer' }}
            >
              🖨️ In phiếu
            </button>
            <button 
              onClick={handleSave}
              style={{ flex: 1.2, background: 'white', color: '#E65100', border: '1px solid #E65100', padding: '6px 2px', borderRadius: 4, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 9, cursor: 'pointer' }}
            >
              🔧 Chuyển sửa chữa
            </button>
            <button 
              onClick={() => window.history.back()}
              style={{ flex: 1, background: 'white', border: '1px solid #E0E0E0', padding: '6px 2px', borderRadius: 4, fontWeight: 500, fontSize: 9, cursor: 'pointer' }}
            >
              Quay lại
            </button>
          </div>

        </div>
      </div>

      {/* Modal Thêm Nhanh Khách Hàng */}
      {showAddCustomerModal && (
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
          <div style={{ background: 'white', borderRadius: 8, width: 400, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '10px 14px', background: '#E65100', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>+ THÊM KHÁCH HÀNG MỚI</div>
              <button onClick={() => setShowAddCustomerModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddCustomerSubmit} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Tên khách hàng <span style={{color:'red'}}>*</span></label>
                <input 
                  type="text" 
                  value={newCustomer.NAME} 
                  onChange={(e) => setNewCustomer({...newCustomer, NAME: e.target.value})}
                  placeholder="Họ và tên chủ xe..." 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                  required 
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Số điện thoại <span style={{color:'red'}}>*</span></label>
                <input 
                  type="text" 
                  value={newCustomer.DIENTHOAI} 
                  onChange={(e) => setNewCustomer({...newCustomer, DIENTHOAI: e.target.value})}
                  placeholder="09xx xxx xxx" 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                  required 
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Địa chỉ</label>
                <input 
                  type="text" 
                  value={newCustomer.DIACHI} 
                  onChange={(e) => setNewCustomer({...newCustomer, DIACHI: e.target.value})}
                  placeholder="Số nhà, đường, quận/huyện..." 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 2 }}>Mã số thuế / CCCD</label>
                <input 
                  type="text" 
                  value={newCustomer.MASOTHUE} 
                  onChange={(e) => setNewCustomer({...newCustomer, MASOTHUE: e.target.value})}
                  placeholder="Mã số thuế (nếu có)..." 
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddCustomerModal(false)}
                  style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: 4, background: 'white', fontSize: 11, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  style={{ padding: '4px 14px', background: '#E65100', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Lưu khách hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In Phiếu */}
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
            maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '10px 16px', background: '#E65100', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={16} /> PHIẾU TIẾP NHẬN XE
              </div>
              <button onClick={() => setShowPrintModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, fontSize: 11, color: '#333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #E65100', paddingBottom: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#E65100' }}>KAZUKO AUTO SERVICE</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Đ/c: 825/15 Âu Cơ, Tân Sơn Nhì, Q.Tân Phú, TP.HCM</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Hotline: 0917 66 4444</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#E65100' }}>MÃ: {reception.ticketCode}</div>
                  <div style={{ fontSize: 9, color: '#777' }}>Ngày vào: {reception.checkinTime}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0 16px 0' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>PHIẾU TIẾP NHẬN XE</h2>
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>Khách hàng:</b> {selectedCustomer.NAME} &nbsp;|&nbsp; <b>SĐT:</b> {selectedCustomer.DIENTHOAI} &nbsp;|&nbsp; <b>Đ/c:</b> {selectedCustomer.DIACHI}
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>Biển số xe:</b> <span style={{ color: '#E65100', fontWeight: 800 }}>{vehicle.plate}</span> &nbsp;|&nbsp; <b>Xe:</b> {vehicle.brand} {vehicle.model} ({vehicle.version}) - ODO: {vehicle.odo} km
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>Yêu cầu khách hàng:</b> {vehicle.request || '(Không có)'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, padding: '0 20px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>KHÁCH HÀNG</div>
                  <div style={{ fontSize: 9, color: '#777', fontStyle: 'italic', marginBottom: 40 }}>(Ký và ghi rõ họ tên)</div>
                  <div>{selectedCustomer.NAME}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>CỐ VẤN DỊCH VỤ</div>
                  <div style={{ fontSize: 9, color: '#777', fontStyle: 'italic', marginBottom: 40 }}>(Ký và ghi rõ họ tên)</div>
                  <div>{reception.advisor}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '8px 16px', background: '#F5F5F5', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowPrintModal(false)} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: 4, background: 'white', fontSize: 11, cursor: 'pointer' }}>Đóng</button>
              <button onClick={() => window.print()} style={{ padding: '6px 16px', background: '#E65100', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <Printer size={14} /> In phiếu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
