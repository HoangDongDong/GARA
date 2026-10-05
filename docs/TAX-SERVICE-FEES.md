# Thuế và phí dịch vụ

Hai tỷ lệ mặc định nằm trong **Cấu hình → Thuế & phí dịch vụ**, lưu ở `SCONFIG.DECIMALVALUE`:

- `MacDinhThueSuat`: thuế suất (%).
- `MacDinhPhiDichVu`: phí dịch vụ (%).

Mỗi tỷ lệ có ô **Áp dụng trong bán hàng** riêng (`BanHangTinhThue`, `BanHangTinhPhiDichVu`, lưu `INTVALUE=30` khi bật và `0` khi tắt). Tắt sẽ ẩn dòng đó trong POS và không cộng khoản đó vào phiếu bán mới, kể cả khi client gửi lại tỷ lệ cũ. Tỷ lệ mặc định vẫn được giữ để bật lại. Hai lựa chọn này chỉ áp dụng cho bán hàng; sửa chữa giữ cách áp dụng tỷ lệ mặc định hiện có.

## Cách tính

1. Tiền sau giảm giá = tiền hàng / tiền công và phụ tùng − giảm giá.
2. Phí dịch vụ = tiền sau giảm giá × tỷ lệ phí dịch vụ; làm tròn đến đồng.
3. Thuế = (tiền sau giảm giá + phí dịch vụ) × thuế suất; làm tròn đến đồng.
4. Tổng thanh toán = tiền sau giảm giá + phí dịch vụ + thuế.

Ví dụ: tiền hàng 2.200.000đ, phí dịch vụ 10%, thuế 20% → phí 220.000đ, thuế 484.000đ, tổng 2.904.000đ.

## Lưu chứng từ

- POS lưu `TILETHUE`, `TIENTHUE`, `TILEPHIDICHVU`, `PHIDICHVU`, tổng tiền và tiền đã thu vào `TDONHANG`.
- Báo giá/lệnh sửa chữa lưu các tỷ lệ và số tiền vào `TLENHSUACHUA`. Phát sinh được khách chấp thuận cập nhật lại các số tiền theo tỷ lệ đã lưu.
- Hóa đơn sửa chữa dùng tỷ lệ đã lưu trên lệnh; lệnh cũ chưa lưu tỷ lệ dùng cấu hình mặc định. Hóa đơn lưu các tỷ lệ/số tiền vào `THOADONSUACHUA` và thanh toán theo tổng đã gồm thuế/phí.
- Hóa đơn có sẵn luôn dùng số tiền đã lưu. Đổi cấu hình chỉ ảnh hưởng phiếu mới; không tính lại hóa đơn cũ.
- Bản in và HTML dùng số tiền lưu trên chứng từ. Mẫu bill có hàng VAT sẽ được bổ sung hàng phí dịch vụ lúc render; không ghi đè mẫu in đã lưu.

## Cài đặt và kiểm tra

Chạy trong thư mục `backend`:

```powershell
npm run migrate:default-charge-rates
npm run migrate:applied-charge-rates
node --test tests/appliedChargeRates.test.js tests/defaultChargeRates.test.js tests/salesPrices.test.js
$env:TEST_FIREBIRD='1'
node --test tests/appliedChargeRates.integration.test.js
```

Các migration có thể chạy lại và giữ nguyên giá trị đã lưu. Kiểm tra Firebird tạo dữ liệu trong transaction rồi rollback toàn bộ. Đặt thêm `RENDER_CHARGES=1` để tạo PDF kiểm tra trong `backend/tmp/pdfs`.
