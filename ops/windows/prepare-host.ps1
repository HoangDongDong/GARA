param(
    [Parameter(Mandatory=$true)][string]$ProjectRoot,
    [Parameter(Mandatory=$true)][string]$Domain,
    [Parameter(Mandatory=$true)][string]$NodeExe,
    [Parameter(Mandatory=$true)][string]$CaddyExe,
    [string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
if ($Domain -notmatch '^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') { throw 'Domain must be a hostname without a protocol or path.' }
foreach ($executablePath in @($NodeExe,$CaddyExe)) { if (-not (Test-Path -LiteralPath $executablePath -PathType Leaf)) { throw "Missing executable: $executablePath" } }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'frontend/dist/index.html'))) { throw 'Build the frontend before preparing the host.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'backend/.env'))) { throw 'Configure backend/.env first.' }
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectPath 'ops/windows/generated' }
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$backendPath = Join-Path $projectPath 'backend'
$webPath = Join-Path $projectPath 'frontend/dist'
$logsPath = Join-Path $outputPath 'logs'
New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
function Escape-Xml([string]$value) { return [Security.SecurityElement]::Escape($value) }
function Write-Service([string]$id,[string]$executable,[string]$arguments,[string]$directory,[string]$extra='') {
    $xml = @"
<service>
  <id>$id</id><name>$id</name>
  <description>KAZUKO Garage SaaS</description>
  <executable>$(Escape-Xml $executable)</executable>
  <arguments>$(Escape-Xml $arguments)</arguments>
  <workingdirectory>$(Escape-Xml $directory)</workingdirectory>
  <logpath>$(Escape-Xml $logsPath)</logpath><log mode="roll" />
  <onfailure action="restart" delay="15 sec" />
  <startmode>Automatic</startmode>
  $extra
</service>
"@
    Set-Content -LiteralPath (Join-Path $outputPath "$id.xml") -Value $xml -Encoding UTF8
}
Write-Service 'GarageSaasApi' $NodeExe 'src/server.js' $backendPath
Write-Service 'GarageSaasWorker' $NodeExe 'tools/saas-worker.js run' $backendPath
$proxyConfig = Join-Path $outputPath 'Caddyfile'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Caddyfile.example') -Destination $proxyConfig
$extra = '<env name="GARAGE_DOMAIN" value="'+(Escape-Xml $Domain)+'" /><env name="GARAGE_WEB_ROOT" value="'+(Escape-Xml $webPath)+'" />'
Write-Service 'GarageSaasProxy' $CaddyExe ('run --config "'+$proxyConfig+'" --adapter caddyfile') $outputPath $extra
$taskArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "'+(Join-Path $PSScriptRoot 'run-backup.ps1')+'" -ProjectRoot "'+$projectPath+'" -NodeExe "'+$NodeExe+'"'
$taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $taskArguments -WorkingDirectory $backendPath
$taskTrigger = New-ScheduledTaskTrigger -Daily -At '03:00'
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4)
$task = New-ScheduledTask -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings
Export-ScheduledTask -InputObject $task | Set-Content -LiteralPath (Join-Path $outputPath 'GarageSaasBackup.xml') -Encoding UTF8
Write-Output "Host configuration generated in $outputPath. No service or scheduled task was installed."
