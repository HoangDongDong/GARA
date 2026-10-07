$ErrorActionPreference='Stop'
try {
 $garaInstaller=Join-Path $PSScriptRoot 'install-service.ps1'
 $garaProcess=Start-Process -FilePath powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$garaInstaller+'"'))
 if($garaProcess.ExitCode -ne 0){throw 'Cài dịch vụ không thành công. Chạy install-service.ps1 bằng Administrator để xem lỗi.'}
 Write-Output 'Đã cài GARA Print Agent. Mở http://127.0.0.1:3790 để ghép với GARA.'
} catch { Write-Output $_.Exception.Message; exit 1 }
