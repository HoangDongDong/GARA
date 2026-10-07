# Tiến độ GARA Print Agent — 06/10/2026

Kế hoạch áp dụng: `print-agent-plan-kprint.md`.

## Đã triển khai

- Hàng đợi Firebird riêng: trạm, mã ghép một lần, máy in, định tuyến, công việc và lịch sử.
- Token thiết bị riêng, máy chủ giữ hash; Windows lưu credential qua DPAPI và giới hạn quyền thư mục dữ liệu.
- Agent Node chủ động nhận công việc; PDF FastReport cố định/hash; lease và idempotency; nhật ký cục bộ từng bản.
- Helper Windows dùng PDF renderer của Windows, GDI và spool ID. Không cần trình duyệt hay gửi byte PDF RAW.
- Windows Service `GaraPrintAgent`, tài khoản LocalService, Automatic, phụ thuộc Spooler; dừng có kiểm soát, log xoay.
- Trang In chứng từ đủ 18 loại; chọn máy/số bản, In trực tiếp, Xem bản in, Tải PDF; quản trị ghép/bật/tắt/mặc định/thu hồi Agent.
- TP80N-M được đặt mặc định cho 7 loại đang có mẫu mặc định 80mm (6 loại sửa chữa/xuất kho và hóa đơn bán hàng); không đổi mẫu A4/tem.
- In lại dùng đúng PDF của job trước; lỗi in không chạy lại thanh toán. PDF kết thúc được dọn sau 7 ngày.
- Gói runtime self-contained, ZIP cài bằng PowerShell và source Inno Setup; tài liệu vận hành tại `print-agent/README.md`.

## Bằng chứng kiểm tra

- Windows nhận TP80N-M / USB001.
- Bản thử LSC26/00018 đã ra giấy, người dùng xác nhận nội dung đúng.
- Nút In trên giao diện gửi LSC26/00017 qua service LocalService; đã nhận spool ID 3, không có popup trình duyệt. Người dùng xác nhận giấy ra và bố cục đúng.
- Frontend build thành công. 18 kiểm thử chọn lọc hàng đợi/PDF/chứng từ/mã vạch qua; kiểm thử in lại giữ nguyên PDF/hash và idempotency qua.
- Đã thử ghép một lần, credential sai, thiếu quyền, claim, hủy sau nhận, lease hết trong lúc gửi, thu hồi và báo kết quả lặp lại.
- Hai kiểm thử nhật ký Agent xác minh mất mạng sau spool chỉ báo lại kết quả, và lệnh đã hủy trên server không chặn các lệnh sau.

## Chưa nghiệm thu

- Người dùng chưa có tên miền: chưa triển khai HTTPS Internet, chưa thử điện thoại 4G.
- Chưa reboot/đăng xuất máy trong phiên làm việc; service đang Running/Automatic và đã thử dưới LocalService.
- Chưa thử giấy thật A4/A5/54mm/tem hoặc các model máy khác. Không mặc định máy bill in được giấy A4/tem.
- Chưa thử rút USB, hết giấy và crash thật ở mọi thời điểm; trạng thái/phục hồi đã kiểm tra bằng integration fixture.
- Chưa có tự cập nhật, tray icon hoặc tự phát hiện Agent từ web. Ghép qua trang loopback trên máy in.
- Không có ISCC sẵn trên máy nên chưa build EXE Inno; bộ cài hiện giao dưới dạng ZIP + Install.cmd/PowerShell.

Không tuyên bố đã in ra giấy khi chỉ có trạng thái spooler; lỗi/không rõ kết quả không tự gửi lại.
