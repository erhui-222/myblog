# Vercel 部署方案

> 状态：**代码改造已完成，本地验证通过，待 Vercel 侧建库与首次部署**
> 前置文档：`PRD.md`、`TECH_DESIGN.md`
> 决策：数据库用 Vercel Marketplace 的 Neon 集成（自动建 Neon 账号，无需单独注册），图片用 Vercel Blob，Docker 自托管方案保留为备选

## 1. 为什么不能直接部署

当前实现面向「单台 VPS + 常驻进程 + 本地磁盘」，与 Vercel 的 Serverless 模型有三处硬冲突。

| # | 冲突点 | 位置 | 后果 |
|---|---|---|---|
| C1 | SQLite 文件数据库 | `prisma/schema.prisma` | Vercel 文件系统只读，`/tmp` 每次冷启动清空且实例间不共享 → 写入即丢 |
| C2 | 图片写本地磁盘 | `app/api/admin/upload/route.ts` L44 `path.join(process.cwd(), "public", "uploads", ...)` | 同上；且 `public/` 构建后为静态产物，运行时写入无效 |
| C3 | `output: "standalone"` | `next.config.ts` | Docker 专用产物形态，Vercel 不需要 |

另有三处不致命但必须一并处理：上传上限 5MB 高于 Vercel 4.5MB 请求体限制；`purgeExpiredTrash()` 只有定义没有调用点（PRD 承诺的 30 天自动清理实际未生效）；`instrumentation.ts` 的管理员初始化在多实例冷启动下可能并发撞唯一约束。

## 2. 目标架构

```
浏览器
  │
  ▼
Vercel Edge Network
  │
  ▼
Serverless Function (Next.js 15 App Router, Node runtime)
  ├── Prisma ──→ Neon Postgres（pooled 连接串）
  └── @vercel/blob ──→ 对象存储（图片，返回公开 URL）
```

本地开发用 Docker Compose 起 Postgres，与生产同构，避免「本地 SQLite 能跑、上线报错」。

## 3. 改造清单

### 3.1 数据层

| 文件 | 改动 |
|---|---|
| `prisma/schema.prisma` | `provider = "postgresql"`；`datasource` 增加 `directUrl = env("DIRECT_URL")`；`generator` 增加 `binaryTargets = ["native", "rhel-openssl-3.0.x"]` |
| `prisma/migrations/` | 删除现有目录（SQLite 语法 SQL 在 Postgres 上无法执行），用 `prisma migrate dev --name init` 重新生成 |
| `lib/db.ts` | 连接串由 `DATABASE_URL` 提供，工厂函数内不做改动；仅在 Neon 侧确保使用 pooled 地址 |
| `lib/env.ts` | 增加 `DIRECT_URL`、`BLOB_READ_WRITE_TOKEN`、`CRON_SECRET` 的校验（后两者可设为可选） |

表结构**不需要改**：`status` 本就是 String（SQLite 不支持 enum 的妥协），切库后反而更合理；`PostViewLog` 的 `@@unique([postId, ipHash, bucket])` 在 Postgres 上同样成立。

### 3.2 连接池

Serverless 下每个函数实例可能各持一条连接，不加限制会迅速耗尽 Neon 的连接额度。

- 应用运行时用 pooled 地址，追加 `?pgbouncer=true&connection_limit=1&connect_timeout=15`
- 迁移用 `DIRECT_URL`（非 pooled 直连），否则 DDL 在事务池里会挂起
- Neon 控制台可查看当前连接数，部署后应观察一天

### 3.3 图片上传

改用 `@vercel/blob`：

```ts
import { put } from "@vercel/blob";

const ext = ALLOWED.get(file.type);
const blob = await put(`uploads/${year}/${month}/${randomUUID()}.${ext}`, file, {
  access: "public",
  contentType: file.type,
});
return ok({ url: blob.url });
```

要点：

- **Blob store 的 access 必须选 Public**。选 Private 则图片需要签名 URL 才能访问，博客封面会直接裂开
- 数据库 `coverUrl` 存完整 URL，字段与调用方均无需改动
- 上传上限从 5MB 降到 **4MB**，低于平台 4.5MB 限制，让错误由我们返回而不是被平台直接拒掉
- 若后续要支持大图，改用客户端直传（`@vercel/blob/client` 的 `handleUpload`），浏览器直接传 Blob，绕开函数请求体限制
- `UPLOAD_MAX_MB` 的默认值同步改为 4

### 3.4 运行逻辑

| 项 | 处理 |
|---|---|
| `next.config.ts` | 移除 `output: "standalone"`；保留 `poweredByHeader: false` |
| `instrumentation.ts` | 保留，但把唯一约束冲突（P2002）视为正常并静默返回，避免多实例并发时报错刷日志 |
| 回收站清理 | 新增 `app/api/cron/purge/route.ts`，校验 `Authorization: Bearer ${CRON_SECRET}`，调用 `purgeExpiredTrash(30)`；`vercel.json` 配置每日一次 |
| `middleware.ts` | 无需改动，Vercel 原生支持 Edge middleware |
| Cookie | 无需改动，`secure: NODE_ENV === "production"` 在 https 下正确 |

`vercel.json`：

```json
{
  "crons": [{ "path": "/api/cron/purge", "schedule": "0 3 * * *" }]
}
```

Hobby 档 cron 每天最多触发一次，够用；触发请求会自带 `CRON_SECRET` 的 Bearer 头。

## 4. 环境变量

| 变量 | 来源 | 说明 |
|---|---|---|
| `DATABASE_URL` | Neon pooled 连接串 | 应用运行时用，带 `-pooler` 主机名 |
| `DIRECT_URL` | Neon 直连串 | 迁移用，不带 `-pooler` |
| `ADMIN_USERNAME` | 自定 | 管理员账号 |
| `ADMIN_PASSWORD` | 自定，≥8 位 | 首次启动由 instrumentation 建号；改它 = 改密码 |
| `IP_SALT` | 随机串 | 阅读量去重时的 IP 哈希盐，上线后不要再改 |
| `SITE_URL` | `https://your-domain` | sitemap / robots / 绝对链接依赖它 |
| `BLOB_STORE_ID` / `VERCEL_OIDC_TOKEN` / `BLOB_READ_WRITE_TOKEN` | 创建 Blob store 时自动注入 | SDK 默认走 OIDC（前两个，短期自动轮换）；第三个是兼容旧方式的长期静态 token，本地开发或浏览器直传时需要 |
| `CRON_SECRET` | 随机串 | 保护 cron 端点 |

## 5. 部署步骤

1. **建库**：Neon 创建项目，记下 pooled 与直连两个连接串
2. **本地改代码**：按第 3 节改造，`prisma migrate dev` 重新生成迁移
3. **本地验证**：`.env` 指向 Neon，`npm run build && npm start`，跑一遍第 6 节的检查项。**不要跳过这步**，Vercel 上排查问题慢得多
4. **迁移生产库**：`DATABASE_URL=<直连> npx prisma migrate deploy`
5. **推代码**：`git push`（远程已是 SSH）
6. **Vercel 导入**：New Project → 选中仓库，框架自动识别 Next.js，无需改构建命令（`build` 脚本已含 `prisma generate`）。导入页里先展开 Environment Variables 填完第 4 节的变量再点 Deploy，否则首次构建会因缺 `DATABASE_URL` 失败
7. **建 Blob store**：项目 → Storage → Create Storage → Blob → **access 选 Public** → 勾选 Production / Preview / **Development** 三个环境
8. **配环境变量**：按第 4 节逐项填入，`SITE_URL` 先用 `*.vercel.app` 地址
9. **首次部署**：观察构建日志，重点看 Prisma engine 是否被正确打包
10. **冒烟验证**：按第 6 节；本地开发用 `npx vercel env pull .env.local` 拉 Blob 变量
11. **绑域名**：Vercel 添加域名 → 按提示配 DNS；绑定后**回头把 `SITE_URL` 改成正式域名**再重新部署一次，否则 sitemap 里还是旧地址

## 6. 上线验证清单

| # | 检查项 | 预期 |
|---|---|---|
| 1 | 首页 | 200，文章列表正常 |
| 2 | 不存在的 slug | **真实 404**（不是软提示页） |
| 3 | 草稿公开访问 | 404 |
| 4 | 登录 | 正确密码进入，错误密码 401 |
| 5 | 发文 | 保存并发布后，前台立即可见 |
| 6 | 上传封面 | 返回 `https://*.public.blob.vercel-storage.com/...`，图片能显示 |
| 7 | 草稿预览 | token 链接可打开，带 `noindex`，2 小时后失效 |
| 8 | 阅读量 | 同浏览器连续刷新多次，只 +1 |
| 9 | 删除 → 回收站 → 恢复 | 前台 404 → 回收站可见 → 恢复后 200 |
| 10 | 无会话调后台接口 | 401 |
| 11 | cron 端点 | 带正确 Bearer 返回 200，不带返回 401 |
| 12 | `/sitemap.xml` | 域名与环境变量一致 |

## 7. 风险与对策

| 风险 | 说明 | 对策 |
|---|---|---|
| 函数包体积 | shiki 带完整语言定义，冷启动偏慢 | 压缩语言列表到常用十余种；必要时换 `shiki` 的 wasm 精简版 |
| Hobby 调用额度 | 详情页为动态 SSR（请求内累加阅读量），每次访问消耗一次调用 | 阅读量改为客户端 `fetch`，页面走 ISR，静态页不消耗函数调用 |
| 连接数耗尽 | Serverless 并发建立连接 | `connection_limit=1` + Neon pooled；必要时启用 Prisma Accelerate |
| 构建期连库 | 若把 `migrate deploy` 放进 build 脚本，每次构建都连生产库 | 本方案选择**本地手动迁移**，build 只做 `prisma generate` |
| SQLite 旧数据 | 现有 2 篇示例文章在 `data/blog.db` | 个人博客可直接重建；若需迁移，写一次性脚本读 SQLite 写 Postgres |

## 8. 与现有文档的关系

- 本文档**覆盖** `TECH_DESIGN.md` 第 7 节（Docker 部署）作为默认上线路径
- `Dockerfile` / `docker-compose.yml` / `Caddyfile` **保留**，作为自托管备选路径；已同步改为 Postgres 版本（compose 里新增 `db` 服务）
- `scripts/backup.sh` 仍是 SQLite 的 `VACUUM INTO` 写法，自托管时需改写为 `pg_dump`
- 备份责任转移：Vercel 方案下由 Neon 的自动备份与时间点恢复承担，不再需要 `backup.sh`

## 9. 实施记录

已按上述方案改造完成，本地用 Docker Postgres 全链路验证通过。

改动文件：

| 文件 | 改动 |
|---|---|
| `prisma/schema.prisma` | `postgresql` + `directUrl` + `binaryTargets` |
| `prisma/migrations/` | 重新生成为 Postgres DDL |
| `app/api/admin/upload/route.ts` | 改为 `@vercel/blob` 的 `put()`，access=public，缺 token 时给明确提示 |
| `app/api/cron/purge/route.ts` | 新增，Bearer 校验后调用 `purgeExpiredTrash(30)` |
| `vercel.json` | 新增，cron 每天 03:00 |
| `lib/env.ts` | `UPLOAD_MAX_MB` 上限收紧到 4，新增 `CRON_SECRET` |
| `next.config.ts` | `output: "standalone"` 改为仅 `BUILD_TARGET=docker` 时启用 |
| `instrumentation.ts` | 并发冷启动撞 P2002 时静默 |
| `docker-compose.yml` | 降级为备选，新增 `db` 服务与 pgdata 卷 |
| `docker-compose.dev.yml` | 新增，本地开发 Postgres（5433） |

本地验证结果：

| 项 | 结果 |
|---|---|
| `/` / 不存在文章 / `/admin` / 无会话调 API | 200 / 404 / 307 / 401 |
| 管理员自动创建 | Postgres 中已存在 `admin` |
| 登录（正确 / 错误密码） | 200 / 401 |
| 中文标题生成 slug | `Postgres 版本第一篇` → `postgres-ban-ben-di-yi-pian` |
| 代码高亮 | shiki 行内颜色正常 |
| 阅读量连刷 5 次 | `views = 1` |
| 草稿公开访问 / 预览 token | 404 / 200 且 `noindex` |
| 删除 → 回收站 → 恢复 | 404 → 列表可见 → 200 |
| cron 无 token / 带 token | 401 / 200 |
| 单测 | 19 passed |
