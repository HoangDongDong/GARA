$ErrorActionPreference = 'Stop'
try {
 'Checking idle Agent' | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data/service-install-result.txt')
 # Upgrade the initial prototype that did not yet handle stop.request.
 # Only stop the verified Agent child, and only while it is idle.
 $garaSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
 Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3790/' -WebSession $garaSession -TimeoutSec 10 -Proxy $null | Out-Null
 $garaStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:3790/status' -WebSession $garaSession -TimeoutSec 10 -Proxy $null
 if ($garaStatus.busy) { throw 'Agent is processing a job; retry update after it finishes.' }
 # The installed Agent supports stop.request; let the service stop gracefully.
 'Installing updated files' | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data/service-install-result.txt')
 & (Join-Path $PSScriptRoot 'install-service.ps1')
 'Service updated and running' | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data/service-install-result.txt')
} catch { $_.Exception.Message | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data/service-install-result.txt'); exit 1 }
