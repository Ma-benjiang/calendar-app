# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY packages/*/package*.json ./packages/*/
COPY apps/*/package*.json ./apps/*/

# 安装依赖
RUN npm ci

# 复制源码
COPY . .

# 构建应用
RUN npm run build:web

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
