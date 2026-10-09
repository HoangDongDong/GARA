param([Parameter(Mandatory=$true)][string]$ProjectRoot,[Parameter(Mandatory=$true)][string]$NodeExe)
$ErrorActionPreference = 'Stop'
$backendPath = Join-Path (Resolve-Path -LiteralPath $ProjectRoot).Path 'backend'
if (-not (Test-Path -LiteralPath $NodeExe -PathType Leaf)) { throw 'Node runtime not found.' }
Push-Location -LiteralPath $backendPath
try { & $NodeExe 'tools/saas-worker.js' 'backup'; $backupExit = $LASTEXITCODE } finally { Pop-Location }
exit $backupExit
