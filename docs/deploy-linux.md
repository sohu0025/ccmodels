# CC Models 服务器部署指南（Linux）

## 架构说明

- **Server** (NestJS + Fastify) — API 服务 + 静态文件服务
- **Web** (React SPA) — 构建后由 Server 直接托管
- **Shared** — 公共类型/工具包
- **Desktop** — Electron 桌面端（无需部署在服务器）

无需 Nginx 反向代理即可运行（Server 自带静态文件服务），但建议用 Nginx 做 SSL 终止。

---

## 方式一：直接部署（无 Docker）

### 1. 安装依赖

```bash
# Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

# pnpm
corepack enable && corepack prepare pnpm@latest --activate
```

### 2. 克隆项目

```bash
git clone <你的仓库地址> /opt/cc-models
cd /opt/cc-models
```

### 3. 配置环境变量

```bash
cp apps/server/.env.example apps/server/.env
```

编辑 `apps/server/.env`：

```env
# SQLite 数据库（默认，无需额外安装数据库）
DATABASE_URL="file:./data/cc-models.db"

# JWT 密钥 — 务必修改
JWT_SECRET=替换为一个随机字符串

# 服务端口
PORT=3000

# CORS（Web 页面可能通过不同域名访问）
CORS_ORIGINS=https://你的域名.com

# 管理后台密码（首次 seed 时创建管理员账号）
ADMIN_PASSWORD=设置一个安全密码

# Sentry（可选）
SENTRY_DSN=
```

### 4. 构建项目

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 构建 shared 包
pnpm --filter @ccmodels/shared build

# 构建 web SPA
pnpm --filter @ccmodels/web build

# 生成 Prisma 客户端
cd apps/server && npx prisma generate && cd ../..

# 构建 server
pnpm --filter @ccmodels/server build

# 数据库迁移（创建表）
cd apps/server && npx prisma db push && cd ../..
```

### 5. 启动服务

```bash
# 直接启动
node apps/server/dist/main.js

# 或用进程管理器（推荐）
npm install -g pm2
pm2 start apps/server/dist/main.js --name cc-models
pm2 save
pm2 startup  # 按提示执行，设置开机自启
```

---

## 方式二：Docker 部署

### 1. 构建镜像

```bash
cd /opt/cc-models
docker build -t cc-models-server -f apps/server/Dockerfile .
```

### 2. 运行容器

```bash
docker run -d \
  --name cc-models \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/cc-models.db" \
  -e JWT_SECRET="替换为一个随机字符串" \
  -e CORS_ORIGINS="https://你的域名.com" \
  -v cc-models-data:/app/apps/server/data \
  --restart unless-stopped \
  cc-models-server
```

> 注意：SQLite 数据库文件在 `data/` 目录，需要持久化卷。

---

## 方式三：Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/cc-models.db
      - JWT_SECRET=替换为一个随机字符串
      - CORS_ORIGINS=https://你的域名.com
      - PORT=3000
    volumes:
      - cc-models-data:/app/apps/server/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/system-providers"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  cc-models-data:
```

```bash
docker compose up -d
```

---

## Nginx 反向代理（SSL）

```nginx
server {
    listen 443 ssl;
    server_name 你的域名.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

---

## 验证部署

启动后访问：

```
http://服务器IP:3000
```

应看到 Web 页面。API 接口：

```
GET /api/system-providers    — 查看系统供应商列表
POST /api/auth/register      — 注册
POST /api/auth/login          — 登录
GET /api/usage/stats          — 使用统计
```

---

## 数据备份

SQLite 数据库文件位于 `apps/server/data/cc-models.db`，定期备份：

```bash
# 简单备份
cp /opt/cc-models/apps/server/data/cc-models.db /backup/cc-models-$(date +%Y%m%d).db

# Docker 卷备份
docker run --rm -v cc-models-data:/data -v /backup:/backup alpine \
  tar czf /backup/cc-models-data-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 更新

```bash
cd /opt/cc-models
git pull
pnpm install --frozen-lockfile
pnpm --filter @ccmodels/shared build
pnpm --filter @ccmodels/web build
cd apps/server && npx prisma generate && npx prisma db push && cd ../..
pnpm --filter @ccmodels/server build
pm2 restart cc-models
```
