# Rà soát dự án Garage — 09/10/2026

## Phạm vi và kết quả

Đọc mã nguồn backend, frontend, các dịch vụ tiền/kho/in ấn, xác thực và phân quyền hiện tại, bao gồm các thay đổi chưa commit. Đây là rà soát mã nguồn và kiểm tra độc lập, chưa phải kiểm thử toàn bộ giao diện bằng tài khoản thật hoặc đánh giá hạ tầng triển khai. Không sửa nghiệp vụ, không ghi dữ liệu thật, không tạo token đăng nhập.

Chạy 40 bài kiểm thử liên quan phân quyền, giá, nhập kho, công nợ và sổ quỹ: **38 đạt, 0 lỗi, 2 kiểm thử Firebird bỏ qua theo cấu hình**. Log: `backend/project-audit-tests.log`. Các kiểm thử hiện có đạt không chứng minh những tình huống thiếu kiểm thử bên dưới đã an toàn.

Kiểm tra trực tiếp các route với DB giả lập xác nhận:

| Tình huống | Kết quả hiện tại |
|---|---|
| Nhập 2 × 100.000, gửi thành tiền dòng 7 và tổng phiếu 1 | HTTP 200, lưu tổng 1 và thành tiền 7 |
| Nhập hàng đơn giá -100 | HTTP 200, thực hiện ghi header và chi tiết |
| Tồn 1, gửi hai dòng cùng mặt hàng, mỗi dòng số lượng 1 | HTTP 200, ghi số lượng bán tổng 2 |
| Không có COST, có INVENTORY=17 | Được phép in phiếu nhập kho chứa đơn giá mua |
| Redact dữ liệu mua hàng khi thiếu COST | Xóa GIANHAP/GIAVON nhưng giữ DONGIA, THANHTIEN, TONGCONG |

## Lỗi và lỗ hổng ưu tiên

### 1. Cao — Phiếu nhập kho tin tổng tiền từ client

Nguồn: `backend/src/routes/inventoryReceipts.js`, POST `/`, khoảng dòng 58–129.

Backend lấy TIENHANG, TIENGIAMGIA, TONGCONG trực tiếp từ body; thành tiền dòng lấy `item.THANHTIEN` nếu được gửi. Chỉ kiểm tra có mã hàng và số lượng > 0; không kiểm tra đầy đủ số hữu hạn, đơn giá không âm, tồn tại mặt hàng/đối tác/kho/nhân viên còn hoạt động và tính nhất quán tiền. `receiptPayment.calculate` kiểm tra tổng và tiền trả, không kiểm tra chi tiết.

Ảnh hưởng: người có quyền thêm nhập kho có thể tạo giá vốn, công nợ và tổng mua sai. Đã tái hiện tổng 1, dòng 7, trong khi 2 × 100.000 = 200.000; đơn giá âm cũng được chấp nhận.

Sửa: chuẩn hóa và kiểm tra toàn bộ dòng trước khi ghi; tự tính tổng và giảm giá ở server; xác minh các ID; từ chối tổng client không khớp hoặc chỉ dùng tổng server. Lỗi quyền phải trả 403: hiện catch chỉ dùng `statusCode`, trong khi assert PAYMENTS có cả status/statusCode nên trường hợp này đang được xử lý, cần giữ nhất quán khi bổ sung kiểm tra.

### 2. Cao — Bán vượt tồn khi lặp mặt hàng và nguy cơ bán đồng thời

Nguồn: `backend/src/routes/sales.js`, `productSql` và vòng lặp POST `/`; `backend/src/db.js`, transaction READ_COMMITTED.

Mỗi dòng so sánh riêng với toàn bộ tồn kho. Hai dòng cùng mã hàng không được cộng số lượng trước khi so sánh. Đã tái hiện tồn 1 nhưng bán 2. Ngoài ra chưa thấy khóa dùng chung theo mặt hàng/kho trước khi đọc và trừ tồn; hai giao dịch đồng thời có thể cùng đọc một lượng tồn. Tình huống đồng thời chưa thử trên Firebird thật.

Sửa: cộng số lượng theo mặt hàng và kho, khóa theo thứ tự cố định rồi kiểm tra lại tồn trong transaction; mọi luồng xuất hàng phải dùng cùng cơ chế.

### 3. Cao — Các màn hình tính tồn kho khác nhau

Nguồn: `backend/src/routes/parts.js` TONKHO_SQL; `routes/sales.js` productSql; `routes/reports.js` dashboard; `services/catalogData.js` inventory; `services/reportData.js` stock.

Danh mục kho lọc trạng thái header/chi tiết, trừ SLHOAN, cộng SLNHAP của dòng bán. Danh sách phụ tùng, POS và dashboard bỏ một phần các điều kiện này. Ví dụ hủy nhập kho đặt STATUS=0 ở chi tiết nhưng POS/dashboard vẫn cộng số lượng nhập. Một số nơi vẫn trừ xuất đã hủy và bỏ qua số lượng hoàn.

Ảnh hưởng: cùng mặt hàng hiển thị các tồn khác nhau; POS có thể cho bán hàng từ phiếu nhập đã hủy. Không cần dữ liệu giả lập để xác nhận sự khác nhau giữa các truy vấn; chưa đo số chênh thực tế trong database.

Sửa: một nguồn tính tồn dùng chung, xét header và chi tiết còn hiệu lực, nhập trả/hoàn, đơn vị và kho; kiểm thử hủy/hoàn trên toàn bộ màn hình.

### 4. Cao — Giao xe xuất phụ tùng mà chưa kiểm tra đủ tồn

Nguồn: `backend/src/routes/workflow.js`, transition targetState=3, ghi TXUATPHUTUNG.

Luồng đã chống xuất trùng theo lệnh/mặt hàng, nhưng chưa kiểm tra và khóa tồn trước khi xuất; kho được suy ra bằng MAX vị trí của mặt hàng. Báo giá tạo trước không giữ tồn nên hàng có thể đã được POS bán trước khi giao xe.

Sửa: xác nhận kho thực tế, kiểm tra/khóa tồn khi xuất, có cơ chế giữ hàng hoặc xuất trong quá trình sửa; đối chiếu lại nếu hàng thiếu trước khi giao.

### 5. Cao — Quyền COST còn lộ qua tên trường khác và PDF

Nguồn: `backend/src/permissionPolicy.js` sensitive.COST; `routes/inventoryReceipts.js` GET chi tiết; `services/documentPrint.js` permitted và MauPhieuNhapKho; `routes/printing.js` PDF.

Chỉ ẩn GIANHAP, GIAVON và vài trường giá trị kho. DONGIA, THANHTIEN và tổng mua hàng vẫn có thể suy ra giá nhập. Bản in phiếu nhập yêu cầu INVENTORY Xem+In, chưa yêu cầu COST; PDF không đi qua `res.json` redaction. Đã kiểm tra điều kiện in cho tài khoản thiếu COST vẫn true.

Sửa: kiểm soát dữ liệu theo ngữ cảnh nghiệp vụ, không xóa DONGIA toàn cục vì đó cũng là giá bán. Với phiếu nhập/PDF, yêu cầu COST hoặc cung cấp bản chỉ có số lượng. Cần xác định rõ ai được xem tổng giá trị mua.

### 6. Cao — Bản in công nợ không khớp sổ công nợ

Nguồn: `backend/src/services/documentPrint.js`, MauCongNoKhachHang/MauCongNoNhaCungCap; `services/debts.js`, ledger/buildLedger.

Sổ công nợ trừ TTHUCHI của đối tác, còn bản in cộng số dư chứng từ bán/sửa/nhập mà không trừ các khoản thu/chi riêng. Sau thanh toán công nợ qua phiếu thu/chi, màn hình và bản in có thể cho hai số khác nhau. Đây là khác biệt xác nhận trong mã, chưa in PDF với chứng từ thật.

Sửa: dùng chung ledger làm nguồn bản in, gồm số dư đầu kỳ, phát sinh và thanh toán trong kỳ.

### 7. Cao — Hủy chứng từ chưa xử lý đầy đủ các quan hệ tiền/kho/quy trình

Nguồn: `routes/inventoryReceipts.js` DELETE; `routes/repairOrders.js` DELETE; `services/debts.js`/`services/cashbook.js`.

Hủy nhập kho chỉ đổi STATUS header/chi tiết; không kiểm tra hàng đã xuất và không có chứng từ đảo giao dịch. Hủy lệnh sửa chỉ đổi STATUS lệnh, chưa đồng bộ workflow/hóa đơn/phụ tùng đã xuất. Các khoản TTHUCHI vẫn tồn tại và có thể trở thành tiền trả trước hoặc số dư âm ngoài ý định.

Sửa: xác định điều kiện được hủy theo giai đoạn; chặn hủy chứng từ đã có phát sinh phụ thuộc hoặc tạo bút toán đảo, lưu lý do và người duyệt trong transaction.

### 8. Cao có điều kiện — Secret token mặc định và phiên không bị thu hồi khi đổi mật khẩu

Nguồn: `backend/src/authSecurity.js` dòng 3–4; `routes/auth.js` change-password; `routes/adminAccess.js` cập nhật mật khẩu; logout ở frontend.

Có secret dự phòng cố định nếu thiếu AUTH_TOKEN_SECRET. Mẫu .env cũng có chuỗi ví dụ, chưa thấy kiểm tra bắt buộc thay đổi trước khi khởi động. **Chưa đọc giá trị secret thực tế nên không kết luận hệ thống đang dùng secret mặc định.** Khi cấu hình sai, người biết secret có thể tạo token không hợp lệ về nguồn gốc nhưng được chấp nhận về chữ ký.

Token hiện có thời hạn 30 ngày (README ghi 12 giờ). Đổi/reset mật khẩu không tăng phiên bản phiên và không thu hồi token cũ; logout chỉ xóa localStorage. Khóa tài khoản được backend kiểm tra và có tác dụng, đây không phải lỗi bỏ qua trạng thái khóa.

Sửa: fail startup khi thiếu/secret mẫu; phiên bản token hoặc bảng phiên để thu hồi khi đổi mật khẩu/đăng xuất; xác định TTL phù hợp và cập nhật tài liệu. Không tự đổi secret đang chạy vì sẽ đăng xuất toàn bộ người dùng.

### 9. Trung bình — Chưa có giới hạn thử đăng nhập

Nguồn: `routes/auth.js` POST login; middleware `server.js`; dependencies backend.

Chưa thấy rate limit/lockout tại ứng dụng. Endpoint truy vấn DB và scrypt đồng bộ có thể bị gọi lặp. Có thể có lớp chống dò bên ngoài, chưa kiểm tra hạ tầng nên chưa kết luận độ phơi nhiễm Internet.

Sửa: giới hạn theo IP và tài khoản, độ trễ tăng dần, log thất bại; tránh khóa tài khoản vĩnh viễn do người ngoài gây ra.

### 10. Trung bình — Người thao tác trong chứng từ có thể bị giả mạo

Nguồn: nhiều routes dùng `req.get('X-User') || 'SYSTEM'`, workflow nhận DNHANVIENID từ body và ghi SYSTEM khi đổi trạng thái.

Xác thực có req.accessUser nhưng USERCREATEDID/USERMODIFIEDID vẫn lấy header do client tự gửi. Người đã đăng nhập có thể khai báo người ghi là người khác; quyền truy cập không vì thế tăng lên, nhưng nhật ký truy vết mất tin cậy.

Sửa: luôn lấy actor từ req.accessUser.ID; tách nhân viên phụ trách nghiệp vụ khỏi người thực hiện; lưu lịch sử trước/sau, lý do hủy và duyệt.

### 11. Trung bình — Gửi lại tạo bán hàng/thu chi có thể sinh chứng từ trùng

Nguồn: POST sales, `services/debtPayment.js`, `services/cashVoucher.js`; so sánh `services/printAgent.js` có IDEMKEY.

Chưa thấy khóa idempotency ở các thao tác tiền này. Frontend khóa nút giảm nhấn đúp trong một trang nhưng không xử lý mất phản hồi/retry qua hai tab. Thu công nợ đã có khóa theo đối tác và chặn vượt số dư; nếu số dư vẫn đủ thì retry cùng yêu cầu có thể thu lần nữa.

Sửa: khóa idempotency theo người dùng và thao tác, lưu hash payload và kết quả trong transaction; retry trả lại kết quả đã có.

## Chức năng còn thiếu hoặc chưa hoàn thiện

### 12. Bảo hành: một phần còn là giao diện mẫu

Nguồn: `frontend/src/pages/BaoHanhPage.jsx` khởi tạo dữ liệu mẫu, useEffect khoảng dòng 374–397; các nút khoảng 621, 627, 1006, 1012, 1088; routes vehicles warranties.

Tạo và xem bảo hành có API. Tuy nhiên khi API rỗng hoặc lỗi, trang giữ hồ sơ giả; nhập/xuất Excel, gia hạn, sửa và tải ảnh chỉ hiện toast. Thông báo xuất thành công không tạo file. Backend hiện chỉ thấy GET/POST bảo hành, chưa thấy API sửa/gia hạn/xử lý yêu cầu. Form chưa có luồng xử lý chi phí bảo hành và lịch sử thực đầy đủ.

Ưu tiên bỏ dữ liệu mẫu khỏi vận hành, hiển thị rỗng/lỗi trung thực; vô hiệu hóa nút chưa làm; sau đó triển khai yêu cầu, duyệt, sửa chữa và kết quả bảo hành.

### 13. Mua linh kiện: trang riêng chưa có nghiệp vụ thực

Nguồn: `frontend/src/pages/MuaLinhKienPage.jsx`; route `/mua-linh-kien` trong App.

Danh sách đơn mua là dữ liệu viết cứng, nút tạo/import/tìm chưa nối API. Chức năng nhập kho thật đã có ở `/nhap-kho`, không nên xem toàn bộ quản lý kho là chưa làm. Phần thiếu là đặt mua → duyệt → nhận một phần/toàn bộ → nhập kho → trả nhà cung cấp.

### 14. Quản lý kho và thu hồi tiền cần bổ sung luồng đầy đủ

Chưa tìm thấy API/UI hoàn chỉnh cho kiểm kê và điều chỉnh có duyệt, chuyển kho, trả hàng POS, hoàn tiền gắn chứng từ gốc. Schema và báo cáo có SLNHAP/SLHOAN nhưng không chứng minh đã có thao tác hoàn trả đầy đủ. Đây là phần chưa tìm thấy trong phạm vi mã nguồn, cần xác nhận nếu có công cụ ngoài ứng dụng.

Nên ưu tiên trả hàng/hoàn tiền và kiểm kê trước các tính năng giao diện mới, vì cần đồng bộ cả kho, công nợ, dòng tiền và báo cáo.

### 15. Vận hành nhiều máy, sao lưu và dữ liệu lớn

- Bảo hành và apiClient cũ còn URL `http://localhost:4000`: mở frontend trên máy khác sẽ gọi backend của máy đó. Cần cấu hình API thống nhất theo môi trường và proxy; hiện apiClient cũ chưa thấy được import trong các trang đang dùng nên không kết luận mọi trang đều lỗi.
- Chưa tìm thấy quy trình sao lưu/khôi phục toàn bộ Firebird và kiểm tra bản sao lưu trong ứng dụng/repo. Các file backup hiện có chủ yếu là cấu hình/mẫu in; không thay cho sao lưu database. Có thể đang sao lưu ngoài repo, cần xác nhận.
- `services/reportData.js` đọc tối đa 20.001 dòng mỗi nguồn trước khi xử lý kỳ; trên 20.000 sẽ trả 413. Chọn kỳ ngắn vẫn có thể bị chặn bởi toàn bảng. Cần đẩy bộ lọc kỳ xuống SQL.
- Danh sách sales giới hạn 50, nhập kho 100 chưa thấy phân trang ở API, có thể không tìm lại chứng từ cũ trong trang danh sách. Cần phân trang, lọc ngày/tìm mã phía server.
- Cần thêm kiểm thử nhiều tài khoản qua giao diện, giao dịch đồng thời, hủy/hoàn tiền và đối chiếu báo cáo. Hai bài Firebird liên quan trong lần chạy này chưa được thực thi.

## Thứ tự xử lý đề xuất

1. Tính/kiểm tra tiền nhập kho; gom và khóa tồn bán; thống nhất nguồn tồn và kiểm tra xuất sửa chữa.
2. Chặn lộ giá nhập qua JSON/PDF; dùng ledger chung cho bản in công nợ; bảo vệ hủy chứng từ.
3. Kiểm tra cấu hình secret, thu hồi phiên, chống dò đăng nhập và actor tin cậy; chống tạo giao dịch trùng.
4. Hoàn thiện bảo hành và đơn mua; bổ sung trả hàng/hoàn tiền, kiểm kê/chuyển kho.
5. Chuẩn hóa chạy nhiều máy, sao lưu/khôi phục, phân trang và báo cáo dữ liệu lớn.

Các mục ở đây là phát hiện và đề xuất trong lần rà soát này, **chưa được sửa**. Những cải tiến phân quyền ở lần làm trước vẫn được giữ; phát hiện mới cần mở rộng bảo vệ ở ngữ cảnh chứng từ và bản in.
