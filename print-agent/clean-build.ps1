$ErrorActionPreference='Stop'
$garaRoot=[IO.Path]::GetFullPath($PSScriptRoot)
# Only regenerable .NET build outputs; never credentials, ledger, dist or installation.
foreach ($garaRelative in @('helper/bin','helper/obj','service/bin','service/obj')) {
 $garaTarget=[IO.Path]::GetFullPath((Join-Path $garaRoot $garaRelative))
 if (-not $garaTarget.StartsWith($garaRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe cleanup target: $garaTarget" }
 if (Test-Path -LiteralPath $garaTarget) { Remove-Item -LiteralPath $garaTarget -Recurse -Force }
}
Write-Output 'Removed regenerable build outputs. Source, dist and data preserved.'
