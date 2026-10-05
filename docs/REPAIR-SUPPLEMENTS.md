# Phát sinh trong quá trình sửa chữa

Chạy `npm run migrate:repair-supplements` trong thư mục backend rồi khởi động lại API. Migration chạy lại được, giữ nguyên dữ liệu hiện có.

Trong trang Sửa chữa, mở phiếu ở bước **Đang sửa**, bấm **Phát sinh** bên cạnh danh sách đã chọn:

1. Nhập lý do, chọn dịch vụ/phụ tùng, số lượng và đơn giá báo khách. Lưu nháp hoặc lưu báo giá chờ khách xác nhận.
2. Ghi nhận phản hồi khách, chọn các mục khách đồng ý, nhập tên khách và bằng chứng/nội dung xác nhận. Bỏ chọn tất cả để ghi nhận từ chối toàn bộ.
3. Chỉ các mục được duyệt mới vào lệnh sửa chữa và tổng tiền. Phụ tùng được xuất theo luồng giao xe hiện có.

Không thể giao xe khi còn đề xuất nháp/chờ xác nhận; cần ghi nhận đồng ý, từ chối hoặc hủy. Sau giao xe chỉ xem lịch sử. Đề xuất đã xử lý không thể sửa hoặc duyệt lại. Khi cần đổi giá/phụ tùng của đề xuất chưa duyệt, hủy và lập đề xuất mới. Số lượng/giá hỗ trợ hai chữ số thập phân, phù hợp chi tiết lệnh hiện có.

Trang **Hồ sơ chờ duyệt** có khu vực **Phát sinh chờ duyệt**, mặc định hiển thị đề xuất chờ khách xác nhận. Có thể lọc bản nháp hoặc kết quả đã xử lý; tìm theo xe, phiếu, khách hàng, lý do và cố vấn. Mở từng đề xuất để xem các hạng mục và ghi nhận khách chấp thuận/từ chối ngay tại đây (cần quyền Sửa của REPAIR). Sau khi xử lý, danh sách và tổng tiền trên bảng điều phối được tải lại. Menu hiển thị thêm `+N PS` cho số đề xuất đang chờ. Không tạo quy trình xe mới hoặc thay đổi trạng thái Đang sửa khi lập/duyệt phát sinh.

Database: `TPHATSINHSUACHUA` lưu đề xuất, người lập, tài khoản ghi nhận, tên khách, nội dung và thời điểm xác nhận; `TPHATSINHSUACHUACT` lưu tên danh mục và giá tại thời điểm báo khách, kết quả từng mục. `TLENHSUACHUACHITIET.PHATSINHCTID` liên kết duy nhất đến mục được duyệt. Duyệt và cập nhật chi tiết/tổng tiền chạy trong cùng transaction; khóa lệnh sửa chữa để tuần tự hóa với thao tác giao xe. Xác nhận là bản ghi do nhân viên nhập sau khi liên hệ khách.

API (quyền REPAIR hiện có, thao tác duyệt dùng quyền Sửa):

- `GET /api/workflow/supplements`: danh sách phát sinh và thông tin phiếu/xe/khách, tổng báo giá bổ sung và trạng thái quy trình liên quan.

- `GET /api/repair-orders/:id/supplements`
- `POST /api/repair-orders/:id/supplements`: `{ LYDO, TRANGTHAI: 'draft'|'pending', items: [{ LOAI, DMATHANGID|DDICHVUID, SOLUONG, DONGIA }] }`
- `PATCH /api/repair-orders/:id/supplements/:supplementId`: `{ action: 'submit'|'cancel'|'decide', approvedItemIds, NGUOIXACNHAN, BANGCHUNG }`

Kiểm tra: `npm run test:repair-supplements`. Bật `$env:TEST_FIREBIRD='1'` trước khi chạy để kiểm tra trên Firebird với dữ liệu thử trong transaction và rollback toàn bộ.
