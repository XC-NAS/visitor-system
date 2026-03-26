# 免费云平台部署指南

## 推荐方案对比

| 平台 | 免费额度 | 特点 | 推荐度 |
|------|----------|------|--------|
| **Railway** | $5/月 | 自动部署，无需配置服务器 | ⭐⭐⭐⭐⭐ |
| **Render** | 750小时/月 | 稳定可靠，支持自定义域名 | ⭐⭐⭐⭐⭐ |
| **Fly.io** | 部分免费 | 全球节点，速度快 | ⭐⭐⭐⭐ |
| **Oracle Cloud** | 永久免费 | 2核1G ARM 服务器 | ⭐⭐⭐⭐ |
| **Glitch** | 一直在线 | 适合演示，有休眠 | ⭐⭐⭐ |

---

## 方案一：Railway（最简单，推荐）

Railway 提供免费 $5/月的额度，足够运行此应用。

### 部署步骤

1. **Fork 或创建 GitHub 仓库**
   - 将代码推送到 GitHub

2. **注册 Railway**
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

3. **创建项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库

4. **配置部署**
   - Railway 会自动识别 Dockerfile
   - 点击部署，等待完成

5. **获取域名**
   - 部署完成后，Railway 会分配一个 `.railway.app` 域名
   - 也可以绑定自定义域名

### Railway 特定配置

创建 `railway.json`：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server/server.js",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 方案二：Render（稳定可靠）

Render 提供 750 小时/月的免费 Web 服务。

### 部署步骤

1. **准备代码**
   - 将代码推送到 GitHub

2. **注册 Render**
   - 访问 https://render.com
   - 使用 GitHub 登录

3. **创建 Web Service**
   - 点击 "New" → "Web Service"
   - 选择 GitHub 仓库

4. **配置服务**
   - **Name**: visitor-system
   - **Environment**: Docker
   - **Branch**: main
   - **Dockerfile Path**: ./Dockerfile
   - **Plan**: Free

5. **添加磁盘（数据持久化）**
   - 在 Service 设置中点击 "Disks"
   - **Name**: data
   - **Mount Path**: /app/server/data
   - **Size**: 1 GB (免费额度)

6. **部署**
   - 点击 "Create Web Service"
   - 等待部署完成

### Render 特定配置

创建 `render.yaml`：

```yaml
services:
  - type: web
    name: visitor-system
    runtime: docker
    plan: free
    dockerfilePath: ./Dockerfile
    disk:
      name: data
      mountPath: /app/server/data
      sizeGB: 1
    envVars:
      - key: PORT
        value: 3000
      - key: NODE_ENV
        value: production
```

---

## 方案三：Fly.io（全球节点）

Fly.io 提供一定的免费额度，应用部署在全球边缘节点。

### 部署步骤

1. **安装 Fly CLI**
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **登录**
   ```bash
   fly auth login
   ```

3. **创建应用**
   ```bash
   cd visitor-system
   fly launch
   ```
   - 按提示输入应用名称
   - 选择区域（推荐香港或新加坡）

4. **创建卷（数据持久化）**
   ```bash
   fly volumes create data --size 1 --region hkg
   ```

5. **修改 fly.toml**
   添加卷挂载：
   ```toml
   [mounts]
     source = "data"
     destination = "/app/server/data"
   ```

6. **部署**
   ```bash
   fly deploy
   ```

### Fly.io 配置文件

创建 `fly.toml`：

```toml
app = "visitor-system"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[mounts]
  source = "data"
  destination = "/app/server/data"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

---

## 方案四：Oracle Cloud（永久免费）

Oracle Cloud 提供永久免费的 ARM 服务器（2核1G）。

### 申请步骤

1. 访问 https://www.oracle.com/cloud/free/
2. 注册账号（需要信用卡验证）
3. 创建实例：
   - 选择 "VM.Standard.A1.Flex" (ARM)
   - 配置：2 OCPU, 12 GB 内存（免费额度）
   - 系统：Ubuntu 22.04

### 部署步骤

```bash
# 1. SSH 连接到服务器
ssh ubuntu@你的服务器IP

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. 上传项目文件（本地执行）
scp -r visitor-system ubuntu@服务器IP:/home/ubuntu/

# 5. 部署（服务器上执行）
cd /home/ubuntu/visitor-system
docker-compose up -d
```

---

## 方案五：Glitch（快速演示）

适合快速演示，有休眠机制。

### 部署步骤

1. 访问 https://glitch.com
2. 点击 "New Project" → "Import from GitHub"
3. 输入 GitHub 仓库地址
4. Glitch 会自动安装依赖并启动

**注意**：Glitch 免费版会在 5 分钟无访问后休眠，首次访问需要等待唤醒。

---

## 数据持久化注意事项

### 无状态部署的问题

大多数免费平台默认是无状态的，重启后数据会丢失。解决方案：

1. **使用平台提供的磁盘/卷**
   - Render Disks
   - Fly.io Volumes
   - Railway Volumes

2. **使用外部数据库**（推荐用于生产）
   - MongoDB Atlas（免费 512MB）
   - PlanetScale MySQL（免费 5GB）
   - Supabase Postgres（免费 500MB）

### 配置外部数据库（可选）

如果需要连接外部数据库，修改 `server/server.js`：

```javascript
// 使用环境变量配置数据库连接
const DB_URL = process.env.DATABASE_URL || 'file://./data/database.json';
```

---

## 自定义域名

### Railway
1. 项目设置 → Domains
2. 点击 "Generate Domain" 或 "Custom Domain"
3. 按提示配置 DNS

### Render
1. 服务设置 → Settings → Custom Domains
2. 添加你的域名
3. 配置 DNS CNAME 记录

### Fly.io
```bash
fly certs create yourdomain.com
```
然后在 DNS 中添加 A/AAAA 记录指向分配的 IP。

---

## 监控和日志

### Railway
- 自带 Dashboard 监控
- 日志查看：Deploy → Logs

### Render
- 服务页面查看日志
- 支持日志搜索

### Fly.io
```bash
# 查看日志
fly logs

# 实时监控
fly logs -f
```

---

## 免费额度监控

定期检查使用情况，避免超额：

- **Railway**: Dashboard → Usage
- **Render**: Dashboard → 查看账单
- **Fly.io**: Dashboard → Billing

---

## 备份策略

由于免费平台可能随时清理数据，建议：

1. **定期导出数据**
   - 使用系统的导出功能下载 Excel

2. **使用 GitHub 备份**
   - 定期将 database.json 提交到 GitHub

3. **使用外部存储**
   - AWS S3 Free Tier
   - Cloudflare R2
