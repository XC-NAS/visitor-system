# 详细搭建教程 - 从零开始部署到免费云平台

## 概述

本教程将带你从零开始，把访客登记系统部署到免费的云平台上，让任何人都能通过互联网访问。

**预计时间**：15-30分钟
**所需工具**：电脑、浏览器、GitHub账号
**费用**：完全免费

---

## 准备工作

### 第一步：创建 GitHub 仓库

为什么需要 GitHub？因为云平台需要从 GitHub 获取你的代码。

1. **注册 GitHub 账号**
   - 访问 https://github.com
   - 点击 "Sign up" 注册
   - 验证邮箱

2. **创建新仓库**
   - 登录 GitHub
   - 点击右上角 "+" → "New repository"
   - 填写信息：
     - Repository name: `visitor-system`
     - Description: `访客登记管理系统`
     - 选择 "Public"（公开）
     - 勾选 "Add a README file"
   - 点击 "Create repository"

3. **上传代码**

   有两种方式：

   **方式A：网页上传（最简单）**
   - 进入你刚创建的仓库
   - 点击 "Add file" → "Upload files"
   - 拖拽或选择 visitor-system 文件夹中的所有文件
   - 点击 "Commit changes"

   **方式B：命令行上传（推荐）**
   ```bash
   # 进入项目文件夹
   cd visitor-system

   # 初始化 Git
   git init

   # 添加所有文件
   git add .

   # 提交
   git commit -m "Initial commit"

   # 关联远程仓库（将下面的 URL 换成你的仓库地址）
   git remote add origin https://github.com/你的用户名/visitor-system.git

   # 推送
   git branch -M main
   git push -u origin main
   ```

---

## 方案一：Railway 部署（推荐）

Railway 是最简单的部署方式，全自动完成。

### 第二步：注册 Railway

1. 访问 https://railway.app
2. 点击 "Login" → "Continue with GitHub"
3. 授权 Railway 访问你的 GitHub 账号

### 第三步：创建项目

1. 登录后，点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 如果你看不到仓库，点击 "Configure GitHub App"，给 Railway 访问仓库的权限
4. 在列表中找到 `visitor-system`，点击选择
5. 点击 "Deploy Now"

### 第四步：等待部署

1. Railway 会自动检测 Dockerfile 并构建镜像
2. 等待 2-5 分钟，看到 "Deployed" 表示成功
3. 点击顶部的域名链接（如 `xxx.up.railway.app`）访问系统

### 第五步：添加数据持久化（重要）

默认情况下，数据存储在容器内，重启后会丢失。需要添加 Volume：

1. 在项目页面，点击你的服务（service）
2. 点击 "Volumes" 标签
3. 点击 "New Volume"
4. 配置：
   - Name: `data`
   - Mount Path: `/app/server/data`
   - Size: 1 GB
5. 点击 "Create Volume"
6. 重新部署：点击 "Deploy" 重新部署

### 第六步：配置域名（可选）

1. 点击 "Settings" 标签
2. 找到 "Domain" 部分
3. 点击 "Generate Domain" 获得免费域名
4. 或使用 "Custom Domain" 绑定自己的域名

---

## 方案二：Render 部署（更稳定）

Render 提供免费 750 小时/月的运行时间，适合长期稳定运行。

### 第二步：注册 Render

1. 访问 https://render.com
2. 点击 "Get Started for Free"
3. 使用 GitHub 账号登录

### 第三步：创建 Web Service

1. 登录后，点击 "New" → "Web Service"
2. 在 GitHub 授权页面，点击 "Authorize render"
3. 在仓库列表中找到 `visitor-system`，点击 "Connect"
4. 配置服务：
   - **Name**: `visitor-system`
   - **Region**: 选择离你近的（如 Singapore）
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Plan**: `Free`
5. 点击 "Advanced" 展开高级设置
6. 点击 "Create Web Service"

### 第四步：等待部署

1. 等待构建完成（约 3-5 分钟）
2. 看到 "Live" 状态表示成功
3. 点击域名链接访问系统

### 第五步：添加磁盘（数据持久化）

这是 Render 的关键步骤，否则数据会丢失：

1. 在服务页面，点击左侧 "Disks"
2. 点击 "Add Disk"
3. 配置：
   - **Name**: `data`
   - **Mount Path**: `/app/server/data`
   - **Size**: 1 GB
4. 点击 "Save"
5. 系统会自动重新部署

### 第六步：配置环境变量（可选）

1. 点击 "Environment" 标签
2. 点击 "Add Environment Variable"
3. 添加：
   - Key: `NODE_ENV`
   - Value: `production`
4. 保存后会自动重新部署

---

## 方案三：Fly.io 部署（技术向）

Fly.io 部署稍微复杂，但提供更灵活的控制。

### 第二步：安装 Fly CLI

**Windows:**
```powershell
# 在 PowerShell 中运行
iwr https://fly.io/install.ps1 -useb | iex
```

**macOS/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### 第三步：登录并创建应用

```bash
# 登录
fly auth login

# 进入项目目录
cd visitor-system

# 创建应用
fly launch
```

按提示操作：
- 输入应用名称（如 `visitor-system`）
- 选择区域（推荐香港 `hkg` 或新加坡 `sin`）
- 不创建数据库（我们使用文件存储）
- 现在不部署

### 第四步：创建数据卷

```bash
fly volumes create data --size 1 --region hkg
```

### 第五步：修改配置文件

我已经为你创建好了 `fly.toml`，确认内容：

```toml
app = "visitor-system"  # 改成你的应用名
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

### 第六步：部署

```bash
fly deploy
```

等待完成，使用 `fly open` 打开应用。

---

## 部署后的配置

### 修改默认密码

首次登录后，立即修改所有默认密码：

1. 使用管理员账号登录：admin / admin
2. 点击左侧菜单 "用户管理"
3. 逐个编辑用户，修改密码
4. 建议修改的账号：
   - admin（管理员）
   - front（前台）
   - staff（员工）
   - security（安保）

### 配置系统设置

1. 点击 "系统设置"
2. 配置来访单位、被访单位、部门人员
3. 设置是否需要审核
4. 保存设置

### 生成二维码

1. 点击 "二维码生成"
2. 下载二维码图片
3. 打印并放置在大门/前台

---

## 验证系统

### 测试访客自助登记

1. 用手机扫描二维码
2. 填写访客信息并提交
3. 在系统 "审核管理" 中看到新记录

### 测试审核流程

1. 登录管理员账号
2. 进入 "审核管理"
3. 通过或拒绝访客申请

### 测试安保登记

1. 登录安保账号
2. 进入 "进出登记"
3. 点击 "到访登记" 进行拍照

---

## 常见问题

### 问题1：部署失败，显示 "Build failed"

**原因**：通常是 Dockerfile 有问题

**解决**：
- 检查代码是否完整上传
- 查看构建日志，定位错误
- 确保 Dockerfile 在项目根目录

### 问题2：系统运行正常，但数据丢失

**原因**：没有配置数据持久化（Volume/Disk）

**解决**：
- Railway：添加 Volume，Mount Path 为 `/app/server/data`
- Render：添加 Disk，Mount Path 为 `/app/server/data`
- Fly.io：创建 volume 并在 fly.toml 配置 mounts

### 问题3：无法访问，显示 "Application Error"

**原因**：应用启动失败

**解决**：
- 查看平台日志（Logs）
- 检查端口配置是否正确（应该是 3000）
- 本地测试：`docker build -t test . && docker run -p 3000:3000 test`

### 问题4：摄像头无法使用

**原因**：生产环境必须使用 HTTPS

**解决**：
- Railway/Render/Fly.io 都自动提供 HTTPS
- 检查访问地址是否是 `https://` 开头
- 如果用自己的域名，需要配置 SSL 证书

### 问题5：如何更新代码

**Railway**：
- 推送新代码到 GitHub
- Railway 会自动重新部署

**Render**：
- 推送新代码到 GitHub
- 在 Render 点击 "Manual Deploy" → "Deploy latest commit"

**Fly.io**：
```bash
fly deploy
```

---

## 备份数据

即使配置了数据持久化，也建议定期备份：

### 方法1：导出 Excel

在系统 "访客报表" 页面，点击 "导出Excel" 下载数据。

### 方法2：备份 database.json

**Railway**：
1. 点击 "Shell" 标签
2. 运行：`cat /app/server/data/database.json`
3. 复制内容保存到本地

**Render**：
1. 点击 "Shell"
2. 运行：`cat /app/server/data/database.json`
3. 复制内容

**Fly.io**：
```bash
fly ssh console
cat /app/server/data/database.json
```

---

## 下一步

系统部署完成后，你可以：

1. **绑定自己的域名**
   - 在云平台设置中添加自定义域名
   - 在域名服务商配置 DNS 解析

2. **配置 HTTPS**
   - 大多数平台自动提供 HTTPS
   - 自定义域名需要配置 SSL 证书

3. **监控和日志**
   - 使用平台提供的监控功能
   - 配置日志告警

4. **扩展功能**
   - 接入外部数据库（MongoDB Atlas 免费版）
   - 添加邮件通知功能
   - 集成企业微信/钉钉

---

## 获取帮助

如果遇到问题：

1. 查看平台文档：
   - Railway Docs: https://docs.railway.app
   - Render Docs: https://render.com/docs
   - Fly.io Docs: https://fly.io/docs

2. 查看系统日志：
   - 各平台都有 Logs 功能
   - 查看错误信息

3. 本地测试：
   ```bash
   docker-compose up
   ```
   如果本地能运行，问题通常在平台配置
