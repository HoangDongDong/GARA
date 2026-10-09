import DocumentPrintDialog from './components/DocumentPrintDialog.jsx';
import AccessSession from './components/AccessSession.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import PlatformPage from './pages/PlatformPage.jsx';
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage         from './pages/LoginPage.jsx';
import MainLayout        from './layouts/MainLayout.jsx';
import DashboardPage     from './pages/DashboardPage.jsx';
import TiepNhanXePage    from './pages/TiepNhanXePage.jsx';
import SuaChuaPage       from './pages/SuaChuaPage.jsx';
import BanHangPage       from './pages/BanHangPage.jsx';
import MuaLinhKienPage   from './pages/MuaLinhKienPage.jsx';
import NhaCungCapPage    from './pages/NhaCungCapPage.jsx';
import KhachHangPage     from './pages/KhachHangPage.jsx';
import HoSoXePage        from './pages/HoSoXePage.jsx';
import NhanVienPage      from './pages/NhanVienPage.jsx';
import BaoCaoPage        from './pages/BaoCaoPage.jsx';
import BaoHanhPage       from './pages/BaoHanhPage.jsx';
import ThuChiPage        from './pages/ThuChiPage.jsx';
import QuanTriPage       from './pages/QuanTriPage.jsx';
import CauHinhPage       from './pages/CauHinhPage.jsx';
import DanhMucPage       from './pages/DanhMucPage.jsx';
import NhapKhoPage       from './pages/NhapKhoPage.jsx';
import HoSoChoDuyetPage from './pages/HoSoChoDuyetPage.jsx';
import PlaceholderPage   from './pages/PlaceholderPage.jsx';
import GlobalNumberPreview from './components/GlobalNumberPreview.jsx';
import GlobalInterfaceScale from './components/GlobalInterfaceScale.jsx';
import ManHinhPhuPage, { SecondaryDisplayScreen } from './pages/ManHinhPhuPage.jsx';

function RequireAuth({ children }) {
  const u = localStorage.getItem('garage_user');
  const token = localStorage.getItem('garage_token');
  if (!u || !token) return <Navigate to="/login" replace />;
  return <AccessSession>{children}</AccessSession>;
}

function PermissionGate({ code, children }) {
  let user = {};
  try { user = JSON.parse(localStorage.getItem('garage_user') || '{}'); } catch {}
  const adminOnly = code === 'ADMIN' || code === 'SETTINGS';
  const allowed = Number(user.ISADMIN) === 1 || (!adminOnly && (Number(user.PERMISSIONS?.[code] || 0) & 1) === 1);
  if (!allowed) return <div style={{ margin: 20, padding: 24, background: '#fff', border: '1px solid #fed7aa', borderRadius: 8, color: '#9a3412' }}><h3 style={{ marginTop: 0 }}>Không có quyền truy cập</h3><p>Tài khoản của bạn chưa được cấp quyền xem chức năng này. Vui lòng liên hệ quản trị viên.</p></div>;
  return children;
}

const secured = (code, element) => <PermissionGate code={code}>{element}</PermissionGate>;

export default function App() {
  const [accessVersion, setAccessVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setAccessVersion(value => value + 1);
    window.addEventListener('garage:permissions-changed', refresh);
    return () => window.removeEventListener('garage:permissions-changed', refresh);
  }, []);
  return (
    <>
      <GlobalInterfaceScale />
      <GlobalNumberPreview />
      <DocumentPrintDialog />
      <Routes key={accessVersion}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/nen-tang" element={<PlatformPage />} />
      <Route path="/man-hinh-phu/xem/:mode" element={<RequireAuth>{secured('SETTINGS', <SecondaryDisplayScreen />)}</RequireAuth>} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index                element={secured('DASHBOARD', <DashboardPage />)} />
        <Route path="tiep-nhan"     element={secured('REPAIR', <TiepNhanXePage />)} />
        <Route path="sua-chua"      element={secured('REPAIR', <SuaChuaPage />)} />
        <Route path="ho-so-cho-duyet" element={secured('REPAIR', <HoSoChoDuyetPage />)} />
        <Route path="ban-hang"      element={secured('SALES', <BanHangPage />)} />
        <Route path="mua-linh-kien" element={secured('INVENTORY', <MuaLinhKienPage />)} />
        <Route path="nhap-kho"      element={secured('INVENTORY', <NhapKhoPage />)} />
        <Route path="nhap-hang"     element={<Navigate to="/nhap-kho" replace />} />
        <Route path="nha-cung-cap"  element={secured('SUPPLIERS', <NhaCungCapPage />)} />
        <Route path="khach-hang"    element={secured('CUSTOMERS', <KhachHangPage />)} />
        <Route path="ho-so-xe"      element={secured('VEHICLES', <HoSoXePage />)} />
        <Route path="bao-hanh"      element={secured('WARRANTY', <BaoHanhPage />)} />
        <Route path="thu-chi"       element={secured('FINANCE', <ThuChiPage />)} />
        <Route path="nhan-vien"     element={secured('EMPLOYEES', <NhanVienPage />)} />
        <Route path="bao-cao"       element={secured('REPORTS', <BaoCaoPage />)} />
        <Route path="in-chung-tu"   element={<DocumentPrintDialog embedded />} />
        <Route path="quan-tri"      element={secured('ADMIN', <QuanTriPage />)} />
        <Route path="cau-hinh"      element={secured('SETTINGS', <CauHinhPage />)} />
        <Route path="man-hinh-phu" element={secured('SETTINGS', <ManHinhPhuPage />)} />
        <Route path="danh-muc"      element={secured('CATALOG', <DanhMucPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
