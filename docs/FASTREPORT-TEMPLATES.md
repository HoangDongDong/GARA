# Mẫu in FastReport trong database

Luồng hiện tại: giao diện gọi `/api/printing/:type/:id/pdf`, backend đọc nội dung `STEMPLATE.TEMPLATE` theo ID đã chọn, cấp dữ liệu chứng từ và render bằng FastReport. Bản xem trước và bản in dùng cùng PDF. Mẫu không bị thay bằng bố cục HTML hoặc chèn thêm logo ngoài thiết kế FRX. Endpoint `/html` cũ chuyển tiếp đến `/pdf`.

## Thêm hoặc sửa mẫu

Trong Cấu hình → Quản lý mẫu in, nhấn **Thêm mẫu .frx**, nhập tên, chọn loại phiếu, nạp tệp và nhấn **Lưu vào cơ sở dữ liệu**. Nội dung mẫu được lưu vào STEMPLATE và ID được thêm vào SCONFIG.OTHERCONFIG của loại phiếu. Mẫu mặc định hiện tại được giữ nguyên. Có thể đặt mẫu mới làm mặc định sau đó.

Sửa bằng FastReport Designer hoặc nạp lại FRX vào mẫu hiện có, lưu và tạo lại bản xem trước. Không cần sửa code khi thêm hoặc thay đổi thiết kế dùng các trường dữ liệu đã được cung cấp.

`backend/templates` chứa tệp nguồn/backup; bản in đọc nội dung database. Không cần tạo module JavaScript hoặc migration riêng cho từng mẫu mới.

Logo lấy từ Cấu hình → Thông tin công ty → Logo công ty (`CompanyLogo`). Trong FRX, đặt tên PictureObject vùng logo là `CompanyLogo` hoặc `ptLogo` (tên có chữ `logo`). Khi render, hình cấu hình thay thế hình mẫu trong đúng vùng này, giữ vị trí/kích thước và co ảnh theo tỷ lệ. Nếu chưa cấu hình logo, giữ hình gốc; nếu FRX không có vùng logo, không tự chèn hình làm thay đổi bố cục. Các ảnh khác trong mẫu được giữ nguyên.

## Bộ trường dữ liệu chung

FRX khai báo TableDataSource `Table0`, ReferenceName `Data.Table0`. Chi tiết thường dùng `ItemName`, `Unit`, `QuantityText`, `UnitPriceText`, `AmountText`, `Note`; các giá trị số để tính tổng gồm `SOLUONG`, `DONGIA`, `THANHTIEN`. Bán hàng có các alias legacy như `DMATHANG_NAME`, `DDONVITINH_NAME`, `SLXUATCHUAQUYDOI`.

Các parameter chung gồm `CompanyName`, `CompanyAddress`, `CompanyPhone`, `CompanyEmail`, `LoiCamOn`, `DocTitle`, `DocNumber`, `DocDate`, `DocDateTime`, `CustomerName`, `Contact`, `VehiclePlate`, `Description`, `SummaryText`, `TotalText`. Số tiền số nguyên gồm `TIENHANG`, `TIENGIAMGIA`, `TIENTHUE`, `TONGCONG`; chuỗi định dạng không có hậu tố tiền tệ gồm `SubtotalText`, `DiscountText`, `TotalNumberText`; `AdditionalChargesText` mô tả thuế/vận chuyển khi có. Bố cục, khổ giấy, font, logo và công thức thuộc FRX.

Mẫu có trường nghiệp vụ ngoài bộ dữ liệu backend cần được chỉnh về trường đã hỗ trợ hoặc bổ sung ánh xạ dữ liệu chung. Backend báo lỗi khi thiếu trường, không thay bằng một bản in HTML khác.

## Tùy chọn ẩn/hiện hóa đơn bán hàng

Trong Cấu hình → **Nội dung hóa đơn bán hàng**, tích từng dòng muốn hiện hoặc bỏ tích để ẩn. Nhấn **Ghi dữ liệu**, sau đó tạo lại bản xem trước. Nút **Chỉ tổng cộng và giảm giá** giữ giảm giá và lời cảm ơn; tổng cộng luôn được giữ. Nút **Hiện tất cả** bật các dòng tùy chọn. Cấu hình áp dụng chung cho các mẫu bán hàng có khai báo tương ứng, không sửa tiền hoặc chứng từ.

SCONFIG lưu các mục `SalesPrintShow_<key>`: 30 = hiện, 0 = ẩn. Khóa gồm `subtotal`, `quantity`, `discount`, `tax`, `shipping`, `returns`, `oldDebt`, `deposit`, `voucher`, `prepaid`, `pointsDeduction`, `transfer`, `card`, `cashGiven`, `change`, `newDebt`, `points`, `loyalty`, `thanks`, `moneyWords`.

FRX mới khai báo Parameter boolean `PrintShow_<key>` và đặt `VisibleExpression="[PrintShow_<key>]"` trên **TableRow**, hoặc trên cả nhãn và giá trị TextObject của cùng một dòng trong ReportSummaryBand. Renderer loại bỏ dòng ẩn và dồn nội dung phía sau lên trước khi Prepare. Không đặt điều kiện trên toàn bảng hoặc band chứa tổng cộng. Mẫu gộp các thông tin trong một dòng nên dùng các chuỗi tổng hợp chung như SummaryText; backend lọc phần giảm giá/thuế theo cấu hình.

`node migrate_sales_print_visibility.js` thêm các tùy chọn và kết nối 10 mẫu bán hàng hiện có; giữ lựa chọn đã lưu và sao lưu nội dung FRX trước khi sửa. Không cần chạy migration này cho từng mẫu mới khi FRX đã khai báo bộ khóa chung. `node print-verification/check-custom-visibility.cjs` kiểm tra giao diện lưu/tải lại và xuất PDF, rồi khôi phục cấu hình trước kiểm tra.

## Kiểm tra và giới hạn

`npm run test:printing` trong backend; `npm run build` trong frontend. `node print-verification/check-fastreport-flow.cjs` kiểm tra nhập FRX qua API, sửa nội dung database, PDF và giao diện. Mẫu kiểm tra tạm được dọn sau khi chạy.

Renderer mặc định hiện dùng FastReport Open Source và bộ xuất PDFSimple chính thức, nên không phát sinh dấu DEMO VERSION của bản Demo. Các trang PDF được xuất dưới dạng ảnh 300 DPI: in được đúng khổ giấy nhưng không chọn/tìm kiếm chữ trong PDF. Không có bước xóa hoặc che watermark; nội dung và watermark do người thiết kế đặt trong FRX vẫn được giữ.

Build và cấu hình: xem `tools/fastreport-renderer/README.md`. `FASTREPORT_RENDERER_EXE` vẫn cho phép chọn renderer có bản quyền khác nếu cần PDF dạng vector. FastReport Designer và renderer là hai chương trình riêng.
