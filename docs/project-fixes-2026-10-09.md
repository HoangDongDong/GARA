# Kết quả sửa lỗi Garage — 09/10/2026

Đối chiếu với `project-audit-2026-10-09.md`. Báo cáo rà soát ban đầu mô tả trạng thái trước khi sửa; tài liệu này ghi kết quả sau sửa. Các thay đổi có sẵn trong workspace được giữ lại.

## Các lỗi đã xử lý

| Mục rà soát | Thay đổi đã thực hiện |
|---|---|
| 1. Tiền nhập kho | Server kiểm tra số lượng, giá, ngày và đối tượng còn hoạt động; tự tính tiền và từ chối tổng không khớp. |
| 2–4. Tồn kho, bán và giao xe | Dùng chung nguồn tính tồn cho danh mục, POS và dashboard; gom dòng trùng theo mặt hàng/kho; khóa mặt hàng theo thứ tự trước khi kiểm tra và ghi giao dịch. Giao xe kiểm tra tồn trước khi xuất. |
| 5. Giá vốn/giá nhập | Kiểm soát COST theo ngữ cảnh phiếu nhập; yêu cầu COST khi in phiếu nhập; lọc trường nhạy cảm trước khi đưa dữ liệu vào bộ dựng PDF. |
| 6. In công nợ | Dùng ledger chung với màn hình, có đầu kỳ và khoản thanh toán trong kỳ. |
| 7. Hủy chứng từ | Chặn hủy nhập đã trả tiền, có thanh toán công nợ liên quan hoặc không đủ tồn; chặn hủy lệnh sửa đã phát sinh hóa đơn/xuất kho hoặc qua giai đoạn cho phép. Hủy lệnh hợp lệ đồng bộ chi tiết và workflow. Chưa bổ sung bút toán đảo/hoàn tiền. |
| 8–9. Đăng nhập | Secret dự phòng ngẫu nhiên được lưu riêng, phiên 12 giờ; đổi/reset mật khẩu vô hiệu phiên cũ; logout thu hồi token; giới hạn số lần đăng nhập theo tài khoản/IP. Giới hạn token trên query string và che token trong log. |
| 10. Người thao tác | Actor lấy từ tài khoản đã xác thực thay cho header do client tự khai; cập nhật đường ghi người thao tác của workflow, phụ tùng và hồ sơ xe. Chưa xây dựng nhật ký trước/sau đầy đủ cho mọi nghiệp vụ. |
| 11. Gửi lại giao dịch | Khóa idempotency lưu cùng transaction cho bán hàng, nhập kho và thu/chi; frontend dùng chung API, giữ khóa khi mất phản hồi để retry không tạo lại chứng từ. |
| 12. Bảo hành | Bỏ dữ liệu giả; tạo/sửa/gia hạn, cập nhật trạng thái, kết quả và chi phí qua API thật; xuất CSV tạo file thật và kiểm tra quyền. Bổ sung quyền Sửa cho chức năng bảo hành. |
| 13. Mua linh kiện | Thay trang đơn mua mẫu bằng chuyển đến nghiệp vụ nhập kho đang hoạt động. Chưa triển khai chu trình đặt mua/duyệt/nhận hàng. |
| 15. Vận hành và dữ liệu lớn | Thống nhất API client; phân trang/tìm kiếm chứng từ phía server, lịch sử bán hàng phân trang; báo cáo lọc kỳ tại SQL cho các nguồn phù hợp và đọc theo trang. Thêm công cụ backup/restore Firebird và kiểm tra thực tế. |

## Kiểm tra đã hoàn thành

- Bộ kiểm thử backend: **187 bài, 174 đạt, 0 lỗi, 13 bỏ qua theo cấu hình**. Log: `backend/safety-fix-tests.log`.
- Kiểm thử frontend: **28 đạt, 0 lỗi**.
- Kiểm thử nghiệp vụ riêng trên Firebird thật: **1 đạt**, dữ liệu thử nằm trong transaction và được rollback. Kiểm tra tiền nhập, tồn kho, dòng bán trùng và kết quả idempotency lưu dạng BLOB.
- Build frontend thành công; còn cảnh báo kích thước bundle.
- `git diff --check` đạt.
- Migration `migrate_request_safety.js` đã chạy, bảng `APP_REQUESTS` đã được xác minh.
- Backup thật: `D:\Garage\backups\garage-2026-10-09T02-25-17-829Z.fbk` (183.004.160 byte).
- Restore sang database kiểm tra riêng: `D:\Garage\backups\verify-2026-10-09-022517.fdb` (200.704.000 byte), khôi phục và đọc xác minh thành công. Không ghi đè database đang vận hành.

Chưa thực hiện kiểm thử toàn bộ UI bằng nhiều tài khoản thật hoặc thử hai giao dịch Firebird đồng thời. Các kiểm tra trên không thay thế kiểm thử triển khai thực tế.

## Sau cập nhật

Refresh ứng dụng và đăng nhập lại một lần: token cũ thiếu phiên bản thông tin đăng nhập sẽ không còn được chấp nhận. Nhóm cần sửa bảo hành phải được bật quyền **Sửa**; người nhập/in chứng từ mua cần quyền **COST** phù hợp. Không tự cấp thêm quyền cho các nhóm đang có.

Secret và dữ liệu thu hồi phiên nằm trong `backend/storage/security/`, đã được loại khỏi Git. Giữ thư mục này ổn định khi khởi động lại/triển khai. Backup chứa dữ liệu thực nên cần lưu trữ riêng và kiểm soát quyền truy cập.

## Các chức năng vẫn còn thiếu

- Đơn đặt mua, duyệt mua và nhận từng phần/toàn bộ.
- Trả hàng, hoàn tiền gắn chứng từ gốc; kiểm kê có duyệt và chuyển kho.
- Nhập Excel, ảnh bảo hành và lịch sử sự kiện bảo hành đầy đủ.
- Nhật ký bất biến trước/sau cho mọi nghiệp vụ và quy trình duyệt/đảo giao dịch.
- Lịch sao lưu tự động: công cụ backup/restore đã hoạt động, chưa thiết lập lịch chạy định kỳ.

Đây là những luồng nghiệp vụ mới cần triển khai tiếp; không coi việc bỏ giao diện mẫu hoặc chặn thao tác không an toàn là đã hoàn thiện các luồng đó.
