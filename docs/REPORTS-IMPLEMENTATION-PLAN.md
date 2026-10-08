# Kế hoạch triển khai báo cáo Garage — 11 nhóm

Ngày lập: 08/10/2026. Trạng thái: đã triển khai nền tảng và 68 báo cáo nối nguồn trong 11 nhóm; còn 13 mục thiếu nguồn cùng các phần nghiệm thu/tích hợp. Chi tiết tại `REPORTS-IMPLEMENTATION-PROGRESS.md`.

## Mục tiêu

Thay trang Báo cáo đang dùng số liệu mẫu bằng trung tâm báo cáo phù hợp nghiệp vụ gara. Mỗi báo cáo có nguồn dữ liệu và công thức rõ ràng, bộ lọc, chi tiết chứng từ, tổng cộng, phân quyền, in/PDF và xuất Excel. Bảng, biểu đồ và tệp xuất dùng cùng bộ lọc và cách tính.

Danh mục báo cáo cũ chỉ dùng để tham khảo cách tổ chức. Không sao chép SQL hoặc bổ sung nghiệp vụ ngoài gara chỉ vì dữ liệu cũ có cấu hình.

## Hiện trạng đã kiểm tra

- Frontend React/Vite: `frontend/src/pages/BaoCaoPage.jsx` chủ yếu dùng dữ liệu cố định; lọc nhóm, từ khóa, chi nhánh chưa áp dụng vào kết quả.
- Backend Express/Firebird: `backend/src/routes/reports.js` có tổng quan, doanh thu sửa chữa theo ngày và bảo dưỡng. Các API này đang được Dashboard sử dụng, cần giữ tương thích khi chuyển sang nguồn tính chung.
- Có nguồn nghiệp vụ thu chi/sổ quỹ, công nợ, hóa đơn bán hàng/sửa chữa, nhập kho, xuất phụ tùng, workflow, phân công và hoa hồng.
- Có hệ thống FastReport/PDF và Print Agent; tận dụng hạ tầng, nhưng dữ liệu và mẫu báo cáo cần kiểm tra riêng.
- Chưa xác minh đủ dữ liệu nghiệp vụ cho đặt mua/nhận hàng, kiểm kê, giá vốn lịch sử, thời gian lao động, hạn thanh toán, hoàn tiền và thanh toán lương.

## 1. Danh mục và phạm vi 11 nhóm

| Nhóm | Báo cáo cần triển khai | Nguồn/điều kiện |
|---|---|---|
| 1. Quỹ & Thu chi | Phiếu thu; phiếu chi; thu chi theo ngày/tháng; theo lý do; sổ tiền mặt; sổ từng tài khoản; theo phương thức; đặt cọc/tạm ứng/hoàn tiền; đối chiếu thanh toán hóa đơn | TTHUCHI, thanh toán chi tiết và hóa đơn. Xác minh phân loại đặt cọc/hoàn tiền, số dư đầu kỳ, tránh tính trùng |
| 2. Danh mục | Khách hàng; xe; phụ tùng/OEM; dịch vụ; NCC; nhân viên; vị trí và định mức kho | Các danh mục hiện có; không tự nhận giá hiện tại là giá lịch sử |
| 3. Bán hàng & Doanh thu | Hóa đơn sửa chữa; hóa đơn bán phụ tùng; doanh thu theo kỳ; theo khách/xe; dịch vụ/nhóm hàng; mặt hàng bán/sử dụng; giảm giá và thuế/phí; thanh toán nhiều lần | THOADONSUACHUA, TDONHANG và chi tiết. Tách hóa đơn, tiền thu, công nợ; phân bổ giảm giá có quy tắc |
| 4. Đặt hàng | Khách đặt phụ tùng; nhu cầu mua theo lệnh; đơn đặt mua; đã nhận/còn thiếu; quá hẹn khi có ngày hẹn | Kiểm tra luồng thật và quan hệ đặt–nhận–lệnh trước. Không dùng phiếu bán hay nhập kho thay cho đơn đặt mua |
| 5. Kho hàng | Nhập; xuất theo nguồn; nhập–xuất–tồn; thẻ kho; giá trị tồn; tồn thấp/âm/lâu; kiểm kê/chênh lệch; chuyển kho nếu sử dụng | TNHAPKHO/chi tiết, TXUATPHUTUNG, chi tiết bán hàng. Kiểm tra tồn đầu, trả hàng, quy đổi, trạng thái và kho |
| 6. Công nợ | Tổng hợp và chi tiết khách hàng/NCC; đối chiếu theo kỳ; trả trước/trả thừa; quá hạn khi có hạn thanh toán | Tận dụng dịch vụ debts/debtPayment; đầu kỳ gồm giao dịch trước kỳ; cùng cách tính cho bản in |
| 7. Sửa chữa & Xưởng | Tiếp nhận; báo giá/chờ duyệt/bổ sung; lệnh và tiến độ; xuất phụ tùng theo lệnh; xe chờ phụ tùng; hoàn thành/bàn giao; trễ hẹn | TTIEPNHANXE, báo giá, TLENHSUACHUA/chi tiết, workflow/lịch sử, phân công. Trạng thái chờ phụ tùng phải có căn cứ |
| 8. Xe, Bảo hành & Bảo dưỡng | Lịch sử xe; phụ tùng đã thay; bảo hành còn hiệu lực/sắp hết; các lần xử lý bảo hành; bảo dưỡng đến hạn | DXE, quan hệ lệnh/phiếu xuất, dữ liệu bảo hành và TLICHSUBAODUONG; ngày/km thiếu phải được thể hiện |
| 9. Nhân viên & KTV | Phân công; số lệnh/hạng mục hoàn thành; năng suất; hoa hồng phân bổ/đủ điều kiện; bảng lương; đã chi/còn phải chi | Phân công, employeeCommissions, bảng lương. Chỉ báo cáo giờ làm và đã chi khi có ghi nhận thật |
| 10. Quản trị | Tổng quan; hiệu quả từng lệnh; lãi phụ tùng/hóa đơn; kết quả kinh doanh; chi phí bảo hành; khách quay lại; giá trị bình quân lượt sửa | Dùng nguồn các nhóm trước; giá vốn lịch sử và phân loại chi phí là điều kiện cho lợi nhuận |
| 11. Biểu đồ | Doanh thu theo kỳ/nguồn; thu chi; tiến độ xưởng; cơ cấu doanh thu; khách/dịch vụ/phụ tùng nổi bật; năng suất KTV | Dùng các tổng hợp đã nghiệm thu; có bảng số liệu và drill-down cùng tiêu chí |

## 2. Chốt định nghĩa dữ liệu trước khi xây giao diện

Mỗi báo cáo có một phiếu đặc tả: mã, nhóm, mục đích, đơn vị mỗi dòng, cột, nguồn, bộ lọc, ngày dùng để xét kỳ, trạng thái được tính, công thức, tổng cộng, quyền và tình huống nghiệm thu.

- Doanh thu: hiển thị riêng tiền hàng/công/dịch vụ, giảm trừ, thuế/phí, tổng hóa đơn. Chốt điều kiện ghi nhận trước khi gọi chỉ tiêu là doanh thu; không bỏ hóa đơn chỉ vì chưa trả đủ.
- Dòng tiền: theo ngày thanh toán, không theo ngày lập hóa đơn nếu có ngày giao dịch riêng. Chọn nguồn ưu tiên và khóa nhận diện giao dịch để tránh cộng đôi.
- Công nợ: đầu kỳ + phát sinh tăng - phát sinh giảm = cuối kỳ; giữ số âm thể hiện trả trước/thừa. Đối chiếu thanh toán tích lũy và phiếu thu chi để tránh khấu trừ hai lần.
- Kho: đầu kỳ + nhập - xuất ± điều chỉnh = cuối kỳ; kiểm tra trạng thái cả phiếu và dòng, đơn vị quy đổi và kho. Tồn lâu có tiêu chí số ngày công khai.
- Lãi: giá trị bán sau giảm trừ - giá vốn tương ứng. Giá nhập hiện tại chỉ dùng cho chỉ tiêu ước tính có nhãn, không thay giá vốn lịch sử.
- Xe/xưởng: phân biệt xe duy nhất, lượt tiếp nhận, lệnh sửa chữa và hạng mục. Dùng lịch sử trạng thái nếu cần số liệu tại thời điểm quá khứ.
- KTV: phân công dùng để tính số việc; doanh thu/hoa hồng phân bổ theo quy tắc, không cộng toàn bộ lệnh cho mọi nhân viên.
- Thời gian: ngày nghiệp vụ theo Asia/Bangkok; ngày kết thúc gồm trọn ngày. Không tự chuyển ngày chọn sang UTC gây lệch kỳ.
- Không có dữ liệu khác với bằng 0; chỉ tiêu thiếu nguồn trả trạng thái chưa đủ dữ liệu, không dùng số mẫu.

## 3. Nền tảng báo cáo dùng chung

- Registry: mã/nhóm báo cáo, cột, bộ lọc, nguồn, quyền, kiểu xuất và khả năng hiện có. Registry không cho phép chạy SQL tùy ý từ frontend.
- Backend: các bộ tính theo miền nghiệp vụ và API cho danh mục, bộ lọc, dữ liệu, tổng cộng, biểu đồ, xuất/in. Kiểm tra tham số, phân trang, sắp xếp ổn định, truy vấn tham số hóa.
- Frontend: menu 11 nhóm, tìm báo cáo, vùng lọc theo báo cáo, chỉ số, bảng phân trang, chi tiết chứng từ, thông báo tải/lỗi/thiếu dữ liệu, bố cục mobile.
- Phân quyền: quyền REPORTS kết hợp phạm vi báo cáo; chốt quyền riêng cho giá vốn/lãi và lương. Kiểm tra ở backend trên API dữ liệu, xuất, PDF và drill-down. Không chỉ ẩn cột trên giao diện.
- In/xuất: dùng chung logic truy vấn và bộ lọc với bảng; tổng cộng tính toàn bộ tập kết quả. Báo cáo lớn có giới hạn rõ ràng hoặc cơ chế xuất theo lô.
- Đồng nhất thời điểm: kết quả có thời điểm tạo; khi dữ liệu thay đổi giữa xem và xuất, tạo lại kết quả hoặc thông báo rõ, không hứa khớp tuyệt đối giữa hai lần truy vấn khác thời điểm.
- Tối ưu: tổng hợp phía server, tránh tải toàn bộ dữ liệu nghiệp vụ vào trình duyệt; kiểm tra truy vấn thực tế trước khi bổ sung index.

## 4. Thứ tự triển khai và đầu ra

### Giai đoạn 0 — Đặc tả và kiểm tra nguồn

Lập danh sách mã báo cáo cho 11 nhóm; kiểm tra schema và mẫu dữ liệu; lập ma trận đủ/thiếu nguồn; chốt các định nghĩa trên. Các câu hỏi nghiệp vụ chưa giải quyết được ghi cụ thể, tiếp tục các báo cáo độc lập đủ dữ liệu.

Đầu ra: đặc tả từng báo cáo, sơ đồ liên kết chứng từ, danh sách bổ sung dữ liệu/migration nếu cần và bộ tình huống kiểm thử.

### Giai đoạn 1 — Khung báo cáo

Xây registry, giao diện 11 nhóm, bộ lọc, bảng, quyền, trạng thái lỗi và API dùng chung. Báo cáo chưa hoàn thành ghi rõ trạng thái và lý do. Giữ tương thích Dashboard, không thay số mẫu bằng số 0 gây hiểu nhầm.

Đầu ra: khung hoạt động với một báo cáo danh mục và một báo cáo thu chi hoàn chỉnh từ dữ liệu đến xuất/in.

### Giai đoạn 2 — Tài chính và danh mục

Làm nhóm 1, 2, 3, 6: danh mục, hóa đơn, doanh thu, thu chi, công nợ. Hợp nhất nguồn tính với sổ quỹ/công nợ và báo cáo PDF hiện có.

Đầu ra: đối chiếu được hóa đơn–thanh toán–công nợ; báo cáo kỳ có đầu/cuối kỳ chính xác.

### Giai đoạn 3 — Kho và đặt hàng

Làm nhóm 5 và 4. Chốt kho trước để kiểm tra đơn đã nhận/còn thiếu. Báo cáo đủ nguồn làm trước; kiểm kê, đặt mua hoặc chuyển kho thiếu nguồn cần hoàn thiện nghiệp vụ ghi nhận riêng.

Đầu ra: thẻ kho khớp nhập–xuất–tồn và màn hình kho; đơn đặt nối được chứng từ nhận hàng nếu có nghiệp vụ.

### Giai đoạn 4 — Xưởng, xe và nhân viên

Làm nhóm 7, 8, 9. Liên kết tiếp nhận–báo giá–lệnh–xuất–hóa đơn–bàn giao–bảo hành. Đối chiếu hoa hồng/bảng lương với màn hình nhân viên.

Đầu ra: mở được chứng từ nguồn; trạng thái và số lượt thống nhất; không tính trùng lệnh nhiều KTV.

### Giai đoạn 5 — Quản trị và biểu đồ

Làm nhóm 10, 11 từ bộ tính đã nghiệm thu. Lợi nhuận, chi phí bảo hành và hiệu suất theo giờ chỉ mở khi có dữ liệu đủ. Thêm so sánh kỳ và liên kết biểu đồ tới bảng chi tiết.

Đầu ra: tổng quan/biểu đồ khớp báo cáo chi tiết, không còn số liệu mẫu.

### Giai đoạn 6 — Nghiệm thu toàn bộ

Hoàn thiện mẫu in/PDF/Excel từng báo cáo ngay trong các giai đoạn; giai đoạn cuối kiểm tra đồng bộ 11 nhóm, quyền, mobile, hiệu năng và dữ liệu thực tế. Migration nếu cần có bản sao lưu và cách hoàn tác được kiểm tra trước khi áp dụng.

Đầu ra: ma trận nghiệm thu từng báo cáo và tài liệu định nghĩa chỉ tiêu/giới hạn dữ liệu. Không đánh dấu cả nhóm hoàn thành nếu còn mục chưa đủ dữ liệu.

## 5. Kiểm thử và tiêu chí hoàn thành

- Hóa đơn trả một phần/nhiều lần; giao dịch khác ngày hóa đơn; giảm giá/thuế/phí; trả trước/thừa; giao dịch điều chỉnh; chứng từ hủy.
- Công nợ có phát sinh trước kỳ; sổ đầu/cuối kỳ; khách/NCC không có phát sinh trong kỳ nhưng có số dư.
- Kho: đầu kỳ, xuất sửa chữa/bán hàng, trả/điều chỉnh nếu có, dòng hủy, hàng ngừng bán nhưng còn tồn, đơn vị quy đổi, tồn âm.
- Một xe nhiều lượt; một lệnh nhiều KTV; trạng thái thay đổi qua kỳ; chưa có ngày hẹn/ODO/hạn thanh toán.
- Quyền: người không có quyền không đọc/xuất/in được lương hoặc giá vốn; liên kết chứng từ vẫn tôn trọng quyền nghiệp vụ.
- Ngày biên, múi giờ, lọc kết hợp, phân trang, tổng toàn tập, dữ liệu rỗng và lỗi kết nối.
- Test công thức độc lập và tích hợp trên dữ liệu kiểm thử cô lập; không tạo chứng từ kiểm thử trong database thật.
- Chạy các kiểm thử thu chi, công nợ, hoa hồng và in hiện có bị ảnh hưởng; frontend build; kiểm tra trực quan bảng và bản in đại diện.
- Mỗi báo cáo hoàn thành khi bộ lọc đúng, tổng khớp chi tiết, truy chứng từ đúng, quyền đúng, xuất/in đúng và điều kiện thiếu dữ liệu được thể hiện rõ.

## 6. Khu vực mã nguồn dự kiến thay đổi

- `frontend/src/pages/BaoCaoPage.jsx`, CSS và các thành phần báo cáo tách riêng.
- `frontend/src/services/index.js` cùng API báo cáo.
- `backend/src/routes/reports.js`, bộ registry và các dịch vụ tính báo cáo theo miền.
- `backend/src/services/cashbook.js`, `debts.js`, `employeeCommissions.js`: tận dụng/chuẩn hóa khi cần, có kiểm thử hồi quy.
- `backend/src/accessControl.js` và cấu hình quyền nếu cần bổ sung phạm vi báo cáo.
- Dịch vụ in, registry mẫu và mẫu FastReport; thêm thư viện xuất XLSX sau khi kiểm tra môi trường hiện có.
- Migration có phiên bản chỉ khi thiếu dữ liệu/khóa/index đã được xác minh.

## 7. Cách theo dõi tiến độ

Mỗi báo cáo đi qua: đặc tả → xác minh nguồn → backend → giao diện → xuất/in → đối chiếu → hoàn thành. Ghi trạng thái và vấn đề ở cấp báo cáo, không chỉ cấp nhóm. Ước lượng thời gian sau giai đoạn 0, khi đã biết chính xác phần nghiệp vụ cần bổ sung.
