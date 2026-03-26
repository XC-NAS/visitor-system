#!/bin/bash

# =============================================================================
# 访客登记管理系统 - 服务器一键部署脚本
# 适用系统: Ubuntu 20.04/22.04, CentOS 7/8, Debian 10/11
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
APP_NAME="visitor-system"
APP_DIR="/opt/$APP_NAME"
PORT=3000

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用 root 用户运行此脚本"
        print_info "尝试使用: sudo bash $0"
        exit 1
    fi
}

# 检测系统类型
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "无法检测操作系统类型"
        exit 1
    fi

    print_info "检测到系统: $OS $VERSION"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker 已安装: $(docker --version)"
        return 0
    fi

    print_info "正在安装 Docker..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://get.docker.com | sh
            ;;
        centos|rhel|fedora)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            systemctl start docker
            systemctl enable docker
            ;;
        *)
            print_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac

    # 启动 Docker
    systemctl start docker
    systemctl enable docker

    print_success "Docker 安装完成: $(docker --version)"
}

# 安装 Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose 已安装: $(docker-compose --version)"
        return 0
    fi

    print_info "正在安装 Docker Compose..."

    # 获取最新版本
    LATEST_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

    curl -L "https://github.com/docker/compose/releases/download/${LATEST_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

    print_success "Docker Compose 安装完成: $(docker-compose --version)"
}

# 检查并安装必要的工具
install_tools() {
    print_info "安装必要工具..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y curl wget unzip git
            ;;
        centos|rhel|fedora)
            yum install -y curl wget unzip git
            ;;
    esac

    print_success "工具安装完成"
}

# 开放防火墙端口
open_firewall() {
    print_info "配置防火墙..."

    # 检查防火墙状态
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        ufw allow $PORT/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        print_success "UFW 防火墙已配置"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS Firewalld
        firewall-cmd --permanent --add-port=$PORT/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --reload
        print_success "Firewalld 防火墙已配置"
    else
        print_warning "未检测到支持的防火墙，请手动开放端口 $PORT"
    fi
}

# 获取项目代码
get_project() {
    print_info "准备项目文件..."

    if [[ -d "$APP_DIR" ]]; then
        print_warning "项目目录已存在: $APP_DIR"
        read -p "是否覆盖? (y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            rm -rf "$APP_DIR"
        else
            print_info "将使用现有目录"
            return 0
        fi
    fi

    # 检查本地是否有项目文件
    if [[ -f "docker-compose.yml" && -f "Dockerfile" ]]; then
        print_info "使用本地项目文件..."
        mkdir -p "$APP_DIR"
        cp -r . "$APP_DIR"
    else
        print_info "请确保项目文件已上传到服务器"
        print_error "未找到 docker-compose.yml 文件"
        exit 1
    fi

    print_success "项目文件准备完成"
}

# 部署应用
deploy() {
    print_info "开始部署应用..."

    cd "$APP_DIR"

    # 创建数据目录
    mkdir -p server/data

    # 构建并启动
    print_info "构建 Docker 镜像..."
    docker-compose build --no-cache

    print_info "启动容器..."
    docker-compose up -d

    # 等待服务启动
    print_info "等待服务启动..."
    sleep 5

    # 检查容器状态
    if docker-compose ps | grep -q "Up"; then
        print_success "应用部署成功！"
    else
        print_error "应用启动失败，请查看日志: docker-compose logs"
        exit 1
    fi
}

# 显示访问信息
show_info() {
    IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}       访客登记管理系统部署完成          ${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo -e "🌐 访问地址:"
    echo -e "   本地: ${GREEN}http://localhost:$PORT${NC}"
    echo -e "   外网: ${GREEN}http://$IP:$PORT${NC}"
    echo ""
    echo -e "📁 项目目录: ${YELLOW}$APP_DIR${NC}"
    echo -e "📊 数据文件: ${YELLOW}$APP_DIR/server/data/database.json${NC}"
    echo ""
    echo -e "🔧 常用命令:"
    echo -e "   查看日志: ${BLUE}cd $APP_DIR && docker-compose logs -f${NC}"
    echo -e "   停止服务: ${BLUE}cd $APP_DIR && docker-compose down${NC}"
    echo -e "   重启服务: ${BLUE}cd $APP_DIR && docker-compose restart${NC}"
    echo -e "   查看状态: ${BLUE}cd $APP_DIR && docker-compose ps${NC}"
    echo ""
    echo -e "⚠️  重要提醒:"
    echo -e "   1. 请立即修改默认密码"
    echo -e "   2. 建议配置 Nginx + HTTPS"
    echo -e "   3. 定期备份数据文件"
    echo ""
    echo -e "${CYAN}========================================${NC}"
}

# 主函数
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  访客登记管理系统 - 一键部署脚本        ${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""

    check_root
    detect_os
    install_tools
    install_docker
    install_docker_compose
    open_firewall
    get_project
    deploy
    show_info
}

# 运行主函数
main "$@"
