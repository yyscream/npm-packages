@echo off
setlocal

rem Pi Web UI Windows autostart wrapper.
rem Recommended use: create a shortcut to this file in:
rem   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
rem The server starts minimized and does not open the browser/PWA automatically.

set "NODE_EXE=C:\Users\hdlea\AppData\Local\Programs\node-v24.12.0-win-x64\node.exe"
if not exist "%NODE_EXE%" (
  for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"
)

if not exist "%NODE_EXE%" (
  echo node.exe was not found.
  pause
  exit /b 1
)

set "PI_WEBUI_SCRIPT=%USERPROFILE%\.pi\agent\npm\node_modules\@firstpick\pi-package-webui\bin\pi-webui.mjs"
if not exist "%PI_WEBUI_SCRIPT%" (
  set "PI_WEBUI_SCRIPT=C:\Users\hdlea\AppData\Local\Programs\node-v24.12.0-win-x64\node_modules\@firstpick\pi-package-webui\bin\pi-webui.mjs"
)

if not exist "%PI_WEBUI_SCRIPT%" (
  echo Pi Web UI server script was not found.
  echo Expected Pi-managed script:
  echo   %USERPROFILE%\.pi\agent\npm\node_modules\@firstpick\pi-package-webui\bin\pi-webui.mjs
  echo Fallback global script:
  echo   C:\Users\hdlea\AppData\Local\Programs\node-v24.12.0-win-x64\node_modules\@firstpick\pi-package-webui\bin\pi-webui.mjs
  pause
  exit /b 1
)

if "%PI_WEBUI_CWD%"=="" (
  rem If this wrapper is run from pi-package-webui, default to the repo root.
  if exist "%~dp0bin\pi-webui.mjs" (
    for %%I in ("%~dp0..") do set "PI_WEBUI_CWD=%%~fI"
  ) else (
    rem Fallback when this .cmd is copied elsewhere instead of shortcut-linked.
    set "PI_WEBUI_CWD=C:\Users\hdlea\Documents\GitHub\npm-packages"
  )
)

start "Pi Web UI" /min "%NODE_EXE%" "%PI_WEBUI_SCRIPT%" --cwd "%PI_WEBUI_CWD%" --host 127.0.0.1 --port 31415
endlocal
