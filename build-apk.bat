@echo off
chcp 65001 >nul
title 森灵 - Android APK 打包器
echo ================================================
echo   森灵 Android APK 打包（Capacitor + Gradle）
echo ================================================
echo.

cd /d "%~dp0"

REM ---- 1. 检查 Java ----
set JAVA_HOME=C:\kaifa_teacher\tools\jdk-17.0.2
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [提示] 未找到 JDK 17，请安装后修改本脚本顶部 JAVA_HOME 路径。
  echo        下载: https://adoptium.net/temurin/releases/?version=17
  pause
  exit /b 1
)

REM ---- 2. 检查 Android SDK ----
set ANDROID_HOME=C:\kaifa_teacher\tools\android-sdk
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
  echo [提示] 未找到 Android SDK，请安装后修改本脚本顶部 ANDROID_HOME 路径。
  echo        需要组件: platform-tools / platforms;android-36 / build-tools;36.0.0
  pause
  exit /b 1
)

set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

REM ---- 3. 同步 Web 配置到 Android 工程 ----
echo [1/3] 同步 Capacitor 配置...
call npx cap sync android
if errorlevel 1 (
  echo [错误] cap sync 失败，请检查 capacitor.config.ts。
  pause
  exit /b 1
)

REM ---- 4. 检查 SDK 路径配置 ----
if not exist android\local.properties (
  echo sdk.dir=%ANDROID_HOME:\=\\%> android\local.properties
  echo [提示] 已生成 android\local.properties
)

REM ---- 5. 打包 ----
echo [2/3] Gradle 打包中（首次下载依赖较慢，请耐心）...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo [错误] 打包失败，请检查上方错误信息。
  cd ..
  pause
  exit /b 1
)
cd ..

echo.
echo [3/3] 打包完成！
echo ================================================
echo   APK 位置: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo   安装方法:
echo     1. 手机开启「开发者选项 - USB 调试」
echo     2. 数据线连接电脑，运行:  adb install android\app\build\outputs\apk\debug\app-debug.apk
echo       （或把 APK 文件发送到手机直接安装）
echo   注意事项:
echo     - 手机与电脑需连同一 Wi-Fi
echo     - 电脑需运行 start.bat 提供服务
echo     - 若电脑 IP 变化，修改 capacitor.config.ts 中 SERVER_URL 后重新打包
echo ================================================
pause
