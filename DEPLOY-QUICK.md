# 互联网部署 - 快速指南

## 推荐方案：Docker 部署（最简单）

### 你需要：
1. 一台云服务器（阿里云/腾讯云/AWS等，1核2G即可）
2. 安装好 Docker 的服务器

### 部署步骤：

```bash
# 1. 连接服务器
ssh root@你的服务器IP

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh

# 3. 上传项目文件到 /opt/visitor-system
# （使用 FileZilla 或 scp 上传）

# 4. 进入目录并启动
cd /opt/visitor-system
docker-compose up -d

# 5. 完成！访问 http://服务器IP:3000
```

---

## 备选方案：PM2 部署

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 2. 安装 PM2
npm install -g pm2

# 3. 上传项目，进入 server 目录安装依赖
cd server && npm install

# 4. 使用 PM2 启动
cd .. && pm2 start ecosystem.config.js

# 5. 设置开机自启
pm2 startup && pm2 save
```

---

## 配置域名和 HTTPS

### 1. 域名解析
在你的域名服务商处，添加 A 记录指向服务器 IP

### 2. 安装 Nginx
```bash
apt install nginx
```

### 3. 配置 Nginx
编辑 `/etc/nginx/sites-available/default`：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. 启用 HTTPS（免费证书）
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## 防火墙设置

记得在安全组/防火墙中开放端口：
- 3000（应用端口）或 80/443（HTTP/HTTPS）

---

## 免费部署平台（无需服务器）

### Railway（推荐）
1. 代码推送到 GitHub
2. 访问 https://railway.app
3. 新建项目 → 选择 GitHub 仓库
4. 设置启动命令：`node server/server.js`
5. 自动部署，获得免费域名

### Render
类似 Railway，访问 https://render.com

---

## 重要提示

⚠️ **部署后立即修改默认密码：**
- admin/admin
- front/front
- staff/staff
- security/security

---

详细文档请查看 `DEPLOY.md`
