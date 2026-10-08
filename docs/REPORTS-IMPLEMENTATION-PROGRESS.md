# Tiến độ báo cáo Garage — 08/10/2026

Đã triển khai trung tâm 11 nhóm: 81 mục, 68 mục nối nguồn, 13 mục chưa đủ dữ liệu. Đây chưa phải hoàn thành toàn bộ kế hoạch.

| Nhóm | Nối nguồn | Chưa đủ dữ liệu |
|---|---:|---:|
| Quỹ & Thu chi | 7 | 1 |
| Danh mục | 7 | 0 |
| Bán hàng & Doanh thu | 11 | 0 |
| Đặt hàng | 0 | 4 |
| Kho hàng | 8 | 2 |
| Công nợ | 6 | 1 |
| Sửa chữa & Xưởng | 7 | 1 |
| Xe, Bảo hành & Bảo dưỡng | 8 | 0 |
| Nhân viên & Kỹ thuật viên | 4 | 2 |
| Quản trị | 4 | 2 |
| Biểu đồ | 6 | 0 |

## Phần còn lại

- **Đặt cọc, tạm ứng & Hoàn tiền**: Chưa có sổ giao dịch riêng xác định ngày đặt cọc/hoàn tiền và liên kết hóa đơn.
- **Phụ tùng khách đặt**: Database hiện tại chưa có phiếu khách đặt độc lập với hóa đơn bán hàng.
- **Đơn đặt mua & Nhận hàng**: Chưa có quan hệ đơn đặt mua – dòng nhận hàng; không dùng phiếu nhập thay cho đơn đặt mua.
- **Nhu cầu phụ tùng theo lệnh**: Cần quy tắc xác định dòng phụ tùng đã duyệt và liên kết từng lần xuất để tính số còn thiếu.
- **Đơn đặt hàng quá hẹn**: Chưa có đơn đặt hàng và ngày hẹn nhận.
- **Kiểm kê & Chênh lệch**: Chưa xác minh luồng phiếu kiểm kê thực tế của gara và đơn vị quy đổi.
- **Chuyển kho**: Chưa có nghiệp vụ chuyển kho độc lập được xác minh.
- **Công nợ quá hạn**: Chưa có hạn thanh toán trên hóa đơn/phiếu nhập.
- **Xe chờ phụ tùng**: Chưa có trạng thái chờ phụ tùng được ghi nhận rõ ràng.
- **Đối chiếu lương / Hoa hồng đã chi**: Chưa có liên kết phiếu chi với bảng lương và khoản hoa hồng.
- **Năng suất theo giờ làm**: Chưa xác minh ghi nhận thời gian làm việc thực tế đầy đủ.
- **Lãi phụ tùng / Hóa đơn**: Có trường giá vốn nhưng chưa xác minh dữ liệu lịch sử và quy tắc phân bổ giảm giá/thuế.
- **Kết quả kinh doanh / Lợi nhuận**: Cần xác minh giá vốn và phân loại chi phí trước khi tính lợi nhuận.

## Đã xác minh

- Build frontend thành công.
- 19 kiểm thử công thức/quyền/HTTP và hồi quy qua; hai kiểm thử nghiệp vụ có ghi dữ liệu không chạy.
- Kiểm tra chỉ đọc tất cả 68 báo cáo trên Firebird thành công, kể cả nguồn chưa có bản ghi.
- PDF phiếu thu và nhập–xuất–tồn kết xuất bằng FastReport; đã xem trang tồn kho để kiểm tra tiếng Việt và bố cục.
- XLSX được kiểm tra cấu trúc ZIP và XML.
- Bảng/Excel/PDF dùng kết quả cố định trong 15 phút; mỗi lần truy cập kiểm tra lại quyền.

## Giới hạn hiện tại

- Công nợ theo sổ đang có: thanh toán tích lũy cũ không đủ ngày thanh toán, chưa chứng nhận số dư lịch sử.
- Kho theo giao dịch đang sử dụng, chưa có nguồn tồn đầu ban đầu riêng. Khi có hoàn kho thiếu ngày hoặc khác đơn vị cơ sở, hệ thống dừng tính và báo lý do.
- Giá trị tồn chỉ ước tính theo giá nhập hiện tại, có nhãn rõ ràng.
- Lương theo tháng chứa ngày bắt đầu; không suy đoán đã trả lương.
- Biểu đồ hiện theo tối đa 20 dòng của trang đang xem, được ghi rõ.
- Nguồn tối đa 20.000 dòng, bản in tối đa 2.000 dòng; cần tối ưu truy vấn theo kỳ/xuất theo lô khi vượt giới hạn.
- In báo cáo dùng PDF và hộp chọn máy in của trình duyệt; chưa tích hợp lệnh báo cáo vào Print Agent hoặc thư viện mẫu chỉnh sửa trong database.
- Drill-down trực tiếp tới lệnh sửa chữa có kiểm tra quyền; các nguồn khác hiện xem chi tiết dòng, chưa mở đúng màn hình chứng từ.
- Chưa thống nhất lại công thức với Dashboard, màn hình tồn kho và bản in công nợ cũ; API Dashboard được giữ nguyên để tránh ảnh hưởng.
- Không sửa schema, số liệu nghiệp vụ hay quyền tài khoản.
- Browser QA không truy cập được localhost của môi trường thực thi; chưa nghiệm thu trực quan trang và mobile.

## Chạy lại kiểm tra

### Bố cục theo mẫu DATA.fdb (08/10/2026)

- Đọc `SREPORT.LASTTEMPLATEID` → `SREPORTTEMPLATE.TEMPLATE`, đối chiếu mẫu tồn quỹ `c6edb5b2-3553-440f-a31c-33e1a86f963e` và nhập xuất tồn `5b9b4f92-1c1e-49d5-a8e8-d45a8056f055`.
- Dùng cấu trúc đầu trang doanh nghiệp/logo, tiêu đề, kỳ báo cáo, bảng STT có viền, tổng cộng, ngày/người lập và số trang. Mẫu chung tạo bằng FastReport; dữ liệu và thông tin công ty lấy từ GARAGE.FDB, không chạy SQL/script của mẫu cũ.
- Giao diện kết quả có khung giấy trắng trên nền xanh xám, viền vàng nhạt; vẫn phân trang 50 dòng, ghi rõ tổng tính trên toàn bộ kết quả. PDF gồm toàn bộ dòng, hỗ trợ A4 đứng/ngang, lặp tiêu đề bảng, xuống dòng nội dung dài.
- Thông tin tên/địa chỉ/điện thoại/email/logo chỉ đọc từ các khóa cấu hình công ty đã chọn; logo PNG/JPEG tối đa 2 MB.
- 13 kiểm thử báo cáo qua, frontend build qua; đã kết xuất/xem PDF ngắn, 85 dòng dài nhiều trang và báo cáo rỗng. Phần tổng, ghi chú và chữ ký giữ cùng nhau khi sang trang.
- Công cụ browser bị chính sách truy cập chặn trang localhost; chưa xác nhận trực quan giao diện web.

Tại backend: node --test tests/reportCenter.test.js tests/cashbook.test.js tests/debts.test.js tests/employeeCompensation*.test.js

Kiểm tra Firebird chỉ đọc: đặt TEST_REPORTS_FIREBIRD=1 rồi node --test tests/reportCenter.firebird.test.js (cần quyền kết nối localhost).

Tại frontend: npm run build.
