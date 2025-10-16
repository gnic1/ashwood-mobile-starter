@echo off
pushd %~dp0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Good-Morning.ps1"
popd
