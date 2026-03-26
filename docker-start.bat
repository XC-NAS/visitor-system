@echo off
chcp 65001 >nul
echo ==========================================
echo 访客系统 - Docker 部署脚本
echo ==========================================
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未安装，请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM 检查 Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker Compose 未安装
    pause
    exit /b 1
)

echo [1/4] 正在构建 Docker 镜像...
docker-compose build
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo [2/4] 正在启动容器...
docker-compose up -d
if errorlevel 1 (
    echo [错误] 启动失败
    pause
    exit /b 1
)

echo [3/4] 等待服务启动...
timeout /t 3 /nobreak >nul

echo [4/4] 检查服务状态...
docker-compose ps

echo.
echo ==========================================
echo 部署完成！
echo ==========================================
echo 访问地址: http://localhost:3000
echo.
echo 常用命令:
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo   重启服务: docker-compose restart
echo ==========================================
pause
