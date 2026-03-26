#!/bin/bash

# 访客登记管理系统 - Linux 启动脚本

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$APP_DIR/app.pid"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

start() {
    echo -e "${GREEN}正在启动访客登记系统...${NC}"
    cd "$APP_DIR/server" || exit 1

    # 检查是否已经在运行
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}系统已经在运行中${NC}"
        return 1
    fi

    # 安装依赖（如果不存在）
    if [ ! -d "node_modules" ]; then
        echo "正在安装依赖..."
        npm install
    fi

    # 启动服务
    nohup node server.js > ../app.log 2>&1 &
    echo $! > "$PID_FILE"

    echo -e "${GREEN}启动成功！${NC}"
    echo "访问地址: http://$(hostname -I | awk '{print $1}'):3000"
    echo "日志文件: $APP_DIR/app.log"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}正在停止服务...${NC}"
            kill "$PID"
            rm -f "$PID_FILE"
            echo -e "${GREEN}已停止${NC}"
        else
            echo -e "${YELLOW}服务未在运行${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}服务未在运行${NC}"
    fi
}

restart() {
    stop
    sleep 2
    start
}

status() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo -e "${GREEN}服务运行中 (PID: $(cat "$PID_FILE"))${NC}"
    else
        echo -e "${RED}服务未运行${NC}"
    fi
}

logs() {
    tail -f "$APP_DIR/app.log"
}

# 主程序
case "${1:-start}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "使用方法: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
