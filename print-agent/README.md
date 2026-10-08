# GARA Print Agent 0.1.0

Windows 10 2004 trở lên, x64. Nhận PDF FastReport qua API GARA; in bằng Windows PDF renderer/GDI với driver máy in đã cài. Node điều phối, .NET helper và Windows Service riêng. Không dùng mã EXE KPRINT có sẵn hoặc gửi PDF dạng RAW.

## Cài đặt

1. Cài driver, bật và cắm USB máy in; kiểm tra tên/cổng trong Windows.
2. Máy phát triển: chạy `powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1` để tạo bản **Lite** trong `dist/`, kèm Node và các assembly ứng dụng; máy cài cần **.NET Desktop Runtime 8 x64**. Installer kiểm tra runtime trước khi dừng service. Cần .NET SDK và NuGet khi build, không cần SDK trên máy sử dụng.
   Dùng `build.ps1 -BundleRuntime` khi cần gói độc lập không yêu cầu cài .NET; helper và service dùng chung một bản runtime. Inno Setup chỉ đóng từ gói BundleRuntime.
3. Chạy `install-service.ps1` bằng PowerShell Administrator. Dịch vụ `GaraPrintAgent` dùng LocalService, tự khởi động và phụ thuộc Print Spooler. Thư mục chương trình nằm trong Program Files, dữ liệu/log nằm trong ProgramData/GARA Print Agent và được giới hạn quyền.
4. Mở `http://127.0.0.1:3790` trên PC máy in. Trong GARA → In chứng từ → Máy in & Agent, Admin tạo mã ghép 5 phút; nhập địa chỉ API và mã trong Agent.
5. GARA → Máy in & Agent: bật đúng máy, chọn khổ giấy và đặt mặc định theo từng loại chứng từ. Bấm In để gửi ngay; Xem bản in/Tải PDF riêng.

API phát triển cục bộ là `http://localhost:4000`. Sử dụng từ mạng khác cần API HTTPS truy cập được qua Internet; không mở cổng 3790 hoặc Firebird ra Internet. Chưa có tên miền nên chưa triển khai/nghiệm thu 4G.

## Vận hành

- `Get-Service GaraPrintAgent`: trạng thái service. `Stop-Service`/`Start-Service` bằng Administrator.
- `service.log`: log xoay tại 5MB. `jobs.json`: kết quả từng bản và spool ID; không xóa khi có lệnh chưa rõ kết quả. Credential trong config được DPAPI bảo vệ, không chia sẻ thư mục dữ liệu.
- Bản in được lưu trong Firebird, dọn nội dung PDF sau 7 ngày khi job đã kết thúc. In lại trong thời hạn dùng đúng PDF trước, không tạo lại từ dữ liệu đã sửa.
- Đã gửi máy in nghĩa spooler nhận, không khẳng định giấy đã ra. Crash/mất kết nối khi gửi chuyển Cần kiểm tra; kiểm tra giấy rồi mới bấm In lại.
- Máy bị tắt hoặc trạm offline không nhận job mới; job chờ tối đa 5 phút. Thu hồi trạm hủy các job chưa gửi và vô hiệu token.
- Gỡ: thu hồi trạm trong GARA; Administrator chạy `sc.exe stop GaraPrintAgent`, `sc.exe delete GaraPrintAgent`. Giữ ProgramData để đối chiếu; chỉ xóa có chủ ý sau khi xử lý các lệnh chưa rõ.
- Cập nhật: dừng service, thay đúng gói đã kiểm tra hash, giữ dữ liệu, khởi động lại. Không chạy hai Agent trên cùng cổng/dữ liệu.
- Output build `helper/bin`, `helper/obj`, `service/bin`, `service/obj` có thể xóa sau khi kiểm tra `dist/`; lần build tiếp theo tạo lại. Không xóa `data/` hoặc ProgramData để giảm dung lượng.
- Bản Lite tối ưu kích thước bộ cài; bộ đã cài trước đó trong Program Files vẫn hoạt động bình thường. Đổi sang Lite phải qua installer để cập nhật đường dẫn service. Máy có Node riêng vẫn dùng Node đóng gói để tránh phụ thuộc PATH/tài khoản Windows.

## Giới hạn bản đầu

- Đã thử TP80N-M USB001 với Lệnh sửa chữa 80mm. Các loại khác dùng cùng API/engine nhưng cần máy/giấy phù hợp và thử giấy thật trước khi dùng thường xuyên.
- Chạy service đã kiểm tra dưới LocalService; reboot/đăng xuất chưa được thực hiện trong phiên làm việc này.
- Chưa có tự cập nhật/tray icon hoặc tự phát hiện loopback từ web. Ghép một lần qua trang cấu hình cục bộ.
- Installer Inno Setup có source `installer.iss`; gói ZIP + PowerShell là cách cài hiện tại khi không có ISCC.
- Không crop PDF tự động hoặc thêm lệnh cắt ESC/POS. Độ dài/cắt giấy do mẫu PDF và driver TP80N-M quyết định.

Tài liệu API Microsoft dùng cho service/GDI: https://learn.microsoft.com/en-us/dotnet/api/system.serviceprocess.servicebase và https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-startdoca .
