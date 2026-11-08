# MyBlog

个人博客系统：公开的用户端 + 只给博主用的管理后台。

- 用户端：首页（文章列表 / 分页）、文章详情（Markdown 渲染、目录、代码高亮）、关于我
- 后台：登录、仪表盘（文章与阅读量统计）、文章管理（增删改查 + 草稿预览）、回收站

需求见 `memory-bank/PRD.md`，技术方案见 `memory-bank/TECH_DESIGN.md`，协作约定见 `WORKBUDDY.md`。

## 技术栈

Next.js 15（App Router / SSR）+ TypeScript + Tailwind CSS 4 + Prisma 6 + Postgres
生产部署在 Vercel，图片存 Vercel Blob；也可用 Docker 自托管。

## 本地启动

需要一个 Postgres。最简单的方式是用仓库自带的 compose 文件起一个：

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres 监听 5433
npm install
cp .env.example .env        # 本地把 DATABASE_URL 指向 localhost:5433
npx prisma migrate dev      # 建库建表
npm run dev                 # http://localhost:3000
```

管理员账号在服务启动时按 `.env` 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 自动创建；改密码 = 改环境变量后重启。

封面图走 Vercel Blob，本地开发需要先 `npx vercel link && npx vercel env pull .env.local` 拿到 `BLOB_READ_WRITE_TOKEN`；不传图不影响其他功能。

| 地址 | 说明 |
| --- | --- |
| `/` | 首页 |
| `/posts/{slug}` | 文章详情 |
| `/about` | 关于我 |
| `/admin` | 后台（未登录会跳登录页） |

## 常用命令

```bash
npm run dev         # 开发
npm run build       # 构建（含 prisma generate）
npm start           # 生产启动
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npx prisma studio   # 看数据
```

## 部署

**Vercel（推荐）**

1. Vercel 导入仓库，框架选 Next.js（构建命令无需改，`build` 已含 `prisma generate`）
2. Storage 里创建 Neon Postgres，自动注入 `DATABASE_URL`（池化）与 `DATABASE_URL_UNPOOLED`（直连）
3. Storage 里创建 Blob store，**access 选 Public**，勾选 Development 环境
4. 配置 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `IP_SALT` / `CRON_SECRET` / `SITE_URL`
5. 首次部署前在本地执行 `DATABASE_URL="<直连串>" npx prisma migrate deploy` 建表
6. 回收站清理由 `vercel.json` 的 cron 每天 03:00 调用 `/api/cron/purge`

**Docker 自托管（备选）**

```bash
cp .env.example .env        # 填 SITE_URL / POSTGRES_PASSWORD / 强密码 / IP_SALT
docker compose up -d --build
```

- `app` 跑 Next.js，`db` 是 Postgres，`caddy` 负责 HTTPS 与反向代理，改 `Caddyfile` 里的域名即可。
- 数据落在 `pgdata` 卷，容器重建不丢。备份用 `pg_dump`，`scripts/backup.sh` 是 SQLite 版本的，切库后需改写。

## 目录

```
app/(site)/     用户端页面
app/admin/      后台（login 独立，其余在 (panel) 分组里统一鉴权与外壳）
app/api/        JSON 接口（写操作入口）
components/     site / article / about / admin
lib/            db auth slug excerpt markdown views services
prisma/         schema 与迁移
```
