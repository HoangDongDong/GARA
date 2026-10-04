# Ảnh mặt hàng nền trắng

Form mặt hàng dùng chung (`PartFormModal`) tự động tách nền khi chọn JPG,
PNG hoặc WebP tối đa 3 MB. Sau xử lý, ảnh được ghép lên nền trắng, giới hạn
cạnh dài 1600 px và lưu JPEG vào `DMATHANG.ANH` qua API mặt hàng hiện có.
Người dùng xem trước kết quả và bấm lưu. Form chặn lưu/đổi ảnh/đóng trong
khi xử lý; khi xử lý lỗi, form yêu cầu chọn lại hoặc bỏ ảnh.

Chỉ áp dụng cho ảnh được chọn mới trong form mặt hàng tại danh mục và nhập
kho. Không chạy trên ảnh xe, ảnh sửa chữa, hoặc tự sửa ảnh đã lưu trước đó.
Ảnh có tay cầm, vật che hoặc nền phức tạp có thể còn sót một phần sau tách nền.

## Tài nguyên mô hình

Thư viện `@imgly/background-removal` 1.7.0 chạy trên trình duyệt. Mô hình
ISNet FP16 và WASM được phục vụ tại `/part-image-model/` từ thư mục
`frontend/public/part-image-model`, tổng khoảng 100 MB. Ảnh không được gửi
sang dịch vụ tách nền bên ngoài. Thiết bị cần thời gian xử lý tùy cấu hình.

Khi dựng checkout mới, chạy từ `frontend`:

```sh
npm ci
npm run prepare:part-images
npm run build
```

Lệnh chuẩn bị tải tài nguyên từ CDN chính thức IMG.LY, bỏ qua chunk đã có
đủ dung lượng. Cần đóng gói thư mục tài nguyên cùng frontend khi triển khai.
Tách nền được import động khi chọn ảnh; không tải mô hình khi mở trang bán hàng.

## Kiểm tra

`tools/check-part-background.cjs` dùng Playwright và Edge headless với Vite
ở `http://127.0.0.1:5188`. Nếu Playwright không nằm trong node_modules, đặt
`PLAYWRIGHT_MODULE` trỏ đến module có sẵn. Kiểm tra ảnh thực, nền trắng,
giới hạn dung lượng, tài nguyên nội bộ, lỗi file, chặn lưu khi đang xử lý và
lưu đúng ảnh đã xử lý qua fixture `scripts/part-image-form-check.html`.
Kiểm tra này không ghi dữ liệu vào database.

Thư viện có giấy phép AGPL; xem `@imgly/background-removal/LICENSE.md` và
https://github.com/imgly/background-removal-js.
