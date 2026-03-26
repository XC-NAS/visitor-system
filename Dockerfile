# 使用 Alpine 版本减小镜像体积（适合免费平台）
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY server/package*.json ./server/
RUN cd server && npm install --production

# 复制代码
COPY server/ ./server/
COPY public/ ./public/

# 创建数据目录
RUN mkdir -p /app/server/data

# 暴露端口
EXPOSE 3000

# 工作目录
WORKDIR /app/server

# 启动
CMD ["node", "server.js"]
