# 多阶段构建
# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端package文件
COPY client/package*.json ./

# 安装前端依赖
RUN npm ci --only=production

# 复制前端源码
COPY client/ ./

# 构建前端
RUN npm run build

# 阶段2: 构建后端
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# 复制后端package文件
COPY server/package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端源码
COPY server/ ./

# 阶段3: 生产环境
FROM node:18-alpine AS production

# 创建应用用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# 创建必要的目录
RUN mkdir -p logs uploads && \
    chown -R appuser:appgroup /app

# 从构建阶段复制文件
COPY --from=backend-builder --chown=appuser:appgroup /app/server ./server
COPY --from=frontend-builder --chown=appuser:appgroup /app/client/dist ./client/dist

# 切换到应用用户
USER appuser

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["node", "server/index.js"]