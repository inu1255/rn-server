@echo off 
REM if "%1" neq "1" ( 
REM >"%temp%\tmp.vbs" echo set WshShell = WScript.CreateObject^(^"WScript.Shell^"^) 
REM >>"%temp%\tmp.vbs" echo WshShell.Run chr^(34^) ^& %0 ^& chr^(34^) ^& ^" 1^",0 
REM start /d "%temp%" tmp.vbs 
REM exit
REM )
if exist "C:\Windows\System32\node.exe" (echo exist ) else (copy bin\node.exe C:\Windows\System32\node.exe)
node index.js