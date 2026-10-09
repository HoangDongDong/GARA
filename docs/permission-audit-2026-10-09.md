# Rà soát phân quyền ngày 09/10/2026

## Phạm vi và kết luận

Đối chiếu ảnh giao diện với mã nguồn frontend/backend hiện tại. Kiểm tra middleware trực tiếp bằng tài khoản giả lập; không đăng nhập bằng tài khoản thực, không thay đổi dữ liệu hay quyền đang lưu. Các phát hiện dưới đây phản ánh mã nguồn trong workspace, chưa xác nhận bản đang triển khai trùng hoàn toàn với mã này.

Hệ thống hiện có 13 mã chức năng, 5 thao tác: Xem=1, Thêm=2, Sửa=4, Xóa=8, In=16. Chức năng mới phần lớn dùng chung mã cũ. Cần sửa cách kiểm tra quyền trước khi chỉ bổ sung hàng vào bảng.

## Các điểm cần sửa

1. **Quyền sửa/xóa lan sang danh mục khác — ưu tiên cao.** `backend/src/accessControl.js:14` dùng cùng danh sách mã và toán tử OR cho mọi HTTP method. `/api/customers` chấp nhận CUSTOMERS hoặc REPAIR; `/api/parts` chấp nhận SALES, INVENTORY hoặc REPAIR; `/api/vehicles` chấp nhận VEHICLES, REPAIR hoặc WARRANTY. Vì vậy quyền Xóa của Sửa chữa cho phép gọi DELETE khách hàng và phụ tùng dù không được cấp quyền quản lý các danh mục đó. Các route tương ứng không bổ sung kiểm tra quyền riêng. Nên tách quyền đọc dữ liệu phục vụ nghiệp vụ khỏi quyền sửa/xóa danh mục, và khai báo theo từng hành động.

2. **API đọc master-data không kiểm tra quyền chức năng — ưu tiên cao.** `backend/src/accessControl.js:77` chỉ chặn mutation của master-data; `:85` cho đi tiếp khi không có mã tương ứng. `backend/src/routes/masterData.js:112` và `:178` trả cả danh sách/chi tiết với SELECT toàn bộ cột. Tài khoản đăng nhập không có quyền vẫn qua middleware để đọc nhà cung cấp, tài khoản ngân hàng, danh mục dịch vụ… Cần quy định resource nào là lookup dùng chung, resource nào cần quyền nghiệp vụ và giới hạn trường trả về.

3. **Phải cấp quyền Nhân sự để trang Sửa chữa tải được dữ liệu — ưu tiên cao.** `frontend/src/pages/SuaChuaPage.jsx:166` tải employees.list cùng các danh sách khác bằng Promise.all. Backend yêu cầu EMPLOYEES/Xem cho `/api/employees`; REPAIR/Xem riêng bị 403 và cả đợt nạp dữ liệu bị lỗi. Cấp EMPLOYEES/Xem để né lỗi lại cho đọc LUONGCA, LUONGTHANG (`backend/src/routes/employees.js:47`) và `/commissions`. Nên dùng API lookup nhân viên chỉ trả ID/tên/chuyên môn cho nghiệp vụ Sửa chữa, đồng thời tách quyền xem lương/hoa hồng.

4. **Quyền thanh toán hóa đơn sửa chữa chưa nhất quán — ưu tiên cao.** `frontend/src/pages/SuaChuaPage.jsx:947` gọi invoices.pay, `:951` gọi invoices.create. `/api/invoices` chỉ chấp nhận SALES hoặc FINANCE trong middleware. Người chỉ có quyền Sửa chữa bị chặn; người có SALES/Sửa lại qua được API thanh toán hóa đơn sửa chữa. Không có quyền Thanh toán riêng để phân biệt lập báo giá, sửa phiếu và thu tiền. Cần khai báo quyền hành động theo loại hóa đơn và vai trò thu ngân.

5. **Thêm nhanh danh mục hiển thị nhưng bị backend chặn.** POS/Khách hàng/Sửa chữa/Nhập kho có thao tác masterData.create; mọi mutation master-data chỉ dành cho ISADMIN=1. Ví dụ SALES/Xem+Thêm vẫn không tạo được nhóm khách hàng. Nếu chủ đích chỉ Admin được thêm, cần ẩn/vô hiệu hóa nút; nếu cho nhân viên thêm nhanh, phải cấp quyền theo từng resource và trường hợp cụ thể.

6. **Nhóm tên Admin không đồng nghĩa tài khoản Admin.** `frontend/src/pages/QuanTriPage.jsx:55` xác định nhóm Admin bằng tên, hiển thị tất cả quyền và không cho sửa. `backend/src/routes/adminAccess.js:108` tạo tài khoản với ISADMIN=0 kể cả chọn nhóm Admin. Backend vẫn cấm ADMIN/SETTINGS cho ISADMIN=0 (`backend/src/accessControl.js:82`). Vì vậy cấp nhóm Admin chưa chắc truy cập được quản trị/cấu hình dù bảng hiển thị toàn quyền. Cần thống nhất cách biểu diễn đặc quyền và không cấp đặc quyền chỉ bằng tên nhóm.

7. **Giao diện chưa kiểm soát đồng đều thao tác và cập nhật quyền.** App.jsx bảo vệ truy cập trang bằng quyền Xem; HoSoChoDuyetPage/NhanVienPage có kiểm tra nút cụ thể, nhiều trang còn dựa vào backend trả 403. Bán hàng/Sửa chữa kiểm tra quyền Sửa cho giá nhưng chưa áp dụng thống nhất cho mọi hành động Thêm/Xóa/In. Giao diện đọc garage_user trong localStorage; auth.me đã có nhưng không thấy nơi gọi để đồng bộ quyền trong src. Backend nạp quyền mỗi request nên thu hồi quyền có hiệu lực ở API, còn menu/nút có thể vẫn hiển thị theo phiên cũ. Nên dùng một cơ chế kiểm tra và đồng bộ quyền dùng chung.

8. **Route mới có thể được cho qua nếu quên khai báo quyền.** `backend/src/accessControl.js:85` mặc định next khi không có mã. Một số route hiện tại có kiểm tra riêng hợp lệ, như catalog, printing, document-numbers và print-control. Nhưng cách này dễ bỏ sót khi phát triển thêm. Nên có danh sách ngoại lệ rõ ràng cho route tự kiểm tra quyền, kiểm tra độ bao phủ route và từ chối route chưa khai báo.

## Chức năng mới đã có quyền, nhưng đang gộp

| Chức năng | Quyền hiện dùng | Đánh giá |
|---|---|---|
| Hồ sơ chờ duyệt | REPAIR | Có bảo vệ; chưa tách duyệt/phân công/giao xe khỏi Sửa |
| Đề xuất phát sinh | REPAIR/Thêm để tạo, REPAIR/Sửa để quyết định | Có bảo vệ; chưa tách quyền duyệt phát sinh |
| Phân công và hoa hồng theo lệnh | REPAIR | Có kiểm tra Sửa khi xác nhận; preview cũng trả hoa hồng cho người có REPAIR/Xem |
| Nhân viên, lương, hoa hồng | EMPLOYEES | Chưa tách dữ liệu nhạy cảm và xuất CSV; CSV phía client không kiểm tra In |
| Danh mục | SETTINGS và kiểm tra chỉ Admin ở catalog | Có bảo vệ; không cấp riêng cho người quản lý danh mục |
| Màn hình phụ | SETTINGS; API secondary-payment dùng SALES/FINANCE/REPAIR | Có bảo vệ nhưng trang và API dùng hai chính sách khác nhau |
| In chứng từ | Xem+In của từng nghiệp vụ | Đã kiểm tra trong printing và Print Agent; menu không cần thêm mã độc lập nếu giữ thiết kế này |
| Thiết kế mẫu in web | SETTINGS, chỉ Admin | Đã được bảo vệ bởi middleware |
| Báo cáo và xuất Excel/PDF | REPORTS/Xem; xuất cần Xem+In; một số báo cáo kiểm tra EMPLOYEES/INVENTORY/FINANCE thêm | Có bảo vệ; quyền xuất đang gộp với In |

Những quyền nên bổ sung nếu cần phân vai Báo giá/Kỹ thuật/Thu ngân/Kho: duyệt báo giá; duyệt phát sinh; phân công kỹ thuật; xác nhận giao xe; thu tiền/thanh toán/cho nợ; xem và sửa lương/hoa hồng; xem giá nhập/giá vốn; thay đổi giá/giảm giá; quản lý phụ tùng/dịch vụ; xuất dữ liệu; xem hồ sơ được phân công so với toàn bộ hồ sơ. Đây là đề xuất chính sách, không phải mọi mục đều là lỗ hổng bắt buộc phải thêm.

Trong ảnh, nhóm Báo giá có cả Xóa và toàn bộ quyền Tài chính/Nhân sự đang hiển thị. Tên nhóm không giới hạn nghiệp vụ; khả năng thực tế do các ô quyền quyết định. Nên rà lại mức cấp này theo công việc thực tế.

## Kiểm chứng

- Gọi authorize trực tiếp cho 10 tình huống, không chạm dữ liệu: xác nhận cho qua DELETE parts/customers với REPAIR=8; cho qua GET master-data/suppliers không có quyền; chặn employees và invoice/pay khi chỉ có REPAIR; cho qua invoice/pay với SALES=4; chặn thêm nhanh master-data với SALES=3; xác nhận route chưa khai báo được cho qua.
- Chạy `node --test tests/documentPrint.test.js tests/reportCenter.test.js tests/pricingPolicy.test.js tests/secondaryPayment.test.js`: 32/34 đạt. Hai ca HTTP local (snapshot report và secondary payment) lỗi `fetch failed`; chưa kết luận được hai ca này trong môi trường hiện tại. Các ca kiểm tra quyền in chứng từ, báo cáo nhạy cảm và chỉnh giá đạt.
- Chưa sửa mã nguồn ứng dụng, chưa chạy migration hay cập nhật database.
