param([string]$InstallRoot = (Join-Path $env:ProgramFiles 'GARA Print Agent'))
$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run as Administrator to install Windows Service.' }
$garaSource = Join-Path $PSScriptRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $garaSource 'runtime/Garage.PrintService.exe'))) { throw 'Run build.ps1 first.' }
$garaInfo = Get-Content -LiteralPath (Join-Path $garaSource 'build-info.json') -Raw | ConvertFrom-Json
if (-not $garaInfo.bundledRuntime) {
 $garaDotnet = Join-Path $env:ProgramFiles 'dotnet/dotnet.exe'
 if (-not (Test-Path -LiteralPath $garaDotnet)) { throw 'Bản Lite cần .NET Desktop Runtime 8 x64. Cài runtime hoặc dùng gói build -BundleRuntime.' }
 $garaRuntimes = & $garaDotnet --list-runtimes
 if (-not ($garaRuntimes -match '^Microsoft.WindowsDesktop.App 8\.')) { throw 'Bản Lite cần .NET Desktop Runtime 8 x64. Cài runtime hoặc dùng gói build -BundleRuntime.' }
}
& (Join-Path $garaSource 'runtime/Garage.PrintService.exe') --check
if ($LASTEXITCODE -ne 0) { throw 'Service package verification failed.' }
$garaService = Get-Service -Name 'GaraPrintAgent' -ErrorAction SilentlyContinue
if ($garaService) { Stop-Service -Name 'GaraPrintAgent' }
New-Item -ItemType Directory -Force $InstallRoot | Out-Null
Copy-Item -Path (Join-Path $garaSource '*') -Destination $InstallRoot -Recurse -Force
$garaData = Join-Path $env:ProgramData 'GARA Print Agent'
New-Item -ItemType Directory -Force $garaData | Out-Null
& icacls.exe $garaData /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M'
if ($LASTEXITCODE -ne 0) { throw 'Cannot secure Agent data directory.' }
# LocalService limits privileges; USB driver visibility is checked after install.
if (-not $garaService) { New-Service -Name 'GaraPrintAgent' -DisplayName 'GARA Print Agent' -BinaryPathName ('"'+(Join-Path $InstallRoot 'runtime/Garage.PrintService.exe')+'"') -StartupType Automatic -Credential (New-Object PSCredential('NT AUTHORITY\LocalService',(New-Object Security.SecureString))) -DependsOn 'Spooler' | Out-Null }
else {
 & sc.exe config GaraPrintAgent binPath= ('"'+(Join-Path $InstallRoot 'runtime/Garage.PrintService.exe')+'"') start= auto
 if ($LASTEXITCODE -ne 0) { throw 'Cannot update service executable path.' }
}
& sc.exe failure GaraPrintAgent reset= 86400 actions= restart/10000/restart/30000/restart/60000
Start-Service -Name 'GaraPrintAgent'
Write-Output 'Service installed. Open http://127.0.0.1:3790 and pair with GARA.'
