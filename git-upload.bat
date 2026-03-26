@echo off
chcp 65001 >nul
echo ==========================================
echo 访客系统 - GitHub 上传助手
echo ==========================================
echo.

REM 检查 Git 是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Git 未安装！
    echo 请先下载安装 Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/5] 检查 Git 安装... 完成

REM 进入项目目录
cd /d "%~dp0"
echo [2/5] 进入项目目录... 完成

REM 初始化 Git（如果未初始化）
if not exist ".git" (
    echo [3/5] 初始化 Git 仓库...
    git init
    git config user.name "Visitor System"
    git config user.email "visitor@example.com"
) else (
    echo [3/5] Git 仓库已存在... 跳过
)

echo.
echo [4/5] 添加文件到 Git...
git add .

echo.
echo [5/5] 提交更改...
git commit -m "Initial commit" || echo 没有新文件需要提交

echo.
echo ==========================================
echo 本地 Git 准备完成！
echo ==========================================
echo.
echo 接下来请执行以下操作：
echo.
echo 1. 在 GitHub 创建仓库（不要勾选 README）
echo 2. 复制仓库地址（如：https://github.com/用户名/visitor-system.git）
echo 3. 运行以下命令：
echo.
echo    git remote add origin https://github.com/你的用户名/visitor-system.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo ==========================================
pause
