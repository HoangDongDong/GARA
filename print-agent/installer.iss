#define AppName "GARA Print Agent"
#if !FileExists("dist\runtime\coreclr.dll")
  #error Build Inno Setup with build.ps1 -BundleRuntime; Lite uses Install.cmd with a runtime prerequisite check.
#endif
[Setup]
AppId={{5F5B8E32-603A-40BF-8A82-7C0A38CB526C}}
AppName={#AppName}
AppVersion=0.1.0
DefaultDirName={autopf}\GARA Print Agent
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=installer-output
OutputBaseFilename=GaraPrintAgentSetup
Compression=lzma2
SolidCompression=yes
[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "install-service.ps1"; DestDir: "{app}"
[Icons]
Name: "{group}\GARA Print Agent"; Filename: "http://127.0.0.1:3790"
[Run]
Filename: "{sys}\sc.exe"; Parameters: "create GaraPrintAgent binPath= """"{app}\runtime\Garage.PrintService.exe"""" start= auto obj= ""NT AUTHORITY\LocalService"" depend= Spooler"; Flags: runhidden waituntilterminated
Filename: "{sys}\sc.exe"; Parameters: "config GaraPrintAgent binPath= """"{app}\runtime\Garage.PrintService.exe"""" start= auto"; Flags: runhidden waituntilterminated
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -Command ""New-Item -ItemType Directory -Force '{commonappdata}\GARA Print Agent' | Out-Null; icacls '{commonappdata}\GARA Print Agent' /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M'"""; Flags: runhidden waituntilterminated
Filename: "{sys}\sc.exe"; Parameters: "failure GaraPrintAgent reset= 86400 actions= restart/10000/restart/30000/restart/60000"; Flags: runhidden waituntilterminated
Filename: "{sys}\sc.exe"; Parameters: "start GaraPrintAgent"; Flags: runhidden waituntilterminated
[UninstallRun]
Filename: "{sys}\sc.exe"; Parameters: "stop GaraPrintAgent"; Flags: runhidden waituntilterminated
Filename: "{sys}\sc.exe"; Parameters: "delete GaraPrintAgent"; Flags: runhidden waituntilterminated
; Keep ProgramData ledger/credential for recovery; revoke station in GARA before removal.
