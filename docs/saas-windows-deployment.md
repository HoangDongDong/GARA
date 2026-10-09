# Chuẩn bị máy chủ Windows cho Garage SaaS

Phạm vi: cấu hình đã chuẩn bị trong repository; chưa thuê máy chủ, mua tên miền, gửi email hoặc cài Windows service. Không có mật khẩu/API key thật trong tài liệu.

## Kiến trúc hosting

Một Windows server chạy Firebird, một backend Node, một worker Node và Caddy làm HTTPS/static frontend. Backend bind `127.0.0.1:4000`; Firebird không mở ra Internet. Chỉ proxy nhận lưu lượng web. Bản đầu chỉ chạy một backend vì phiên thu hồi và một số cache chưa phân tán.

Chốt cấu hình CPU/RAM/SSD sau phép đo tải pilot; dung lượng phải tính cả database từng tenant, file và backup. Cần tài khoản chạy dịch vụ riêng với quyền cần thiết và backup ngoài máy chủ. Kiểm tra phiên bản Firebird, Node và bộ renderer phù hợp trên máy chủ trước khi nhận khách.

Cấu hình Caddy theo [tài liệu reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) và [chạy trên Windows](https://caddyserver.com/docs/running). XML service sử dụng [WinSW](https://github.com/winsw/winsw/blob/v3/docs/xml-config-file.md). Lịch backup dùng [Windows ScheduledTasks](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasktrigger).

## Cấu hình ứng dụng

1. Cài Node, Firebird và bộ FastReport renderer; đưa source/build lên máy chủ, cài dependency và build frontend.
2. Khôi phục backup cửa hàng hiện tại sang database mới trên máy chủ nếu cần đưa cửa hàng này lên cùng hệ thống. Không copy file database đang mở. Cập nhật FB_HOST/FB_DATABASE/credential trong `backend/.env`.
3. Gộp các khóa trong `backend/.env.saas.example` vào `.env`; không ghi đè các khóa cũ một cách máy móc. Chọn SAAS_DATA_ROOT có quyền ghi cho Firebird/worker và được bảo vệ khỏi truy cập web.
4. Giữ `SAAS_ENABLED=false`, `SAAS_REGISTRATION_ENABLED=false` trong lúc chuẩn bị. Chạy trong thư mục backend:

```powershell
npm run saas:init
npm run saas:template:source
npm run saas:logins
```

Trên máy phát triển hiện tại hai lệnh đã chạy; không chạy tạo lại template trên file đã có. Manifest hiện trỏ tới mẫu sạch seed 3. Tool tạo database nền tảng bằng isql dialect 3 để tương thích Firebird 2.5.

5. Cấu hình mật khẩu quản trị nền tảng dưới dạng hash scrypt vào `SAAS_ADMIN_PASSWORD_HASH`. Dùng hàm hashPassword của ứng dụng qua công cụ quản lý secret an toàn trên máy chủ; không đặt mật khẩu mặc định hoặc đưa secret vào Git. AUTH_TOKEN_SECRET/thư mục security phải ổn định qua các lần restart.
6. Đặt SAAS_PUBLIC_URL, SAAS_TERMS_URL và SAAS_PRIVACY_URL thành URL HTTPS thật. Công bố điều khoản/chính sách; không đặt liên kết rỗng khi mở đăng ký.
7. Tích hợp dịch vụ email qua SAAS_MAIL_WEBHOOK (HTTPS) và SAAS_MAIL_TOKEN. Hợp đồng gửi:

```http
POST <SAAS_MAIL_WEBHOOK>
Authorization: Bearer <SAAS_MAIL_TOKEN>
Content-Type: application/json

{"to":"owner@example.com","subject":"Xác minh cửa hàng KAZUKO","text":"Nội dung và liên kết xác minh"}
```

Dịch vụ cần chấp nhận gửi đúng người nhận, trả 2xx khi nhận yêu cầu hợp lệ, thiết lập tên miền gửi/SPF/DKIM theo nhà cung cấp. Adapter phải ánh xạ payload nếu provider yêu cầu thêm trường from hoặc cấu trúc khác. Đây là tích hợp gửi, chưa có theo dõi delivery/bounce. Test hiện mô phỏng HTTP; cần thử email thật trước khi mở đăng ký. API không trả mã xác minh cho người đăng ký.

8. Chạy `node tools/saas-preflight.js`. Cấu hình thiếu báo PENDING và exit 1. Sau khi kiểm tra đạt, bật SAAS_ENABLED=true cho pilot, vẫn giữ đăng ký công khai false đến khi thử email/pilot hoàn thành. Đăng nhập bằng tên tài khoản; danh bạ nền tảng tự nhận diện cửa hàng; người dùng cần đăng nhập lại, agent cần ghép lại.

## Chuẩn bị service, HTTPS và lịch backup

Chuẩn bị Caddy và WinSW từ nguồn chính thức. Với đường dẫn thực trên máy chủ:

```powershell
.\ops\windows\prepare-host.ps1 `
  -ProjectRoot 'D:\Garage\garage-app' `
  -Domain 'garage.example.com' `
  -NodeExe 'C:\Program Files\nodejs\node.exe' `
  -CaddyExe 'D:\Tools\caddy.exe'
```

Script tạo Caddyfile, 3 XML service (API/worker/proxy) và XML task backup, không cài hoặc chạy chúng. `garage.example.com` là ví dụ, cần thay tên miền thật. Output mặc định `ops/windows/generated`, đã bỏ khỏi Git.

Đặt các bản WinSW executable tương ứng cạnh XML và cài bằng quy trình WinSW; thiết lập tài khoản dịch vụ/quyền file trước khi start. Caddy cần DNS trỏ đúng máy và cổng HTTPS/HTTP theo cấu hình chứng chỉ. Kiểm tra proxy chỉ phục vụ frontend/dist, không phục vụ source/backend/database.

Import task backup từ XML bằng Task Scheduler, chọn tài khoản có quyền đọc cấu hình/backup và chạy khi không đăng nhập. Lịch đề xuất **03:00 hằng ngày theo múi giờ Windows server**, đặt server Asia/Bangkok hoặc múi giờ UTC+7 tương ứng. Task không chạy song song với chính nó; chạy bù khi máy sẵn sàng. Task hiện chưa cài.

Các lệnh vận hành:

```powershell
npm run saas:worker
npm run saas:backup
node tools/saas-backup-verify.js <backup-id>
```

Lệnh verify restore sang file mới trong restore-checks, không ghi đè database đang dùng. Bản restore được giữ riêng để kiểm tra, operator xử lý lưu giữ theo chính sách. Cần thêm lịch verify, offsite, mã hóa, cảnh báo backup thất bại và quy trình phục hồi định kỳ.

## Đăng ký trực tiếp trên máy hiện tại — cập nhật 09/10/2026

Theo yêu cầu mở đăng ký trước, backend/.env hiện bật SAAS_ENABLED=true, SAAS_REGISTRATION_ENABLED=true, SAAS_REGISTRATION_MODE=instant và SAAS_EMBEDDED_WORKER=true. Trang http://localhost:5173/dang-ky tạo cửa hàng trực tiếp, không gửi email xác minh; thời hạn dùng thử vẫn 14 ngày từ lúc khởi tạo thành công. Không giới hạn tổng số cửa hàng đăng ký; mỗi IP có giới hạn 300 yêu cầu đăng ký/giờ. Email, số điện thoại đã chuẩn hóa và mã cửa hàng có ràng buộc chống trùng tại database nền tảng.

Trang http://localhost:5173/nen-tang quản lý cửa hàng và gia hạn. Khi chưa có mật khẩu, trang cho thiết lập lần đầu trên localhost với mật khẩu tối thiểu 12 ký tự. Hash được lưu riêng trong backend/storage/security/platform-admin-password, không dùng tài khoản Admin của cửa hàng. Chọn cửa hàng → Quản lý → Gia hạn → nhập số ngày và lý do → Lưu thay đổi. Cửa hàng hiện tại đăng nhập bằng tên tài khoản cũ, không cần nhập mã cửa hàng.

Email và số điện thoại trong chế độ instant chưa được xác minh quyền sở hữu. Chuyển SAAS_REGISTRATION_MODE=email nếu muốn bắt buộc email xác minh sau khi tích hợp dịch vụ gửi thư. Trên máy chủ có worker service riêng, đặt SAAS_EMBEDDED_WORKER=false. Các yêu cầu HTTPS/mail bên dưới áp dụng cho phương án triển khai Internet có xác minh email.

## Các điều kiện trước khi mở công khai

- Gửi/nhận được email thật; xác minh/khởi tạo/retry và hết hạn hoạt động qua tên miền.
- Kiểm thử UI theo nhiều vai trò, cách ly JSON/PDF/ảnh/agent và tải đồng thời; kiểm thử trên môi trường hosting.
- Backup và restore một tenant thử đạt, kiểm tra backup nền tảng; ghi nhận RPO/RTO mong muốn.
- Cấu hình tài khoản DB/Windows, firewall, secret và quyền lưu trữ phù hợp.
- Chốt hạn mức tài khoản/dung lượng, chính sách dữ liệu và quy trình hỗ trợ; hoàn thiện hạn mức cùng registry rollout migration trước khi mở rộng số khách hoặc nâng cấp schema.
- Bản đầu dùng mẫu in chuẩn; chưa mở chạy FRX khách tự tải vì chưa có renderer được cách ly.

Khi các điều kiện đạt, mới đặt `SAAS_REGISTRATION_ENABLED=true` và restart API/worker theo lịch triển khai. Không cần sửa dữ liệu cửa hàng hiện tại để tạo tenant mới.

## Tên đăng nhập riêng và tự nhận diện cửa hàng

Trang /login chỉ yêu cầu tên đăng nhập và mật khẩu. Đăng ký mới có ô tên đăng nhập 3–60 ký tự, duy nhất toàn nền tảng và không phân biệt chữ hoa/thường. SAAS_LOGINS lưu định tuyến tới tenant/user; mật khẩu vẫn nằm trong SUSER của từng cửa hàng. API xác minh mật khẩu, trạng thái tài khoản và tên cục bộ sau khi chọn database từ danh bạ, rồi cấp token chứa tenant ID. Tạo/đổi tên nhân viên đặt trước tên toàn hệ thống; lỗi ghi tài khoản rollback phần đặt tên. Khóa tài khoản vẫn giữ tên đã cấp.

Sau saas:init, chạy npm run saas:logins để nhập tài khoản đã có. Lệnh có thể chạy lại; không sửa mật khẩu hoặc dữ liệu nghiệp vụ. Chủ các cửa hàng cũ có SUSER tên owner được cấp tên đăng nhập là mã cửa hàng (ví dụ kzauto1); tài khoản legacy giữ tên nếu chưa trùng, trường hợp trùng dùng tên có tiền tố mã cửa hàng. API vẫn nhận tenantCode để tương thích client cũ, giao diện mới tự nhận diện. Khi đăng ký xong và khởi tạo thành công, tự chuyển sang đăng nhập với tên đã chọn và mật khẩu đang giữ trong bộ nhớ trang.

Danh bạ không thay thế identity/membership cho một người tham gia nhiều cửa hàng. Thao tác đổi tên trải qua hai database; nếu tenant đã commit nhưng commit danh bạ thất bại, đăng nhập bị từ chối khi tên không khớp. Cần operator đối soát bản ghi trước khi thử lại; chưa có transaction phân tán tự phục hồi.
