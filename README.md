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
│   └── src/
│       ├── server.js
│       ├── db.js           # pool + helper query / execute / transaction
│       ├── config.js
│       └── routes/
│           ├── auth.js         # SUSER (username = NAME, password = NOTE)
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

## Đăng nhập

Tài khoản lấy trực tiếp từ bảng **SUSER** trong `GARAGE.FDB` (cột `NAME` = username, cột `NOTE` = password, `STATUS = 1`).

```sql
SELECT NAME, NOTE FROM SUSER WHERE STATUS = 1;
```

Nếu chưa có user, thêm nhanh 1 user admin bằng SQL:

```sql
INSERT INTO SUSER (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED)
VALUES (UUID(), 'admin', '123456', 1, UUID(), CURRENT_TIMESTAMP);
```

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