# Trình thiết kế mẫu in trên web

Mở **Cấu hình → Quản lý mẫu in → chọn mẫu → Sửa mẫu trên web**.

## Chức năng

- Đọc và sửa trực tiếp XML FRX, giữ Dictionary, ScriptText, biểu thức, định dạng và đối tượng ngoài phạm vi hỗ trợ.
- Chọn trang/vùng in; di chuyển, thay đổi kích thước chữ, hình, đường kẻ, khung bằng chuột; bám lưới 1 mm và thu phóng.
- Thêm chữ/trường dữ liệu, ảnh PNG/JPEG (2 MB), đường kẻ, khung và bảng một dòng ba cột vào vùng đã chọn.
- Sửa nội dung, font, cỡ chữ, màu chữ, căn ngang, viền và tọa độ theo mm.
- Sửa ô bảng hiện có, độ rộng cột, chiều cao dòng. Ô bảng giữ cấu trúc và không kéo rời khỏi bảng; chọn toàn bảng rồi kéo nhãn để di chuyển.
- Bấm trang giấy rồi Ctrl+A để chọn các đối tượng có thể di chuyển trên trang hiện tại. Kéo một đối tượng đã chọn để di chuyển cả cụm, giữ khoảng cách và vùng in của từng đối tượng. Ctrl+Z hoàn tác cả lần kéo; Ctrl+Y hoặc Ctrl+Shift+Z làm lại.
- Khi kéo toàn trang qua nhiều vùng in, dịch dọc bằng lề trên của trang để không thêm khoảng trống vào từng dòng lặp. Nhóm chỉ gồm một phần đối tượng ở nhiều vùng in chỉ dịch ngang; muốn dịch dọc, chỉnh từng vùng riêng.
- Đối tượng rời có tay nắm ở cạnh và góc để thay đổi riêng chiều rộng, chiều cao hoặc cả hai. Kéo tay nắm không đổi cỡ chữ và không đổi đối tượng khác; đường kẻ có tay nắm ở hai đầu. Ô bảng vẫn chỉnh rộng cột / cao dòng trong thuộc tính.
- Ctrl+C/Ctrl+V sao chép và dán đối tượng trong trình thiết kế. Khi con trỏ ở ô nhập chữ, các phím tắt vẫn chọn, sao chép và hoàn tác chữ theo hành vi của trình duyệt.
- Chọn ô bảng để dùng Xóa hàng / Xóa cột; giữ tối thiểu một hàng và một cột. Chọn ô hoặc đối tượng chữ rồi bấm Xóa chữ (hoặc Delete trên trang giấy) để làm trống nội dung, giữ khung và định dạng. Xóa đối tượng bỏ hẳn khung chữ rời. Các thao tác đều có thể hoàn tác trước khi đóng trình thiết kế.
- Hoàn tác/làm lại 50 thao tác; tải FRX; lưu bản sao vào loại phiếu đang chọn.
- Xem trước PDF với ba dòng dữ liệu mẫu, qua FastReport Open Source và PDF.js. Không cần trình đọc PDF của trình duyệt.
- Lưu kiểm tra SHA-256 của bản gốc bên trong transaction có khóa hàng. Phiên bản cũ trả HTTP 409.
- Sao lưu nội dung trước khi ghi ở `backend/storage/print-template-backups/<hash-id>/`. Chọn bản sao lưu để nạp, kiểm tra rồi bấm Lưu để khôi phục. Giao diện hiển thị 30 bản gần nhất; tệp cũ vẫn được giữ. Cần đưa thư mục này vào quy trình sao lưu máy chủ.

## Giới hạn

Đây là trình thiết kế riêng của GARA, không phải FastReport Online Designer. Không cần mua giấy phép Designer. Backend vẫn dùng bộ renderer Open Source đã có; xem trước cần executable renderer đã build.

Màn hình thiết kế mô phỏng một lần xuất hiện của từng vùng in. PDF xem trước thể hiện font và vùng lặp thực tế. Dữ liệu xem trước là dữ liệu giả theo kiểu khai báo trong Dictionary, không lấy hóa đơn/khách hàng thật. Mẫu có script, nguồn dữ liệu hoặc biểu thức đặc biệt có thể cần dữ liệu riêng để xem trước thành công.

Chưa hỗ trợ thêm/xóa dòng hoặc cột bảng, thiết kế barcode/chart/subreport, sửa script và đổi kiểu nguồn dữ liệu. Đối tượng chưa hỗ trợ hiển thị nhãn và giữ XML gốc. Designer Windows và trình sửa XML vẫn có trong phần tùy chọn.

Lưu mẫu không tự chọn mẫu đó làm mặc định. Khổ giấy và lề là mm; tọa độ đối tượng dùng đơn vị FRX 96 DPI (3.78 đơn vị/mm).

## Kiểm tra

Tại frontend: `node --test tests/frxDesigner.test.mjs`, `npm run build`.

Tại backend: `node --test tests/webReportDesigner.test.js tests/webReportDesignerRoutes.test.js`.

API mới dưới `/api/print-templates/:id`: `GET/PUT web-content`, `POST web-preview`, `GET web-backups/:backupId`. Các endpoint dùng middleware xác thực/phân quyền chung của ứng dụng. Preview không ghi mẫu vào database; giới hạn hai tiến trình renderer đồng thời và 60 giây mỗi lần render.
