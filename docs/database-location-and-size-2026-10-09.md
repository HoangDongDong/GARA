# Vị trí database và kiểm tra dung lượng — 09/10/2026

Ứng dụng hiện dùng GARAGE.FDB tại D:/Garage/garage-app/backend/GARAGE.FDB; registry tại backend/saas/platform-v1.fdb; database cửa hàng tại backend/saas/tenants. Mẫu hiện hành: backend/saas/template-source-0ec3c95d-4d3a-40a8-b2b5-dedaf7709f89.fdb. Manifest đã cập nhật sang đường dẫn backend. Đã xác nhận kết nối 6 cửa hàng, mẫu có hash đúng và API health/info 200.

Đã sao lưu trước chuyển tại backend/storage/relocation-backup-1791518702628. Bản GARAGE.FDB ở D:/Garage còn giữ làm bản cũ; ứng dụng không dùng đường dẫn đó nữa. Không xóa dữ liệu cửa hàng.

Đã xóa 42 database mẫu cũ/database test, giải phóng 757,09 MB. Hai file cũ tại D:/Garage/saas/PLATFORM.FDB và D:/Garage/saas/TEMPLATE-SOURCE-0EC3C95D-4D3A-40A8-B2B5-DEDAF7709F89.FDB còn bị tiến trình khác giữ nên chưa xóa; không dùng cho đăng ký hiện tại. Không dừng dịch vụ Firebird toàn máy để ép xóa.

Mẫu đang dùng đã restore từ backup sạch, dung lượng 24,47 MB; backup sạch 14,03 MB. GARAGE.FDB trong backend 191,41 MB. Mẫu có 173 XML TEMPLATE tổng 9,598 MB, 70 XML TEMPLATEDATA tổng 2,587 MB; layout/code hệ thống chiếm phần BLOB còn lại. Có 89 đối tượng PictureObject/PictureBox/Image trong XML mẫu in; IMAGE32/IMAGE có khoảng 0,03 MB. Không thấy chữ ký MP4/MKV/WebM/AVI trong TEMPLATE/TEMPLATEDATA. Các cột ảnh nghiệp vụ/logo trong mẫu đều không có dữ liệu BLOB. Không xóa ảnh nhúng mẫu in vì đang giữ mẫu theo yêu cầu.

File Firebird đã DELETE có thể giữ vùng cấp phát, không giảm dung lượng ngay. Backup/restore sang file mới giảm vùng trống. Không thu nhỏ database đang dùng bằng sửa file trực tiếp.
