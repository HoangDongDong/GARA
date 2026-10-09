using System.Drawing.Printing;
using System.Text.Json;
using Windows.Data.Pdf;
using Windows.Storage;
using Windows.Storage.Streams;

// Windows' built-in PDF renderer; no browser, external PDF program or RAW PDF.
class Program
{
    [STAThread]
    static int Main(string[] args)
    {
        Console.OutputEncoding=System.Text.Encoding.UTF8;
        Console.InputEncoding=System.Text.Encoding.UTF8;
        try
        {
            if (args.Length == 1 && args[0] == "printers")
            {
                Console.WriteLine(JsonSerializer.Serialize(PrinterSettings.InstalledPrinters.Cast<string>().Select(name => new { name })));
                return 0;
            }
            if (args.Length == 4 && args[0] == "paper")
            {
                var settings = new PrinterSettings { PrinterName = args[1] };
                if (!settings.IsValid) throw new Exception("Máy in Windows không tồn tại: " + args[1]);
                var size = new SizeF(float.Parse(args[2], System.Globalization.CultureInfo.InvariantCulture) * 100 / 25.4f,
                    float.Parse(args[3], System.Globalization.CultureInfo.InvariantCulture) * 100 / 25.4f);
                var selected = SelectPaper(settings.PaperSizes.Cast<PaperSize>(), size);
                Console.WriteLine(JsonSerializer.Serialize(new { name=selected.paper.PaperName, rawKind=selected.paper.RawKind, landscape=selected.landscape }));
                return 0;
            }
            if (args.Length != 5 || args[0] != "print") throw new Exception("print <pdf> <printer> <width-mm or 0> <job-name>");
            var jobId = Print(args[1], args[2], double.Parse(args[3], System.Globalization.CultureInfo.InvariantCulture), args[4]).GetAwaiter().GetResult();
            Console.WriteLine(JsonSerializer.Serialize(new { submitted=true,spoolId=jobId }));
            return 0;
        }
        catch (Exception e) { Console.Error.WriteLine(e.Message); return 1; }
    }

    static async Task<int> Print(string file, string printer, double widthMm, string jobName)
    {
        var pdf = await PdfDocument.LoadFromFileAsync(await StorageFile.GetFileFromPathAsync(Path.GetFullPath(file)));
        if (pdf.PageCount == 0 || pdf.PageCount > 200) throw new Exception("PDF không có trang hoặc quá 200 trang.");
        var images = new List<Bitmap>();
        var sizes = new List<SizeF>();
        try
        {
            using var doc = new PrintDocument();
            doc.PrinterSettings.PrinterName = printer;
            if (!doc.PrinterSettings.IsValid) throw new Exception("Máy in Windows không tồn tại: " + printer);
            var controller = new SpoolController();
            doc.PrintController = controller;
            doc.DocumentName = jobName;
            doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
            // Raster at 300 DPI. Printed dimensions come from PDF, not bitmap pixel count.
            for (uint i = 0; i < pdf.PageCount; i++)
            {
                using var page = pdf.GetPage(i);
                var size = page.Size;
                if (size.Width <= 0 || size.Height <= 0 || size.Width > 2000 || size.Height > 15000) throw new Exception("Kích thước PDF vượt giới hạn.");
                using var stream = new InMemoryRandomAccessStream();
                await page.RenderToStreamAsync(stream, new PdfPageRenderOptions { DestinationWidth = (uint)Math.Ceiling(size.Width * 300 / 96), DestinationHeight = (uint)Math.Ceiling(size.Height * 300 / 96) });
                stream.Seek(0);
                using var reader = new DataReader(stream);
                await reader.LoadAsync((uint)stream.Size);
                byte[] bytes = new byte[(int)stream.Size]; reader.ReadBytes(bytes);
                using var ms = new MemoryStream(bytes);
                using var original = new Bitmap(ms);
                images.Add(new Bitmap(original));
                sizes.Add(new SizeF((float)(size.Width * 100 / 96), (float)(size.Height * 100 / 96)));
            }
            int index = 0;
            doc.QueryPageSettings += (_, e) => {
                var size = sizes[index];
                if (widthMm > 0 && Math.Abs(size.Width * 25.4 / 100 - widthMm) > 2) throw new Exception("Khổ PDF không khớp khổ máy in đã chọn.");
                var paper = SelectPaper(doc.PrinterSettings.PaperSizes.Cast<PaperSize>(), size);
                e.PageSettings.PaperSize = paper.paper;
                e.PageSettings.Landscape = paper.landscape;
            };
            doc.PrintPage += (_, e) => {
                var size = sizes[index];
                e.Graphics!.DrawImage(images[index], -e.PageSettings.HardMarginX, -e.PageSettings.HardMarginY, size.Width, size.Height);
                index++;
                e.HasMorePages = index < images.Count;
            };
            doc.Print();
            return controller.JobId;
        }
        finally { foreach (var image in images) image.Dispose(); }
    }

    // Use the driver's paper ID (A5/A4 etc.). Some drivers ignore custom forms
    // and silently use their default A4 even when the PDF dimensions are A5.
    internal static (PaperSize paper, bool landscape) SelectPaper(IEnumerable<PaperSize> supported, SizeF size)
    {
        const float tolerance = 2 * 100 / 25.4f;
        foreach (var paper in supported)
        {
            if (Math.Abs(paper.Width - size.Width) <= tolerance && Math.Abs(paper.Height - size.Height) <= tolerance)
                return (paper, false);
            if (Math.Abs(paper.Height - size.Width) <= tolerance && Math.Abs(paper.Width - size.Height) <= tolerance)
                return (paper, true);
        }
        return (new PaperSize("GARA PDF", (int)Math.Ceiling(size.Width), (int)Math.Ceiling(size.Height)), false);
    }
}
