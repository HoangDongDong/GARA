$ErrorActionPreference = 'Stop'
$garaRoot = $PSScriptRoot
$garaDist = Join-Path $garaRoot 'dist'
New-Item -ItemType Directory -Force $garaDist | Out-Null
dotnet publish (Join-Path $garaRoot 'helper/Garage.PrintHelper.csproj') -c Release -r win-x64 --self-contained true -o (Join-Path $garaDist 'helper')
if ($LASTEXITCODE -ne 0) { throw 'Build helper failed' }
dotnet publish (Join-Path $garaRoot 'service/Garage.PrintService.csproj') -c Release -r win-x64 --self-contained true -o (Join-Path $garaDist 'service')
if ($LASTEXITCODE -ne 0) { throw 'Build service failed' }
Copy-Item -LiteralPath (Get-Command node).Source -Destination (Join-Path $garaDist 'node.exe')
Copy-Item -LiteralPath (Join-Path $garaRoot 'agent.js'),(Join-Path $garaRoot 'ledger.js'),(Join-Path $garaRoot 'ui.html') -Destination $garaDist
Copy-Item -Path (Join-Path $garaRoot 'licenses/*') -Destination $garaDist -ErrorAction Stop
Get-ChildItem -LiteralPath $garaDist -Recurse -File | Get-FileHash -Algorithm SHA256 | Select-Object Hash,Path | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $garaRoot 'dist-manifest.csv')
Write-Output 'Build complete. Runtime bundled from local node.exe; record its version before release.'
