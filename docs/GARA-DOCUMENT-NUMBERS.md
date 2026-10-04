# Cấu hình số phiếu GARA

Các ô lập phiếu tại Sửa chữa, Tiếp nhận, Nhập kho, POS, form Bảo hành, form Thu/Chi và form thanh toán hóa đơn sửa chữa hiển thị số dự kiến ngay. GET document-numbers/:type/next kiểm tra quyền xem của từng nghiệp vụ và chỉ đọc bộ đếm. Đổi loại Thu/Chi đổi số tương ứng; chọn phiếu đã lưu giữ số cũ. Tại Sửa chữa, các bước trong quy trình dùng chung số lệnh; khi thanh toán có thêm số hóa đơn riêng. Bản dự kiến không được gửi thành số thủ công ở nhập kho nếu người dùng chưa sửa ô đó. Các form minh họa chưa có API lưu chỉ hiển thị số dự kiến, không cấp số chính thức.

Kiểm tra Chrome: Sửa chữa hiện LSC, nhập kho PN, tiếp nhận TN, bảo hành PBH, form Thu/Chi đổi PT/PC đúng cấu hình. Mở các trang và form này không thay đổi bất kỳ bộ đếm nào. Build và 30 unit tests thành công.

POS hiển thị ngay số dự kiến theo cấu hình qua GET sales/next-number, khi mở trang hoặc tạo phiếu mới. API chỉ đọc bộ đếm và kiểm tra số đã tồn tại, không cấp số. Khi lưu, backend vẫn cấp số dưới khóa transaction và giao diện cập nhật số chính thức từ kết quả lưu. Hai máy có thể cùng nhìn thấy số dự kiến, nhưng phiếu lưu thành công nhận số chính thức riêng. Kiểm tra Chrome và database xác nhận mở trang/tạo phiếu mới không tăng bộ đếm.

Nhóm Số phiếu lưu 10 mẫu trong SCONFIG.TEXTVALUE; tên bắt đầu SoPhieu. Migration bổ sung: `npm run migrate:document-numbers --prefix backend`. Chạy lại giữ nguyên cấu hình, bộ đếm và số chứng từ đã lưu.

| Phiếu | Tên cấu hình | Mẫu mặc định | Luồng áp dụng |
|---|---|---|---|
| Tiếp nhận xe | SoPhieuTiepNhan | TN(yy)/(*****) | POST repair-orders/tiep-nhan, bao gồm tạo từ màn hình Sửa chữa |
| Lệnh sửa chữa | SoPhieuLenhSuaChua | LSC(yy)/(*****) | POST repair-orders |
| Báo giá riêng | SoPhieuBaoGia | BG(yy)/(*****) | Có TBAOGIA, chưa có API tạo riêng |
| Hóa đơn sửa chữa | SoPhieuHoaDonSuaChua | HDSC(yy)/(*****) | POST invoices |
| Hóa đơn bán phụ tùng | SoPhieuBanPhuTung | BH(yy)/(*****) | POST sales |
| Nhập kho | SoPhieuNhapKho | PN(yy)/(*****) | POST inventory-receipts; để NAME trống tự sinh, có thể nhập thủ công |
| Bảo hành | SoPhieuBaoHanh | PBH(yy)/(*****) | Hai API tạo bảo hành trong vehicles |
| Thu | SoPhieuThu | PT(yy)/(*****) | Chưa có API lập riêng |
| Chi | SoPhieuChi | PC(yy)/(*****) | Chưa có API lập riêng |
| Bảng lương | SoPhieuBangLuong | BL(yy)/(*****) | Chưa có API lập riêng |

Bàn giao và xuất phụ tùng theo lệnh dùng số TLENHSUACHUA; không cấp thêm số độc lập. Luồng báo giá trên màn hình Sửa chữa hiện lưu vào TLENHSUACHUA và dùng số lệnh. Màn hình tiếp nhận cũ còn có thao tác minh họa cục bộ; số phiếu thật chỉ cấp khi gọi API lưu TTIEPNHANXE.

Hỗ trợ (yyyy), (yy), (MM), (dd), đúng một nhóm dấu sao 1–9 ký tự: (*****) hoặc ('*****'). Ví dụ BG(yy)/(*****) tạo BG26/00001; HD(yyyy)(MM)-(****) tạo HD202610-0001. Ngày lấy theo thời điểm cấp số, múi giờ Asia/Bangkok. Đếm lại theo đơn vị nhỏ nhất có trong mẫu: ngày, tháng, năm; không có ngày tháng năm thì liên tục. Không cho số tự tăng vượt độ dài; tăng số dấu sao trong cấu hình khi hết số.

SNUMBERCOUNTER khóa hàng theo loại phiếu trong transaction Firebird trước khi cấp số, kiểm tra NAME cả chứng từ đã hủy để không tái sử dụng số cũ. Thu/chi dùng cùng TTHUCHI nên khóa cả hai bộ đếm. Nhập kho số thủ công cũng dùng cùng khóa và kiểm tra trùng. Lệnh, bán phụ tùng và nhập kho cấp số trong transaction lưu chứng từ; tiếp nhận, hóa đơn sửa chữa và bảo hành cấp số riêng trước khi ghi nên có thể có khoảng trống nếu ghi thất bại. Không cam kết dãy liên tục không có khoảng trống.

API xem ví dụ POST system-config/number-preview không cấp số. API lưu cấu hình kiểm tra cú pháp và rollback toàn bộ nếu có mẫu sai. Bộ đếm không thay đổi khi xem ví dụ hoặc sửa mẫu; đổi mẫu chỉ ảnh hưởng phiếu mới. Nếu đổi về mẫu cũ hay ngày lặp lại, bộ cấp số bỏ qua NAME đã tồn tại.

Kiểm tra: 29 unit tests; frontend build; cấp số thật cho 6 loại trong transaction rollback và xác nhận bộ đếm giữ nguyên; 4 transaction Firebird đồng thời trên bộ đếm tách biệt cấp 4 số khác nhau rồi xóa bộ đếm kiểm thử; API lưu mẫu hiện tại và từ chối mẫu sai; Chrome xác nhận 10 mục và ví dụ thay đổi theo mẫu nhập. Không tạo chứng từ nghiệp vụ để kiểm thử.
