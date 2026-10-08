param([switch]$BundleRuntime)
$ErrorActionPreference = 'Stop'
$garaRoot = $PSScriptRoot
$garaDist = Join-Path $garaRoot 'dist'
$garaStage = Join-Path $garaRoot '.build-stage'
function Remove-Generated([string]$target) {
 $resolved = [IO.Path]::GetFullPath($target)
 $allowed = @([IO.Path]::GetFullPath($garaDist),[IO.Path]::GetFullPath($garaStage))
 if ($resolved -notin $allowed) { throw "Refusing to remove unexpected build path: $resolved" }
 if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
Remove-Generated $garaStage
New-Item -ItemType Directory -Force $garaStage | Out-Null
$garaSelfContained = if ($BundleRuntime) { 'true' } else { 'false' }
try {
 dotnet publish (Join-Path $garaRoot 'helper/Garage.PrintHelper.csproj') -c Release -r win-x64 --self-contained $garaSelfContained -p:DebugType=None -p:DebugSymbols=false -o (Join-Path $garaStage 'runtime')
 if ($LASTEXITCODE -ne 0) { throw 'Build helper failed' }
 dotnet publish (Join-Path $garaRoot 'service/Garage.PrintService.csproj') -c Release -r win-x64 --self-contained $garaSelfContained -p:DebugType=None -p:DebugSymbols=false -o (Join-Path $garaStage 'service')
 if ($LASTEXITCODE -ne 0) { throw 'Build service failed' }
 # Both executables share one directory/runtime. Conflicting library versions fail the build.
 $garaServiceRoot = Join-Path $garaStage 'service'
 foreach ($garaFile in Get-ChildItem -LiteralPath $garaServiceRoot -Recurse -File) {
  $garaRelative = $garaFile.FullName.Substring($garaServiceRoot.Length+1)
  $garaDestination = Join-Path (Join-Path $garaStage 'runtime') $garaRelative
  if (Test-Path -LiteralPath $garaDestination) {
   if ((Get-FileHash -LiteralPath $garaFile.FullName).Hash -ne (Get-FileHash -LiteralPath $garaDestination).Hash) { throw "Runtime conflict: $garaRelative" }
  } else {
   New-Item -ItemType Directory -Force (Split-Path $garaDestination) | Out-Null
   Copy-Item -LiteralPath $garaFile.FullName -Destination $garaDestination
  }
 }
 Remove-Generated $garaDist
 New-Item -ItemType Directory -Force $garaDist | Out-Null
 Copy-Item -LiteralPath (Join-Path $garaStage 'runtime') -Destination $garaDist -Recurse
} finally { Remove-Generated $garaStage }
Copy-Item -LiteralPath (Get-Command node).Source -Destination (Join-Path $garaDist 'node.exe')
Copy-Item -LiteralPath (Join-Path $garaRoot 'agent.js'),(Join-Path $garaRoot 'ledger.js'),(Join-Path $garaRoot 'ui.html') -Destination $garaDist
Copy-Item -Path (Join-Path $garaRoot 'licenses/*') -Destination $garaDist -ErrorAction Stop
@{ bundledRuntime=[bool]$BundleRuntime; requiredRuntime='Microsoft.WindowsDesktop.App 8.x x64'; nodeVersion=(& (Join-Path $garaDist 'node.exe') --version) } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $garaDist 'build-info.json') -Encoding UTF8
Get-ChildItem -LiteralPath $garaDist -Recurse -File | Get-FileHash -Algorithm SHA256 | Select-Object Hash,Path | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $garaRoot 'dist-manifest.csv')
Write-Output "Build complete. BundleRuntime=$([bool]$BundleRuntime). Helper and service share runtime/."
