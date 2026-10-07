using System.Drawing.Printing;
using System.Runtime.InteropServices;

// Own GDI document lifecycle so the real spool job identifier is retained.
sealed class SpoolController : PrintController
{
    IntPtr dc;
    Graphics? graphics;
    public int JobId { get; private set; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct DocInfo { public int Size; public string Name; public string? Output; public string? Type; public int Flags; }
    [DllImport("gdi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateDC(string driver,string device,string? output,IntPtr mode);
    [DllImport("gdi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr ResetDC(IntPtr h,IntPtr mode);
    [DllImport("gdi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern int StartDoc(IntPtr h,ref DocInfo info);
    [DllImport("gdi32.dll",SetLastError=true)] static extern int StartPage(IntPtr h);
    [DllImport("gdi32.dll",SetLastError=true)] static extern int EndPage(IntPtr h);
    [DllImport("gdi32.dll",SetLastError=true)] static extern int EndDoc(IntPtr h);
    [DllImport("gdi32.dll",SetLastError=true)] static extern int AbortDoc(IntPtr h);
    [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr h);
    [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr GlobalLock(IntPtr h);
    [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr h);
    [DllImport("kernel32.dll")] static extern IntPtr GlobalFree(IntPtr h);
    public override void OnStartPrint(PrintDocument document,PrintEventArgs e)
    {
        var mode=document.PrinterSettings.GetHdevmode(document.DefaultPageSettings);
        int error=0;
        try { var pointer=GlobalLock(mode);if(pointer==IntPtr.Zero)throw new Exception("Không khóa được DEVMODE.");dc=CreateDC("WINSPOOL",document.PrinterSettings.PrinterName,null,pointer);error=Marshal.GetLastWin32Error(); }
        finally { GlobalUnlock(mode);GlobalFree(mode); }
        if(dc==IntPtr.Zero)throw new Exception("Không mở được printer DC; Windows error "+error);
        var info=new DocInfo{Size=Marshal.SizeOf<DocInfo>(),Name=document.DocumentName};
        JobId=StartDoc(dc,ref info);
        if(JobId<=0){DeleteDC(dc);dc=IntPtr.Zero;throw new Exception("Spooler không nhận lệnh in.");}
    }
    public override Graphics OnStartPage(PrintDocument document,PrintPageEventArgs e)
    {
        var mode=document.PrinterSettings.GetHdevmode(e.PageSettings);
        try { var pointer=GlobalLock(mode);if(pointer==IntPtr.Zero)throw new Exception("Không khóa được DEVMODE.");var next=ResetDC(dc,pointer);if(next==IntPtr.Zero)throw new Exception("Không đặt được khổ giấy; Windows error "+Marshal.GetLastWin32Error());dc=next; }
        finally { GlobalUnlock(mode);GlobalFree(mode); }
        if(StartPage(dc)<=0)throw new Exception("Không bắt đầu được trang in.");
        graphics=Graphics.FromHdc(dc);
        graphics.PageUnit=GraphicsUnit.Pixel;
        graphics.ScaleTransform(graphics.DpiX/100f,graphics.DpiY/100f);
        return graphics;
    }
    public override void OnEndPage(PrintDocument document,PrintPageEventArgs e)
    {
        graphics?.Dispose();graphics=null;
        if(EndPage(dc)<=0)throw new Exception("Lỗi kết thúc trang in.");
    }
    public override void OnEndPrint(PrintDocument document,PrintEventArgs e)
    {
        try { if(dc!=IntPtr.Zero){if(e.Cancel)AbortDoc(dc);else if(EndDoc(dc)<=0)throw new Exception("Lỗi kết thúc lệnh in.");} }
        finally { graphics?.Dispose();graphics=null;if(dc!=IntPtr.Zero)DeleteDC(dc);dc=IntPtr.Zero; }
    }
}
