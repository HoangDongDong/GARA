using System.Diagnostics;
using System.ServiceProcess;

ServiceBase.Run(new AgentService());

sealed class AgentService : ServiceBase
{
    Process? child;
    readonly string root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, ".."));
    readonly string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "GARA Print Agent");
    bool stopping;
    public AgentService() { ServiceName = "GaraPrintAgent"; CanShutdown = true; }
    protected override void OnStart(string[] args)
    {
        stopping = false;
        Directory.CreateDirectory(data);
        var psi = new ProcessStartInfo(Path.Combine(root,"node.exe")) { WorkingDirectory=root, UseShellExecute=false, CreateNoWindow=true, RedirectStandardOutput=true, RedirectStandardError=true };
        psi.ArgumentList.Add(Path.Combine(root,"agent.js"));
        psi.Environment["GARA_AGENT_DATA"] = data;
        psi.Environment["GARA_PRINT_HELPER"] = Path.Combine(root,"helper","Garage.PrintHelper.exe");
        child = new Process { StartInfo=psi, EnableRaisingEvents=true };
        child.OutputDataReceived += (_,e) => Log(e.Data);
        child.ErrorDataReceived += (_,e) => Log(e.Data);
        child.Exited += (_,_) => { if (!stopping) Environment.Exit(1); };
        child.Start(); child.BeginOutputReadLine(); child.BeginErrorReadLine();
    }
    readonly object gate = new();
    void Log(string? message) { if(message==null)return;lock(gate){var file=Path.Combine(data,"service.log");if(File.Exists(file)&&new FileInfo(file).Length>5_000_000)File.Move(file,file+".previous",true);File.AppendAllText(file,DateTimeOffset.Now.ToString("O")+" "+message+Environment.NewLine);}}
    protected override void OnStop()
    {
        stopping=true;
        if(child is {HasExited:false})
        {
            // IPC asks Node to stop claiming jobs and finish/report the current job.
            try { child.StandardInput.Close(); } catch { }
            File.WriteAllText(Path.Combine(data,"stop.request"),"stop");
            RequestAdditionalTime(150000);
            if(!child.WaitForExit(140000)) child.Kill(true);
        }
        child?.Dispose(); child=null;
    }
    protected override void OnShutdown() => OnStop();
}
