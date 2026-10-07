# Kế hoạch GARA Print Agent trên Windows

> Đã được thay thế ngày 06/10/2026 bởi [kế hoạch dựa trên KPRINT R2.2.4](print-agent-plan-kprint.md). Nội dung dưới đây giữ lại để tham khảo hướng ban đầu.

## Mục tiêu

Máy in cắm USB vào máy tính Windows. Người dùng trên máy tính hoặc điện thoại ở mạng khác chọn chứng từ, máy in và nhấn In trong GARA. Agent nhận lệnh qua HTTPS và in qua driver Windows, không cần mở hộp thoại in trên máy tính.

Phạm vi bản đầu: một gara, một hoặc nhiều trạm Windows; PDF A4/A5, bill 54/80mm và tem mã vạch; chọn số bản; xem trạng thái và in lại có chủ ý. Tiếp tục giữ chức năng xem/tải PDF hiện có.

## Hiện trạng đã kiểm tra

- Frontend React có trang `/in-chung-tu` và hộp thoại in dùng chung `DocumentPrintDialog.jsx`.
- Backend Express có `/api/printing/:type/:id/pdf`, kiểm tra quyền Xem và In theo loại chứng từ.
- Dữ liệu nằm trong Firebird; backend dùng FastReport chạy trên Windows để tạo PDF.
- Chưa có hàng đợi in, tài khoản thiết bị, giao thức nhận lệnh hay chương trình gửi PDF đến máy in USB.

## Kiến trúc

Điện thoại / trình duyệt → GARA qua HTTPS → hàng đợi và PDF bất biến → Agent Windows → Windows Print Spooler → máy in USB.

Agent chỉ chủ động kết nối ra máy chủ. Không mở cổng máy in hoặc cổng điều khiển Agent ra Internet. Agent không truy cập Firebird và không nhận lệnh shell.

Bản đầu giữ backend/renderer trên Windows. Cần một địa chỉ HTTPS truy cập được từ Internet: máy chủ Windows hoặc kết nối tunnel có kiểm soát đến backend hiện tại. Chọn phương án triển khai trước khi nghiệm thu in bằng 4G. Không đưa Firebird lên Internet. Nếu backend vẫn nằm trên máy tính gara, máy đó cũng phải bật để điện thoại truy cập GARA.

## 1. Thử in trên máy thật trước

1. Liệt kê tên, driver và khổ giấy của các máy in được Windows nhận diện.
2. Kiểm tra một PDF bill 80mm, một chứng từ A4 và một tem mã vạch.
3. Chọn thư viện hoặc helper render PDF thành trang để in qua driver, kiểm tra giấy phép và đóng gói cùng Agent. Không mặc định gửi byte PDF dạng RAW cho mọi máy in USB.
4. Kiểm tra đúng kích thước, hướng giấy, lề, số bản và không xuất hiện hộp thoại tương tác.
5. Thử dưới tài khoản Windows Service thực tế, không chỉ dưới tài khoản đang đăng nhập.

Điều kiện hoàn thành: in ra giấy đúng nội dung, tem quét đúng mã và không bị co giãn ngoài cấu hình.

## 2. Xây Agent Windows

- C#/.NET Worker, chạy dưới Windows Service; chọn phiên bản .NET còn được hỗ trợ khi bắt đầu triển khai.
- Công cụ cấu hình riêng: ghép trạm với gara, chọn máy in, cấu hình khổ giấy, in thử, xem lỗi và ngắt kết nối.
- Agent khởi động cùng Windows, xử lý tuần tự theo từng máy in.
- Danh tính trạm và credential riêng, lưu bằng cơ chế bảo vệ của Windows; có thể thu hồi từ GARA.
- Lưu nhật ký và sổ công việc bền vững trên máy tính, đối chiếu job ID sau khi khởi động lại.
- Bản đầu hỏi công việc mới mỗi 2–5 giây; gửi heartbeat mỗi 30 giây. Máy chủ hiển thị trạm mất kết nối sau khoảng 90 giây không có heartbeat.
- Tải PDF bằng API đã xác thực, xác minh kích thước và hash trước khi in. Dọn file tạm theo thời hạn lưu cấu hình.

## 3. Bổ sung hàng đợi vào backend

Các thực thể dự kiến:

| Thực thể | Nội dung chính |
| --- | --- |
| PRINT_STATIONS | Trạm, gara, credential thiết bị, phiên bản, lần kết nối gần nhất, trạng thái |
| PRINT_PRINTERS | Máy in trên trạm, tên Windows, driver, cấu hình giấy, khả năng được trạm báo cáo |
| PRINT_JOBS | ID, người yêu cầu, loại/ID chứng từ, mẫu, máy in, số bản, trạng thái, lease, hash PDF, spool ID |
| PRINT_JOB_EVENTS | Lịch sử chuyển trạng thái, lỗi, lần thử và yêu cầu in lại |

Lưu PDF và cấu hình in tại thời điểm tạo lệnh. Thay đổi mẫu hoặc chứng từ sau đó không làm thay đổi công việc đã xếp hàng. Chốt nơi lưu file/PDF và thời hạn giữ khi triển khai; mặc định đề xuất giữ 7 ngày, nhật ký lâu hơn theo cấu hình.

API dự kiến:

- `POST /api/print-jobs`: kiểm tra quyền, tạo PDF và công việc với idempotency key.
- `GET /api/print-jobs/:id`: người dùng xem trạng thái theo quyền truy cập.
- `POST /api/print-jobs/:id/cancel`: hủy khi chưa bắt đầu gửi đến spooler.
- `POST /api/print-jobs/:id/reprint`: tạo công việc mới liên kết với bản trước, có xác nhận của người dùng.
- API thiết bị riêng cho ghép trạm, báo danh sách máy in, heartbeat, nhận lease công việc, tải PDF và báo kết quả.

Nhận công việc bằng transaction có khóa/lease để hai Agent không cùng nhận một lệnh. Phân biệt hoàn toàn token người dùng và credential thiết bị. Chỉ cấp mã ghép một lần, có hạn sử dụng và yêu cầu quyền quản trị.

## 4. Trạng thái và chống in trùng

Luồng chính: Đang tạo bản in → Chờ trạm in → Agent đã nhận → Đang gửi → Đã gửi đến máy in.

Trạng thái bổ sung: Tạo PDF lỗi, In lỗi, Đã hủy, Cần kiểm tra.

- Nhấn In nhiều lần hoặc gửi lại cùng request không tạo thêm công việc.
- Có thể thử lại tự động nếu lỗi xảy ra trước khi gửi đến spooler.
- Nếu mất điện/kết nối trong lúc gửi và không xác định được spool ID, chuyển Cần kiểm tra; không tự gửi lại vì có thể đã in.
- Sau khi gửi thành công, Agent lưu spool ID và kết quả cục bộ; nếu chưa báo được máy chủ, chỉ gửi lại báo cáo.
- “Đã gửi đến máy in” không đồng nghĩa giấy đã ra. Chỉ hiển thị xác nhận vật lý nếu driver/máy in cung cấp thông tin đủ tin cậy.
- Hủy sau khi gửi chỉ là yêu cầu hủy spool; không cam kết ngăn được tờ giấy đã bắt đầu in.

## 5. Giao diện GARA

- Trang In chứng từ: chọn trạm, máy in, khổ giấy theo cấu hình và số bản; thêm nút In qua Agent.
- Hiển thị trạm đang kết nối/mất kết nối và hàng đợi; cho phép xem PDF trước khi gửi.
- Giữ lựa chọn mẫu mặc định và ghi nhớ máy in theo người dùng/loại chứng từ.
- Các nút in trong xác nhận sửa chữa dùng cùng luồng, chọn sẵn phiếu hiện tại.
- Bill thanh toán dùng trạng thái công việc riêng. Nếu in lỗi, thử lại từ hóa đơn đã lưu, không thực hiện lại giao dịch thanh toán.
- Trang cấu hình quản lý ghép trạm, máy in mặc định, khổ giấy và quyền sử dụng.

## 6. Kiểm thử và phát hành

1. Kiểm thử quyền, ghép/thu hồi thiết bị, lease, idempotency và PDF bất biến.
2. Kiểm thử ngắt mạng trước/sau khi gửi spool, Agent khởi động lại, máy in bị rút USB, driver lỗi, hết giấy và trạm mất kết nối.
3. Kiểm tra số bản, kích thước bill và tem bằng giấy thật; quét mã vạch.
4. Điện thoại dùng 4G tạo lệnh; máy tính gara dùng mạng khác nhận lệnh và in USB.
5. Đóng gói bộ cài Agent, cấu hình tự khởi động, log chẩn đoán và gỡ cài đặt. Bản đầu cập nhật thủ công; chưa tự tải/chạy chương trình cập nhật từ lệnh in.

Điều kiện nghiệm thu: điện thoại không cần cùng Wi-Fi; máy tính không cần mở trình duyệt; lệnh in đúng máy, đúng chứng từ và số bản; trạng thái lỗi rõ ràng; sự cố không gây tự động in trùng.

## Thứ tự triển khai

1. Thử in cục bộ trên máy USB thật và chốt engine PDF.
2. Agent nhận lệnh từ backend cục bộ và gửi qua spooler.
3. Hàng đợi bền vững, bảo vệ thiết bị, phục hồi và chống gửi trùng.
4. Nút In qua Agent, cấu hình trạm và lịch sử công việc.
5. HTTPS từ Internet và nghiệm thu điện thoại dùng 4G.
6. Bộ cài, tài liệu vận hành và chạy thử tại gara.

Thông tin cần có cho bước 1: hãng/model máy in, tên driver trong Windows, khổ giấy sử dụng và các máy in cần hỗ trợ. Chưa cài dịch vụ, thay đổi mạng hoặc triển khai máy chủ trong giai đoạn lập kế hoạch này.

## Tài liệu kỹ thuật

- Windows Worker Service: https://learn.microsoft.com/en-us/dotnet/core/extensions/windows-service
- Windows Print Spooler: https://learn.microsoft.com/en-us/windows/win32/printdocs/startdocprinter
- RAW là dữ liệu ngôn ngữ máy in: https://learn.microsoft.com/en-us/windows-hardware/drivers/print/raw-data-type
