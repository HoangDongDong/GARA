$ErrorActionPreference = 'Stop'
$garaPackageRoot = Join-Path $PSScriptRoot 'installer-output'
New-Item -ItemType Directory -Force $garaPackageRoot | Out-Null
$garaArchive = Join-Path $garaPackageRoot 'GaraPrintAgent-0.1.0-win-x64.zip'
Compress-Archive -LiteralPath (Join-Path $PSScriptRoot 'dist'),(Join-Path $PSScriptRoot 'install-service.ps1'),(Join-Path $PSScriptRoot 'launch-install.ps1'),(Join-Path $PSScriptRoot 'Install.cmd'),(Join-Path $PSScriptRoot 'README.md'),(Join-Path $PSScriptRoot 'dist-manifest.csv') -DestinationPath $garaArchive -Force
Get-FileHash -LiteralPath $garaArchive -Algorithm SHA256 | Select-Object Hash | ConvertTo-Json | Set-Content -LiteralPath ($garaArchive+'.sha256.json')
Write-Output $garaArchive
