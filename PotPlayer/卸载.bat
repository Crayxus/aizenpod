@ECHO OFF&(PUSHD "%~DP0")&(REG QUERY "HKU\S-1-5-19">NUL 2>&1)||(
powershell -Command "Start-Process '%~sdpnx0' -Verb RunAs"&&EXIT)

taskkill /f /im potplayer* /t >NUL 2>NUL

echo f|copy /y "%~dp0PotPlayerMini64.ini" "%~dp0Module\PotPlayerMini64.ini" >NUL 2>NUL
start "" /wait "%~dp0PotPlayerMini64.exe" /Unregister

rd/s/q "%AppData%\Daum"2>NUL
rd/s/q "%AppData%\PotPlayerMini"2>NUL
rd/s/q "%AppData%\PotPlayerMini64"2>NUL

del/q "%Public%\Desktop\PotPlayer.lnk" >NUL 2>NUL
del/q "%UserProfile%\Desktop\PotPlayer.lnk" >NUL 2>NUL
rd/s/q "%AppData%\Microsoft\Windows\Start Menu\Programs\PotPlayer"2>NUL
rd/s/q "%ProgramData%\Microsoft\Windows\Start Menu\Programs\PotPlayer"2>NUL

reg delete "HKLM\Software\Daum" /f >NUL 2>NUL
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\PotPlayerMini.exe" /f >NUL 2>NUL
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\PotPlayerMini64.exe" /f >NUL 2>NUL
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PotPlayer" /f >NUL 2>NUL
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PotPlayer" /f /reg:32 >NUL 2>NUL

ECHO.&ECHO 清理完成，确认删除？
ECHO.&ECHO 1.删除软件保存选项配置
ECHO.&ECHO 2.删除软件清除选项配置
CHOICE /C 12 /N >NUL 2>NUL

IF "%ERRORLEVEL%"=="2" (
 reg delete "HKCU\Software\Daum" /f >NUL 2>NUL
 PUSHD .. & RD /S/Q "%~DP0" >NUL 2>NUL)
  
IF "%ERRORLEVEL%"=="1" (
 rd /s/q Playlist 2>NUL
 rd /s/q Capture 2>NUL
 del MediaInfo.sdb /f >NUL 2>NUL
 echo f|copy /y "%~dp0Module\PotPlayerMini64.ini" "%~dp0\" >NUL 2>NUL
 regedit /e "PotPlayerMini64.reg" HKEY_CURRENT_USER\Software\DAUM >NUL 2>NUL
 if exist PotPlayerMini64.ini reg delete "HKEY_CURRENT_USER\Software\DAUM" /f >NUL 2>NUL
 if exist PotPlayerMini64.ini ren PotPlayerMini64.ini PotPlayerMini64.ini.bak >NUL 2>NUL
 FOR /F "delims=*" %%a IN ('dir /a/b *.*^|findstr /v /i /c:"PotPlayerMini64.reg" /c:"PotPlayerMini64.ini"') DO ( RD /S/Q "%%a" >NUL 2>NUL & DEL /F/Q "%%a" >NUL 2>NUL )
)