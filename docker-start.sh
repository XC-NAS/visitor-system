#!/bin/bash

# 访客系统 - Docker 部署脚本（Linux/macOS）

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}访客系统 - Docker 部署脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[错误] Docker 未安装${NC}"
    echo "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}[错误] Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/4] 正在构建 Docker 镜像...${NC}"
docker-compose build

echo -e "${YELLOW}[2/4] 正在启动容器...${NC}"
docker-compose up -d

echo -e "${YELLOW}[3/4] 等待服务启动...${NC}"
sleep 3

echo -e "${YELLOW}[4/4] 检查服务状态...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}部署成功！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# 获取访问地址
IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
echo -e "本地访问: ${BLUE}http://localhost:3000${NC}"
echo -e "局域网访问: ${BLUE}http://${IP}:3000${NC}"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  查看状态: docker-compose ps"
echo ""
echo -e "${GREEN}==========================================${NC}"
