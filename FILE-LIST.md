# 项目文件清单

## 保留文件说明

### 核心代码文件（必须保留）
```
server/
  ├── server.js          # Express 后端服务主文件
  ├── package.json       # Node.js 依赖配置
  └── data/              # 数据存储目录
       └── database.json # 访客数据（部署后生成）

public/
  ├── index.html         # 前端主页面
  ├── app.js             # 前端 JavaScript 逻辑
  └── styles.css         # 前端样式文件
```

### Docker 部署配置（推荐保留）
```
Dockerfile              # Docker 镜像构建配置
docker-compose.yml      # Docker Compose 编排配置
.dockerignore           # Docker 构建忽略文件
```

### 云平台部署配置（按需保留）
```
railway.json            # Railway 平台配置
render.yaml             # Render 平台配置
fly.toml                # Fly.io 平台配置
app.json                # Heroku 平台配置
```

### 部署脚本（推荐保留）
```
install.sh              # Linux 一键安装脚本
docker-start.sh         # Linux Docker 启动脚本
docker-start.bat        # Windows Docker 启动脚本
start.sh                # Linux 普通启动脚本
start.bat               # Windows 普通启动脚本
```

### 文档文件（建议保留）
```
README.md               # 项目主文档
TUTORIAL.md             # 详细搭建教程
QUICK-START.md          # 快速开始指南
DEPLOY.md               # 完整部署文档
DEPLOY-FREE.md          # 免费云平台部署指南
DEPLOY-QUICK.md         # 部署快速参考
DOCKER.md               # Docker 部署指南
```

### Git 配置（必须保留）
```
.gitignore              # Git 忽略文件配置
.github/
  └── workflows/
       └── deploy.yml   # GitHub Actions 自动部署
```

### 其他配置文件
```
.env.example            # 环境变量示例文件
ecosystem.config.js     # PM2 进程管理配置
clean.sh                # 项目清理脚本（本文件）
```

---

## 已清理的文件

以下文件/目录已被清理，不需要提交到 Git：

| 文件/目录 | 说明 | 清理原因 |
|-----------|------|----------|
| `server/node_modules/` | Node.js 依赖目录 | 部署时会自动安装 |
| `server/package-lock.json` | 依赖锁定文件 | 部署时会重新生成 |
| `app.log` | 运行日志 | 运行时生成 |
| `*.tmp` | 临时文件 | 无用 |
| `.DS_Store` | macOS 系统文件 | 无用 |
| `Thumbs.db` | Windows 缩略图缓存 | 无用 |

---

## 部署前检查清单

提交到 GitHub 前，请确认：

- [ ] `server/node_modules/` 已删除
- [ ] `server/package-lock.json` 已删除
- [ ] 日志文件已删除
- [ ] `.gitignore` 已配置（排除 node_modules 等）
- [ ] 所有配置文件已保留
- [ ] 代码文件已更新到最新

---

## 文件大小参考

清理前后的对比（估算）：

| 项目 | 清理前 | 清理后 |
|------|--------|--------|
| node_modules | ~50MB | 0 |
| package-lock.json | ~30KB | 0 |
| 核心代码 | ~200KB | ~200KB |
| 配置文件 | ~20KB | ~20KB |
| **总计** | **~50MB** | **~220KB** |

清理后项目体积减少 **99%**！
