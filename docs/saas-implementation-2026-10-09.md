# Kết quả triển khai nền tảng SaaS — 09/10/2026

## Trạng thái hiện tại

Đã triển khai và kiểm thử nền dữ liệu nhiều khách hàng cùng luồng dùng thử trong mã nguồn. Chế độ nhiều khách hàng và đăng ký công khai **chưa bật trên cửa hàng đang vận hành**. Chưa có máy chủ/tên miền/dịch vụ email, theo thông tin chủ dự án; đã chuẩn bị phương án chạy Windows.

Database quản lý nền tảng: `D:\Garage\saas\platform-v1.fdb`. Cửa hàng cũ được ánh xạ thành tenant `legacy`, mã đăng nhập dự kiến `kazuko`; chưa di chuyển dữ liệu hoặc tài khoản của cửa hàng cũ. Database mẫu sạch: `D:\Garage\saas\template-seed3.fdb`; manifest đang dùng: `D:\Garage\saas\template-current.json`. Các mẫu thử trước đó giữ riêng để chẩn đoán, không được dùng để tạo khách mới.

## Những phần đã làm

- Kết nối Firebird theo context tenant bất biến; không thay đổi đường dẫn database toàn cục theo request. Khi bật SaaS, thiếu tenant bị từ chối. Pool tối đa 20 tenant mặc định, 3 kết nối/pool, thu hồi pool nhàn rỗi; quá giới hạn trả lỗi để thử lại.
- Database nền tảng có tenant, job khởi tạo, lịch sử sao lưu và nhật ký quản trị. Email có khóa hash duy nhất để tương thích giới hạn chỉ mục Firebird 2.5.
- Đăng nhập cần mã cửa hàng; token gắn tenant và audience. Quyền Admin của cửa hàng và quản trị nền tảng tách biệt. Tài khoản cũ tiếp tục dùng database hiện tại khi chưa bật SaaS.
- Đăng ký kiểm tra thông tin, mật khẩu, điều khoản; email xác minh chỉ lưu hash, có hạn 24 giờ. Có gửi lại xác minh. Tích hợp email qua webhook HTTPS cấu hình phía máy chủ; không trả mã xác minh trong API công khai.
- Worker khởi tạo database riêng từ backup sạch đã kiểm tra hash, tạo tài khoản `owner`, cập nhật tên/email cửa hàng và kích hoạt 14 ngày dùng thử khi hoàn thành. Job có lease, retry và giới hạn số lần; Admin có thể thử lại job thất bại. Tài nguyên tạo dở không bị tự ghi đè.
- Template lấy **metadata** từ schema hiện tại; không lấy hàng dữ liệu nghiệp vụ. Seed dùng định nghĩa và mẫu FRX trong repository. Kiểm tra mọi bảng ngoài danh sách seed phải trống trước khi phát hành mẫu.
- Chặn ghi nghiệp vụ khi hết hạn ngay tại backend, cho phép đọc. Đổi mật khẩu và logout vẫn được dùng để bảo vệ tài khoản. Khóa tenant chặn truy cập. Gia hạn thủ công không thay đổi dữ liệu nghiệp vụ.
- Màn hình đăng ký `/dang-ky`, đăng nhập theo mã cửa hàng, banner thời hạn và quản trị nền tảng `/nen-tang` có API thật. Quản trị có gia hạn, khóa/mở, retry và xem job/backup/audit.
- Tách màn hình thanh toán phụ, cache thông tin công ty, snapshot báo cáo, backup mẫu in, dữ liệu nháp và khóa retry theo tenant. Không dùng thông tin công ty cửa hàng cũ làm mặc định cho tenant mới.
- Ghép print agent theo tenant; khi chuyển sang SaaS cần ghép lại agent. Cấm dùng token quản trị nền tảng để đọc nghiệp vụ.
- API SaaS dùng `private, no-store` và phân biệt Authorization để giảm nguy cơ cache hình/chứng từ cùng ID giữa các cửa hàng. Đổi đăng nhập ở tab khác sẽ tải lại để bỏ biểu mẫu phiên cũ.
- Có lệnh backup tất cả tenant và database nền tảng; lệnh restore kiểm tra sang database mới, ghi nhận thời gian xác minh. Có cấu hình Windows service/proxy và lịch backup để cài trên máy chủ tương lai.

## Kiểm chứng

- Toàn bộ backend: **192 bài, 179 đạt, 0 lỗi, 13 bỏ qua theo cấu hình**, có bật kiểm thử SaaS Firebird thật. Log: `backend/saas-tests.log`.
- Frontend: **31 đạt, 0 lỗi**, gồm cách ly nháp/khóa retry và chặn biểu mẫu tab cũ gửi bằng token cửa hàng mới. Log: `frontend/saas-tests.log`.
- Build frontend thành công; vẫn có cảnh báo bundle lớn.
- Kiểm thử Firebird SaaS riêng sau đó đạt: đăng ký/xác minh được mô phỏng email, khởi tạo hai database thật, request đồng thời không lẫn dữ liệu, cùng ID tài khoản/khách hàng vẫn cách ly, cache công ty và file backup mẫu riêng biệt, snapshot báo cáo không đọc chéo.
- Đã kiểm thử API quản trị gia hạn/khóa, chặn ghi sau hết hạn, token sai audience và token thiếu tenant; backup/restore tenant thử thành công và ghi nhận xác minh.
- Dữ liệu/tài khoản/token kiểm thử chỉ thuộc database thử mới tạo. Không đăng nhập bằng tài khoản thật hoặc gửi email thật.
- Preflight đạt database nền tảng, mẫu sạch, frontend build và renderer. Còn chờ mật khẩu quản trị nền tảng, tên miền HTTPS, chính sách và dịch vụ email.

Chưa kiểm thử đầy đủ giao diện nhiều vai trò hoặc tải production. Cấu hình Windows đã được chuẩn bị, chưa cài service, task hoặc proxy trên máy chủ thực.

Trong lúc tạo database nền tảng thử ban đầu bằng driver, Firebird gặp lỗi tạo chỉ mục và Guardian khởi động lại dịch vụ. Bootstrap đã chuyển sang isql dialect 3; database nền tảng mới và các lần tạo tenant/backup/restore sau đó đạt. File thử ban đầu không được sử dụng. Endpoint health cửa hàng hiện tại đã được kiểm tra lại sau kiểm thử; không có thao tác ghi nghiệp vụ vào database cửa hàng trong đợt này.

## Giới hạn của bản triển khai này

- Định danh người dùng còn theo từng tenant/SUSER; chưa có identity/membership chung để một người chuyển giữa nhiều doanh nghiệp mà không đăng nhập lại. Đã bổ sung danh bạ tên đăng nhập duy nhất để tự chọn cửa hàng; chưa có một identity tham gia nhiều doanh nghiệp.
- Có dùng thử và gia hạn thủ công; chưa có catalog giá/gói thương mại, hạn mức tài khoản/dung lượng theo gói hoặc thanh toán online.
- Có phiên bản schema trên tenant và mẫu sạch hiện tại; chưa có hệ thống rollout migration tự động cho toàn bộ tenant. Cần hoàn thiện trước khi phát hành các lần nâng cấp schema tiếp theo.
- Bản SaaS chỉ dùng bộ mẫu in chuẩn. API chỉnh sửa/tải FRX tùy ý và preview nội dung tùy ý bị chặn khi bật SaaS, vì bộ dựng FastReport cần được cách ly trước khi nhận template do khách cung cấp. Cửa hàng cục bộ vẫn giữ trình thiết kế hiện tại.
- Backup hiện lưu trong thư mục riêng; cần quyền truy cập, mã hóa/offsite, chính sách lưu giữ và cảnh báo vận hành trước production. Lịch backup chưa được cài trên máy hiện tại.
- Chưa triển khai nhiều chi nhánh, trả hàng/hoàn tiền, kiểm kê/chuyển kho hoặc các nghiệp vụ mới khác trong báo cáo rà soát.

## Cập nhật đăng ký trực tiếp và quản trị gia hạn

Đã mở đăng ký local theo yêu cầu: tạo tenant ngay, không cần dịch vụ email; chống trùng email, số điện thoại chuẩn hóa và mã cửa hàng bằng truy vấn kiểm tra cùng ràng buộc duy nhất trong Firebird. API chạy worker khởi tạo nền trong tiến trình cho cấu hình local hiện tại. Dùng thử vẫn 14 ngày. Trang /nen-tang cho thiết lập mật khẩu quản trị lần đầu qua localhost và gia hạn riêng từng cửa hàng.

Kiểm thử bổ sung: đăng ký instant khi không có mail webhook, chặn trùng thông tin, khởi tạo thành công dữ liệu riêng, chuẩn hóa số điện thoại và chặn ghi đè mật khẩu quản trị. Backend đạt 181 test, bỏ qua 13; frontend đạt 31 test. Health, info và setup-status trên máy đang chạy trả 200; đăng ký đã mở, không yêu cầu xác minh, quản trị đang chờ chủ máy đặt mật khẩu.

## Thứ tự tiếp theo

1. Chuẩn bị VPS Windows, tên miền và dịch vụ email; chốt điều khoản, thời hạn lưu giữ và hạn mức pilot.
2. Cấu hình máy chủ theo `saas-windows-deployment.md`, chạy preflight và kiểm tra gửi email thật.
3. Kiểm thử onboarding và in tại 2–3 cửa hàng, đo tải, đối chiếu tiền/kho; hoàn thiện hạn mức/rollout theo yêu cầu pilot.
4. Bật đăng ký công khai theo đợt khi các kiểm tra đạt. Không xem bản local đang hoạt động là đã triển khai SaaS Internet.

## Cập nhật danh bạ đăng nhập

Đã bỏ ô mã cửa hàng trên trang đăng nhập. Đăng ký chọn username riêng; ràng buộc duy nhất bằng hash username đã chuẩn hóa trong SAAS_LOGINS. Tạo/đổi tên nhân viên đồng bộ định tuyến, khóa tài khoản vẫn kiểm tra trạng thái tại database cửa hàng. Tài khoản hiện có đã nhập vào danh bạ, mật khẩu và nghiệp vụ giữ nguyên. Chủ kzauto1 dùng username kzauto1; tài khoản admin/bg1/kt1 giữ tên.

Kiểm thử Firebird riêng đạt đăng nhập không cần tenantCode, chữ hoa/thường, sai mật khẩu, tên chưa có, chống trùng username đăng ký, tạo/đổi tên/khóa nhân viên qua API, rollback đặt tên khi ghi tenant lỗi, và cách ly dữ liệu. Toàn bộ backend 181 đạt/13 bỏ qua; frontend 31 đạt, build thành công.

## Cập nhật mẫu theo GARAGE.FDB

Theo yêu cầu mới, template-current.json đã chuyển sang seedVersion 4: sao lưu đầy đủ D:/Garage/GARAGE.FDB, khôi phục file mẫu riêng, chỉ làm sạch dữ liệu. Làm trống 57 bảng, giữ 27 bảng. TWORKFLOWMAP, DDONVITINH, mẫu/cấu hình và nhóm quyền được giữ từ nguồn; DKHOHANG để trống. DLYDOTHUCHI chỉnh 7 tên sang tiếng Việt có dấu; bộ đếm chứng từ về 0; cấu hình thông tin công ty/logo/ngân hàng/đường dẫn riêng được làm trống. Không sao chép người dùng, khách hàng hoặc ghép máy in sang cửa hàng mới.

Đã kiểm tra cấu trúc tương đương nguồn, số dòng các bảng giữ lại, các bảng xóa đều rỗng, backup sạch restore lại đạt và onboarding từ mẫu mới đạt. Số dòng nguồn không thay đổi; health 200. Backend 196 bài, 183 đạt, 13 bỏ qua. Chi tiết bảng và đường dẫn tại saas-template-source-2026-10-09.md. Chỉ đăng ký mới dùng mẫu cập nhật; không reset tenant đã có.
