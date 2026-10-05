# FastReport Open Source PDF renderer

Renderer này dùng các gói chính thức FastReport.OpenSource và FastReport.OpenSource.Export.PdfSimple 2026.2.8, không sử dụng FastReport Demo. Mẫu FRX vẫn lấy từ STEMPLATE trong database; không sửa, che hoặc xóa nội dung PDF để loại bỏ watermark.

Build trên Windows với .NET SDK:

```powershell
dotnet publish backend/tools/fastreport-renderer/FastReportRenderer.csproj -c Release -o backend/tools/fastreport-renderer/bin/Renderer
```

Backend mặc định gọi `bin/Renderer/Garage.FastReportRenderer.exe --render template.frx data.json output.pdf`. Có thể đặt `FASTREPORT_RENDERER_EXE` để dùng renderer khác. Cửa sổ Designer là một chương trình riêng, dùng các thư viện Designer hiện có.

Bộ xuất PDFSimple chính thức lưu mỗi trang dưới dạng ảnh 300 DPI trong PDF, nên không chọn/tìm kiếm chữ như PDF dạng vector. Khổ giấy, bố cục, dữ liệu, logo và font do FastReport render từ FRX. Giữ toàn bộ nội dung có sẵn trong mẫu, bao gồm watermark do người thiết kế đặt nếu có.

Nguồn và giấy phép: https://github.com/FastReports/FastReport ; https://www.nuget.org/packages/FastReport.OpenSource.Export.PdfSimple/2026.2.8 . Các gói được khóa phiên bản trong csproj; không tự chuyển về renderer Demo khi xuất lỗi.
