$ErrorActionPreference = 'Stop'
try {
 $garaExisting = Get-Service -Name 'GaraPrintAgent'
 if ($garaExisting.Status -ne 'Stopped') { Stop-Service -Name 'GaraPrintAgent' }
 $garaAgentProcess = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*D:\Garage\garage-app\print-agent\agent.js*' }
 foreach ($garaProcess in $garaAgentProcess) { Stop-Process -Id $garaProcess.ProcessId }
 $garaServiceData = Join-Path $env:ProgramData 'GARA Print Agent'
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'data/config.json'),(Join-Path $PSScriptRoot 'data/jobs.json') -Destination $garaServiceData -Force
 Start-Service -Name 'GaraPrintAgent'
 'Service running' | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data/service-install-result.txt')
} catch { $_.Exception.Message | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data/service-install-result.txt'); exit 1 }
