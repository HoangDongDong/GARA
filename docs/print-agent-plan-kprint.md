# Kế hoạch GARA Print Agent dựa trên KPRINT R2.2.4

Cập nhật 06/10/2026. Kế hoạch này thay thế hướng triển khai trong `print-agent-plan.md`. Chưa chạy EXE, cài Agent hoặc thay đổi mạng/máy in.

## Trải nghiệm cần đạt

Cài Agent trên PC có máy in USB, ghép gara và đặt máy in mặc định một lần. Sau đó chọn chứng từ/mẫu và bấm **In** trong GARA: máy nhận lệnh và in mà không mở hộp thoại PDF. Điện thoại dùng 4G hoặc mạng Wi-Fi khác gửi được lệnh qua backend HTTPS.

Giữ ba hành động riêng: **Xem bản in**, **In**, **Tải PDF**. Nút In lệnh sửa chữa trong Xác nhận sửa chữa dùng cùng cơ chế, chọn sẵn phiếu hiện tại. Biểu tượng in trong trình xem PDF vẫn thuộc trình duyệt; nút In riêng của GARA mới đi qua Agent.

Máy tính, Agent và máy in phải hoạt động. Bản đầu từ chối tạo job mới nếu trạm offline hoặc máy in bị tắt; không âm thầm tích lũy để in bù sau nhiều giờ. Job đã nhận nhưng gặp sự cố có trạng thái và hạn chờ rõ ràng.

## Những gì đã kiểm tra trong bộ tham khảo

Nguồn: `D:/Garage/KZPOS_KPRINT_R2_2_4_SERVICE_PRINTER_BUILD_KIT`.

| Thành phần | Hiện trạng trong nguồn | Cách áp dụng |
| --- | --- | --- |
| `kprint/server.js` | Node.js, loopback 127.0.0.1:3788, ticket ghép thiết bị, token, poll/claim/status/heartbeat | Tận dụng cấu trúc điều phối, thay API KZPOS bằng API GARA |
| Cấu hình máy in | Tên Windows, số bản, kênh bật/tắt, định tuyến nhóm hàng | Chuyển sang định tuyến theo loại chứng từ và hồ sơ giấy |
| `print-win.js`, `ps-worker.ps1`, `escpos.js` | HTML/layout → ảnh → ESC/POS → RAW qua spooler | Tham khảo cho máy bill tương thích; thêm đường in PDF FastReport |
| `cdp-edge.js` | Edge/Chrome chụp HTML | Không dùng làm engine PDF mặc định |
| `kprint.iss`, VBS, `tray.ps1` | LocalAppData, Startup theo người dùng, khay hệ thống | Tận dụng cách đóng gói/cấu hình, tạo sản phẩm riêng |

Các giới hạn cần xử lý:

- “Service” trong bản này là kênh In dịch vụ, không phải Windows Service. Bộ cài khởi động khi người dùng đăng nhập; chưa chứng minh chạy trước đăng nhập hoặc sau đăng xuất.
- Không thấy đường nhận/in PDF trong `print-win.js`. Khổ hiện chủ yếu 57/58, 80, 80plus; chưa coi là hỗ trợ A4/A5, 54mm và tem GARA.
- `printed.json` giữ khoảng 400 ID, ghi nhận trước khi gửi. Nhánh lỗi báo status sau khi đã gửi RAW có thể xóa ID đã nhớ. Cần tách lỗi in khỏi lỗi báo kết quả và lưu nhật ký bền vững.
- Helper khai báo `StartDocPrinter` trả bool, không lấy spool job ID; cần sửa chữ ký, kiểm tra số byte đã ghi và giải phóng tài nguyên khi lỗi.
- Token lưu trong JSON; cần bảo vệ credential bằng Windows và hỗ trợ thu hồi.
- CORS cấp header theo origin nhưng chưa chặn mọi request ngoài danh sách. Cần kiểm tra Host/Origin, giới hạn body và xác thực thao tác thay đổi cấu hình/in thử.
- Kit không có backend KZPOS thực thi claim/routes, nên chưa xác minh tính nguyên tử của claim hoặc quy tắc kênh tắt ở máy chủ.
- Có stage, backup và nhiều EXE: kế hoạch tham khảo nguồn `kprint/`, không khẳng định mọi EXE chứa đúng nguồn này.

## Kiến trúc được chọn

Giữ **Node.js** cho điều phối Agent, API và giao diện cấu hình để tận dụng KPRINT. Dùng **helper Windows** cho render PDF và giao tiếp spooler; chưa viết lại toàn bộ Agent bằng C#.

Tạo sản phẩm riêng trong `print-agent/` của garage-app: AppId, thư mục dữ liệu, runtime và cổng loopback riêng sau khi kiểm tra xung đột. Không dùng token, địa chỉ kzpos.com hoặc Startup của KPRINT đang có.

Luồng: **Máy tính/điện thoại → GARA HTTPS → hàng đợi và PDF cố định → Agent chủ động nhận → helper → Windows spooler → USB**.

Agent không truy cập Firebird, không mở cổng ra Internet. Ghép qua loopback chỉ làm trên PC cài Agent; điện thoại gọi backend, không gọi localhost của điện thoại.

Backend FastReport hiện chạy Windows. Cần máy chủ Windows có HTTPS hoặc tunnel được cấu hình tới backend gara. Nếu backend vẫn ở PC gara, PC đó phải bật. Không đưa Firebird lên Internet.

## 1. Thử PDF và máy in USB thật

1. Kiểm kê model, driver, tên máy Windows, khổ giấy/DPI; bắt đầu với bill 80mm.
2. Dùng PDF FastReport GARA hiện có, giữ mẫu/logo/tiếng Việt; không dựng lại bằng HTML KZPOS.
3. Chọn engine PDF/helper sau khi kiểm tra giấy phép; render/in qua driver và lấy spool ID khi có thể.
4. In 80mm, A4/A5 và tem; kiểm tra kích thước, lề, số bản, cắt giấy và quét mã vạch.
5. Với ESC/POS đã thử: có thể PDF → raster đúng DPI → ESC/POS → RAW. Không gửi PDF nguyên dạng RAW, không mặc định mọi máy 80mm là 576 dots.
6. Khổ 54mm có hồ sơ riêng; tem giữ kích thước/khoảng cách nhãn, không crop như bill.

Đầu ra: giấy thật đúng mẫu, không hộp thoại; engine đã chọn trước khi đóng bộ cài.

## 2. Backend hàng đợi và giao thức GARA

| Bảng dự kiến | Nội dung |
| --- | --- |
| PRINT_STATIONS | Trạm, credential đã băm, phiên bản, heartbeat, thu hồi |
| PRINT_PRINTERS | Máy in thuộc trạm, tên Windows, driver, giấy/DPI, bật/tắt |
| PRINT_ROUTES | Loại chứng từ → trạm/máy in/hồ sơ giấy mặc định |
| PRINT_JOBS | Người yêu cầu, loại/ID/mẫu, PDF/hash, số bản, trạng thái, lease, spool ID |
| PRINT_JOB_EVENTS | Nhật ký chuyển trạng thái/lỗi/in lại |

API người dùng: tạo job, trạng thái/lịch sử, hủy trước khi gửi, in lại có chủ ý; quản trị ghép/thu hồi và định tuyến. API Agent riêng: đổi ticket một lần, báo máy in, heartbeat, claim có lease, tải PDF, báo kết quả.

- Kiểm tra quyền Xem/In, trạm và máy đang bật; idempotency key chống nhấn đúp.
- Tạo PDF một lần với dữ liệu/mẫu tại thời điểm yêu cầu; lưu bản/hash và cấu hình cố định. Sửa chứng từ sau đó không đổi job đã tạo.
- Claim bằng transaction; định tuyến theo ID trạm/máy, không chỉ tên Windows vì hai PC có thể trùng tên.
- Tắt kênh/máy: ngăn job mới và hủy job chưa bắt đầu gửi theo chính sách rõ ràng; bật lại không tự in bù.
- Poll đề xuất 1–2 giây khi hoạt động, backoff lúc mất mạng; heartbeat 30 giây, offline khoảng 90 giây. Đo tải trước khi chốt, không sao chép poll 450ms.
- Job chờ có hạn; không tự chuyển sang máy khác. Thời hạn lưu PDF đề xuất 7 ngày, cấu hình lại khi triển khai.

## 3. Agent và chống in trùng

Tách cấu hình, credential, API, hàng đợi, nhật ký, engine và UI cục bộ. Xử lý tuần tự theo từng máy in; giới hạn số job tải/render đồng thời.

Trạng thái: **Đang tạo → Chờ trạm → Đã nhận → Đang gửi → Đã gửi máy in**; thêm **Lỗi**, **Hủy**, **Hết hạn**, **Cần kiểm tra**.

Ghi nhật ký bền vững trước/sau gửi spooler. Gửi thành công nhưng mất mạng báo cáo thì chỉ gửi lại báo cáo, không xóa bằng chứng để in lại. Crash giữa lúc gửi mà chưa biết kết quả phải chuyển Cần kiểm tra, không tự thử lại. Với nhiều bản, lưu kết quả từng bản để tránh in lại toàn bộ khi lỗi giữa chừng.

“Đã gửi máy in” chỉ nghĩa spooler đã nhận; không khẳng định giấy đã ra. Chỉ báo hết giấy/trạng thái vật lý khi driver cung cấp dữ liệu tin cậy.

Credential được Windows bảo vệ, có thể thu hồi; loopback kiểm tra Host/Origin và xác thực thao tác sửa cấu hình. URL server chỉ thiết lập qua ghép đã xác thực. Không nhận shell/script tùy ý từ job.

## 4. Giao diện một lần bấm

- Cấu hình → Máy in & Agent: tải bộ cài, ghép, online/offline, danh sách máy, mặc định theo loại chứng từ, giấy/số bản, in thử.
- Không yêu cầu nhập tenant ID/token. Nếu trình duyệt không tự phát hiện loopback, hỗ trợ mã ghép ngắn hạn trong công cụ cấu hình.
- `/in-chung-tu`: tất cả loại được quyền dùng; **In** tạo job ngay với mẫu/máy mặc định, không bắt xem PDF trước; có lựa chọn đổi máy/số bản.
- Tách **Tải PDF** khỏi **In**, sửa hướng dẫn đang yêu cầu mở PDF rồi in.
- **In lệnh sửa chữa** trong footer Xác nhận sửa chữa dùng phiếu hiện tại; giữ Chưa xác nhận bên trái và Xác nhận sửa chữa bên phải.
- Hiện trạng thái và lịch sử/in lại. Thanh toán lưu trước rồi tạo job; lỗi in không thực hiện lại giao dịch.

## 5. Chạy nền và bộ cài

Mốc thử nghiệm dùng nền theo tài khoản Windows như KPRINT để xác minh driver. Mốc phát hành mục tiêu là **Windows Service**, nhận lệnh khi chưa đăng nhập/đã đăng xuất.

Chọn service host cho Node có giấy phép phù hợp; tách tray/UI khỏi service. Thử helper PDF và quyền máy in dưới tài khoản service thực tế. Nếu chưa đạt, bản thử nghiệm ghi rõ cần đăng nhập Windows.

Tận dụng Inno Setup nhưng đổi AppId/tên/đường dẫn/cổng và khóa runtime. Bộ cài service cần quyền cài dịch vụ, không kế thừa `PrivilegesRequired=lowest`. Chỉ dừng đúng Agent khi gỡ, không kill chung node.exe; giữ nhật ký cần phục hồi. Bản đầu cập nhật thủ công với hash gói phát hành.

## 6. Nghiệm thu và thứ tự triển khai

1. POC PDF/USB: giấy thật đúng mẫu 80mm, A4/A5, tem quét được.
2. Queue + Agent Node: demo **Lệnh sửa chữa 80mm** một lần bấm.
3. Lease, credential, nhật ký và phục hồi: nhấn đúp, rút USB, mất mạng, crash sau spool không tự in trùng; hai trạm trùng tên máy không lấy job nhau.
4. Cấu hình và nút In dùng chung: hỗ trợ toàn bộ loại chứng từ theo máy/giấy phù hợp; tắt/bật không in bù.
5. Service + installer: đóng browser vẫn in, reboot chưa đăng nhập/đăng xuất vẫn nhận lệnh.
6. HTTPS + điện thoại 4G: bấm In, PC mạng khác nhận và in USB không hộp thoại; kiểm tra thu hồi thiết bị và quyền người dùng.

Thông tin cần chốt lúc POC: model/driver máy USB, khổ giấy thật, máy tem nếu có và địa chỉ GARA dùng từ điện thoại. Chưa ấn định thời gian trước khi thử engine trên máy thật.
