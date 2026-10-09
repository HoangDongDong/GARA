# Tự nén ảnh tải lên — 09/10/2026

Bộ nén dùng chung frontend/src/utils/compressImage.js thu nhỏ theo tỷ lệ, không phóng to; giảm chất lượng JPEG theo bước và giảm kích thước thêm nếu vẫn vượt giới hạn. Chỉ nhận ảnh gốc tối đa 20 MB; ảnh lỗi hoặc không nén được bị từ chối thay vì gửi ảnh gốc lớn. Ảnh nhỏ đã đạt giới hạn cùng định dạng được giữ nếu mã hóa lại làm tăng dung lượng. File GIF được chuyển thành ảnh tĩnh; video/URL ảnh quảng cáo không thuộc xử lý file ảnh này.

| Luồng | Cạnh dài tối đa | Dung lượng ảnh tối đa |
|---|---:|---:|
| Hồ sơ xe, chụp camera, nhận diện/OCR | 1600 px | 512 KB |
| Ảnh trạng thái sửa chữa | 1600 px | 512 KB |
| Nhân viên | 800 px | 200 KB |
| Mặt hàng | 1200 px | 300 KB |
| Quảng cáo màn hình phụ | 1920 px | 512 KB |
| Ảnh cấu hình khác và chèn vào mẫu in | 1200 px | 256 KB |
| Logo công ty, bộ nén hiện có | 800 px | 256 KB |

Ảnh mặt hàng nén trước khi xử lý tách nền và nén lại kết quả; vẫn giữ chức năng tách nền trắng. PNG/WebP dùng trong cấu hình hoặc mẫu in chuyển PNG để giữ alpha; ảnh nghiệp vụ chuyển JPEG nền trắng. Tự nén xảy ra khi chọn file; không cần thao tác thêm. Mật độ điểm ảnh và độ rõ còn tùy ảnh nguồn; ảnh cần đọc chữ nhỏ nên kiểm tra bản xem trước. Giới hạn trên tính byte ảnh nhị phân; data URL/base64 lưu trong Firebird lớn hơn khoảng 1/3.

Đã rà soát input file ảnh trong frontend; còn FileReader ở bộ nén/logo/worker là đọc dữ liệu đã xử lý. Import FRX/XML là tài liệu mẫu, không chuyển qua bộ nén ảnh. Chỉ thay ảnh mới do giao diện này gửi; không xử lý hàng loạt ảnh đang có trong GARAGE.FDB, không thay đổi giới hạn đọc ảnh cũ hoặc cấu trúc database. API gọi trực tiếp bên ngoài giao diện vẫn chịu giới hạn backend hiện có, không có bộ nén ảnh trên server trong thay đổi này.

Kiểm chứng: 32 test frontend đạt, build thành công (cảnh báo bundle lớn hiện có). Test mới dùng mô phỏng codec để kiểm tra giới hạn/rẽ nhánh, thử lại chất lượng-kích thước, PNG/không phóng to, từ chối file sai/quá lớn, lỗi giải mã/mã hóa và thu hồi object URL; chưa kiểm thử thủ công trên tất cả thiết bị/trình duyệt.
