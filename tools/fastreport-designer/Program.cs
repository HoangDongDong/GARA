using FastReport;
using FastReport.Design.StandardDesigner;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace Garage.FastReportDesigner;

internal static class Program
{
    private const int SwShowMaximized = 3;
    private const uint Infinite = 0xFFFFFFFF;
    private const uint CreateUnicodeEnvironment = 0x00000400;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct StartupInfo
    {
        public int Cb;
        public string? Reserved;
        public string? Desktop;
        public string? Title;
        public int X;
        public int Y;
        public int XSize;
        public int YSize;
        public int XCountChars;
        public int YCountChars;
        public int FillAttribute;
        public int Flags;
        public short ShowWindow;
        public short Reserved2Size;
        public IntPtr Reserved2;
        public IntPtr StdInput;
        public IntPtr StdOutput;
        public IntPtr StdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessInformation
    {
        public IntPtr Process;
        public IntPtr Thread;
        public uint ProcessId;
        public uint ThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CreateProcess(
        string? applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string? currentDirectory,
        ref StartupInfo startupInfo,
        out ProcessInformation processInformation);

    [DllImport("kernel32.dll")]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll")]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr windowHandle, int command);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr windowHandle);

    [STAThread]
    private static int Main(string[] args)
    {
        // Headless rendering: --render <template.frx> <data.json> <output.pdf>
        if (args.Length == 4 && args[0] == "--render")
            return ReportRenderer.Render(args[1], args[2], args[3]);
        var validateOnly = args.Length == 2 && args[0] == "--validate";
        var desktopChild = args.Length == 2 && args[0] == "--desktop-child";
        var pathArgument = validateOnly || desktopChild ? args.ElementAtOrDefault(1) : args.ElementAtOrDefault(0);
        var validArguments = validateOnly || desktopChild ? args.Length == 2 : args.Length == 1;
        if (!validArguments || string.IsNullOrWhiteSpace(pathArgument)) return 2;

        var templatePath = Path.GetFullPath(pathArgument);
        if (!File.Exists(templatePath)) return 3;

        if (validateOnly) return RunDesigner(templatePath, true);
        if (desktopChild) return RunDesigner(templatePath, false);

        try
        {
            return LaunchOnInteractiveDesktop(templatePath);
        }
        catch (Exception error)
        {
            File.WriteAllText(templatePath + ".error.txt", error.ToString());
            return 1;
        }
    }

    private static int LaunchOnInteractiveDesktop(string templatePath)
    {
        var executablePath = Environment.ProcessPath
            ?? throw new InvalidOperationException("Không xác định được đường dẫn cầu nối FastReport.");
        var commandLine = new StringBuilder(
            $"\"{executablePath}\" --desktop-child \"{templatePath.Replace("\"", "\\\"")}\"");
        var startupInfo = new StartupInfo
        {
            Cb = Marshal.SizeOf<StartupInfo>(),
            Desktop = @"winsta0\default",
        };

        if (!CreateProcess(
            executablePath,
            commandLine,
            IntPtr.Zero,
            IntPtr.Zero,
            false,
            CreateUnicodeEnvironment,
            IntPtr.Zero,
            Path.GetDirectoryName(executablePath),
            ref startupInfo,
            out var processInfo))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Không thể mở FastReport trên desktop người dùng.");
        }

        try
        {
            WaitForSingleObject(processInfo.Process, Infinite);
            if (!GetExitCodeProcess(processInfo.Process, out var exitCode))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Không đọc được trạng thái FastReport Designer.");
            return unchecked((int)exitCode);
        }
        finally
        {
            CloseHandle(processInfo.Thread);
            CloseHandle(processInfo.Process);
        }
    }

    private static int RunDesigner(string templatePath, bool validateOnly)
    {
        try
        {
            Trace(templatePath, $"RunDesigner started; validateOnly={validateOnly}");
            ApplicationConfiguration.Initialize();
            Trace(templatePath, "ApplicationConfiguration initialized");
            using var report = new Report();
            Trace(templatePath, "Report created");
            report.Load(templatePath);
            Trace(templatePath, "Report loaded");
            report.FileName = templatePath;

            if (!validateOnly)
            {
                using var designerForm = new DesignerForm();
                Trace(templatePath, "DesignerForm created");
                designerForm.Designer.Report = report;
                Trace(templatePath, "Report assigned to DesignerForm");
                designerForm.Designer.AskSave = true;
                designerForm.Text = $"FastReport Designer - {Path.GetFileNameWithoutExtension(templatePath)}";
                designerForm.StartPosition = FormStartPosition.CenterScreen;
                designerForm.WindowState = FormWindowState.Maximized;
                designerForm.ShowInTaskbar = true;
                designerForm.Shown += (_, _) =>
                {
                    ShowWindow(designerForm.Handle, SwShowMaximized);
                    designerForm.BringToFront();
                    designerForm.Activate();
                    SetForegroundWindow(designerForm.Handle);
                };
                designerForm.Show();
                ShowWindow(designerForm.Handle, SwShowMaximized);
                designerForm.BringToFront();
                designerForm.Activate();
                SetForegroundWindow(designerForm.Handle);
                Trace(templatePath, $"DesignerForm shown; handle={designerForm.Handle}");
                Application.Run();
                Trace(templatePath, "DesignerForm closed");
            }

            report.Save(templatePath);
            return 0;
        }
        catch (Exception error)
        {
            File.WriteAllText(templatePath + ".error.txt", error.ToString());
            if (!validateOnly)
            {
                MessageBox.Show(
                    error.Message,
                    "Không mở được FastReport Designer",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
            return 1;
        }
    }

    private static void Trace(string templatePath, string message)
    {
        File.AppendAllText(
            templatePath + ".trace.txt",
            $"{DateTime.Now:O} PID={Environment.ProcessId} {message}{Environment.NewLine}");
    }
}
