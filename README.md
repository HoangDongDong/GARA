# GARAGE APP - Hệ thống quản lý gara ô tô (KAZUKO AUTO)

Dự án full-stack gồm **React + Vite (frontend)** và **Node.js + Express (backend)** kết nối trực tiếp vào **Firebird 2.5 database `GARAGE.FDB`**.

## Cấu trúc thư mục

```
garage-app/
├── README.md
├── .gitignore
├── backend/                # Express + node-firebird
│   ├── package.json
│   ├── .env.example / .env (FB_DATABASE = D:/Garage/GARAGE.FDB)
│   ├── tools/              # FastReport Designer, PDF renderer và script kiểm tra
│   └── src/
│       ├── server.js
│       ├── db.js           # pool + helper query / execute / transaction
│       ├── config.js
│       └── routes/
│           ├── auth.js         # Đăng nhập SUSER + token phiên
│           ├── adminAccess.js  # Chức vụ, tài khoản, ma trận quyền
│           ├── customers.js    # DKHACHHANG
│           ├── vehicles.js     # DXE + DHANGXE + DDONGXE
│           ├── employees.js    # DNHANVIEN (LOAI NV: thường/KTV/CV/Thủ kho/Thu ngân)
│           ├── parts.js        # DMATHANG + tồn kho từ TNHAPKHOCHITIET, TXUATPHUTUNG, TDONHANGCHITIET
│           ├── repairOrders.js # TTIEPNHANXE + TLENHSUACHUA + TLENHSUACHUACHITIET
│           ├── invoices.js     # THOADONSUACHUA
│           └── reports.js      # tổng hợp + doanh thu
└── frontend/               # React 18 + Vite + React Router + Axios
    ├── package.json
    ├── vite.config.js (proxy /api → 4000)
    └── src/
        ├── App.jsx, api.js, main.jsx
        ├── styles/global.css
        ├── layouts/MainLayout.jsx
        └── pages/   (9 trang)
```

## Yêu cầu

- Node.js >= 18
- Firebird Server 2.5 đang chạy (port 3050)
- Database `D:\Garage\GARAGE.FDB` đã có sẵn schema KAZUKO AUTO
- .NET Desktop Runtime 8 để mở FastReport Designer

## Cài đặt

```powershell
# Backend
cd d:\Garage\garage-app\backend
copy .env.example .env       # sửa FB_DATABASE nếu khác
npm install

# Frontend
cd d:\Garage\garage-app\frontend
npm install
```

## Chạy

Mở 2 terminal:

```powershell
# Terminal 1 - Backend (port 4000)
cd d:\Garage\garage-app\backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd d:\Garage\garage-app\frontend
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

## In ấn & mẫu FastReport

- Tab `Cấu hình > In ấn & mẫu` đọc mẫu từ `STEMPLATE` trong database chính `GARAGE.FDB`.
- Nội dung `.frx` được đọc/ghi trực tiếp ở `STEMPLATE.TEMPLATE`; nhóm và mẫu mặc định được nối qua `SFORM`, `STABLEDESC`, `SIMAGE` và `SFORM.LASTTEMPLATEID`.
- Build FastReport Designer khi cần bằng `dotnet build backend/tools/fastreport-designer/FastReportDesignerBridge.csproj -c Release` từ thư mục gốc dự án. Khi bấm `Sửa mẫu bằng FastReport`, mẫu được mở bằng Designer desktop và tự đồng bộ về BLOB sau khi lưu/đóng.
- Dữ liệu tham khảo từ `D:\Garage\DATA.fdb` được nhập một lần bằng `npm run migrate:print-templates`; lệnh có thể chạy lại để đồng bộ theo ID.

## Phân quyền và đăng nhập

Chạy migration một lần cho database cũ:

```powershell
cd D:\Garage\garage-app\backend
npm run migrate:access
```

Mô hình dữ liệu:

- `DNHANVIEN`: hồ sơ nhân viên (họ tên, điện thoại, email, chứng chỉ, kỹ năng).
- `SUSER.DNHANVIENID`: tài khoản của nhân viên.
- `SUSER.SGROUPUSERID`: chức vụ/nhóm quyền của tài khoản.
- `SGROUPROLE`: quyền của chức vụ trên từng `SFUNCTION`.
- `MODE`: bitmask `Xem=1`, `Thêm=2`, `Sửa=4`, `Xóa=8`, `In=16`.

Tài khoản cũ được giữ nguyên; mật khẩu dạng cũ được tự động chuyển sang scrypt sau lần đăng nhập thành công đầu tiên. Token đăng nhập có hiệu lực 12 giờ. Khi triển khai, đặt `AUTH_TOKEN_SECRET` riêng trong `.env`.

## Bảng trong GARAGE.FDB đang dùng

| Bảng | Mục đích |
|------|----------|
| `SUSER` | Đăng nhập |
| `DKHACHHANG` | Khách hàng |
| `DXE` + `DHANGXE` + `DDONGXE` | Hồ sơ xe + dropdown hãng/dòng |
| `DNHANVIEN` | Nhân viên, KTV |
| `DMATHANG` + `DVITRIKHO` + `DHANGSANXUAT` + `DDONVITINH` + `DNHOMMATHANG` | Kho phụ tùng |
| `TTIEPNHANXE` | Phiếu tiếp nhận xe |
| `TLENHSUACHUA` + `TLENHSUACHUACHITIET` | Lệnh sửa chữa |
| `THOADONSUACHUA` | Hóa đơn |

## Tồn kho

Tồn kho = `SUM(TNHAPKHOCHITIET.SOLUONG) - SUM(TXUATPHUTUNG.SOLUONG) - SUM(TDONHANGCHITIET.SOLUONG)`

## REST API chính

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/auth/login` | Đăng nhập (SUSER) |
| GET/POST/PUT/DELETE | `/api/customers` | DKHACHHANG |
| GET/POST/PUT/DELETE | `/api/vehicles` | DXE |
| GET | `/api/vehicles/meta/brands` | Dropdown hãng + dòng |
| GET/POST/PUT/DELETE | `/api/employees` | DNHANVIEN |
| GET/POST/PUT/DELETE | `/api/parts` | DMATHANG + tồn kho |
| GET | `/api/parts/meta/options` | Dropdown hãng SX, vị trí, nhóm, ĐVT |
| GET | `/api/repair-orders` | TLENHSUACHUA |
| GET | `/api/repair-orders/:id` | Chi tiết + items |
| POST | `/api/repair-orders` | Tạo lệnh + chi tiết |
| PATCH | `/api/repair-orders/:id/status` | Đổi trạng thái |
| GET/POST/PATCH | `/api/invoices` | THOADONSUACHUA |
| GET | `/api/reports/dashboard` | Thống kê tổng quan |
| GET | `/api/reports/revenue?from=...&to=...` | Doanh thu theo ngày |
