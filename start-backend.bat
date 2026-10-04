@echo off
title Garage Backend (Port 4000)
if not exist "%~dp0tools\fastreport-designer\bin\Release\net8.0-windows\Garage.FastReportDesigner.exe" (
  echo Building FastReport Designer bridge...
  dotnet build "%~dp0tools\fastreport-designer\FastReportDesignerBridge.csproj" -c Release
  if errorlevel 1 echo WARNING: FastReport Designer bridge was not built. XML fallback will remain available.
)
cd /d %~dp0\backend
npm start
pause
