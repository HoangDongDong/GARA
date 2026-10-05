# Thuế mặt hàng và giảm giá khách hàng

Chạy `npm run migrate:pricing-policies --prefix backend` sau migration thuế/phí dịch vụ. Migration bổ sung cột nếu thiếu, không ghi đè chính sách hoặc tính lại chứng từ cũ.

## Thiết lập và sử dụng

- Danh mục → Mặt hàng / Phụ tùng → chọn nhóm → nút Sửa nhóm: chọn thuế theo cấu hình hoặc đặt riêng. Sửa từng mặt hàng để chọn theo nhóm hoặc đặt riêng.
- Danh mục → Khách hàng → chọn nhóm → nút Sửa nhóm: đặt giảm giá mặc định cho nhóm. Trong Khách hàng → Sửa hoặc Danh mục → Sửa khách hàng: chọn theo nhóm hoặc đặt riêng.
- Dịch vụ và nhóm dịch vụ có cùng lựa chọn thuế cho sửa chữa.
- Bán hàng tự lấy chính sách khi chọn khách và mặt hàng. Nhập giảm giá để đặt riêng cho phiếu; nút Theo khách hàng trả về chính sách khách. Bấm thuế trên từng dòng để đặt riêng, ↺ để kế thừa lại.
- Sửa chữa có cùng cách tính. Lựa chọn riêng trên phiếu cần quyền Sửa của nghiệp vụ tương ứng; backend kiểm tra lại quyền.

## Quy tắc

Thuế: riêng trên phiếu → riêng mặt hàng/dịch vụ → nhóm đang sử dụng → cấu hình. Công tắc thuế trong cấu hình áp dụng cho cả bán hàng và sửa chữa, ưu tiên cao nhất: tắt thì phiếu mới không cộng thuế, không hiện cột/dòng thuế. Công tắc phí dịch vụ cũng áp dụng cho cả hai nghiệp vụ. Báo giá/hóa đơn đã lưu giữ nguyên số tiền đã chốt; hạng mục phát sinh mới tuân theo công tắc thuế hiện tại.

Giảm giá: riêng trên phiếu → riêng khách hàng → nhóm đang sử dụng → 0%. Mức riêng thay thế mức nhóm, không cộng dồn. `NULL` là kế thừa; `0` là mức riêng 0%.

Giá hiện tại được hiểu là chưa gồm thuế. Giảm giá được phân bổ theo giá trị từng dòng, sau đó tính VAT từng dòng và gom theo thuế suất. Tỷ lệ cho phép 0–100%, tối đa hai chữ số thập phân. Tiền giảm phân bổ đến hai chữ số thập phân, VAT/phí làm tròn đồng. Phí dịch vụ tính trên tiền sau giảm; VAT của phí dịch vụ dùng thuế mặc định được lưu trên phiếu, không dùng thuế suất bình quân của mặt hàng.

Phiếu mới lưu `CHARGEVERSION=1`, thuế/giảm từng dòng, `NGUONTHUE`, `NGUONGIAMGIA` và `TAXSUMMARY`. Khi sửa danh mục, phiếu đã lưu giữ nguyên. Hóa đơn sửa chữa kế thừa chính xác báo giá đã chốt; không thay mức giảm tại bước thanh toán. Hạng mục phát sinh mới lấy thuế mặt hàng tại thời điểm được duyệt và giữ mức giảm khách đã chốt, không tính lại thuế suất của các dòng cũ.

Chứng từ cũ có `CHARGEVERSION` rỗng tiếp tục dùng cách tính trước đây; không tự gắn chính sách khách mới vào hóa đơn cũ.

## Bản in FRX

`TaxBreakdownText` cung cấp các dòng VAT theo mức, `DiscountSource` cung cấp nguồn giảm giá. `TAXSUMMARY` là JSON danh sách `{rate,base,amount}` đã lưu. Với mẫu bảng có `[TILETHUE]`/`[TIENTHUE]`, renderer mở rộng dòng VAT trong bộ nhớ thành từng mức; không ghi đè FRX trong database. Dòng VAT bằng 0 được bỏ qua. Tổng tiền bán hàng dùng dấu phẩy phân cách nghìn.

Kiểm tra: `TEST_FIREBIRD=1 node --test --test-concurrency=1 tests/pricingPolicy*.test.js` trong backend. Kiểm thử database dùng transaction rollback, không giữ lại phiếu hay thay đổi chính sách thật. `RENDER_POLICIES=1` xuất PDF tạm để kiểm tra bố cục.
