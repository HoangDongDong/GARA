# Giao diện cửa hàng trắng — 09/10/2026

Đọc database kazuko1 xác nhận DXE có 0 dòng, cashbook có 0 dòng và tổng thu/chi bằng 0. Ảnh lọc dầu, trạng thái hoạt động và mốc bảo dưỡng khi chưa có xe đến từ EMPTY_VEHICLE_PROFILE. Các KPI, giao dịch, biểu đồ và bộ lọc 09/2025 trên ThuChiPage là giá trị hardcode, không phải dữ liệu bị sao chép từ cửa hàng khác.

HoSoXePage bỏ bộ dữ liệu xe minh họa không sử dụng và ảnh lọc dầu fallback. Chưa có ID xe chỉ render trạng thái trống, nút tạo hồ sơ; không render thông tin giả, nhắc bảo dưỡng hay thao tác của hồ sơ. Xe thật chưa có ảnh dùng icon trung tính. Mốc bảo dưỡng mặc định 5000 km cho hồ sơ xe thật vẫn là logic dự kiến hiện có, chưa phải lịch bảo dưỡng được khách đăng ký.

ThuChiPage tải /finance/cashbook; lọc theo ngày, loại, đối tác/nội dung và danh mục; tổng thu chi, giao dịch, biểu đồ và tổng cuối bảng tính từ dữ liệu thật. Mặc định từ đầu tháng tới hôm nay UTC+7. Bỏ tỷ lệ tăng trưởng mẫu. Số dư tiền mặt theo sổ tính thu trừ chi tiền mặt tới ngày kết thúc, bao gồm trước kỳ; chuyển khoản/thẻ không cộng vào số dư tiền mặt. Không có cấu hình số dư đầu tiền mặt riêng trong phép tính này. Category thu chi lấy từ DLYDOTHUCHI, chứng từ nghiệp vụ có danh mục theo nguồn. Lỗi tải không thay bằng dữ liệu mẫu; giữ số tổng dạng gạch ngang.

Kiểm chứng: backend 183 đạt/13 bỏ qua, frontend 34 đạt. Test mới kiểm tra cửa hàng trống, lọc và tổng số liệu, không tính chuyển khoản vào tiền mặt và ngày theo UTC+7. Build thành công, cảnh báo bundle lớn hiện có. Không thay đổi dữ liệu cửa hàng khi sửa giao diện.
