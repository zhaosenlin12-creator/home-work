@echo off
chcp 65001 >nul
title 森灵学习系统 - 启动器
echo ================================================
echo   森灵家庭学习系统 启动器
echo ================================================
echo.

cd /d "%~dp0"

REM ---- 检查 node ----
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装 Node 18+：
  echo   https://nodejs.org/zh-cn/download
  pause
  exit /b 1
)

REM ---- 检查依赖 ----
if not exist node_modules (
  echo [首次运行] 正在安装依赖，请耐心等待（约 2-5 分钟）...
  call npm install --registry=https://registry.npmmirror.com
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

REM ---- 检查 .next 是否已构建（没有则先构建）----
if not exist .next\BUILD_ID (
  echo [首次运行] 正在构建生产版本（约 2-5 分钟）...
  call npm run build
  if errorlevel 1 (
    echo [错误] 构建失败，请检查上方报错信息。
    pause
    exit /b 1
  )
)

REM ---- 教材预下载（可选，首次建议执行：缓存三年级语数英教材）----
if not exist data\textbook_cache (
  echo.
  echo [可选] 检测到教材缓存为空，正在预下载三年级语数英教材（约 1-3 分钟）...
  echo        按 Ctrl+C 可跳过，稍后在教材页面加载时自动下载。
  node scripts\predownload-textbooks.mjs
)

REM ---- 检测局域网 IP ----
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set LANIP=%%a
set LANIP=%LANIP: =%

echo.
echo   * 本机访问:   http://localhost:3101
if defined LANIP echo   * 手机访问:   http://%LANIP%:3101   ^(手机连同一 Wi-Fi^)
echo.
echo   正在启动服务，请保持此窗口开启（关闭窗口即停止服务）。
echo ================================================
echo.

REM ---- 生产模式启动（已构建则秒开）----
npm start -- -p 3101

pause
