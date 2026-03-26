# 访客登记管理系统

基于 Node.js + Express + Docker 的访客登记管理系统，支持多角色访问、二维码自助登记、拍照登记、数据导出等功能。

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 功能特性

- **多角色访问**：管理员、前台、员工、安保
- **访客自助登记**：扫码填写信息，等待审核
- **审核管理**：管理员审核访客预约
- **进出登记**：安保拍照登记到访/离场
- **访客报表**：多维度筛选统计，照片展示
- **数据导出**：Excel 格式导出
- **二维码生成**：自助登记二维码下载

## 部署方式

### 方式1：免费云平台（无服务器成本）

**Railway（最简单，推荐）**
```bash
# 1. Fork 代码到 GitHub
# 2. 登录 https://railway.app
# 3. New Project → Deploy from GitHub
# 4. 自动部署完成！
```

**Render（最稳定）**
- 登录 https://render.com
- 创建 Web Service，选择 Docker 环境
- 免费 750 小时/月

**查看详细指南：** [免费平台部署](DEPLOY-FREE.md) | [快速选择](QUICK-START.md)

### 方式2：Docker 部署（推荐用于生产）

**Linux 服务器一键部署：**
```bash
# 1. 上传项目文件到服务器 /opt/visitor-system
# 2. 执行一键安装脚本
cd /opt/visitor-system
chmod +x install.sh
sudo bash install.sh
```

**手动部署：**
```bash
cd /opt/visitor-system
docker-compose up -d
```

**Windows 本地测试：**
```cmd
docker-start.bat
```

### 方式2：本地运行

```bash
cd server
npm install
npm start
```

或双击 `start.bat`

## 访问系统

- **本机**：http://localhost:3000
- **局域网**：http://服务器IP:3000
- **互联网**：配置服务器公网IP或域名

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin |
| 前台 | front | front |
| 员工 | staff | staff |
| 安保 | security | security |

⚠️ **部署后请立即修改默认密码！**

## 文档

- [快速开始指南](QUICK-START.md) - 快速选择最适合的部署方案
- [免费平台部署](DEPLOY-FREE.md) - Railway/Render/Fly.io 等免费平台部署指南
- [Docker 部署指南](DOCKER.md) - 详细的 Docker 部署步骤
- [部署快速指南](DEPLOY-QUICK.md) - 各平台快速部署参考
- [完整部署文档](DEPLOY.md) - 所有部署方式详解

## 项目结构

```
visitor-system/
├── public/                 # 前端文件
│   ├── index.html         # 主页面
│   ├── app.js             # 前端逻辑
│   └── styles.css         # 样式文件
├── server/                # 后端服务
│   ├── server.js          # Express 服务
│   ├── package.json       # 依赖配置
│   └── data/              # 数据存储目录
├── docker-compose.yml     # Docker 编排配置
├── Dockerfile             # Docker 镜像配置
├── install.sh             # Linux 一键安装脚本
└── docker-start.bat       # Windows Docker 启动脚本
```

## 数据备份

数据存储在 `server/data/database.json`，建议定期备份：

```bash
# 手动备份
cp server/data/database.json backup/database_$(date +%Y%m%d).json

# 自动备份（添加到 crontab）
0 2 * * * cp /opt/visitor-system/server/data/database.json /opt/backup/database_$(date +\%Y\%m\%d).json
```

## 常见问题

1. **端口被占用**
   - 修改 `docker-compose.yml` 中的端口映射
   - 或修改 `server/server.js` 中的 PORT 变量

2. **无法访问**
   - 检查防火墙设置，开放 3000 端口
   - 云服务器需要在安全组中开放端口

3. **摄像头无法使用**
   - 生产环境建议使用 HTTPS
   - 检查浏览器权限设置

## 技术栈

- 后端：Node.js + Express
- 前端：HTML + CSS + JavaScript
- 存储：JSON 文件存储
- 部署：Docker + Docker Compose

## 许可证

MIT
