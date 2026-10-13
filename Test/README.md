# Kiểm thử và script Firebird

Tất cả file kiểm thử và script tạo/cập nhật database được tập trung tại đây.

- `backend/tests/`: kiểm thử backend, quyền truy cập, in ấn, Firebird.
- `frontend/tests/`: kiểm thử logic và bộ thiết kế mẫu in frontend.
- `print-agent/tests/`: kiểm thử print-agent.
- `firebird/`: script migration, tạo bảng, seed dữ liệu, kiểm tra schema.
- `firebird/tools/`: tạo database mẫu SaaS, kiểm tra backup, chuẩn hóa mẫu in và kiểm tra ảnh.
- `artifacts/`: ảnh/PDF kiểm tra, log và các bản sao lưu cấu hình cũ; không đưa vào Git.
- `relocation-manifest.json`: bảng đối chiếu đường dẫn trước/sau khi gom file.

## Chạy kiểm thử

Từ thư mục gốc `D:\Garage\garage-app`:

```powershell
npm --prefix Test test
npm --prefix Test run test:backend
npm --prefix Test run test:frontend
npm --prefix Test run test:print-agent
```

Các lệnh `npm run test:*` và `npm run migrate:*` trong `backend` vẫn sử dụng được với đường dẫn mới.

```powershell
npm --prefix backend run test:access
npm --prefix backend run migrate:document-numbers
npm --prefix backend run migrate:fuel-catalog
npm --prefix backend run migrate:store-profiles
```

## Lưu ý khi chạy script Firebird

Migration/seed có thể thay đổi database. Chỉ chạy script phù hợp với database/cửa hàng cần cập nhật; không chạy toàn bộ seed trên dữ liệu thật. Việc gom thư mục chỉ di chuyển file và cập nhật đường dẫn, không tự chạy migration hay seed.

Test Firebird được bật khi đặt `TEST_FIREBIRD=1`; các test tích hợp mới dùng giao dịch rollback. Một số công cụ QA cũ có hành vi riêng, cần đọc script trước khi chạy.

Công cụ chạy thường xuyên như `backend/tools/database-backup.js`, `backend/tools/saas-worker.js`, `backend/tools/saas-login-directory.js` và FastReport vẫn ở backend. Giữ thư mục `Test/firebird` khi triển khai: quy trình khởi tạo cửa hàng mới vẫn gọi một số migration tại đây.

Các script dùng thư viện đã cài ở `backend/node_modules`; không cần sao chép hoặc cài thêm node_modules trong Test.

Bộ chạy `run-tests.cjs` đặt `SAAS_ENABLED=false` riêng cho tiến trình test đơn vị; không sửa `.env` của ứng dụng. Test tenancy tự đặt ngữ cảnh riêng. Test Firebird phải được bật chủ động bằng biến môi trường tương ứng.
