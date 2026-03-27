# Render 部署详细教程

## 概述

Render 是一个稳定的云平台，提供 750 小时/月的免费额度，适合长期运行访客登记系统。

**特点：**
- ✅ 稳定可靠，适合生产环境
- ✅ 750 小时/月免费额度（足够运行）
- ✅ 支持数据持久化（Disk）
- ✅ 自动 HTTPS
- ⚠️ 15 分钟无访问会休眠（首次访问需等待唤醒）

---

## 准备工作

### 1. 确认代码已上传到 GitHub

访问你的 GitHub 仓库，确认以下文件都存在：

```
visitor-system/
├── server/
│   ├── server.js
│   ├── package.json
│   └── data/
│       └── README.md
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── Dockerfile
├── docker-compose.yml
├── render.yaml
└── ...
```

### 2. 创建 Render 账号

1. 访问 https://render.com
2. 点击页面右上角的 **"Get Started for Free"**
3. 选择 **"Continue with GitHub"**
4. 授权 Render 访问你的 GitHub 账号
   - 点击 **"Authorize render"**

---

## 第一步：创建 Web Service

### 1.1 进入 Dashboard

登录后，你会看到 Render Dashboard。

### 1.2 创建新服务

1. 点击页面右上角的 **"New"** 按钮
2. 在下拉菜单中选择 **"Web Service"**

![步骤：New → Web Service]

### 1.3 连接 GitHub 仓库

1. 在 **"Connect a repository"** 页面：
   - 如果你看到 **"visitor-system"** 仓库，直接点击它
   - 如果没有看到，点击 **"Configure account"**，给 Render 访问仓库的权限

2. 点击 **"Connect"** 按钮

---

## 第二步：配置服务

连接仓库后，进入配置页面，按以下填写：

### 2.1 基本信息

| 字段 | 填写内容 | 说明 |
|------|----------|------|
| **Name** | `visitor-system` | 服务名称，只能用小写字母、数字和横线 |
| **Region** | `Singapore` | 选择离你最近的服务器位置 |
| **Branch** | `main` | 选择代码分支（通常是 main 或 master）|
| **Root Directory** | 留空 | 使用项目根目录 |

### 2.2 运行时设置

| 字段 | 填写内容 | 说明 |
|------|----------|------|
| **Runtime** | `Docker` | 使用 Docker 部署 |
| **Dockerfile Path** | `./Dockerfile` | Dockerfile 位置 |

### 2.3 选择套餐

- 选择 **"Free"** 套餐
- 免费套餐规格：
  - 512 MB RAM
  - 0.1 CPU
  - 750 小时/月

### 2.4 展开高级设置

点击 **"Advanced"** 展开更多选项：

| 字段 | 填写内容 |
|------|----------|
| **Auto-Deploy** | `Yes`（默认）推送代码自动部署 |

### 2.5 创建服务

检查所有配置无误后，点击页面底部的 **"Create Web Service"** 按钮。

---

## 第三步：等待首次部署

### 3.1 查看构建日志

创建后，Render 会开始构建 Docker 镜像，你会看到：

```
==> Building service...
==> Using Docker...
Step 1/10 : FROM node:18-alpine
...
==> Build successful
==> Deploying...
```

### 3.2 部署时间

- **首次部署**：约 3-5 分钟
- **后续部署**：约 1-2 分钟

### 3.3 部署成功标志

看到以下信息表示部署成功：

```
==> Your service is live 🎉
==> Service URL: https://visitor-system-xxx.onrender.com
```

---

## 第四步：添加数据持久化（重要！）

⚠️ **这一步非常重要！** 如果不配置，数据会在服务重启后丢失。

### 4.1 进入 Disk 设置

1. 在服务页面，点击左侧菜单的 **"Disks"**
2. 点击 **"Add Disk"** 按钮

### 4.2 配置 Disk

| 字段 | 填写内容 | 说明 |
|------|----------|------|
| **Name** | `data` | 磁盘名称 |
| **Mount Path** | `/app/server/data` | 挂载路径，必须填这个 |
| **Size** | `1 GB` | 磁盘大小，免费额度内 |

### 4.3 保存并重启

1. 点击 **"Save"** 按钮
2. Render 会自动重新部署服务
3. 等待重新部署完成（约 1-2 分钟）

---

## 第五步：访问系统

### 5.1 获取访问地址

1. 服务页面顶部会显示 URL：
   ```
   https://visitor-system-xxx.onrender.com
   ```
   （xxx 是随机生成的字符串）

2. 点击 URL 即可访问系统

### 5.2 测试访问

打开浏览器，访问你的地址，应该能看到登录页面。

**首次访问可能较慢**（约 10-30 秒），因为：
- Render 的免费服务会在 15 分钟无访问后休眠
- 首次访问需要唤醒服务

---

## 第六步：初始化配置

### 6.1 修改默认密码

1. 使用管理员账号登录：
   - 用户名：`admin`
   - 密码：`admin`

2. 点击左侧菜单 **"用户管理"**
3. 修改所有默认账号的密码：
   - admin（管理员）
   - front（前台）
   - staff（员工）
   - security（安保）

### 6.2 配置系统设置

1. 点击 **"系统设置"**
2. 配置：
   - 来访单位列表
   - 被访单位列表
   - 部门与人员
3. 保存设置

### 6.3 生成二维码

1. 点击 **"二维码生成"**
2. 点击 **"下载二维码"**
3. 打印二维码放置在前台

---

## 第七步：验证功能

### 7.1 测试访客自助登记

1. 用手机扫描二维码
2. 填写访客信息提交
3. 在系统 **"审核管理"** 中查看记录

### 7.2 测试审核流程

1. 登录管理员账号
2. 进入 **"审核管理"**
3. 点击 **"通过"** 审核访客

### 7.3 测试安保登记

1. 登录安保账号
2. 进入 **"进出登记"**
3. 点击 **"到访登记"**，测试拍照功能

---

## 配置自定义域名（可选）

### 8.1 添加自定义域名

1. 在服务页面，点击 **"Settings"**
2. 找到 **"Custom Domains"** 部分
3. 点击 **"Add Custom Domain"**
4. 输入你的域名，如：`visitor.yourcompany.com`

### 8.2 配置 DNS

在你的域名服务商处，添加 CNAME 记录：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| CNAME | visitor | visitor-system-xxx.onrender.com |

### 8.3 等待生效

- DNS 生效通常需要 5-30 分钟
- 在 Render 页面查看验证状态

---

## 日常维护

### 查看日志

1. 在服务页面，点击 **"Logs"**
2. 可以看到应用的运行日志
3. 支持搜索和过滤

### 重启服务

1. 点击 **"Manual Deploy"**
2. 选择 **"Deploy latest commit"**
3. 或点击 **"Restart service"**

### 更新代码

1. 修改本地代码
2. 推送到 GitHub：`git push`
3. Render 会自动重新部署（如果开启了 Auto-Deploy）

---

## 常见问题

### 问题1：部署失败，显示 "Build failed"

**排查步骤：**
1. 点击 **"Logs"** 查看错误信息
2. 检查 Dockerfile 是否存在
3. 确保 render.yaml 配置正确

### 问题2：数据丢失

**原因：** 没有配置 Disk 或路径错误

**解决：**
- 检查 Disk 的 Mount Path 是否为 `/app/server/data`
- 确认 Disk 已创建并挂载

### 问题3：访问很慢

**原因：** Render 免费服务会休眠

**解决：**
- 首次访问需要唤醒，等待 10-30 秒
- 或使用付费套餐（$7/月）保持常驻

### 问题4：摄像头无法使用

**原因：** 必须使用 HTTPS

**解决：**
- Render 自动提供 HTTPS，确保访问地址是 `https://`
- 如果用了自定义域名，需要配置 SSL

---

## 费用说明

### 免费套餐
- **Web Service**：750 小时/月
- **Disk**：1 GB 存储
- **带宽**：100 GB/月

### 超出后
- 如果需要更多资源，可升级到 Starter 套餐（$7/月）

---

## 总结

部署完成后，你的系统信息：

| 项目 | 内容 |
|------|------|
| 访问地址 | `https://visitor-system-xxx.onrender.com` |
| 管理后台 | 同上 |
| 数据存储 | 1GB Disk，持久化保存 |
| 自动部署 | 推送代码到 GitHub 自动更新 |

**下一步：**
1. 修改默认密码
2. 配置系统设置
3. 下载二维码开始使用
