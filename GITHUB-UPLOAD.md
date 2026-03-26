# GitHub 上传指南

## 问题说明

GitHub 网页直接上传文件时可能会遇到 "我们无法处理那个档案" 错误，原因通常是：
- 文件数量太多
- 某些文件名包含特殊字符
- 文件夹嵌套太深

以下是几种解决方案：

---

## 方案一：使用 Git 命令行（推荐）

### 1. 安装 Git

1. 访问 https://git-scm.com/download/win
2. 下载并安装 Git（全部默认选项即可）

### 2. 运行上传脚本

在项目文件夹中，双击运行 `git-upload.bat`

这个脚本会自动：
- 初始化 Git 仓库
- 添加所有文件
- 提交更改

### 3. 推送到 GitHub

```cmd
# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/visitor-system.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

---

## 方案二：使用压缩包上传

### 1. 使用已创建的压缩包

我已为你创建了压缩包：`visitor-system-clean.tar.gz`（42KB）

**解压后上传步骤：**
1. 解压压缩包到桌面
2. 打开 GitHub 仓库页面
3. 点击 "Add file" → "Upload files"
4. 将解压后的文件和文件夹拖拽到上传区域
5. 注意：一次不要上传太多文件，可以分批上传

### 2. 分批上传建议

如果一次性上传失败，可以分批：

**第一批 - 核心代码：**
```
server/
  - server.js
  - package.json
  - data/ (只上传 README.md)
public/
  - index.html
  - app.js
  - styles.css
```

**第二批 - 配置文件：**
```
Dockerfile
docker-compose.yml
.gitignore
.dockerignore
```

**第三批 - 部署配置：**
```
railway.json
render.yaml
fly.toml
app.json
ecosystem.config.js
```

**第四批 - 脚本文件：**
```
*.bat
*.sh
```

**第五批 - 文档：**
```
*.md
```

---

## 方案三：使用 GitHub Desktop（最简单）

### 1. 下载安装

访问 https://desktop.github.com 下载 GitHub Desktop

### 2. 添加本地仓库

1. 打开 GitHub Desktop
2. 点击 "File" → "Add local repository"
3. 选择 visitor-system 文件夹
4. 点击 "Add repository"

### 3. 发布到 GitHub

1. 点击 "Publish repository"
2. 输入仓库名称
3. 点击 "Publish repository"

---

## 方案四：使用 VS Code（开发者推荐）

### 1. 安装 VS Code

访问 https://code.visualstudio.com 下载安装

### 2. 打开项目

1. 打开 VS Code
2. 点击 "File" → "Open Folder"
3. 选择 visitor-system 文件夹

### 3. 初始化 Git

1. 按 `Ctrl+Shift+G` 打开源代码管理
2. 点击 "Initialize Repository"
3. 输入提交信息 "Initial commit"
4. 点击提交按钮

### 4. 推送到 GitHub

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Publish to GitHub"
3. 选择 "Publish to GitHub"
4. 选择仓库类型（Public/Private）
5. 点击确定

---

## 验证上传

上传完成后，在 GitHub 仓库页面检查：

- [ ] server/server.js 存在
- [ ] public/index.html 存在
- [ ] Dockerfile 存在
- [ ] README.md 存在

---

## 常见问题

### 问题1：git push 提示 "Permission denied"

**解决：**
```cmd
# 配置 Git 账号
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"

# 或者使用 token
git remote set-url origin https://你的用户名:token@github.com/你的用户名/visitor-system.git
```

### 问题2：上传后文件显示为 "Binary file"

**解决：**
这是正常的，某些文件会被 GitHub 识别为二进制文件，不影响部署。

### 问题3：中文文件名乱码

**解决：**
```cmd
# 配置 Git 使用 UTF-8
git config --global core.quotepath false
git config --global gui.encoding utf-8
git config --global i18n.commit.encoding utf-8
git config --global i18n.logoutputencoding utf-8
```

---

## 快速检查清单

上传前确认：
- [ ] 已删除 node_modules 文件夹
- [ ] 已删除 database.json 数据文件
- [ ] 没有包含密码或敏感信息的文件

上传后确认：
- [ ] 所有核心代码文件都已上传
- [ ] 部署配置文件都已上传
- [ ] 仓库设置为 Public（免费平台需要）
