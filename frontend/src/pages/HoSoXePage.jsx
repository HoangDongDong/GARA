import { useState, useRef, useEffect } from 'react';
import { 
  Car, Search, FileSpreadsheet, Plus, MoreHorizontal, FileText, ClipboardList,
  User, Building2, History, Image as ImageIcon, Calendar, Edit3, Printer, Edit, Trash2, Tag,
  Wrench, Shield, CheckCircle, Copy, ChevronRight, ChevronDown, X, Eye, Download, AlertTriangle, Check, Clock, Award, FileCheck, Filter, ArrowRight
} from 'lucide-react';
import { customers, vehicles } from '../services';
import VehicleProfileModal from '../components/VehicleProfileModal';
import './HoSoXePage.css';

// CƠ SỞ DỮ LIỆU ĐA XE THEO BIỂN SỐ XE
const VEHICLES_DATABASE = [
  {
    plate: '51A-123.45',
    modelName: 'TOYOTA FORTUNER 2.4G (AT)',
    brand: 'Toyota',
    model: 'Fortuner',
    variant: '2.4G (AT)',
    year: '2020',
    color: 'Trắng',
    fuel: 'Dầu',
    vin: 'MROBA3FSX00123456',
    engine: '2GD1234567',
    odo: '56.780 km',
    status: 'Đang hoạt động',
    statusColor: '#2E7D32',
    statusBg: '#E8F5E9',
    owner: {
      name: 'Nguyễn Văn A',
      phone: '0903 123 456',
      email: 'nguyenvana@gmail.com',
      address: '123 Lê Lợi, Q.1, TP.HCM',
      note: 'Khách hàng thân thiết'
    },
    company: {
      name: 'Công ty TNHH Phụ Tùng A',
      taxCode: '0312345678',
      address: '123 Lê Lợi, Q.1, TP.HCM',
      phone: '0903 123 456',
      contact: 'Nguyễn Văn A'
    },
    ownerHistory: [
      { period: '2020 - Hiện tại', name: 'Nguyễn Văn A (Chủ hiện tại)', active: true },
      { period: '2019 - 2020', name: 'Trần Văn B', active: false },
      { period: '2018 - 2019', name: 'Lê Thị C', active: false }
    ],
    avatar: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&auto=format&fit=crop&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514316454349-740a2fa3351f?w=80&auto=format&fit=crop&q=80'
    ],
    repairs: [
      {
        id: 'SC-20250915-01',
        date: '15/09/2025',
        dateOut: '16/09/2025',
        plate: '51A-123.45',
        odo: '56.780 km',
        service: 'Bảo dưỡng định kỳ 55.000 km + Thay dầu máy & lọc dầu',
        tech: 'Nguyễn Văn Minh',
        advisor: 'Lê Thanh Tuấn',
        partCost: 2150000,
        laborCost: 1350000,
        total: 3500000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Dầu động cơ Castrol Magnatec 5W-30 (5L)', 'Lọc dầu chính hãng Toyota', 'Vệ sinh 4 cụm phanh', 'Công bảo dưỡng định kỳ']
      },
      {
        id: 'SC-20250820-03',
        date: '20/08/2025',
        dateOut: '20/08/2025',
        plate: '51A-123.45',
        odo: '52.300 km',
        service: 'Thay dầu nhớt động cơ + lọc nhớt + kiểm tra gầm',
        tech: 'Trần Văn Cường',
        advisor: 'Lê Thanh Tuấn',
        partCost: 950000,
        laborCost: 250000,
        total: 1200000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Dầu nhớt Mobil 1 (5L)', 'Lọc dầu Toyota', 'Công thay dầu & kiểm tra gầm']
      },
      {
        id: 'SC-20250710-02',
        date: '10/07/2025',
        dateOut: '10/07/2025',
        plate: '51A-123.45',
        odo: '48.150 km',
        service: 'Kiểm tra tiếng kêu phanh + Láng đĩa phanh trước',
        tech: 'Nguyễn Văn Minh',
        advisor: 'Phạm Hồng Đức',
        partCost: 350000,
        laborCost: 600000,
        total: 950000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Vật tư phụ gia dưỡng phanh', 'Công láng 2 đĩa phanh trước', 'Công tháo lắp kiểm tra']
      },
      {
        id: 'SC-20250605-01',
        date: '05/06/2025',
        dateOut: '05/06/2025',
        plate: '51A-123.45',
        odo: '44.200 km',
        service: 'Thay lọc gió động cơ & lọc gió điều hòa',
        tech: 'Lê Quốc Huy',
        advisor: 'Phạm Hồng Đức',
        partCost: 530000,
        laborCost: 150000,
        total: 680000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Lọc gió động cơ Toyota Fortuner', 'Lọc gió điều hòa than hoạt tính']
      }
    ],
    replacedParts: [
      { id: 'PT-01', date: '15/09/2025', code: '04152-YZZA1', name: 'Lọc dầu động cơ Fortuner Diesel', qty: 1, unit: 'Cái', price: 180000, total: 180000, odo: '56.780 km', repairId: 'SC-20250915-01', warranty: '6 tháng / 10.000 km', warrantyStatus: 'active' },
      { id: 'PT-02', date: '15/09/2025', code: 'CAS-5W30-4L', name: 'Dầu nhờn Castrol Magnatec Stop-Start 5W-30 (Can 4L)', qty: 1, unit: 'Can', price: 820000, total: 820000, odo: '56.780 km', repairId: 'SC-20250915-01', warranty: 'Theo chu kỳ bảo dưỡng', warrantyStatus: 'active' },
      { id: 'PT-03', date: '20/08/2025', code: '04465-0K360', name: 'Bộ má phanh trước Fortuner chính hãng', qty: 1, unit: 'Bộ', price: 1450000, total: 1450000, odo: '52.300 km', repairId: 'SC-20250820-03', warranty: '12 tháng / 20.000 km', warrantyStatus: 'active' },
      { id: 'PT-04', date: '05/06/2025', code: '17801-0L040', name: 'Lọc gió động cơ Toyota Fortuner', qty: 1, unit: 'Cái', price: 270000, total: 270000, odo: '44.200 km', repairId: 'SC-20250605-01', warranty: '6 tháng', warrantyStatus: 'expired' }
    ],
    warranties: [
      { id: 'BH-2025-001', item: 'Ắc quy GS 12V 65Ah', type: 'Phụ tùng thay thế', startDate: '12/03/2025', endDate: '12/03/2026', duration: '12 tháng', odoStart: '40.000 km', odoLimit: 'Không giới hạn km', status: 'Còn hiệu lực', daysLeft: 'Còn 163 ngày', supplier: 'Cty TNHH Ắc Quy GS Việt Nam', note: 'Bảo hành sụt áp, chết cọc do lỗi nhà sản xuất.' },
      { id: 'BH-2025-002', item: 'Bố thắng trước Fortuner', type: 'Hệ thống phanh', startDate: '20/08/2025', endDate: '20/02/2026', duration: '6 tháng', odoStart: '52.300 km', odoLimit: '62.300 km (10.000 km)', status: 'Còn hiệu lực', daysLeft: 'Còn 142 ngày', supplier: 'Kazuko Auto Parts', note: 'Bảo hành nứt vỡ má phanh, kêu bất thường.' }
    ],
    media: [
      { id: 1, title: 'Toàn cảnh xe góc trước bên lái', category: 'truoc', date: '15/09/2025 08:30', odo: '56.780 km', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80' },
      { id: 2, title: 'Vết xước nhẹ mép cản trước phụ', category: 'truoc', date: '15/09/2025 08:35', odo: '56.780 km', url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=80' },
      { id: 3, title: 'Xả dầu máy & thay thế lọc dầu mới', category: 'trong', date: '15/09/2025 11:00', odo: '56.780 km', url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&auto=format&fit=crop&q=80' },
      { id: 4, title: 'Xe sẵn sàng bàn giao tại khu giao xe', category: 'sau', date: '16/09/2025 16:00', odo: '56.780 km', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80' }
    ],
    notes: [
      { id: 1, priority: 'urgent', author: 'Cố vấn Tuấn', date: '15/09/2025 09:30', content: 'LƯU Ý ĐẶC BIỆT: Khách thường xuyên chở hàng nặng tuyến Tây Nguyên, kiểm tra độ chùng nhíp sau và độ rơ rotuyn cân bằng mỗi đợt bảo dưỡng.' },
      { id: 2, priority: 'warning', author: 'KTV Minh', date: '15/09/2025 15:45', content: 'Nhắc hẹn mốc 60.000 km: Khách đồng ý thay dầu hộp số tự động tuần hoàn và thay lọc nhiên liệu diezen chính hãng.' },
      { id: 3, priority: 'info', author: 'Admin', date: '10/01/2025 16:00', content: 'Chủ xe ưu tiên dùng nhớt Castrol Magnatec hoặc Mobil 1. Khách quen của xưởng, áp dụng chiết khấu phụ tùng 5%.' }
    ]
  },
  {
    plate: '30H-987.65',
    modelName: 'HONDA CR-V 1.5L TURBO (L)',
    brand: 'Honda',
    model: 'CR-V',
    variant: '1.5L Turbo (L)',
    year: '2022',
    color: 'Đen Ánh Độc Tôn',
    fuel: 'Xăng',
    vin: 'RLHRL2870NY102948',
    engine: 'L15BG998811',
    odo: '34.200 km',
    status: 'Đang bảo dưỡng',
    statusColor: '#E65100',
    statusBg: '#FFF3E0',
    owner: {
      name: 'Trần Văn Bình',
      phone: '0912 888 999',
      email: 'binh.tran@xaydungbinhan.vn',
      address: '45 Nguyễn Chí Thanh, Ba Đình, Hà Nội',
      note: 'Khách VIP - Doanh nghiệp'
    },
    company: {
      name: 'Cty CP Xây Dựng Bình An',
      taxCode: '0108765432',
      address: 'Tầng 8, Tòa nhà Landmark, Hà Nội',
      phone: '024 3888 9999',
      contact: 'Trần Văn Bình (GĐ)'
    },
    ownerHistory: [
      { period: '2022 - Hiện tại', name: 'Trần Văn Bình (Chủ hiện tại)', active: true }
    ],
    avatar: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&auto=format&fit=crop&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=80&auto=format&fit=crop&q=80'
    ],
    repairs: [
      {
        id: 'SC-20250928-02',
        date: '28/09/2025',
        dateOut: '29/09/2025',
        plate: '30H-987.65',
        odo: '34.200 km',
        service: 'Bảo dưỡng định kỳ 30.000 km + Thay dầu Honda Ultra Leo 0W-20',
        tech: 'Hoàng Văn Thái',
        advisor: 'Nguyễn Văn Minh',
        partCost: 1850000,
        laborCost: 650000,
        total: 2500000,
        status: 'Đang bảo dưỡng',
        paymentStatus: 'Chờ thanh toán',
        items: ['Dầu động cơ tổng hợp Honda Ultra Leo 0W-20 (4L)', 'Lọc nhớt chính hãng Honda', 'Vệ sinh họng ga & kim phun xăng điện tử', 'Kiểm tra ắc quy & hệ thống gầm']
      },
      {
        id: 'SC-20250412-01',
        date: '12/04/2025',
        dateOut: '12/04/2025',
        plate: '30H-987.65',
        odo: '25.000 km',
        service: 'Thay má phanh sau & đảo lốp cân mâm bấm chì',
        tech: 'Hoàng Văn Thái',
        advisor: 'Nguyễn Văn Minh',
        partCost: 1200000,
        laborCost: 400000,
        total: 1600000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Bộ má phanh sau Honda CR-V', 'Cân mâm bấm chì 4 bánh xe']
      }
    ],
    replacedParts: [
      { id: 'PT-CRV-01', date: '28/09/2025', code: '15400-RTA-003', name: 'Lọc dầu nhớt động cơ Honda CR-V Turbo', qty: 1, unit: 'Cái', price: 160000, total: 160000, odo: '34.200 km', repairId: 'SC-20250928-02', warranty: '6 tháng', warrantyStatus: 'active' },
      { id: 'PT-CRV-02', date: '28/09/2025', code: '08217-99974', name: 'Dầu động cơ Honda SN 0W-20 (Can 4L)', qty: 1, unit: 'Can', price: 920000, total: 920000, odo: '34.200 km', repairId: 'SC-20250928-02', warranty: 'Theo chu kỳ', warrantyStatus: 'active' },
      { id: 'PT-CRV-03', date: '12/04/2025', code: '43022-TLA-A01', name: 'Bộ má phanh sau Honda CR-V Turbo', qty: 1, unit: 'Bộ', price: 1200000, total: 1200000, odo: '25.000 km', repairId: 'SC-20250412-01', warranty: '12 tháng / 20.000 km', warrantyStatus: 'active' }
    ],
    warranties: [
      { id: 'BH-CRV-001', item: 'Bộ má phanh sau Honda CR-V', type: 'Hệ thống phanh', startDate: '12/04/2025', endDate: '12/04/2026', duration: '12 tháng', odoStart: '25.000 km', odoLimit: '45.000 km (20.000 km)', status: 'Còn hiệu lực', daysLeft: 'Còn 194 ngày', supplier: 'Honda Việt Nam', note: 'Bảo hành mòn không đều, kêu rít má phanh.' }
    ],
    media: [
      { id: 101, title: 'Đầu xe Honda CR-V tại cầu nâng', category: 'trong', date: '28/09/2025 09:15', odo: '34.200 km', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80' },
      { id: 102, title: 'Kiểm tra họng nạp động cơ 1.5L VTEC Turbo', category: 'trong', date: '28/09/2025 10:40', odo: '34.200 km', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80' }
    ],
    notes: [
      { id: 201, priority: 'info', author: 'Cố vấn Minh', date: '28/09/2025 09:00', content: 'Khách hàng có thẻ thành viên Gold của Kazuko, giảm 10% công thợ bảo dưỡng.' },
      { id: 202, priority: 'warning', author: 'KTV Thái', date: '28/09/2025 11:20', content: 'Gạt mưa trước bắt đầu có hiện tượng để lại vệt nước, đã tư vấn khách thay ở lần sau.' }
    ]
  },
  {
    plate: '60C-555.88',
    modelName: 'FORD RANGER WILDTRAK 2.0L BI-TURBO 4X4',
    brand: 'Ford',
    model: 'Ranger Wildtrak',
    variant: '2.0L 4x4 (AT)',
    year: '2021',
    color: 'Vàng Cam (Saber)',
    fuel: 'Dầu',
    vin: 'MNBUMF820MW543210',
    engine: 'YN2X887766',
    odo: '82.500 km',
    status: 'Chờ giao xe',
    statusColor: '#1565C0',
    statusBg: '#E3F2FD',
    owner: {
      name: 'Lê Hoàng Nam',
      phone: '0988 777 666',
      email: 'nam.le@namphatlogistics.com',
      address: '78 Xa Lộ Hà Nội, Biên Hòa, Đồng Nai',
      note: 'Xe chạy công trình & chở hàng liên tỉnh'
    },
    company: {
      name: 'Cty TNHH Vận Tải Nam Phát',
      taxCode: '3602468102',
      address: 'KCN Biên Hòa 2, Đồng Nai',
      phone: '0251 3999 888',
      contact: 'Lê Hoàng Nam (Chủ xe)'
    },
    ownerHistory: [
      { period: '2021 - Hiện tại', name: 'Lê Hoàng Nam (Chủ hiện tại)', active: true }
    ],
    avatar: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&auto=format&fit=crop&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=80&auto=format&fit=crop&q=80'
    ],
    repairs: [
      {
        id: 'SC-20250920-04',
        date: '20/09/2025',
        dateOut: '22/09/2025',
        plate: '60C-555.88',
        odo: '82.500 km',
        service: 'Đại tu bảo dưỡng gầm + Thay rotuyn cân bằng + Cân chỉnh góc đặt bánh xe 3D',
        tech: 'Vũ Đức Thịnh',
        advisor: 'Lê Thanh Tuấn',
        partCost: 4600000,
        laborCost: 1800000,
        total: 6400000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Đôi rotuyn cân bằng trước Ford chính hãng', 'Cao su càng A trên & dưới', 'Cân chỉnh góc đặt bánh xe công nghệ 3D Hunter', 'Công tháo ép cao su & lắp đặt']
      }
    ],
    replacedParts: [
      { id: 'PT-FR-01', date: '20/09/2025', code: 'EB3C-3B438-AA', name: 'Rô tuyn cân bằng trước Ford Ranger Wildtrak', qty: 2, unit: 'Cây', price: 950000, total: 1900000, odo: '82.500 km', repairId: 'SC-20250920-04', warranty: '12 tháng / 20.000 km', warrantyStatus: 'active' },
      { id: 'PT-FR-02', date: '20/09/2025', code: 'UC2R-34-470', name: 'Bộ cao su càng A trên dưới Ranger 2.0 Bi-Turbo', qty: 1, unit: 'Bộ', price: 2700000, total: 2700000, odo: '82.500 km', repairId: 'SC-20250920-04', warranty: '12 tháng', warrantyStatus: 'active' }
    ],
    warranties: [
      { id: 'BH-FR-001', item: 'Cụm rotuyn & cao su càng A Ranger', type: 'Hệ thống treo & gầm', startDate: '22/09/2025', endDate: '22/09/2026', duration: '12 tháng', odoStart: '82.500 km', odoLimit: '102.500 km (20.000 km)', status: 'Còn hiệu lực', daysLeft: 'Còn 357 ngày', supplier: 'Ford AutoCare', note: 'Bảo hành cao su nứt gãy, rô tuyn rơ lắc.' }
    ],
    media: [
      { id: 201, title: 'Toàn cảnh gầm xe Ford Ranger Wildtrak', category: 'trong', date: '20/09/2025 14:00', odo: '82.500 km', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80' }
    ],
    notes: [
      { id: 301, priority: 'urgent', author: 'KTV Thịnh', date: '20/09/2025 15:30', content: 'Xe chạy đường đất đỏ nhiều, khuyến cáo vệ sinh cổ hút và kiểm tra lọc nhiên liệu mỗi 10.000km.' }
    ]
  },
  {
    plate: '43A-678.90',
    modelName: 'MAZDA CX-5 2.0L PREMIUM',
    brand: 'Mazda',
    model: 'CX-5',
    variant: '2.0L Premium',
    year: '2023',
    color: 'Đỏ Pha Lê (Soul Red Crystal)',
    fuel: 'Xăng',
    vin: 'JM3KFBCM9P0887711',
    engine: 'PE654321',
    odo: '28.900 km',
    status: 'Đang hoạt động',
    statusColor: '#2E7D32',
    statusBg: '#E8F5E9',
    owner: {
      name: 'Phạm Thu Hà',
      phone: '0935 222 333',
      email: 'ha.phamthu@gmail.com',
      address: '22 Bạch Đằng, Hải Châu, Đà Nẵng',
      note: 'Khách hàng nữ, yêu cầu kiểm tra kỹ hệ thống điều hòa'
    },
    company: {
      name: 'Cá nhân',
      taxCode: 'Chưa cung cấp',
      address: '22 Bạch Đằng, Hải Châu, Đà Nẵng',
      phone: '0935 222 333',
      contact: 'Phạm Thu Hà'
    },
    ownerHistory: [
      { period: '2023 - Hiện tại', name: 'Phạm Thu Hà (Chủ hiện tại)', active: true }
    ],
    avatar: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=80&auto=format&fit=crop&q=80'
    ],
    repairs: [
      {
        id: 'SC-20250910-01',
        date: '10/09/2025',
        dateOut: '11/09/2025',
        plate: '43A-678.90',
        odo: '28.900 km',
        service: 'Sơn dặm góc cản sau bên phụ + Đánh bóng phục hồi sơn toàn xe',
        tech: 'Đinh Công Bằng (Đồng Sơn)',
        advisor: 'Phạm Hồng Đức',
        partCost: 450000,
        laborCost: 1850000,
        total: 2300000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Sơn lót, sơn màu đỏ Soul Red 46V theo công thức Nippon', 'Bóng 2K Dupont phủ bề mặt', 'Công sơn dặm sấy hồng ngoại & đánh bóng 3 bước']
      }
    ],
    replacedParts: [
      { id: 'PT-CX5-01', date: '10/09/2025', code: 'KD45-67-330', name: 'Cần gạt mưa ba khúc cao cấp Mazda CX-5', qty: 1, unit: 'Bộ', price: 450000, total: 450000, odo: '28.900 km', repairId: 'SC-20250910-01', warranty: '6 tháng', warrantyStatus: 'active' }
    ],
    warranties: [
      { id: 'BH-CX5-001', item: 'Bề mặt sơn dặm cản sau Soul Red', type: 'Sơn - Đồng', startDate: '11/09/2025', endDate: '11/09/2026', duration: '12 tháng', odoStart: '28.900 km', odoLimit: 'Không giới hạn', status: 'Còn hiệu lực', daysLeft: 'Còn 346 ngày', supplier: 'Xưởng Sơn Kazuko', note: 'Bảo hành bong tróc sơn, rộp nứt bề mặt.' }
    ],
    media: [
      { id: 301, title: 'Góc xước cản sau trước khi xử lý', category: 'truoc', date: '10/09/2025 09:00', odo: '28.900 km', url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&auto=format&fit=crop&q=80' },
      { id: 302, title: 'Hoàn thiện lớp sơn bóng sau sấy hồng ngoại', category: 'sau', date: '11/09/2025 15:30', odo: '28.900 km', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80' }
    ],
    notes: [
      { id: 401, priority: 'info', author: 'Admin', date: '10/09/2025 09:30', content: 'Chủ xe yêu cầu bảo dưỡng sơn xe 6 tháng một lần theo gói chăm sóc Detailing.' }
    ]
  },
  {
    plate: '29A-345.67',
    modelName: 'HYUNDAI SANTAFE 2.2L DIESEL HTRAC',
    brand: 'Hyundai',
    model: 'SantaFe',
    variant: '2.2L Cao cấp HTRAC',
    year: '2022',
    color: 'Xanh Nước Biển (Taiga Blue)',
    fuel: 'Dầu',
    vin: 'KMHFH81VCNU998822',
    engine: 'D4HB332211',
    odo: '45.600 km',
    status: 'Đang hoạt động',
    statusColor: '#2E7D32',
    statusBg: '#E8F5E9',
    owner: {
      name: 'Đặng Quốc Tuấn',
      phone: '0904 555 123',
      email: 'tuan.dang@tuanphatcorp.vn',
      address: '15 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      note: 'Ưu tiên sử dụng dầu nhớt Mobil 1 5W-30'
    },
    company: {
      name: 'Cty CP Dịch Vụ Tuấn Phát',
      taxCode: '0106543219',
      address: '15 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      phone: '024 3777 6666',
      contact: 'Đặng Quốc Tuấn'
    },
    ownerHistory: [
      { period: '2022 - Hiện tại', name: 'Đặng Quốc Tuấn (Chủ hiện tại)', active: true }
    ],
    avatar: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400&auto=format&fit=crop&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=80&auto=format&fit=crop&q=80'
    ],
    repairs: [
      {
        id: 'SC-20250815-03',
        date: '15/08/2025',
        dateOut: '15/08/2025',
        plate: '29A-345.67',
        odo: '45.600 km',
        service: 'Bảo dưỡng cấp 40.000 km + Thay dầu máy & lọc nhiên liệu diesel',
        tech: 'Trần Văn Cường',
        advisor: 'Lê Thanh Tuấn',
        partCost: 2450000,
        laborCost: 850000,
        total: 3300000,
        status: 'Hoàn thành',
        paymentStatus: 'Đã thanh toán',
        items: ['Dầu động cơ Total Rubia TIR 7400 (6L)', 'Lọc nhiên liệu diesel SantaFe chính hãng', 'Lọc gió động cơ & điều hòa', 'Bảo dưỡng 4 cụm phanh']
      }
    ],
    replacedParts: [
      { id: 'PT-SF-01', date: '15/08/2025', code: '31922-2W000', name: 'Lọc nhiên liệu dầu diesel SantaFe', qty: 1, unit: 'Cái', price: 650000, total: 650000, odo: '45.600 km', repairId: 'SC-20250815-03', warranty: '12 tháng / 20.000 km', warrantyStatus: 'active' }
    ],
    warranties: [
      { id: 'BH-SF-001', item: 'Lọc nhiên liệu diesel Hyundai OEM', type: 'Hệ thống nhiên liệu', startDate: '15/08/2025', endDate: '15/08/2026', duration: '12 tháng', odoStart: '45.600 km', odoLimit: '65.600 km', status: 'Còn hiệu lực', daysLeft: 'Còn 319 ngày', supplier: 'Hyundai Mobis', note: 'Bảo hành nghẹt lọc, rò rỉ ron đáy lọc.' }
    ],
    media: [
      { id: 401, title: 'Khoang máy Hyundai SantaFe 2.2L Diesel HTRAC', category: 'truoc', date: '15/08/2025 08:30', odo: '45.600 km', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80' }
    ],
    notes: [
      { id: 501, priority: 'urgent', author: 'KTV Cường', date: '15/08/2025 10:00', content: 'Xe chạy động cơ diesel có turbo, lưu ý thay lọc dầu và lọc nhiên liệu đúng định kỳ.' }
    ]
  }
];

const EMPTY_VEHICLE_PROFILE = {
  id: '', plate: '—', modelName: 'CHƯA CÓ HỒ SƠ XE', brand: '—', model: '—', variant: '—',
  year: '—', color: '—', fuel: '—', vin: '—', engine: '—', odo: '0 km',
  status: 'Đang hoạt động', statusColor: '#2E7D32', statusBg: '#E8F5E9',
  owner: { name: '—', phone: '—', email: '—', address: '—', note: '' },
  company: { name: '—', taxCode: '—', address: '—', phone: '—', contact: '—' },
  ownerHistory: [], avatar: '/parts/loc_dau_toyota.jpg', thumbnails: [],
  repairs: [], replacedParts: [], warranties: [], media: [], notes: [],
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
  avatar: '/parts/loc_dau_toyota.jpg', thumbnails: [],
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
      id: item.NAME || item.ID, item: item.TEN_MATHANG || item.TEN_DICHVU || item.NOTE || 'Hạng mục bảo hành',
      type: Number(item.LOAI) === 1 ? 'Dịch vụ' : 'Phụ tùng thay thế',
      startDate: formatProfileDate(item.NGAYBATDAU), endDate: formatProfileDate(item.NGAYKETTHUC),
      duration: item.NGAYKETTHUC ? 'Theo thời hạn phiếu' : '—', odoStart: summary.odo,
      odoLimit: 'Theo chính sách bảo hành', status: days == null || days >= 0 ? 'Còn hiệu lực' : 'Hết hiệu lực',
      daysLeft: days == null ? '—' : days >= 0 ? `Còn ${days} ngày` : 'Hết BH', supplier: 'KAZUKO AUTO', note: item.NOTE || '',
    };
  });
  const media = (data?.media || []).map((item) => ({
    id: item.ID, title: item.MOTA || 'Hình ảnh tiếp nhận xe',
    category: Number(item.LOAIHINH) === 2 ? 'sau' : Number(item.LOAIHINH) === 1 ? 'trong' : 'truoc',
    date: formatProfileDate(item.TIMECREATED, true),
    odo: `${Number(item.ODO || row.ODO || 0).toLocaleString('vi-VN')} km`, url: summary.avatar,
  }));
  const noteList = row.GHICHU ? [{ id: `vehicle-${row.ID}`, priority: 'info', author: 'Hệ thống', date: formatProfileDate(row.TIMECREATED, true), content: row.GHICHU }] : [];
  return {
    ...EMPTY_VEHICLE_PROFILE, ...summary,
    rawVehicle: row,
    status: repairs[0] && repairs[0].status !== 'Hoàn thành' ? repairs[0].status : 'Đang hoạt động',
    owner: { name: row.TEN_KH || '—', phone: row.DIENTHOAI || '—', email: row.EMAIL || '—', address: row.DIACHI || '—', note: row.GHICHU_KH || row.NHOM_KH || '' },
    company: { name: row.NHOM_KH || row.TEN_KH || '—', taxCode: row.MASOTHUE || '—', address: row.DIACHI || '—', phone: row.DIENTHOAI || '—', contact: row.TEN_KH || '—' },
    ownerHistory: row.TEN_KH ? [{ period: `${row.NAMSANXUAT || '—'} - Hiện tại`, name: `${row.TEN_KH} (Chủ hiện tại)`, active: true }] : [],
    repairs, replacedParts, warranties, media, notes: noteList,
  };
};

export default function HoSoXePage() {
  const [selectedPlate, setSelectedPlate] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('plate') || '';
    } catch (e) {}
    return '';
  });
  const [vehicleList, setVehicleList] = useState([]);
  const [currentVehicle, setCurrentVehicle] = useState(EMPTY_VEHICLE_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState('thong-tin-chung');
  const [copiedCode, setCopiedCode] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('all');
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
      if (notify) showToast('Đã tải hồ sơ xe: ' + profile.plate + ' (' + profile.model + ')');
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể tải hồ sơ xe.');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);
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
        if (selected) await loadVehicleProfile(selected);
        else setCurrentVehicle(EMPTY_VEHICLE_PROFILE);
      } catch (error) {
        showToast(error?.response?.data?.error || error.message || 'Không thể tải danh sách xe.');
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

  const tabs = [
    { id: 'thong-tin-chung', label: 'Thông tin chung', icon: FileText, count: null },
    { id: 'lich-su-sua-chua', label: 'Lịch sử sửa chữa', icon: ClipboardList, count: currentVehicle.repairs.length },
    { id: 'phu-tung-thay', label: 'Phụ tùng đã thay', icon: Wrench, count: currentVehicle.replacedParts.length },
    { id: 'bao-hanh', label: 'Bảo hành', icon: Shield, count: currentVehicle.warranties.length },
    { id: 'hinh-anh', label: 'Hình ảnh & Video', icon: ImageIcon, count: currentVehicle.media.length },
    { id: 'ghi-chu', label: 'Ghi chú', icon: Edit3, count: currentNotes.length },
  ];

  return (
    <div className="page-responsive-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      overflowY: 'auto',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: '#E65100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Car size={14} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(14px, 1.1vw, 16px)', fontWeight: 700, color: '#1E293B' }}>
            Hồ sơ xe
          </h1>
          <span style={{
            background: '#FFF3E0',
            color: '#E65100',
            border: '1px solid #FFB74D',
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: '11px',
            fontWeight: 700
          }}>
            {currentVehicle.plate}
          </span>
        </div>

        {/* Cụm tìm kiếm và nút thao tác */}
        <div className="hsx-top-actions" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, minWidth: 0 }}>
          
          {/* Ô tìm kiếm biển số xe với Dropdown gợi ý */}
          <div ref={searchBoxRef} className="hsx-search-wrap" style={{ position: 'relative', width: 'clamp(220px, 20vw, 290px)' }}>
            <div style={{ position: 'relative', width: '100%', height: 'clamp(26px, 3vh, 30px)' }}>
              <input
                type="text"
                placeholder="Gõ biển số (51A, 30H...), số khung, tên xe..."
                value={searchPlateQuery}
                onChange={(e) => {
                  setSearchPlateQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '0 26px 0 8px',
                  border: isSearchOpen ? '1px solid #E65100' : '1px solid #CBD5E1',
                  borderRadius: 4,
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
            {/* Nút mở danh sách tất cả các xe */}
            <button
              type="button"
              onClick={() => setIsCarModalOpen(true)}
              style={{
                height: 'clamp(24px, 3vh, 28px)',
                padding: '0 8px',
                background: '#FFFFFF',
                color: '#1565C0',
                border: '1px solid #90CAF9',
                borderRadius: 4,
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Car size={13} />
              Danh sách xe ({vehicleList.length})
            </button>

            <button
              type="button"
              onClick={openCreateVehicleForm}
              style={{
                height: 'clamp(24px, 3vh, 28px)',
                padding: '0 10px',
                background: '#E65100',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={13} />
              Tạo hồ sơ xe
            </button>

            <button
              type="button"
              onClick={() => showToast('Import hồ sơ từ Excel')}
              style={{
                height: 'clamp(24px, 3vh, 28px)',
                padding: '0 8px',
                background: '#fff',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
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
                height: 'clamp(24px, 3vh, 28px)',
                padding: '0 8px',
                background: '#fff',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <FileSpreadsheet size={13} color="#1565C0" />
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Dải NÚT CHỌN NHANH BIỂN SỐ XE (QUICK SELECTOR CHIPS) */}
      <div className="hsx-quick-selector-bar" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: '#FFF8E1',
        border: '1px solid #FFE0B2',
        borderRadius: 6,
        padding: '3px 8px',
        flexShrink: 0,
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10.5px', fontWeight: 700, color: '#BF360C', flexShrink: 0 }}>
          <Car size={13} />
          <span>Chọn nhanh xe:</span>
        </div>
        <div className="hsx-quick-chips-scroll" style={{ display: 'flex', gap: 4, flex: '1 1 auto', overflowX: 'auto' }}>
          {vehicleList.slice(0, 5).map(v => {
            const isSelected = v.id === currentVehicle.id;
            return (
              <button
                key={v.id || v.plate}
                type="button"
                onClick={() => handleSelectVehicle(v)}
                style={{
                  padding: '2px 8px',
                  background: isSelected ? '#E65100' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  border: isSelected ? '1px solid #E65100' : '1px solid #FFCC80',
                  borderRadius: 4,
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 3px rgba(230, 81, 0, 0.3)' : 'none'
                }}
              >
                <b>{v.plate}</b>
                <span style={{ fontSize: '10px', opacity: isSelected ? 0.95 : 0.75 }}>({v.brand} {v.model})</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setIsCarModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#E65100',
            fontSize: '10.5px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0
          }}
        >
          Xem tất cả <ChevronRight size={12} />
        </button>
      </div>

      {/* Vùng nội dung chính của Hồ sơ xe */}
      <div className="hsx-main-content">
        {/* Card thông tin xe tổng quan trên cùng */}
        <div className="hsx-vehicle-card">
          <div className="hsx-mobile-top-block">
            {/* Ảnh xe và 4 thumbnail */}
            <div className="hsx-media-col">
              <div className="hsx-main-avatar">
                <img
                  src={currentVehicle.avatar}
                  alt={currentVehicle.modelName}
                />
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
                {currentVehicle.modelName}
              </div>

              <div className="hsx-plate-badge-row">
                <div className="hsx-plate-badge">
                  {currentVehicle.plate}
                </div>
                <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '1px 6px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                  Đăng ký
                </span>
                <span style={{ background: currentVehicle.statusBg || '#E8F5E9', color: currentVehicle.statusColor || '#2E7D32', padding: '1px 6px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                  {currentVehicle.status || 'Đang hoạt động'}
                </span>
              </div>

              {/* Thông tin chủ xe tóm tắt trên mobile */}
              <div className="hsx-mobile-owner-summary" style={{ fontSize: '11px', color: '#475569', marginTop: 2 }}>
                <span>Chủ xe: <b style={{ color: '#1565C0' }}>{currentVehicle.owner?.name || 'Chưa có'}</b></span>
                {currentVehicle.owner?.phone && <span>SĐT: <b>{currentVehicle.owner.phone}</b></span>}
              </div>
            </div>
          </div>

          {/* Dòng Số khung & Số máy */}
          <div className="hsx-vin-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>Số khung:</span>
              <b style={{ color: '#0F172A' }}>{currentVehicle.vin || '—'}</b>
              {currentVehicle.vin && (
                <Copy
                  size={11}
                  color="#1976D2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCopy(currentVehicle.vin, 'Số khung')}
                  title="Sao chép số khung"
                />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>Số máy:</span>
              <b style={{ color: '#0F172A' }}>{currentVehicle.engine || '—'}</b>
              {currentVehicle.engine && (
                <Copy
                  size={11}
                  color="#1976D2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCopy(currentVehicle.engine, 'Số máy')}
                  title="Sao chép số máy"
                />
              )}
            </div>
          </div>

          {/* Thông số kỹ thuật nhanh */}
          <div className="hsx-specs-grid">
            <div className="hsx-spec-item">
              <div className="spec-label">Hãng xe</div>
              <div className="spec-value">{currentVehicle.brand || '—'}</div>
            </div>
            <div className="hsx-spec-item">
              <div className="spec-label">Dòng xe</div>
              <div className="spec-value">{currentVehicle.model || '—'}</div>
            </div>
            <div className="hsx-spec-item">
              <div className="spec-label">Phiên bản</div>
              <div className="spec-value">{currentVehicle.variant || '—'}</div>
            </div>
            <div className="hsx-spec-item">
              <div className="spec-label">Năm SX</div>
              <div className="spec-value">{currentVehicle.year || '—'}</div>
            </div>
            <div className="hsx-spec-item">
              <div className="spec-label">Màu xe</div>
              <div className="spec-value">{currentVehicle.color || '—'}</div>
            </div>
            <div className="hsx-spec-item">
              <div className="spec-label">Nhiên liệu</div>
              <div className="spec-value">{currentVehicle.fuel || '—'}</div>
            </div>
          </div>

          {/* Chủ xe & địa chỉ bên phải (Desktop) */}
          <div className="hsx-owner-col">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
              <span style={{ background: currentVehicle.statusBg, color: currentVehicle.statusColor, padding: '1px 6px', borderRadius: 10, fontSize: '10px', fontWeight: 600 }}>
                {currentVehicle.status}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '9.5px', color: '#64748B' }}>Chủ xe: </span>
              <span style={{ fontWeight: 700, color: '#1565C0', fontSize: '11px' }}>{currentVehicle.owner?.name || '—'}</span>
            </div>
            <div>
              <span style={{ fontSize: '9.5px', color: '#64748B' }}>SĐT: </span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{currentVehicle.owner?.phone || '—'}</span>
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '9.5px', color: '#64748B' }}>Khách hàng: </span>
              <span style={{ fontWeight: 500, color: '#334155' }}>{currentVehicle.company?.name || 'Khách lẻ'}</span>
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px', color: '#64748B' }}>
              {currentVehicle.owner?.address || '—'}
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

          {/* Các nút hành động nhanh bên phải thanh tab */}
          <div className="hsx-tab-actions">
            <button
              type="button"
              onClick={() => showToast('Đang gửi lệnh in phiếu hồ sơ xe ' + currentVehicle.plate + '...')}
              style={{
                height: 'clamp(24px, 3vh, 28px)',
                padding: '0 8px',
                background: '#FFFFFF',
                color: '#E65100',
                border: '1px solid #FFCC80',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: '10.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Printer size={12} />
              In phiếu
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingVehicle(currentVehicle);
                setIsCreateVehicleOpen(true);
              }}
              style={{
                height: 'clamp(24px, 3vh, 28px)',
                padding: '0 8px',
                background: '#FFFFFF',
                color: '#1565C0',
                border: '1px solid #90CAF9',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: '10.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Edit size={12} />
              Sửa
            </button>
          </div>
        </div>

        {/* TAB 1: THÔNG TIN CHUNG */}
        {activeTab === 'thong-tin-chung' && (
          <>
            {/* 4 Cards dạng lưới */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px, 100%), 1fr))',
              gap: 'clamp(4px, 0.6vh, 6px)',
              flexShrink: 0
            }}>
              {/* Card 1: Thông tin xe */}
              <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                <div style={{ padding: '3px 8px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Car size={13} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#1E293B' }}>Thông tin xe</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B', width: '25%' }}>Biển số xe</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600, width: '25%' }}>{currentVehicle.plate}</td>
                      <td style={{ padding: '3px 6px', color: '#64748B', width: '25%', borderLeft: '1px solid #F1F5F9' }}>Hãng xe</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600, width: '25%' }}>{currentVehicle.brand}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Dòng xe</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.model}</td>
                      <td style={{ padding: '3px 6px', color: '#64748B', borderLeft: '1px solid #F1F5F9' }}>Phiên bản</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.variant}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Năm SX</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.year}</td>
                      <td style={{ padding: '3px 6px', color: '#64748B', borderLeft: '1px solid #F1F5F9' }}>Màu xe</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.color}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Số khung (VIN)</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentVehicle.vin.substring(0, 10)}...
                      </td>
                      <td style={{ padding: '3px 6px', color: '#64748B', borderLeft: '1px solid #F1F5F9' }}>Số máy</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.engine}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>ODO hiện tại</td>
                      <td style={{ padding: '3px 6px', fontWeight: 700, color: '#E65100' }}>{currentVehicle.odo}</td>
                      <td style={{ padding: '3px 6px', color: '#64748B', borderLeft: '1px solid #F1F5F9' }}>Nhiên liệu</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.fuel}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Card 2: Chủ sở hữu */}
              <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                <div style={{ padding: '3px 8px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={13} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#1E293B' }}>Chủ sở hữu</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B', width: '30%' }}>Họ tên</td>
                      <td style={{ padding: '3px 6px', fontWeight: 700, color: '#1565C0' }}>{currentVehicle.owner.name}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>SĐT</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.owner.phone}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Email</td>
                      <td style={{ padding: '3px 6px', color: '#1E293B' }}>{currentVehicle.owner.email}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Địa chỉ</td>
                      <td style={{ padding: '3px 6px', color: '#1E293B' }}>{currentVehicle.owner.address}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Ghi chú</td>
                      <td style={{ padding: '3px 6px', color: '#2E7D32', fontWeight: 600 }}>{currentVehicle.owner.note}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Card 3: Khách hàng */}
              <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                <div style={{ padding: '3px 8px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={13} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#1E293B' }}>Khách hàng</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B', width: '30%' }}>Tên công ty</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600, color: '#1E293B' }}>{currentVehicle.company.name}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Mã số thuế</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{currentVehicle.company.taxCode}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Địa chỉ</td>
                      <td style={{ padding: '3px 6px', color: '#1E293B' }}>{currentVehicle.company.address}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Điện thoại</td>
                      <td style={{ padding: '3px 6px' }}>{currentVehicle.company.phone}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 6px', color: '#64748B' }}>Người liên hệ</td>
                      <td style={{ padding: '3px 6px', fontWeight: 600, color: '#1565C0' }}>{currentVehicle.company.contact}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Card 4: Lịch sử chủ xe */}
              <div style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                <div style={{ padding: '3px 8px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <History size={13} color="#E65100" />
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#1E293B' }}>Lịch sử chủ xe</span>
                </div>
                <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '10.5px' }}>
                  {currentVehicle.ownerHistory.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.active ? '#E65100' : '#CBD5E1', flexShrink: 0 }} />
                      <div style={{ color: item.active ? '#E65100' : '#64748B', fontWeight: item.active ? 700 : 500, width: 80, flexShrink: 0 }}>
                        {item.period}
                      </div>
                      <div style={{ color: item.active ? '#1565C0' : '#334155', fontWeight: item.active ? 600 : 400 }}>
                        {item.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Lịch sử sửa chữa gần đây */}
            <div style={{
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
                              onClick={() => showToast('In phiếu sửa chữa ' + row.id)}
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
                            onClick={() => showToast('In chứng nhận bảo hành ' + bh.id)}
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

        {/* TAB 5: HÌNH ẢNH & VIDEO */}
        {activeTab === 'hinh-anh' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            {/* Thanh lọc & Tải ảnh lên */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[
                  { id: 'all', label: 'Tất cả ảnh/video' },
                  { id: 'truoc', label: 'Trước sửa chữa' },
                  { id: 'trong', label: 'Trong quá trình' },
                  { id: 'sau', label: 'Sau hoàn thiện' }
                ].map(f => {
                  const isSelected = mediaFilter === f.id;
                  const count = f.id === 'all' ? currentVehicle.media.length : currentVehicle.media.filter(m => m.category === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMediaFilter(f.id)}
                      style={{
                        padding: '3px 10px',
                        background: isSelected ? '#E65100' : '#F1F5F9',
                        color: isSelected ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => showToast('Mở hộp thoại tải lên ảnh/video thực tế của xe ' + currentVehicle.plate)}
                  style={{
                    height: 26,
                    padding: '0 10px',
                    background: '#E65100',
                    color: '#FFFFFF',
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
                  <Plus size={12} /> Tải ảnh / Video lên
                </button>
              </div>
            </div>

            {/* Grid hiển thị hình ảnh & video */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E0E0E0',
              padding: 8
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10
              }}>
                {currentVehicle.media.filter(m => mediaFilter === 'all' || m.category === mediaFilter).map(item => (
                  <div
                    key={item.id}
                    onClick={() => setPreviewImage(item)}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: '#FAFAFA',
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 130, background: '#CBD5E1', overflow: 'hidden' }}>
                      <img
                        src={item.url}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        background: item.category === 'truoc' ? '#1565C0' : item.category === 'trong' ? '#E65100' : '#2E7D32',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4
                      }}>
                        {item.category === 'truoc' ? 'Trước SC' : item.category === 'trong' ? 'Đang làm' : 'Hoàn thiện'}
                      </span>
                      <div style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        <Eye size={10} /> Phóng to
                      </div>
                    </div>

                    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: '11px', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#64748B' }}>
                        <span>{item.date}</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.odo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                    placeholder="Nhập ghi chú tình trạng xe, khuyến nghị phụ tùng hoặc lưu ý thói quen lái xe của khách..."
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
                      {[
                        { date: '02/10/2025', type: 'Bảo dưỡng', note: 'Kiểm tra tổng thể sau 5.000km', status: 'Chờ xử lý', color: '#E65100', bg: '#FFF3E0' },
                        { date: '15/10/2025', type: 'Thay dầu', note: 'Dầu máy Castrol + lọc dầu', status: 'Đã xác nhận', color: '#2E7D32', bg: '#E8F5E9' },
                        { date: '30/10/2025', type: 'Phanh', note: 'Kiểm tra độ mòn má phanh sau', status: 'Chưa đến', color: '#1565C0', bg: '#E3F2FD' }
                      ].map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '5px 6px', color: '#334155' }}>{it.date}</td>
                          <td style={{ padding: '5px 6px', fontWeight: 600 }}>{it.type}</td>
                          <td style={{ padding: '5px 6px', color: '#64748B' }}>{it.note}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                            <span style={{ background: it.bg, color: it.color, padding: '2px 6px', borderRadius: 8, fontSize: '9.5px', fontWeight: 600 }}>
                              {it.status}
                            </span>
                          </td>
                        </tr>
                      ))}
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
      </div>

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
              <button
                type="button"
                onClick={() => {
                  showToast('In phiếu sửa chữa ' + selectedRepair.id);
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
