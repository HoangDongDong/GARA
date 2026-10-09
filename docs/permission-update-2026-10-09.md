# Cập nhật phân quyền 09/10/2026

Đã bổ sung quyền vào database GARAGE.FDB: 24 chức năng đang hoạt động, gồm 13 chức năng cũ và 11 chức năng mới. Migration chạy trong transaction, chỉ tạo vai trò chưa tồn tại và không khôi phục quyền đã bị thu hồi khi chạy lại.

## Quyền mới trên màn hình Quản trị

| Chức năng | Cột sử dụng | Phạm vi |
|---|---|---|
| Quản lý danh mục / Phụ tùng / Dịch vụ | Xem, Thêm, Sửa, Xóa | Quản lý danh mục. Cấu hình ngân hàng/quỹ/cửa hàng/lý do thu chi vẫn chỉ dành cho tài khoản hệ thống Admin |
| Duyệt báo giá | Sửa | Chuyển hồ sơ từ chờ báo giá sang chờ xác nhận. Khi người lập có quyền này, phiếu được chuyển ngay như luồng cũ; thiếu quyền thì giữ ở bước chờ duyệt |
| Duyệt phát sinh | Sửa | Ghi nhận quyết định đối với đề xuất phát sinh, ngoài quyền Sửa chữa/Sửa |
| Phân công kỹ thuật | Sửa | Chốt nhân viên/tỷ lệ chia và bắt đầu sửa chữa, ngoài quyền Sửa chữa/Sửa |
| Xác nhận giao xe / Hoàn thành | Sửa | Chuyển bước giao xe/hoàn thành, ngoài quyền Sửa chữa/Sửa |
| Thu tiền / Thanh toán / Ghi công nợ | Xem, Sửa | Quyền thanh toán tách khỏi quyền lập phiếu; vẫn cần quyền xem/lập/sửa nghiệp vụ liên quan |
| Xem / Sửa / In lương | Xem, Sửa, In | Đọc mức lương, sửa thông số lương và in bảng lương |
| Xem / Cấu hình hoa hồng | Xem, Sửa | Xem hoa hồng và chỉnh cấu hình hoa hồng theo dịch vụ/phụ tùng |
| Xem giá nhập / Giá vốn | Xem | Cho phép trả các trường giá nhập/giá vốn; sửa thông tin này còn cần quyền sửa danh mục |
| Điều chỉnh giá / Thuế / Giảm giá | Sửa | Đổi đơn giá, thuế, phí, giảm giá trên phiếu, ngoài quyền nghiệp vụ |
| Xuất dữ liệu CSV / Excel | Xem | Cho phép xuất dữ liệu được xem; báo cáo Excel vẫn cần quyền Xem+In báo cáo như trước |

Các ô không áp dụng được vô hiệu hóa. Ô Tất cả tính trên các thao tác áp dụng của từng chức năng. Quyền quản trị/cấu hình hệ thống dựa vào ISADMIN của tài khoản, không dựa vào tên nhóm Admin.

## Các lỗi đã xử lý

- Quyền Sửa/Xóa của Sửa chữa/POS/Bảo hành không còn cho sửa/xóa danh mục khách hàng, phụ tùng, xe. Quản lý danh mục có quyền riêng; các nghiệp vụ vẫn được đọc và thêm nhanh những dữ liệu cần thiết.
- API master-data đọc kiểm tra quyền theo resource. Thêm nhanh hãng/dòng xe, nhóm khách/NCC chỉ cho các trường tên/mã/thứ tự/hãng xe; cập nhật đầy đủ danh mục cần quyền quản lý danh mục.
- Sửa chữa và Nhập kho lấy nhân viên từ API lookup chỉ có ID/tên/mã/chuyên môn/vai trò; không cần quyền đọc hồ sơ nhân sự/lương.
- API JSON loại bỏ trường lương, hoa hồng, giá nhập/giá vốn khi thiếu quyền. Endpoint thu nhập không truy vấn lương/hoa hồng khi thiếu quyền tương ứng. Preview phân công không trả chi tiết/tổng hoa hồng nếu chưa được phép.
- Thanh toán hóa đơn sửa chữa yêu cầu quyền Thanh toán và quyền xem Sửa chữa hoặc Tài chính. POS/nhập kho/thu chi cũng kiểm tra quyền Thanh toán riêng. Khi bill bắt buộc, kiểm tra quyền In trước khi lưu thanh toán.
- Sửa thông tin phụ tùng khi không có quyền xem giá vốn giữ nguyên giá nhập đã lưu, không ghi thành 0.
- Route chưa khai báo bị từ chối; ngoại lệ chỉ dành cho các router in chứng từ/Print Agent/số chứng từ vốn tự kiểm tra quyền theo loại và bản ghi.
- Giao diện xác minh quyền bằng phiên đăng nhập hiện có khi mở ứng dụng, khi quay lại cửa sổ và mỗi 60 giây. Khi quyền thay đổi, giao diện được nạp lại để bỏ menu/nút và dữ liệu theo quyền cũ.
- Các nút/chức năng chính ở luồng Sửa chữa, Hồ sơ chờ duyệt, POS, Nhập kho, Nhân sự, Danh mục, Khách hàng, Nhà cung cấp, Thu chi và Xuất báo cáo đã dùng kiểm tra quyền tương ứng. Backend vẫn là lớp bảo vệ quyết định đối với mọi thao tác.

## Chuyển đổi quyền cũ

- Duyệt/phân công/giao xe lấy quyền Sửa chữa/Sửa cũ.
- Thanh toán lấy quyền lập/sửa POS, Nhập kho hoặc Tài chính cũ; không tự cấp chỉ vì có quyền Sửa chữa.
- Lương lấy quyền Nhân sự cũ. Hoa hồng giữ quyền xem/cấu hình đã có của Nhân sự/Sửa chữa.
- Giá vốn lấy quyền xem Kho/Tài chính; không tự cấp cho người chỉ có quyền Sửa chữa/POS.
- Điều chỉnh giá lấy quyền Sửa POS/Sửa chữa cũ. Xuất dữ liệu lấy quyền xuất/in Báo cáo hoặc xem Nhân sự cũ.
- Quản lý danh mục không tự cấp cho nhóm thông thường. Admin hệ thống luôn có quyền; muốn nhân viên quản lý danh mục thì cấp riêng trên ma trận.

Tên nhóm Báo giá/Kỹ thuật không tự áp đặt chính sách. Những nhóm từng được cấp rất rộng vẫn giữ các quyền tương ứng; quản trị viên có thể bỏ riêng quyền thanh toán, lương, hoa hồng, giá vốn, duyệt… theo công việc thực tế.

## Kiểm chứng

- Bộ hồi quy backend: 161 ca đạt, 0 lỗi, 12 ca tích hợp bỏ qua theo cấu hình mặc định; các fixture lập/thu tiền đã có người dùng được phép rõ ràng. Sửa một mock migration cũ vốn ghi nhầm câu UPDATE vào danh sách INSERT.
- Sau các thay đổi cuối: 11 ca phân quyền/migration đạt, gồm kiểm tra giữ nguyên giá nhập khi trường này bị ẩn; 2 ca frontend về quyền và tính nhất quán các thao tác đạt.
- Build frontend production thành công. API health công khai xác nhận API và kết nối Firebird hoạt động. Database đã xác nhận đủ 11 mã mới.
- Không thử bằng tài khoản thật: bước tạo token Admin để thử endpoint quản trị bị hệ thống duyệt tự động từ chối. Thay thế bằng kiểm thử độc lập với quyền giả lập và endpoint health công khai; chưa kiểm chứng giao diện của từng tài khoản thật bằng đăng nhập.

Tải lại trang để thấy các dòng mới. Khi chỉnh quyền một nhóm, bấm Lưu quyền; các phiên đang mở sẽ tự đồng bộ trong tối đa 60 giây hoặc khi quay lại cửa sổ.
