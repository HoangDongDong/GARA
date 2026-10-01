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
import NhapKhoPage       from './pages/NhapKhoPage.jsx';
import PlaceholderPage   from './pages/PlaceholderPage.jsx';

function RequireAuth({ children }) {
  const u = localStorage.getItem('garage_user');
  if (!u) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index                element={<DashboardPage />} />
        <Route path="tiep-nhan"     element={<TiepNhanXePage />} />
        <Route path="sua-chua"      element={<SuaChuaPage />} />
        <Route path="ban-hang"      element={<BanHangPage />} />
        <Route path="mua-linh-kien" element={<MuaLinhKienPage />} />
        <Route path="nhap-kho"      element={<NhapKhoPage />} />
        <Route path="nhap-hang"     element={<Navigate to="/nhap-kho" replace />} />
        <Route path="nha-cung-cap"  element={<NhaCungCapPage />} />
        <Route path="khach-hang"    element={<KhachHangPage />} />
        <Route path="ho-so-xe"      element={<HoSoXePage />} />
        <Route path="bao-hanh"      element={<BaoHanhPage />} />
        <Route path="thu-chi"       element={<ThuChiPage />} />
        <Route path="nhan-vien"     element={<NhanVienPage />} />
        <Route path="bao-cao"       element={<BaoCaoPage />} />
        <Route path="quan-tri"      element={<QuanTriPage />} />
        <Route path="cau-hinh"      element={<CauHinhPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}