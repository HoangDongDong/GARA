# Rà soát và áp dụng mẫu in GARA

Ngày cập nhật: 04/10/2026.

## Luồng hiện tại: FastReport từ database

Giao diện xem trước và in hiện dùng PDF được render trực tiếp từ `STEMPLATE.TEMPLATE`. Có nút **Thêm mẫu .frx** để nhập mẫu mới và gắn loại phiếu; sửa FRX trong database áp dụng khi tạo lại PDF. Không dùng bộ dựng HTML cho luồng in hiện tại. Xem [hướng dẫn mẫu FastReport](FASTREPORT-TEMPLATES.md) về dữ liệu, quy trình và giới hạn FastReport Demo.

Các phần dưới ghi lại lịch sử kiểm tra trước khi chuyển lại sang FastReport.

## Luồng in hiện tại: HTML và window.print()

Sau khi đối chiếu GYM, đã chuyển giao diện in GARA và bản xem trước POS sang HTML/CSS. API `GET /api/printing/:type/:id/html` dùng dữ liệu chứng từ đã lưu và logo cấu hình; giữ kiểm tra quyền Xem + In và danh sách ID STEMPLATE được phép. Giao diện nhúng trang in trong iframe không cho chạy script và gọi `window.print()` trên iframe. Nút **In / Lưu PDF** mở hộp thoại in của trình duyệt; chọn Lưu thành PDF để xuất file.

Luồng này không chạy FastReport renderer, nên không phát sinh dấu DEMO VERSION. Các API PDF FastReport cũ giữ để tương thích, nhưng không còn được giao diện in hiện tại gọi. Các mô tả PDF FastReport ở phần lịch sử dưới đây là kết quả kiểm tra trước khi đổi luồng in.

STEMPLATE và OTHERCONFIG vẫn quyết định mẫu mặc định, mẫu được chọn và khổ giấy (A4 đứng/ngang, A5, 54/58/77/80 mm). Nội dung FRX không được chạy hay chuyển toàn bộ sang HTML; bản in dùng bố cục GARA theo nghiệp vụ. Chỉnh nội dung trong FastReport Designer chưa áp dụng vào bản in HTML. Không thay đổi file FRX gốc hay dữ liệu nghiệp vụ.

Kiểm tra: 24 kiểm thử thành công, frontend build thành công; API HTML chạy được cho 15 loại có chứng từ lưu thật. Thu, chi và lương chưa có bản ghi nên kiểm tra bằng fixture trong unit tests. Chrome kiểm tra giao diện xem trước A4 đứng/ngang, 80 mm và xuất kho; nút In gọi đúng window.print và không yêu cầu API PDF cũ. Chưa kiểm tra máy in vật lý.

## Kết quả

Đã kết nối **18 loại bản in** trên **13 màn hình nghiệp vụ**. Số này tính theo loại chứng từ, không đếm lặp các nút in ở danh sách, chi tiết và chân màn hình. Các màn hình tổng quan, quản trị và cấu hình không phát sinh thêm chứng từ giao dịch cần in.

| STT | Loại bản in | Màn hình áp dụng | Nguồn dữ liệu đã lưu | SCONFIG.NAME |
|---|---|---|---|---|
| 1 | Phiếu tiếp nhận xe | Tiếp nhận; Sửa chữa | TTIEPNHANXE, DXE, DKHACHHANG, nhân viên được phân công | MauPhieuTiepNhan |
| 2 | Lệnh sửa chữa | Sửa chữa; Hồ sơ chờ duyệt; Hồ sơ xe | TLENHSUACHUA + TLENHSUACHUACHITIET | MauPhieuSuaChua |
| 3 | Báo giá sửa chữa | Tiếp nhận; Sửa chữa; Hồ sơ chờ duyệt | TBAOGIA + TBAOGIACHITIET | MauBaoGia |
| 4 | Biên bản bàn giao xe | Sửa chữa; Hồ sơ chờ duyệt | Lệnh đã hoàn thành/QC/bàn giao, chi tiết sửa chữa | MauPhieuBanGiao |
| 5 | Hóa đơn sửa chữa | Sửa chữa; Hồ sơ chờ duyệt | THOADONSUACHUA, chi tiết lệnh liên kết khi có | MauHoaDonSuaChua |
| 6 | Phiếu bảo hành | Bảo hành; Hồ sơ xe | TBAOHANH, xe, chủ xe, phụ tùng/dịch vụ | MauPhieuBaoHanh |
| 7 | Hóa đơn bán phụ tùng | Bán hàng/POS | TDONHANG + TDONHANGCHITIET | MauHoaDonBanHang |
| 8 | Phiếu nhập kho | Nhập kho; Mua linh kiện | TNHAPKHO + TNHAPKHOCHITIET | MauPhieuNhapKho |
| 9 | Phiếu xuất phụ tùng theo lệnh | Nhập kho; Sửa chữa | TXUATPHUTUNG, nhóm theo TLENHSUACHUAID | MauPhieuXuatKho |
| 10 | Phiếu thu | Thu - Chi | TTHUCHI, LOAI=0 | MauPhieuThu |
| 11 | Phiếu chi | Thu - Chi | TTHUCHI, LOAI=1 | MauPhieuChi |
| 12 | Tem mã vạch phụ tùng | Nhập kho; Mua linh kiện | DMATHANG.BARCODE/CODE, tên, giá bán | MauMaVachPhuTung |
| 13 | Bảng lương | Nhân viên; Báo cáo theo mẫu | TBANGLUONG + TBANGLUONGCHITIET, DNHANVIEN | MauBangLuong |
| 14 | Tổng hợp giá trị hóa đơn GARA | Báo cáo | THOADONSUACHUA + TDONHANG, theo ngày chứng từ | MauBaoCao |
| 15 | Hồ sơ xe | Hồ sơ xe | DXE, chủ xe, VIN/số máy, năm/màu/ODO | MauHoSoXe |
| 16 | Lịch sử sửa chữa xe | Hồ sơ xe; Báo cáo theo mẫu | TLENHSUACHUA theo DXEID và khoảng ngày | MauLichSuSuaChua |
| 17 | Công nợ khách hàng | Khách hàng; Thu - Chi; Báo cáo theo mẫu | Số dư hóa đơn sửa chữa và đơn bán phụ tùng | MauCongNoKhachHang |
| 18 | Công nợ nhà cung cấp | Nhà cung cấp; Thu - Chi; Báo cáo theo mẫu | TNHAPKHO.CONGNO theo nhà cung cấp | MauCongNoNhaCungCap |

13 màn hình: Tiếp nhận, Sửa chữa, Hồ sơ chờ duyệt, Bán hàng, Mua linh kiện, Nhập kho, Bảo hành, Hồ sơ xe, Thu - Chi, Khách hàng, Nhà cung cấp, Nhân viên, Báo cáo.

## Cách sử dụng

Nhấn **In chứng từ** ở màn hình nghiệp vụ hoặc nút in tại chứng từ đang chọn. Chọn loại phiếu, tìm chứng từ đã lưu, chọn mẫu rồi **Xem bản in → In PDF / Tải PDF**. Các nút tại hồ sơ xe, bảo hành, nhập kho, lệnh sửa chữa, khách hàng, nhà cung cấp và POS tự truyền ID thật khi có.

Trong **Cấu hình → In ấn & Mẫu**, mẫu mặc định đọc từ `SCONFIG.TEXTVALUE`. `OTHERCONFIG` chứa JSON danh sách **ID STEMPLATE trực tiếp**. Mẫu chọn tại hộp thoại chỉ áp dụng cho lần in, không thay đổi cấu hình mặc định.

Đã thêm 18 mẫu A4 GARA vào STEMPLATE và đặt làm mặc định khi gắn lần đầu. Mẫu tem có Code128; danh sách mã vạch chọn phụ tùng đã lưu. File FRX nguồn nằm tại `backend/templates/gara/`. Các mẫu gốc vẫn được giữ; mẫu có biến không được ánh xạ sẽ báo lỗi và yêu cầu chọn mẫu GARA/chỉnh mẫu, thay vì tự điền số 0 vào dữ liệu thiếu.

Migration sao lưu SCONFIG vào `backend/system-config-templates-backup-*.json`. Chạy lại migration không ghi đè nội dung STEMPLATE đã có hoặc mẫu mặc định người dùng đã đổi. `--refresh-generated` là thao tác chủ động cập nhật 18 mẫu sinh sẵn, có thể ghi đè chỉnh sửa của những mẫu này; không dùng cờ này sau khi tùy chỉnh mẫu.

## Các giới hạn đã xác định

- TTHUCHI và TBANGLUONG hiện không có bản ghi. Luồng in đã được nối; người dùng cần chứng từ lưu thật. Các màn hình thu chi và một số phần báo cáo còn dùng dữ liệu minh họa; thao tác in không lấy dữ liệu minh họa đó và không tự tạo giao dịch.
- Báo cáo mới tổng hợp **giá trị hóa đơn theo ngày**, bao gồm hóa đơn còn công nợ. Đây không phải báo cáo tiền thực thu, lợi nhuận hay kê khai thuế. Các biểu đồ và danh mục báo cáo minh họa trên BaoCaoPage chưa trở thành báo cáo dữ liệu thật trong phạm vi thay đổi này; các nút PDF được đặt tên rõ là tổng hợp GARA.
- Báo cáo công nợ cộng **dư nợ hiện tại của chứng từ nằm trong khoảng ngày chọn**; không có tính số dư đầu kỳ/cuối kỳ hay lịch sử thanh toán vì chưa có sổ đối soát tương ứng.
- Phiếu xuất hiện là xuất phụ tùng cho lệnh sửa chữa; không dùng đơn bán hàng làm phiếu xuất sửa chữa, không giả lập chuyển kho/kiểm kê khi chưa có nghiệp vụ tương ứng.
- Mẫu tem hiện là A4 có mã Code128; chưa có thiết lập cuộn tem/kích thước máy in nhiệt riêng.
- FastReport đang dùng thư viện `fastreport.net.demo/2026.2.7`, có dấu **Demo version** và có thể chèn chữ demo vào nội dung xuất. Cần bộ FastReport có bản quyền để sử dụng PDF chính thức không có dấu demo.
- Chưa kiểm tra máy in vật lý và thao tác trong trình duyệt thực tế. Đã kiểm tra build giao diện, API và bản PDF render.

## Kiểm tra

- `npm run build --prefix frontend`: thành công.
- `node --test backend/tests/*.test.js`: 11 kiểm thử thành công, gồm quyền Xem + In, ngày hợp lệ, đúng loại thu/chi, chặn bàn giao chưa hoàn thành, thuế/giảm giá, ưu tiên số dư đã lưu và chặn biến mẫu không tương thích.
- `node backend/verify_print_documents.js`: 18 mẫu tạo được PDF; 15 dùng chứng từ thật, 3 thu/chi/lương dùng mock tách biệt. Không chèn chứng từ kiểm thử vào Firebird.
- API `/api/printing/types`: 200, trả đủ 18 loại cho admin; không có token: 401. API xuất PDF và luồng in POS cũ trả PDF hợp lệ.
- PDF được render thành ảnh để kiểm tra bảng, chữ tiếng Việt, ngắt trang và mã vạch. Các bản kiểm tra chứa dữ liệu nghiệp vụ ở `backend/print-verification/`, đã đưa vào .gitignore.

Triển khai trên database khác: `npm run migrate:print-documents --prefix backend`, sau khi có nhóm cấu hình In ấn & Mẫu và kết nối Firebird đúng. In là thao tác đọc; không chuyển trạng thái sửa chữa, thu tiền hay trừ kho.

## Bổ sung mẫu người dùng cho bốn nghiệp vụ (03/10/2026)

Đã tạo 12 mẫu từ ba file gốc `D:/Garage/Mẫu A4 nằm ngang.frx`, `Mẫu A4 nằm đứng.frx`, `Mẫu 80.frx` cho Lệnh sửa chữa, Báo giá sửa chữa, Bàn giao xe và Hóa đơn sửa chữa. Giữ nguyên file gốc, bố cục đầu trang/logo/chữ ký; bổ sung thông tin chứng từ và chi tiết nghiệp vụ. Mỗi mẫu có ID STEMPLATE riêng, gắn vào OTHERCONFIG của đúng loại phiếu. A4 đứng được đặt mặc định khi bổ sung lần đầu; chạy lại migration giữ nguyên mẫu mặc định và chỉnh sửa STEMPLATE hiện có.

Nguồn FRX điều chỉnh: `backend/templates/business/<SCONFIG.NAME>/`. Migration: `npm run migrate:business-templates --prefix backend`.

Đã sửa mẫu Xuất kho cũ A4/A5/80mm/54mm: nhân viên và kho được tổng hợp từ các dòng TXUATPHUTUNG, email lấy từ cấu hình, diễn giải lấy ghi chú xuất, ngày lấy NGAYXUAT, tổng tiền lấy chi tiết xuất. Thuế/chiết khấu của xuất phụ tùng theo lệnh là 0 vì TXUATPHUTUNG không lưu các khoản này. Bổ sung chuyển biểu thức ToVndWords thành dữ liệu số tiền bằng chữ, giữ nguyên số tiền gốc.

Kiểm tra: 12 mẫu mới và 5 mẫu xuất kho đều tạo được PDF với chứng từ lưu thật. Đã xem ảnh của 17 trang PDF. Phiếu xuất kho A4 của LSC11685284 trả HTTP 200 application/pdf. Tổng 19 kiểm thử đều đạt. Hạn chế bản quyền FastReport Demo vẫn còn như mô tả ở trên.
