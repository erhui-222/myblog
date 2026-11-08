# MyBlog

个人博客系统：公开的用户端 + 只给博主用的管理后台。

- 用户端：首页（文章列表 / 分页）、文章详情（Markdown 渲染、目录、代码高亮）、关于我
- 后台：登录、仪表盘（文章与阅读量统计）、文章管理（增删改查 + 草稿预览）、回收站

需求见 `memory-bank/PRD.md`，技术方案见 `memory-bank/TECH_DESIGN.md`，协作约定见 `WORKBUDDY.md`。

## 技术栈

Next.js 15（App Router / SSR）+ TypeScript + Tailwind CSS 4 + Prisma 6 + SQLite

## 本地启动

```bash
npm install
cp .env.example .env        # 修改 ADMIN_PASSWORD 等
npx prisma migrate dev      # 建库建表
npm run dev                 # http://localhost:3000
```

管理员账号在服务启动时按 `.env` 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 自动创建；改密码 = 改环境变量后重启。

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

```bash
cp .env.example .env        # 填 SITE_URL / 强密码 / IP_SALT
docker compose up -d --build
```

- `app` 容器跑 Next.js（standalone），`caddy` 容器负责 HTTPS 与反向代理，改 `Caddyfile` 里的域名即可。
- 数据落在宿主机 `./data/db`（SQLite）与 `./data/uploads`（封面图），容器重建不丢数据。
- 备份：`scripts/backup.sh` 用 `VACUUM INTO` 生成一致快照，保留 7 份。crontab 示例写在脚本头部。

## 目录

```
app/(site)/     用户端页面
app/admin/      后台（login 独立，其余在 (panel) 分组里统一鉴权与外壳）
app/api/        JSON 接口（写操作入口）
components/     site / article / about / admin
lib/            db auth slug excerpt markdown views services
prisma/         schema 与迁移
```
