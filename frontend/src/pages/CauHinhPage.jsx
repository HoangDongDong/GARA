import { useState } from 'react';
import {
  Settings, Building2, Sliders, Printer, Radio, Share2,
  Database, FileText, DollarSign, Calendar, Clock, Lock,
  Shield, UploadCloud, RefreshCw, Folder, Trash2, Eye,
  CheckCircle, ChevronRight, X, Camera, AlertCircle, HardDrive
} from 'lucide-react';

export default function CauHinhPage() {
  const [activeTab, setActiveTab] = useState('thong-tin-cong-ty');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 7 Tab trên cùng
  const tabs = [
    { id: 'thong-tin-cong-ty', label: 'Thông tin công ty', icon: Building2 },
    { id: 'thiet-lap-chung', label: 'Thiết lập chung', icon: Sliders },
    { id: 'in-an', label: 'In ấn & mẫu', icon: Printer },
    { id: 'ket-noi-thiet-bi', label: 'Kết nối thiết bị', icon: Radio },
    { id: 'tich-hop', label: 'Tích hợp', icon: Share2 },
    { id: 'sao-luu-phuc-hoi', label: 'Sao lưu & phục hồi', icon: Database },
    { id: 'nhat-ky-he-thong', label: 'Nhật ký hệ thống', icon: FileText }
  ];

  // Form State: Thông tin công ty
  const [companyInfo, setCompanyInfo] = useState({
    name: 'CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM',
    address: '925/15 Âu Cơ - P. Tân Sơn Nhì - TP.HCM',
    phone: '0917 66 4444 - 0967 04 1111',
    zalo: '0917664444',
    email: 'kazukovietnamcompany@gmail.com',
    website: 'https://kazukovietnam.com',
    facebook: 'kazukovietnam'
  });

  // Form State: Đơn vị tiền tệ & tỷ giá
  const [currency, setCurrency] = useState('VND');
  const [exchangeRate, setExchangeRate] = useState('1.00');
  const [rateUpdateDate, setRateUpdateDate] = useState('30/09/2025');

  // Form State: Thời gian & làm việc
  const [startDate, setStartDate] = useState('01/01/2025');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:30');
  const [offDay, setOffDay] = useState('Chủ nhật');
  const [autoShiftDay, setAutoShiftDay] = useState(true);

  // Form State: Cài đặt chung
  const [language, setLanguage] = useState('Tiếng Việt');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [timeFormat, setTimeFormat] = useState('HH:mm');
  const [gridRows, setGridRows] = useState('50');
  const [workMode, setWorkMode] = useState('Bình thường');
  const [allowEditLocked, setAllowEditLocked] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  // Form State: Kết nối cơ sở dữ liệu
  const [dbType, setDbType] = useState('SQL Server');
  const [dbServer, setDbServer] = useState('(local)');
  const [dbName, setDbName] = useState('KazukoAutoDB');
  const [dbUser, setDbUser] = useState('sa');
  const [dbPass, setDbPass] = useState('••••••••');
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Form State: Phân quyền & bảo mật
  const [adminPass, setAdminPass] = useState('••••••••');
  const [passExpireDays, setPassExpireDays] = useState('90');
  const [enable2FA, setEnable2FA] = useState(false);
  const [logLogin, setLogLogin] = useState(true);
  const [limitIp, setLimitIp] = useState(false);

  // Form State: Sao lưu dữ liệu
  const [backupDir, setBackupDir] = useState('D:\\KazukoAuto\\Backup');
  const [autoBackupPeriod, setAutoBackupPeriod] = useState('Hàng ngày');
  const [backupTime, setBackupTime] = useState('02:00');

  // Modal State
  const [modalTitle, setModalTitle] = useState('');
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(4px, 0.8vh, 10px)',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Toast thông báo */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 15,
          right: 15,
          background: '#2E7D32',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 600,
          fontSize: 12
        }}>
          <CheckCircle size={15} />
          {toastMessage}
        </div>
      )}

      {/* Header & 7 Tabs gọn 1 hàng */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 6,
        padding: 'clamp(4px, 0.6vh, 8px) 12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexShrink: 0
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: '#E65100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Settings size={14} />
          </div>
          <h1 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#212121' }}>
            Cấu hình hệ thống
          </h1>
        </div>

        {/* 7 Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          overflowX: 'auto',
          flexWrap: 'nowrap'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  showToast(`Chuyển cấu hình: ${tab.label}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? 'none' : '1px solid #DEDEDE',
                  background: isActive ? '#E65100' : 'white',
                  color: isActive ? 'white' : '#424242',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={12} color={isActive ? 'white' : '#616161'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hàng 1 (3 Cột): Thông tin công ty (Kèm Logo) | Đơn vị tiền tệ | Thời gian & làm việc (flex: 1.15) */}
      <div className="responsive-grid-3" style={{
        flex: 1.15,
        minHeight: 0
      }}>
        {/* Cột 1: Thông tin công ty (Form + Logo bên phải) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{
              width: 15,
              height: 15,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Building2 size={10} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Thông tin công ty</span>
          </div>

          <div className="responsive-grid-2" style={{ flex: 1, minHeight: 0 }}>
            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Tên công ty</span>
                <input
                  type="text"
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Địa chỉ</span>
                <input
                  type="text"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Điện thoại</span>
                <input
                  type="text"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Zalo</span>
                <input
                  type="text"
                  value={companyInfo.zalo}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, zalo: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Email</span>
                <input
                  type="text"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Website</span>
                <input
                  type="text"
                  value={companyInfo.website}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#616161' }}>Facebook</span>
                <input
                  type="text"
                  value={companyInfo.facebook}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, facebook: e.target.value })}
                  style={{ padding: 'clamp(1px, 0.3vh, 3px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>
            </div>

            {/* Logo Preview & Upload Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              {/* Logo Box */}
              <div style={{
                background: '#FAFAFA',
                border: '1px solid #EEEEEE',
                borderRadius: 4,
                padding: 'clamp(4px, 0.8vh, 10px) 8px',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: 'clamp(13px, 1.8vh, 16px)', fontWeight: 900, color: '#D32F2F', letterSpacing: 0.5 }}>
                  KAZUKO <span style={{ color: '#E65100', fontStyle: 'italic' }}>AUTO</span>
                </div>
                <div style={{ fontSize: 7.5, color: '#E65100', fontWeight: 600 }}>
                  Giải Pháp Công Nghệ - Nâng Tầm Quản Lý!
                </div>
              </div>

              {/* Upload Dashed Box */}
              <div
                onClick={() => showToast('Mở cửa sổ chọn logo công ty...')}
                style={{
                  border: '1px dashed #BDBDBD',
                  borderRadius: 4,
                  background: '#FCFCFC',
                  padding: 'clamp(6px, 1vh, 12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <Camera size={16} color="#757575" />
                <span style={{ fontSize: 9, fontWeight: 600, color: '#333', marginTop: 2 }}>Chọn logo công ty</span>
                <span style={{ fontSize: 7.5, color: '#888' }}>(PNG, JPG - 300x120)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột 2: Đơn vị tiền tệ & tỷ giá */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <DollarSign size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Đơn vị tiền tệ & tỷ giá</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.6vh, 6px)', fontSize: 9.5 }}>
              <div>
                <span style={{ color: '#616161', display: 'block', marginBottom: 1 }}>Loại tiền tệ</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(2px, 0.4vh, 4px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="VND">VND - Việt Nam Đồng</option>
                  <option value="USD">USD - Đô la Mỹ</option>
                </select>
              </div>

              <div>
                <span style={{ color: '#616161', display: 'block', marginBottom: 1 }}>Tỷ giá mặc định</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'clamp(2px, 0.4vh, 4px) 5px', background: '#FAFAFA', border: '1px solid #DEDEDE', borderRadius: 3 }}>
                  <span>1.00</span>
                  <span style={{ color: '#888' }}>1.00</span>
                </div>
              </div>

              <div>
                <span style={{ color: '#616161', display: 'block', marginBottom: 1 }}>Cập nhật tỷ giá</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={rateUpdateDate}
                    onChange={(e) => setRateUpdateDate(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(2px, 0.4vh, 4px) 20px clamp(2px, 0.4vh, 4px) 5px', fontSize: 9.5, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Calendar size={10} style={{ position: 'absolute', right: 5, color: '#757575' }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => showToast('Đã cập nhật tỷ giá ngoại tệ mới nhất')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: '#E65100',
              color: 'white',
              border: 'none',
              borderRadius: 3,
              padding: 'clamp(4px, 0.7vh, 8px)',
              fontSize: 9.5,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 2
            }}
          >
            <RefreshCw size={10} />
            Cập nhật tỷ giá
          </button>
        </div>

        {/* Cột 3: Thời gian & làm việc */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Calendar size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Thời gian & làm việc</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.6vh, 6px)', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Ngày bắt đầu làm việc</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(1.5px, 0.3vh, 3px) 18px clamp(1.5px, 0.3vh, 3px) 5px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Calendar size={9} style={{ position: 'absolute', right: 4, color: '#757575' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Giờ bắt đầu làm việc</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(1.5px, 0.3vh, 3px) 18px clamp(1.5px, 0.3vh, 3px) 5px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Clock size={9} style={{ position: 'absolute', right: 4, color: '#757575' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Giờ kết thúc làm việc</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(1.5px, 0.3vh, 3px) 18px clamp(1.5px, 0.3vh, 3px) 5px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Clock size={9} style={{ position: 'absolute', right: 4, color: '#757575' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Ngày nghỉ cố định</span>
                <select
                  value={offDay}
                  onChange={(e) => setOffDay(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1.5px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="Chủ nhật">Chủ nhật</option>
                  <option value="Thứ 7 & Chủ nhật">Thứ 7 & Chủ nhật</option>
                  <option value="Không nghỉ">Không nghỉ</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginTop: 1 }}>
                <input
                  type="checkbox"
                  checked={autoShiftDay}
                  onChange={(e) => setAutoShiftDay(e.target.checked)}
                  style={{ accentColor: '#E65100' }}
                />
                <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>Tự động chuyển ngày làm việc</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 2 (3 Cột): Cài đặt chung | Kết nối cơ sở dữ liệu | Phân quyền & bảo mật (flex: 1.25) */}
      <div className="responsive-grid-3" style={{
        flex: 1.25,
        minHeight: 0
      }}>
        {/* Cột 1: Cài đặt chung */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Settings size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Cài đặt chung</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2.5px, 0.5vh, 5px)', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Ngôn ngữ</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Định dạng ngày</span>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                  <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Định dạng giờ</span>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="HH:mm">HH:mm</option>
                  <option value="hh:mm a">hh:mm a</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Số dòng hiển thị (grid)</span>
                <select
                  value={gridRows}
                  onChange={(e) => setGridRows(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Chế độ làm việc</span>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="Bình thường">Bình thường</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginTop: 1 }}>
                <input
                  type="checkbox"
                  checked={allowEditLocked}
                  onChange={(e) => setAllowEditLocked(e.target.checked)}
                  style={{ accentColor: '#E65100' }}
                />
                <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>Cho phép sửa chứng từ đã khóa</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  style={{ accentColor: '#E65100' }}
                />
                <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>Tự động lưu dữ liệu</span>
              </label>
            </div>
          </div>
        </div>

        {/* Cột 2: Kết nối cơ sở dữ liệu */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Database size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Kết nối cơ sở dữ liệu</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 4px)', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Loại CSDL</span>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="SQL Server">SQL Server</option>
                  <option value="Firebird">Firebird (.FDB)</option>
                  <option value="MySQL">MySQL</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Máy chủ (Server)</span>
                <input
                  type="text"
                  value={dbServer}
                  onChange={(e) => setDbServer(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Tên CSDL</span>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Tài khoản</span>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Mật khẩu</span>
                <input
                  type="password"
                  value={dbPass}
                  onChange={(e) => setDbPass(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                />
              </div>
            </div>
          </div>

          {/* Buttons & Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <button
              onClick={() => {
                setIsDbConnected(true);
                showToast('Kết nối cơ sở dữ liệu thành công!');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#E65100',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                padding: 'clamp(3px, 0.5vh, 6px) 8px',
                fontSize: 9.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Radio size={10} />
              Kiểm tra kết nối
            </button>

            {isDbConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#2E7D32', fontSize: 9.5, fontWeight: 600 }}>
                <CheckCircle size={12} color="#2E7D32" />
                <span>Kết nối thành công</span>
              </div>
            )}
          </div>
        </div>

        {/* Cột 3: Phân quyền & bảo mật */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Shield size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Phân quyền & bảo mật</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 4px)', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Mật khẩu quản trị</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 18px clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Eye size={9} style={{ position: 'absolute', right: 4, color: '#757575', cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Thời gian hết hạn mật khẩu</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    value={passExpireDays}
                    onChange={(e) => setPassExpireDays(e.target.value)}
                    style={{ width: 40, padding: 'clamp(1px, 0.3vh, 3px) 3px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3, textAlign: 'center' }}
                  />
                  <span style={{ color: '#616161', fontSize: 9 }}>ngày</span>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginTop: 1 }}>
                <input
                  type="checkbox"
                  checked={enable2FA}
                  onChange={(e) => setEnable2FA(e.target.checked)}
                  style={{ accentColor: '#E65100' }}
                />
                <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>Bật xác thực 2 lớp (2FA)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={logLogin}
                  onChange={(e) => setLogLogin(e.target.checked)}
                  style={{ accentColor: '#E65100' }}
                />
                <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>Ghi log đăng nhập</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={limitIp}
                  onChange={(e) => setLimitIp(e.target.checked)}
                  style={{ accentColor: '#E65100' }}
                />
                <span style={{ fontSize: 9, whiteSpace: 'nowrap' }}>Giới hạn IP đăng nhập</span>
              </label>
            </div>
          </div>

          <button
            onClick={() => {
              setModalTitle('Quản lý phân quyền người dùng');
              setShowModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'white',
              color: '#D32F2F',
              border: '1px solid #FFCDD2',
              borderRadius: 3,
              padding: 'clamp(3px, 0.6vh, 6px) 8px',
              fontSize: 9.5,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4
            }}
          >
            👤 Quản lý người dùng
          </button>
        </div>
      </div>

      {/* Hàng 3 (3 Cột): Sao lưu dữ liệu | Phiên bản phần mềm | Khác (4 Ô) (flex: 0.95) */}
      <div className="responsive-grid-3" style={{
        flex: 0.95,
        minHeight: 0
      }}>
        {/* Cột 1: Sao lưu dữ liệu */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <UploadCloud size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Sao lưu dữ liệu</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 4px)', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Thư mục lưu backup</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={backupDir}
                    onChange={(e) => setBackupDir(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 18px clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Folder size={9} style={{ position: 'absolute', right: 4, color: '#757575', cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Tự động sao lưu</span>
                <select
                  value={autoBackupPeriod}
                  onChange={(e) => setAutoBackupPeriod(e.target.value)}
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                >
                  <option value="Hàng ngày">Hàng ngày</option>
                  <option value="Hàng tuần">Hàng tuần</option>
                  <option value="Hàng tháng">Hàng tháng</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Thời gian sao lưu</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={backupTime}
                    onChange={(e) => setBackupTime(e.target.value)}
                    style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 18px clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #DEDEDE', borderRadius: 3 }}
                  />
                  <Clock size={9} style={{ position: 'absolute', right: 4, color: '#757575' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 1 }}>
            <button
              onClick={() => showToast('Đang tiến hành sao lưu dữ liệu toàn diện...')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#E65100',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                padding: 'clamp(3px, 0.5vh, 6px) 8px',
                fontSize: 9.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Database size={10} />
              Sao lưu ngay
            </button>
          </div>
        </div>

        {/* Cột 2: Phiên bản phần mềm */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <div style={{
                width: 15,
                height: 15,
                borderRadius: 3,
                background: '#E65100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <AlertCircle size={10} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Phiên bản phần mềm</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 4px)', fontSize: 9.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Phiên bản hiện tại</span>
                <input
                  type="text"
                  value="v5.9.18.5"
                  readOnly
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #EEEEEE', borderRadius: 3, background: '#FAFAFA' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Ngày phát hành</span>
                <input
                  type="text"
                  value="30/09/2025"
                  readOnly
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #EEEEEE', borderRadius: 3, background: '#FAFAFA' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#616161' }}>Build</span>
                <input
                  type="text"
                  value="20250930.1428"
                  readOnly
                  style={{ width: '100%', padding: 'clamp(1px, 0.3vh, 3px) 4px', fontSize: 9, border: '1px solid #EEEEEE', borderRadius: 3, background: '#FAFAFA' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => showToast('Phần mềm đang ở phiên bản mới nhất (v5.9.18.5)')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'white',
              color: '#424242',
              border: '1px solid #DEDEDE',
              borderRadius: 3,
              padding: 'clamp(3px, 0.5vh, 6px) 8px',
              fontSize: 9.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={10} color="#E65100" />
            Kiểm tra cập nhật
          </button>
        </div>

        {/* Cột 3: Khác (4 Grid Action Tiles) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 6,
          padding: 'clamp(6px, 1vh, 10px) 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <div style={{
              width: 15,
              height: 15,
              borderRadius: 3,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Sliders size={10} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#212121' }}>Khác</span>
          </div>

          {/* 4 Tiles (2x2) */}
          <div className="responsive-grid-2" style={{
            gap: 4,
            flex: 1
          }}>
            {/* Tile 1: Khôi phục mặc định */}
            <div
              onClick={() => {
                setModalTitle('Khôi phục thiết lập mặc định');
                setShowModal(true);
              }}
              style={{
                background: '#FAFAFA',
                border: '1px solid #EEEEEE',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '3px'
              }}
            >
              <RefreshCw size={12} color="#D32F2F" />
              <span style={{ fontSize: 8.5, color: '#333', textAlign: 'center', marginTop: 1, fontWeight: 500 }}>
                Khôi phục mặc định
              </span>
            </div>

            {/* Tile 2: Nhập / Xuất dữ liệu */}
            <div
              onClick={() => {
                setModalTitle('Nhập / Xuất cấu hình dữ liệu');
                setShowModal(true);
              }}
              style={{
                background: '#FAFAFA',
                border: '1px solid #EEEEEE',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '3px'
              }}
            >
              <Folder size={12} color="#D32F2F" />
              <span style={{ fontSize: 8.5, color: '#333', textAlign: 'center', marginTop: 1, fontWeight: 500 }}>
                Nhập / Xuất dữ liệu
              </span>
            </div>

            {/* Tile 3: Xóa dữ liệu mẫu */}
            <div
              onClick={() => {
                setModalTitle('Xóa dữ liệu mẫu');
                setShowModal(true);
              }}
              style={{
                background: '#FAFAFA',
                border: '1px solid #EEEEEE',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '3px'
              }}
            >
              <Trash2 size={12} color="#D32F2F" />
              <span style={{ fontSize: 8.5, color: '#333', textAlign: 'center', marginTop: 1, fontWeight: 500 }}>
                Xóa dữ liệu mẫu
              </span>
            </div>

            {/* Tile 4: Cài đặt nâng cao */}
            <div
              onClick={() => {
                setModalTitle('Cài đặt hệ thống nâng cao');
                setShowModal(true);
              }}
              style={{
                background: '#FAFAFA',
                border: '1px solid #EEEEEE',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '3px'
              }}
            >
              <Sliders size={12} color="#D32F2F" />
              <span style={{ fontSize: 8.5, color: '#333', textAlign: 'center', marginTop: 1, fontWeight: 500 }}>
                Cài đặt nâng cao
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cấu hình tiện ích */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#E65100',
              color: 'white',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Settings size={16} />
                <span>{modalTitle}</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', fontSize: 12, color: '#333' }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Đang mở tác vụ: <strong>{modalTitle}</strong>. Thao tác này sẽ áp dụng thiết lập hệ thống cho toàn bộ chi nhánh của Kazuko Auto.
              </p>
              <div style={{ marginTop: 12, background: '#FAFAFA', padding: 10, borderRadius: 6, border: '1px solid #EEE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2E7D32', fontWeight: 600 }}>
                  <CheckCircle size={14} />
                  <span>Hệ thống đã sẵn sàng thực thi tác vụ.</span>
                </div>
              </div>
            </div>

            <div style={{
              background: '#FAFAFA',
              padding: '8px 16px',
              borderTop: '1px solid #EEEEEE',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  showToast(`Đã áp dụng: ${modalTitle}`);
                }}
                style={{
                  background: '#E65100',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#E0E0E0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 12px',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
