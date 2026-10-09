# Mẫu cửa hàng từ GARAGE.FDB — 09/10/2026

Nguồn: `D:/Garage/GARAGE.FDB`. Mọi DELETE/UPDATE chỉ chạy trong file mẫu mới riêng. Không đổi cấu trúc bảng, chỉ mục, khóa ngoại hoặc trigger. Cửa hàng đã tạo trước đó giữ nguyên.

Mẫu đang dùng: `D:\Garage\saas\template-source-0ec3c95d-4d3a-40a8-b2b5-dedaf7709f89.fdb`. Manifest: `D:/Garage/saas/template-current.json`. Báo cáo kiểm tra: `D:/Garage/saas/template-source-audit-0ec3c95d-4d3a-40a8-b2b5-dedaf7709f89.json`. Backup nguồn nguyên trạng lưu riêng trong `D:/Garage/saas/source-backups`; bản backup đã làm sạch dùng để đăng ký nằm trong `D:/Garage/saas/templates`.

Đã khôi phục lại backup sạch và đối chiếu cấu trúc/số dòng trước khi cập nhật manifest. Các tên bảng rút gọn theo yêu cầu được đối chiếu sang tên thực trong nguồn.

## Các bảng làm trống

| Bảng | Số dòng trước | Sau |
|---|---:|---:|
| APP_REQUESTS | 0 | 0 |
| DCUAHANG | 1 | 0 |
| DDICHVU | 13 | 0 |
| DHANGSANXUAT | 6 | 0 |
| DKHACHHANG | 10 | 0 |
| DKHOHANG | 4 | 0 |
| DLOAIDICHVU | 7 | 0 |
| DMATHANG | 16 | 0 |
| DNHACUNGCAP | 5 | 0 |
| DNHANVIEN | 6 | 0 |
| DNHOMMATHANG | 6 | 0 |
| DNHOMNHACUNGCAP | 1 | 0 |
| DTAIKHOANNGANHANG | 4 | 0 |
| DVITRIKHO | 6 | 0 |
| DXE | 70 | 0 |
| PRINT_JOBS | 29 | 0 |
| PRINT_JOB_EVENTS | 116 | 0 |
| PRINT_PAIRINGS | 10 | 0 |
| PRINT_PRINTERS | 13 | 0 |
| PRINT_ROUTES | 7 | 0 |
| PRINT_STATIONS | 3 | 0 |
| SIMAGE | 25 | 0 |
| SQUICKNOTE | 0 | 0 |
| SUSER | 5 | 0 |
| TBANGLUONG | 0 | 0 |
| TBANGLUONGCHITIET | 0 | 0 |
| TBANGLUONGTONGHOP | 0 | 0 |
| TBAOGIA | 3 | 0 |
| TBAOGIACHITIET | 6 | 0 |
| TBAOHANH | 16 | 0 |
| TCHANDOAN | 4 | 0 |
| TCHITIETTHANHTOAN | 0 | 0 |
| TDONHANG | 65 | 0 |
| TDONHANGCHITIET | 107 | 0 |
| TDONHANGHUY | 0 | 0 |
| TDONHANGHUYCHITIET | 0 | 0 |
| THOADONSUACHUA | 20 | 0 |
| THOAHONGSUACHUA | 23 | 0 |
| TLENHSUACHUA | 77 | 0 |
| TLENHSUACHUACHITIET | 210 | 0 |
| TLICHSUBAODUONG | 0 | 0 |
| TLICHSUTRANGTHAI | 185 | 0 |
| TLUUVET | 0 | 0 |
| TNGUOIDUNGTHEOCUAHANG | 0 | 0 |
| TNHAPKHO | 25 | 0 |
| TNHAPKHOCHITIET | 45 | 0 |
| TPHANCONGNHANVIEN | 18 | 0 |
| TPHATSINHSUACHUA | 5 | 0 |
| TPHATSINHSUACHUACT | 5 | 0 |
| TTHUCHI | 4 | 0 |
| TTHUONGPHAT | 0 | 0 |
| TTIEPNHANXE | 93 | 0 |
| TTIEPNHANXEHINH | 42 | 0 |
| TTRANGTHAIANH | 44 | 0 |
| TTRANGTHAIXE | 54 | 0 |
| TVAORA | 0 | 0 |
| TXUATPHUTUNG | 42 | 0 |

## Các bảng giữ lại

| Bảng | Số dòng trước | Sau |
|---|---:|---:|
| DCALAMVIEC | 3 | 3 |
| DDONGXE | 21 | 21 |
| DDONVITINH | 6 | 6 |
| DHANGXE | 8 | 8 |
| DLOAIMATHANG | 0 | 0 |
| DLYDOTHUCHI | 9 | 9 |
| DNHOMKHACHHANG | 3 | 3 |
| DPHONGBAN | 0 | 0 |
| DTINHTHANH | 0 | 0 |
| SANALYSIS | 0 | 0 |
| SCOLUMN | 0 | 0 |
| SCONFIG | 128 | 128 |
| SCONFIGGROUP | 13 | 13 |
| SFORM | 14 | 14 |
| SFUNCTION | 24 | 24 |
| SGRID | 0 | 0 |
| SGROUPROLE | 74 | 74 |
| SGROUPUSER | 5 | 5 |
| SMENU | 0 | 0 |
| SNUMBERCOUNTER | 10 | 10 |
| SREPORT | 0 | 0 |
| SREPORTROLE | 0 | 0 |
| SREPORTTEMPLATE | 0 | 0 |
| SSMSTEMPLATE | 0 | 0 |
| STABLEDESC | 8 | 8 |
| STEMPLATE | 174 | 174 |
| TWORKFLOWMAP | 5 | 5 |

## Chỉnh dữ liệu cấu hình

Giữ dòng định nghĩa SCONFIG; làm trống thông tin công ty, logo, ngân hàng/QR thanh toán và đường dẫn riêng. SNUMBERCOUNTER giữ các loại chứng từ, SEQ=0 và PERIODKEY=ALL. Không tạo lại Kho chính: DKHOHANG được để trống đúng yêu cầu. Thông tin tên/email/điện thoại cửa hàng mới được điền từ đăng ký khi tạo chủ cửa hàng.

DLYDOTHUCHI giữ nguyên ID và số dòng, chỉnh 7 tên:

- Thu tu khach hang → Thu từ khách hàng
- Thu no NCC → Thu nợ nhà cung cấp
- Thu khac → Thu khác
- Chi nhap hang → Chi nhập hàng
- Chi luong nhan vien → Chi lương nhân viên
- Chi dien nuoc → Chi điện nước
- Chi phi khac → Chi phí khác

Tạo lại mẫu bằng `npm run saas:template:source` trong backend. Mỗi lần tạo file đích mới và giữ manifest cũ; chỉ chuyển manifest sau khi kiểm tra xong.
