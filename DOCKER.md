# Docker 部署指南

## 方案一：Linux 服务器部署（推荐用于生产环境）

### 1. 准备服务器

购买云服务器（推荐配置）：
- **阿里云/腾讯云/华为云**：1核2G，带宽1M以上
- **系统**：Ubuntu 20.04/22.04 LTS 或 CentOS 7/8
- **开放端口**：3000（或自定义）

### 2. 安装 Docker

**Ubuntu/Debian：**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 添加当前用户到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

**CentOS/RHEL：**
```bash
# 安装 Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. 上传项目文件

**方式1：使用 SCP（本地电脑执行）**
```bash
# 压缩项目文件夹
zip -r visitor-system.zip visitor-system/

# 上传到服务器
scp visitor-system.zip root@你的服务器IP:/opt/

# 连接服务器解压
ssh root@你的服务器IP
cd /opt
unzip visitor-system.zip
```

**方式2：使用 Git（如果代码在 GitHub）**
```bash
cd /opt
git clone https://你的仓库地址.git visitor-system
```

**方式3：使用 FileZilla / WinSCP**
- 下载 FileZilla 或 WinSCP
- 连接服务器（SFTP 协议）
- 上传 visitor-system 文件夹到 /opt/

### 4. 部署应用

```bash
cd /opt/visitor-system

# 给脚本添加执行权限
chmod +x docker-start.sh

# 执行部署脚本
./docker-start.sh
```

或者手动执行：
```bash
cd /opt/visitor-system
docker-compose build
docker-compose up -d
```

### 5. 验证部署

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 访问测试
curl http://localhost:3000
```

浏览器访问：`http://服务器IP:3000`

---

## 方案二：本地 Windows Docker Desktop 测试

### 1. 安装 Docker Desktop

1. 下载：https://www.docker.com/products/docker-desktop
2. 安装并启动 Docker Desktop
3. 确保 WSL2 已启用（安装程序会提示）

### 2. 部署

```cmd
# 进入项目目录
cd C:\Users\DX\Desktop\visitor-system

# 双击运行或命令行执行
docker-start.bat
```

浏览器访问：`http://localhost:3000`

---

## 方案三：使用 Nginx 反向代理 + HTTPS

### 1. 安装 Nginx

```bash
sudo apt install nginx -y
```

### 2. 配置 Nginx

创建配置文件：
```bash
sudo nano /etc/nginx/sites-available/visitor-system
```

添加内容：
```nginx
server {
    listen 80;
    server_name yourdomain.com;  # 修改为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件大小限制
    client_max_body_size 50M;
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/visitor-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. 配置 HTTPS（SSL 证书）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期测试
sudo certbot renew --dry-run
```

---

## 常用命令

### 容器管理
```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker-compose logs -f

# 查看最后 100 行日志
docker-compose logs --tail=100

# 停止服务
docker-compose down

# 停止并删除卷（会清空数据！）
docker-compose down -v

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build

# 进入容器内部
docker exec -it visitor-system sh

# 查看容器资源占用
docker stats visitor-system
```

### 数据备份
```bash
# 备份数据文件
cp /opt/visitor-system/server/data/database.json /opt/backup/database_$(date +%Y%m%d).json

# 自动备份脚本
echo "0 2 * * * cp /opt/visitor-system/server/data/database.json /opt/backup/database_\$(date +\%Y\%m\%d).json" | sudo crontab -
```

### 更新部署
```bash
cd /opt/visitor-system

# 拉取最新代码（如果是 git）
git pull

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

---

## 故障排查

### 1. 端口被占用
```bash
# 查看占用 3000 端口的进程
sudo lsof -i :3000

# 杀死进程
sudo kill -9 PID

# 或者修改 docker-compose.yml 使用其他端口
# ports:
#   - "8080:3000"
```

### 2. 权限问题
```bash
# 修复权限
sudo chown -R $USER:$USER /opt/visitor-system

# Docker 权限
sudo usermod -aG docker $USER
# 然后重新登录
```

### 3. 容器无法启动
```bash
# 查看详细日志
docker-compose logs

# 检查配置文件
docker-compose config

# 手动运行查看错误
docker run --rm -it visitor-system sh
```

### 4. 数据丢失
数据存储在 `server/data/database.json`，已通过 volume 挂载到宿主机。确保：
- 不要删除 `server/data` 目录
- 定期备份 `database.json`

---

## 性能优化

### 1. 限制容器资源

编辑 `docker-compose.yml`：
```yaml
services:
  visitor-system:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 2. 使用多阶段构建（大型项目）

如需进一步优化镜像大小，可以使用多阶段构建的 Dockerfile。

---

## 安全建议

1. **修改默认密码**：部署后立即修改所有默认账号密码
2. **限制端口访问**：使用防火墙限制 3000 端口仅允许特定 IP
3. **使用 HTTPS**：生产环境必须配置 SSL 证书
4. **定期更新**：定期更新系统和 Docker 镜像
5. **数据备份**：设置自动备份任务

---

## 免费服务器推荐

| 平台 | 配置 | 时长 | 备注 |
|------|------|------|------|
| 阿里云 | 1核2G | 3个月免费 | 需实名认证 |
| 腾讯云 | 1核2G | 1个月免费 | 新用户专享 |
| 华为云 | 1核1G | 1年免费 | 需实名认证 |
| Oracle Cloud | 1核1G | 永久免费 | 需信用卡验证 |
| Railway | 500MB RAM | 每月免费额度 | 无需服务器 |
| Render | 512MB RAM | 免费 | 无需服务器 |
