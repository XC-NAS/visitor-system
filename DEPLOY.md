# 访客登记管理系统 - 部署指南

## 部署方式选择

### 方式一：Docker 部署（推荐）

#### 1. 安装 Docker 和 Docker Compose

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 上传项目文件

将项目文件上传到服务器，例如 `/opt/visitor-system`

```bash
# 使用 scp 上传（本地执行）
scp -r visitor-system root@你的服务器IP:/opt/

# 或者使用 git 克隆（如果代码在仓库中）
git clone https://你的仓库地址.git /opt/visitor-system
```

#### 3. 启动服务

```bash
cd /opt/visitor-system

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 4. 访问系统

浏览器访问：`http://服务器IP:3000`

---

### 方式二：PM2 部署（推荐用于生产环境）

#### 1. 安装 Node.js 和 PM2

```bash
# 安装 Node.js (18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2
```

#### 2. 上传并配置项目

```bash
# 上传到服务器
cd /opt
git clone 你的仓库地址 visitor-system
cd visitor-system/server

# 安装依赖
npm install --production

# 创建日志目录
mkdir -p ../logs
```

#### 3. 使用 PM2 启动

```bash
cd /opt/visitor-system

# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs visitor-system

# 设置开机自启
pm2 startup
pm2 save
```

#### 4. 配置 Nginx 反向代理（可选但推荐）

```bash
sudo apt install nginx
```

创建配置文件 `/etc/nginx/sites-available/visitor-system`：

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # 修改为你的域名或IP

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

---

### 方式三：云服务器手动部署

#### 1. 服务器要求
- Linux 系统（Ubuntu 20.04+/CentOS 7+）
- 1GB 以上内存
- 开放 3000 端口（或 80/443）

#### 2. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v
npm -v
```

#### 3. 部署应用

```bash
# 创建目录
mkdir -p /opt/visitor-system
cd /opt/visitor-system

# 上传文件（使用 scp 或 git）
scp -r 本地路径/* root@服务器IP:/opt/visitor-system/

# 安装依赖
cd server
npm install --production

# 启动
node server.js
```

#### 4. 后台运行（使用 nohup 或 screen）

```bash
# 方法1：nohup
nohup node server.js > ../app.log 2>&1 &

# 方法2：screen
screen -S visitor
node server.js
# Ctrl+A 然后 D 分离

# 重新连接
screen -r visitor
```

---

## 常用云服务商部署

### 阿里云 ECS

1. 购买 ECS 实例（推荐 1核2G 以上）
2. 配置安全组，开放 3000 端口
3. 使用上述任意方式部署
4. （可选）绑定域名，配置 SSL

### 腾讯云 CVM

1. 购买轻量应用服务器
2. 防火墙设置开放 3000 端口
3. 按上述方式部署

### Railway / Render（免费）

1. 将代码推送到 GitHub
2. 在 Railway/Render 创建新项目
3. 选择 GitHub 仓库
4. 设置启动命令：`node server/server.js`
5. 自动部署完成

---

## 配置 HTTPS（SSL 证书）

### 使用 Certbot（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期测试
sudo certbot renew --dry-run
```

---

## 数据备份

数据存储在 `server/data/database.json`，建议定期备份：

```bash
# 创建备份脚本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /opt/visitor-system/server/data/database.json $BACKUP_DIR/database_$DATE.json
# 保留最近30天备份
find $BACKUP_DIR -name "database_*.json" -mtime +30 -delete
EOF

chmod +x /opt/backup.sh

# 添加定时任务
crontab -e
# 添加：0 2 * * * /opt/backup.sh
```

---

## 更新部署

### Docker 方式更新

```bash
cd /opt/visitor-system
git pull  # 或上传新文件
docker-compose down
docker-compose up --build -d
```

### PM2 方式更新

```bash
cd /opt/visitor-system
git pull  # 或上传新文件
pm2 restart visitor-system
```

---

## 故障排查

### 查看日志

```bash
# Docker
docker-compose logs -f

# PM2
pm2 logs visitor-system

# 手动启动
node server/server.js  # 查看控制台输出
```

### 常见问题

1. **端口被占用**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 PID
   ```

2. **权限问题**
   ```bash
   sudo chown -R $USER:$USER /opt/visitor-system
   ```

3. **防火墙设置**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 3000
   sudo ufw allow 80
   sudo ufw allow 443

   # CentOS
   sudo firewall-cmd --permanent --add-port=3000/tcp
   sudo firewall-cmd --reload
   ```

---

## 系统优化

### 1. 修改默认密码

首次部署后，立即修改默认账号密码：
- 管理员：admin/admin
- 前台：front/front
- 安保：security/security

### 2. 配置定期重启（可选）

```bash
# 添加到 crontab，每天凌晨3点重启
0 3 * * * cd /opt/visitor-system && pm2 restart visitor-system
```

### 3. 监控

使用 PM2 Plus 或宝塔面板等工具监控应用状态。
