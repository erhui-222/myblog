# 个人博客系统 技术方案（TECH_DESIGN）

> 配套文档：`memory-bank/PRD.md`（V1.1）
> 本文回答「怎么做」，PRD 回答「做什么」。

| 项目 | 内容 |
| --- | --- |
| 文档版本 | V1.0 |
| 编写日期 | 2026-11-08 |
| 适用阶段 | MVP 第一期 |

---

## 1. 技术选型

### 1.1 最终选型

| 层次 | 选型 | 版本基线 | 选择理由 |
| --- | --- | --- | --- |
| 框架 | **Next.js（App Router）** | 15.x | 一个进程同时提供 SSR 页面和 JSON 接口，天然满足 PRD 的 SSR + 真实 404 + SEO；RSC 让首页/详情页零客户端 JS 即可渲染 |
| 语言 | **TypeScript** | 5.x | 前后台共享类型，schema 用 zod 定义后前后端复用，减少字段级返工 |
| UI 库 | **React** | 19.x | 跟框架同生态 |
| 样式 | **Tailwind CSS** | 4.x | 响应式断点是 PRD 的硬需求，用 `md:`/`lg:` 前缀直接表达；避免为二三十个组件写散落的 CSS 文件 |
| 组件基础 | **Radix UI primitives**（按需引入） | - | 只取 Dialog / Toast / Switch 等需要无障碍与焦点管理的交互组件，样式全部自己写；不用完整 shadcn 预设，避免带进一堆积压文件 |
| ORM | **Prisma** | 6.x | schema 单文件可读、迁移可控、类型自动生成 |
| 数据库 | **SQLite**（MVP）→ PostgreSQL（可选迁移） | - | 个人博客是单写者、低并发场景，SQLite 无运维、备份就是一个文件；Prisma schema 保持可迁移写法，需要时切 Postgres |
| 认证 | **自建 Session（数据库表 + HttpOnly Cookie）** | - | 单管理员，不需要 OAuth、不需要多角色；Session 表可主动吊销，比 JWT 更符合「退出即失效」 |
| 密码 | **bcrypt** | - | PRD 4.4 要求，成本因子 12 |
| Markdown | **unified 管线**（remark-parse / remark-gfm / rehype-sanitize / rehype-pretty-code + shiki） | - | 服务端渲染成 HTML，SEO 友好；`rehype-sanitize` 白名单是 PRD 4.4 的 XSS 要求的落点 |
| 编辑器 | **自研 textarea + 分栏实时预览** | - | 不引 CodeMirror/Monaco，MVP 够用；预览复用同一套渲染管线，保证「预览 = 发布后」 |
| 图表 | **纯 SVG 手写环形图** | - | 仪表盘只有一个状态分布图，引 ECharts 不划算 |
| 测试 | **Vitest**（纯函数）+ **Playwright**（主链路） | - | slug、摘要、阅读量去重这类逻辑必须有单测 |
| 部署 | **Docker Compose（app + Caddy）+ 单台 VPS** | - | 一个 Node 进程 + 一个 SQLite 文件 + 一个上传目录，Caddy 自动签发 HTTPS |

### 1.2 被否掉的方案与原因

| 方案 | 否决原因 |
| --- | --- |
| 纯前端 SPA（Vite + React） | 不满足 SEO 与真实 404；PRD 明确要求 SSR |
| 纯静态（Hexo / Astro SSG） | 后台 CRUD 要写数据库，发布后还要触发重建，等于两套数据通路 |
| Vercel + Serverless + Postgres | 最省运维，但 SQLite 无法在 serverless 持久化，图片也只能上对象存储；文件上传与备份链路反而变复杂。作为备选方案保留（见 8.4） |
| NextAuth / Auth.js | 单账号场景下配置量远大于收益 |
| tRPC | 只有一个客户端（自家后台），类型收益不抵引入成本 |
| 全量 shadcn/ui 初始化 | 生成几十个用不到的文件，后续升级痛苦 |

---

## 2. 架构规范

### 2.1 分层

```
页面 / 路由（app/）
   ↓ 只负责：取数、组装 props、SEO metadata、重定向
Service 层（lib/services/）
   ↓ 只负责：业务规则与数据库访问，不含 HTTP 概念
Prisma（lib/db.ts）
   ↓ 只管连接与查询构造
SQLite
```

**硬性规则**

1. `app/` 下的文件里**不出现 Prisma 查询**，一律调 service。
2. Service 函数**不接收 `Request`/`Response`**，只接普通参数，便于单测与复用（页面、API 路由共用同一函数）。
3. 组件**不直接 fetch 自己的数据**（除预览、上传这类纯客户端交互），数据由页面传入。
4. 跨端共享的纯函数（摘要、阅读时长、slug 规则）放 `lib/`，前后端都可 import。

### 2.2 服务端优先

- 默认全部是 Server Component。
- 只有需要状态/事件的文件才加 `'use client'`：`MobileMenu`、`MarkdownEditor`、`ArticleForm`、`ArticleToolbar`、`ConfirmDialog`、`Toast`。
- 客户端组件通过 props 接收初始数据，不自己拉接口（除长列表翻页）。

### 2.3 渲染策略（按页面定）

| 页面 | 策略 | 原因 |
| --- | --- | --- |
| 首页 | 动态 SSR | 文章随时发布，需要即时可见；分页参数在 query 里 |
| 文章详情 | 动态 SSR（不强缓存） | 阅读量计数需要在服务端按请求执行；单站流量小，DB 查询成本可忽略 |
| 关于我 | 静态化（`revalidate = 3600`） | 内容来自配置文件，随部署变化 |
| 后台全部页面 | 动态 | 全部依赖会话 |
| 预览页 | 动态 + `noindex` | token 校验不可缓存 |

### 2.4 鉴权边界（关键设计）

Next.js 的 `middleware.ts` 运行在 Edge 运行时，**没有 Prisma**，无法查 Session 表。因此：

| 层 | 职责 | 能否作为安全边界 |
| --- | --- | --- |
| `middleware.ts` | 只判断「有没有 session cookie」，无则重定向登录页 | ❌ 仅体验优化，不能当安全措施 |
| `app/admin/layout.tsx` | 服务端调 `requireAdmin()` 查库校验会话，失败 `redirect` | ✅ 页面层拦截 |
| 每个 `/api/admin/*` Route Handler | 调 `requireAdmin()`，失败返回 **401 JSON** | ✅ 真正的安全边界 |

这样 PRD 3.9 与 F4 验收里「退出后调用任意后台接口返回 401」才成立。

### 2.5 校验与错误

- 所有写操作入参用 **zod schema** 校验（`lib/validation/post.ts`），前端表单复用同一 schema 做即时校验。
- API 统一响应信封：

```ts
// 成功
{ ok: true, data: T }
// 失败
{ ok: false, error: { code: string; message: string; fields?: Record<string,string> } }
```

- 错误码：`UNAUTHORIZED`(401) / `FORBIDDEN`(403) / `NOT_FOUND`(404) / `VALIDATION_FAILED`(422) / `SLUG_CONFLICT`(409) / `RATE_LIMITED`(429) / `INTERNAL`(500)。
- 页面级异常用 `error.tsx` + `not-found.tsx`；不在页面里 try/catch 吞错误。

### 2.6 编码约定

| 项 | 约定 |
| --- | --- |
| 组件文件 | PascalCase（`ArticleCard.tsx`） |
| 其他文件 | kebab-case（`reading-time.ts`） |
| 组件目录 | 一个组件一个文件，同名 props 类型 `XxxProps` 就地定义 |
| 样式 | 只用 Tailwind 类，不写 `style={{}}`；动态值用 CSS 变量 |
| 环境变量 | 集中在 `lib/env.ts` 用 zod 校验启动时读取，缺变量直接启动失败 |
| 提交 | Conventional Commits（`feat:` / `fix:` / `refactor:`） |
| 分支 | `main` 保护 + `feat/*` |

---

## 3. 项目目录结构

```
myblog/
├── app/
│   ├── layout.tsx                    根布局：字体、全局样式、<html lang="zh-CN">
│   ├── globals.css                   Tailwind 入口 + 主题变量
│   ├── page.tsx                      首页（?page=n）
│   ├── not-found.tsx                 404（返回真实 404 状态）
│   ├── error.tsx                     全局错误边界
│   ├── sitemap.ts                    动态生成 sitemap.xml
│   ├── robots.ts                     robots.txt
│   │
│   ├── posts/[slug]/
│   │   ├── page.tsx                  文章详情（SSR，计数，404）
│   │   └── opengraph-image.tsx       可选：OG 图
│   │
│   ├── about/page.tsx                关于我（读 lib/site-config.ts）
│   │
│   ├── preview/[slug]/page.tsx       草稿预览（token 校验 + noindex）
│   │
│   ├── admin/
│   │   ├── layout.tsx                后台外壳 + requireAdmin()
│   │   ├── page.tsx                  仪表盘
│   │   ├── login/page.tsx            登录（独立视觉，不套外壳）
│   │   ├── posts/
│   │   │   ├── page.tsx              文章列表（searchParams 驱动）
│   │   │   ├── new/page.tsx          新建
│   │   │   └── [id]/edit/page.tsx    编辑
│   │   └── trash/page.tsx            回收站
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts        POST 登录
│       │   └── logout/route.ts       POST 退出
│       ├── admin/
│       │   ├── posts/route.ts                 GET 列表 / POST 新建
│       │   ├── posts/[id]/route.ts            GET / PATCH / DELETE（软删）
│       │   ├── posts/[id]/preview-token/route.ts   POST 签发预览 token
│       │   ├── posts/[id]/restore/route.ts    POST 恢复
│       │   ├── trash/route.ts                 GET 回收站列表
│       │   ├── trash/[id]/route.ts            DELETE 彻底删除
│       │   ├── stats/route.ts                 GET 仪表盘统计
│       │   └── upload/route.ts                POST 封面上传
│       └── view/[slug]/route.ts      POST 阅读上报（备用：前端 beacon）
│
├── components/
│   ├── site/          SiteHeader / NavMenu / MobileMenu / HeroSection /
│   │                  ArticleList / ArticleCard / Pagination / SiteFooter / EmptyState
│   ├── article/       ArticleHeader / MarkdownRenderer / CodeBlock / ImageFigure /
│   │                  TocSidebar / ReadingProgress / ArticleNav / ShareButton
│   ├── about/         ProfileCard / SkillTags / Timeline / ContactList
│   ├── admin/         AdminShell / SideNav / AdminTopbar / StatCard / StatGrid /
│   │                  StatusDonut / RecentArticleTable / QuickActions /
│   │                  ArticleToolbar / SearchInput / StatusFilter / ArticleTable /
│   │                  StatusBadge / RowActions / ConfirmDialog / DangerConfirmDialog /
│   │                  ArticleForm / TitleInput / SlugInput / SummaryTextarea /
│   │                  CoverUploader / MarkdownEditor / StatusSwitch / FormActions /
│   │                  TrashTable / RestoreButton
│   ├── common/        LoadingSkeleton / NotFound / Toast
│   └── ui/            Button / Input / Textarea / Dialog / Badge / Skeleton / Switch
│
├── lib/
│   ├── db.ts                     Prisma 单例（dev 热更不重复连接）
│   ├── env.ts                    环境变量 zod 校验
│   ├── auth.ts                  createSession / getSession / requireAdmin / destroySession
│   ├── slug.ts                   拼音生成 + 唯一化 + 合法性校验
│   ├── excerpt.ts                自动摘要（120 字、句末截断）
│   ├── reading-time.ts           阅读时长估算
│   ├── markdown.ts               unified 渲染管线（服务端 → HTML 字符串）
│   ├── views.ts                  阅读量去重计数
│   ├── preview-token.ts          token 签发与校验
│   ├── rate-limit.ts             登录失败限流
│   ├── site-config.ts            站点与「关于我」内容
│   ├── validation/              zod schema（post / login / query）
│   └── services/
│       ├── posts.ts              文章 CRUD、列表查询、上一篇/下一篇
│       ├── stats.ts              仪表盘聚合
│       └── admin.ts              管理员初始化与密码同步
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   └── uploads/                 封面图（生产挂 Docker volume）
│
├── scripts/
│   ├── backup.sh                SQLite 热备份 + 上传目录同步 + 7 天轮转
│   └── seed.ts                  可选：写几篇示例文章
│
├── middleware.ts                 粗筛 cookie（非安全边界）
├── instrumentation.ts            启动时初始化管理员账号
├── Dockerfile
├── docker-compose.yml
├── Caddyfile
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

---

## 4. 路由设计

### 4.1 页面路由

| 路径 | 页面 | 渲染 | 鉴权 | 说明 |
| --- | --- | --- | --- | --- |
| `/` | 首页 | 动态 SSR | 公开 | `?page=1`，每页 10 条 |
| `/posts/[slug]` | 文章详情 | 动态 SSR | 公开 | 非 `published` 或已删除 → HTTP 404 |
| `/about` | 关于我 | 静态化 1h | 公开 | 内容来自配置文件 |
| `/preview/[slug]?t=` | 草稿预览 | 动态 | 有效 token | `noindex`；已发布文章跳正式页 |
| `/admin/login` | 登录 | 静态 | 公开 | 已登录则跳 `/admin` |
| `/admin` | 仪表盘 | 动态 | 需登录 | 默认落地页 |
| `/admin/posts` | 文章列表 | 动态 | 需登录 | `?keyword=&status=&sort=&page=&pageSize=` |
| `/admin/posts/new` | 新建文章 | 动态 | 需登录 | 默认草稿 |
| `/admin/posts/[id]/edit` | 编辑文章 | 动态 | 需登录 | 用 id 而非 slug（slug 会变） |
| `/admin/trash` | 回收站 | 动态 | 需登录 | |

**约定**

- 后台编辑用 `id`，前台访问用 `slug`。这样改 slug 不会让后台书签失效。
- 列表页所有筛选条件放 `searchParams`，页面服务端直接读，天然可分享、可刷新复现（满足 PRD F6 规则 11）。
- 未登录访问 `/admin/**`：middleware 粗筛 + `admin/layout.tsx` 兜底 `redirect('/admin/login?from=原路径')`。

### 4.2 API 路由

| 方法 | 路径 | 用途 | 失败码 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 账号密码换会话 | 401 / 422 / 429 |
| POST | `/api/auth/logout` | 销毁会话 | - |
| GET | `/api/admin/posts` | 列表（分页/筛选/排序） | 401 |
| POST | `/api/admin/posts` | 新建 | 401 / 422 / 409 |
| GET | `/api/admin/posts/:id` | 单篇（编辑页回填） | 401 / 404 |
| PATCH | `/api/admin/posts/:id` | 更新 | 401 / 404 / 422 / 409 |
| DELETE | `/api/admin/posts/:id` | 软删除 | 401 / 404 |
| POST | `/api/admin/posts/:id/preview-token` | 签发预览 token（2h） | 401 / 404 |
| POST | `/api/admin/posts/:id/restore` | 从回收站恢复 | 401 / 404 / 409 |
| GET | `/api/admin/trash` | 回收站列表 | 401 |
| DELETE | `/api/admin/trash/:id` | 彻底删除（需 `confirmTitle`） | 401 / 404 / 422 |
| GET | `/api/admin/stats` | 仪表盘聚合数据 | 401 |
| POST | `/api/admin/upload` | 封面上传 | 401 / 422 |
| POST | `/api/view/:slug` | 阅读上报（前端 beacon 备用） | 静默失败 |

### 4.3 为什么不直接用 Server Actions

PRD 3.9 与 F4 验收要求「无会话调用后台接口返回 401」。Server Actions 不是标准 HTTP 接口，无法表达 401 语义，也不方便以后用脚本/CLI 批量导入文章。因此**写操作统一走 Route Handler**，读操作（页面数据）走 RSC 直连 service。代价是多写一层薄路由，换来行为可预测与可测试。

---

## 5. 数据库 Schema

### 5.1 Prisma 定义

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"          // 迁移到 Postgres 时改 provider + DATABASE_URL
  url      = env("DATABASE_URL")
}

// 管理员（单账号，启动时由环境变量同步）
model AdminUser {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// 会话（数据库存储，可主动吊销）
model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique          // 存 SHA-256，不存明文
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([expiresAt])
}

// 文章
model Post {
  id            String    @id @default(cuid())
  title         String
  slug          String    @unique
  summary       String?               // 为空时按规则自动生成
  content       String                // Markdown 原文
  coverUrl      String?
  status        String    @default("DRAFT")   // "DRAFT" | "PUBLISHED"，见 5.3
  publishedAt   DateTime?             // 首次发布写入，此后不重置
  views         Int       @default(0)

  previewTokenHash      String?       // 预览 token 哈希
  previewTokenExpiresAt DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?             // 软删除；非空即已删除

  viewLogs      PostViewLog[]

  @@index([status, deletedAt, publishedAt])   // 首页列表
  @@index([deletedAt, updatedAt])             // 后台列表
  @@index([deletedAt, deletedAt])             // 回收站
}

// 阅读去重（30 分钟桶）
model PostViewLog {
  id        String   @id @default(cuid())
  postId    String
  ipHash    String                    // SHA-256(ip + 盐)，不存明文 IP
  bucket    Int                       // floor(now / 30min)
  createdAt DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, ipHash, bucket])   // 同一 30 分钟内重复访问被唯一约束拦掉
  @@index([postId, createdAt])
}

// 登录尝试（限流）
model LoginAttempt {
  id        String   @id @default(cuid())
  ip        String
  success   Boolean
  createdAt DateTime @default(now())

  @@index([ip, createdAt])
}
```

### 5.2 表与 PRD 条款对应

| 表 | 支撑的 PRD 条款 |
| --- | --- |
| `AdminUser` | F4 单账号、F4-8 密码哈希、B5 环境变量初始化 |
| `Session` | F4-4 登录态 7 天、F4-6 退出即失效 |
| `Post` | F1/F2/F6 全部；`slug` → `/posts/{slug}`；`publishedAt` 首次写入不重置；`deletedAt` 软删除 |
| `PostViewLog` + `Post.views` | F5-2 阅读量、3.8 计数规则（30 分钟去重） |
| `LoginAttempt` | F4-7 5 次 / 10 分钟锁定 |

### 5.3 两个必须知道的取舍

**① SQLite 没有 enum 类型**，Prisma 在 SQLite 下不支持 `enum`。因此 `status` 用 `String`，取值约束放在应用层 zod（`z.enum(['DRAFT','PUBLISHED'])`）。迁移到 Postgres 时再改回原生 enum，数据无需转换。

**② SQLite 的 `LIKE` 对 ASCII 天然忽略大小写**，中文不存在大小写问题，所以搜索直接用 `contains` 即可，**不要**写 `mode: 'insensitive'`（SQLite 下会报错）。这与 PRD F6 规则 9「无需分词，中英文均适用」一致。

### 5.4 常用查询口径

```ts
// 用户端列表：已发布且未删除
where: { status: 'PUBLISHED', deletedAt: null }

// 后台列表：未删除
where: { deletedAt: null }

// 回收站
where: { deletedAt: { not: null } }

// 仪表盘「本月新增」：按创建时间，排除已删除
where: { createdAt: { gte: startOfMonth }, deletedAt: null }

// 上一篇 / 下一篇：按 publishedAt 相邻
prev: publishedAt < 当前, 取最新一条
next: publishedAt > 当前, 取最早一条
```

---

## 6. 关键实现细节

### 6.1 Markdown 渲染管线

```
Markdown 原文
  → remark-parse         解析
  → remark-gfm           表格 / 任务列表 / 删除线
  → remark-rehype        转 HTML AST
  → rehype-slug          给标题加 id（供 TOC 锚点）
  → rehype-pretty-code   shiki 代码高亮（服务端）
  → rehype-sanitize      白名单过滤（XSS）
  → rehype-stringify     输出 HTML 字符串
```

- 目录（TOC）复用同一管线的标题抽取结果，不在客户端二次解析。
- 预览页与详情页**共用同一个 `renderMarkdown()`**，保证「预览所见 = 发布后」。
- `rehype-sanitize` 需放宽 `code`/`pre` 的 `className`（shiki 输出）与 `img` 的 `loading`。

### 6.2 slug 生成

1. 标题 → 拼音（`pinyin-pro`，保留英文与数字）→ 小写 → 非字母数字转 `-` → 合并连续 `-` → 去首尾 `-`。
2. 规则：只用 `[a-z0-9-]`，长度 1–80；空结果（纯符号标题）回退为 `post-{时间戳}`。
3. 唯一性：查库，冲突则追加 `-2`、`-3`…（最多尝试 50 次兜底加随机后缀）。
4. **生成后不随标题变化**；用户手动改动时，若文章已发布则前端弹「旧链接将失效」确认（PRD 3.9）。

### 6.3 摘要与阅读时长

```ts
// excerpt.ts：120 字，句末标点优先截断
// 1) 去 front-matter、代码块、图片、链接语法，只留纯文本
// 2) 取前 120 字
// 3) 从第 120 字往前找最近的 。！？.!?，找到则截断并保留该标点
// 4) 无标点则硬截 120 字 + "…"

// reading-time.ts：中文字符数 + 英文单词数，/300，向上取整，最小 1
```

两处均有单测，覆盖：纯中文、纯英文、中英混排、超长无标点、含代码块。

### 6.4 阅读量计数

```ts
// lib/views.ts
async function recordView(postId: string, ip: string) {
  const bucket = Math.floor(Date.now() / (30 * 60 * 1000));
  const ipHash = sha256(ip + env.IP_SALT);
  try {
    await prisma.$transaction([
      prisma.postViewLog.create({ data: { postId, ipHash, bucket } }),
      prisma.post.update({ where: { id: postId }, data: { views: { increment: 1 } } }),
    ]);
  } catch (e) {
    // P2002 唯一约束冲突 = 30 分钟内重复访问，静默忽略
  }
}
```

- 在详情页 SSR 渲染时调用，`await` 失败不阻塞页面（`catch` 后返回页面）。
- 取 IP：`x-forwarded-for` 首段（需 Caddy 透传），无则用 `x-real-ip`，都无则跳过计数。
- 若以后上 CDN 缓存，改为前端 `navigator.sendBeacon('/api/view/:slug')`，逻辑不变。

### 6.5 预览 token

```
POST /api/admin/posts/:id/preview-token
  → 生成 32 字节随机串，DB 存 SHA-256，expiresAt = now + 2h
  → 返回 /preview/{slug}?t={明文}
访问 /preview/[slug]?t=
  → 比对 hash + 未过期 + 文章未删除 → 渲染
  → 否则渲染 410「预览链接已过期，请重新预览」
  → 页面 metadata: robots: { index: false, follow: false }
```

### 6.6 会话与限流

- 登录成功：生成随机 token → DB 存 hash + 7 天过期 → `Set-Cookie: blog_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`。
- `requireAdmin()`：读 cookie → 查 Session（含过期校验）→ 无则 API 返 401 / 页面 redirect。
- 限流：查该 IP 最近 10 分钟的 `LoginAttempt`，失败 ≥5 次则直接返回 429，不再校验密码。

### 6.7 管理员初始化

`instrumentation.ts` 的 `register()` 中执行（服务启动一次）：

```ts
const { ADMIN_USERNAME, ADMIN_PASSWORD } = env;
const existing = await prisma.adminUser.findUnique({ where: { username: ADMIN_USERNAME } });
if (!existing) {
  await prisma.adminUser.create({ data: { username, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) } });
} else if (!(await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash))) {
  // 环境变量里的密码变了 → 视为重置
  await prisma.adminUser.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) } });
}
```

逻辑幂等，容器每次重启都跑；改密码 = 改环境变量 + 重启（与 PRD F4 规则 2 一致）。

---

## 7. 实现步骤

> 每一步都以「可跑通、可验收」为结束标准，不做半成品堆叠。

### M0 骨架与数据层（1 天）

1. `create-next-app`（TS + Tailwind + App Router），配置 ESLint / Prettier / 路径别名。
2. 装 Prisma，写 `schema.prisma`，跑首次 migration，`lib/db.ts` 单例。
3. `lib/env.ts` 用 zod 校验环境变量；`.env.example` 补全。
4. 写 `instrumentation.ts` 完成管理员初始化。
5. 空壳页面全建出来（首页 / 详情 / 关于 / 登录 / 后台四页），先返回占位文字，确保路由不 404。
6. **验收**：`npm run dev` 能打开所有路由；容器重启后管理员账号存在且能查到；`npx prisma studio` 能看到四张表。

### M1 用户端只读链路（2 天）

1. `lib/markdown.ts` 渲染管线 + `MarkdownRenderer` / `CodeBlock` / `ImageFigure` / `TocSidebar`。
2. `lib/site-config.ts` 写站点与「关于我」内容；`/about` 页面 + 四个组件。
3. `lib/excerpt.ts`、`lib/reading-time.ts` + 单测。
4. 文章详情页：`generateMetadata`、404 分支、上下篇、计数调用。
5. 首页：Hero、卡片列表、分页、骨架、空状态。
6. 手动往库里插 3 篇样例文章（含代码块 / 表格 / 图片），跑通视觉。
7. **验收**：PRD 3.1/3.2/3.3 的全部验收要点；`view-source` 能看到正文 HTML（证明 SSR 生效）。

### M2 认证 + 后台读写（3 天）

1. `/api/auth/login|logout`，bcrypt 校验、Session 写入、限流。
2. `middleware.ts` 粗筛 + `admin/layout.tsx` 的 `requireAdmin()`。
3. 登录页（含错误态、锁定态、loading）。
4. 后台外壳：`AdminShell` / `SideNav` / `AdminTopbar`（含移动端抽屉）。
5. 文章列表：`ArticleToolbar` + `ArticleTable`，searchParams 驱动筛选/排序/分页。
6. 文章表单：`ArticleForm` 全字段 + `SlugInput`（自动生成 + 冲突校验）+ `MarkdownEditor`（分栏预览）+ `CoverUploader` + `/api/admin/upload`。
7. 新建 / 编辑 / 删除（软删）+ `ConfirmDialog`。
8. 预览：`preview-token` 接口 + `/preview/[slug]` 页。
9. **验收**：PRD F6 全部验收要点；一条完整链路「写作 → 预览 → 发布 → 前台可见 → 改标题链接不变 → 删除 → 前台 404」。

### M3 统计 + 回收站（1.5 天）

1. `lib/services/stats.ts` 聚合查询 + `/api/admin/stats`。
2. 仪表盘：五个指标卡、`StatusDonut`、最近文章表、快捷入口角标。
3. 回收站：列表、恢复（slug 冲突处理）、彻底删除（输入标题确认）、30 天清理（启动时扫一次即可，不必上 cron）。
4. `views` 计数接入详情页，验证去重与累加。
5. **验收**：PRD F5 / F7 验收要点；数字与列表逐项对得上。

### M4 打磨与上线（2 天）

1. 响应式：375 / 768 / 1024 / 1440 四档逐页过一遍，后台表格在 <768 转卡片。
2. 状态覆盖：骨架、空、错误、404、loading 按钮、Toast。
3. 无障碍：label 关联、焦点样式、键盘可达、对比度。
4. SEO：`sitemap.ts`、`robots.ts`、canonical、OG 标签、`noindex` 范围。
5. Playwright 三条主链路：登录、发布并前台可见、删除并恢复。
6. Dockerfile + compose + Caddy + 备份脚本，本机跑一遍完整容器。
7. **验收**：PRD 4.1.5 响应式验收 + 上线检查清单（见 8.5）。

---

## 8. 部署方案

### 8.1 拓扑

```
Internet
   │  443 / 80
   ▼
Caddy（容器，自动申请与续期 TLS）
   │  反代到 3000
   ▼
Next.js（容器，standalone 输出）
   ├── SQLite 文件  /app/data/blog.db      ┐
   └── 上传目录     /app/public/uploads    ┘→ 挂载宿主机目录（Docker volume）
                                                  │
                                          每日 cron 备份 → /var/backups/myblog（保留 7 天）
```

### 8.2 关键配置

**Dockerfile（要点）**

```dockerfile
FROM node:22-alpine AS deps
# 安装依赖（含 prisma generate）

FROM node:22-alpine AS builder
# next build（next.config.ts 设 output: 'standalone'）

FROM node:22-alpine AS runner
# 只拷 .next/standalone + .next/static + public + prisma
# 启动前执行 prisma migrate deploy
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

**docker-compose.yml（要点）**

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./data/db:/app/data          # SQLite
      - ./data/uploads:/app/public/uploads
    environment:
      DATABASE_URL: file:/app/data/blog.db
      TZ: Asia/Shanghai

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
```

**Caddyfile**

```
你的域名 {
  encode gzip zstd
  reverse_proxy app:3000
}
```

Caddy 自动签发与续期 Let's Encrypt 证书，不需要额外配 certbot。

### 8.3 环境变量

```env
DATABASE_URL="file:./data/blog.db"
SITE_URL="https://你的域名"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="换成强密码"
IP_SALT="随机 32 字节"
UPLOAD_MAX_MB="5"
TZ="Asia/Shanghai"
```

### 8.4 备选：不想运维服务器

| 方案 | 组成 | 代价 |
| --- | --- | --- |
| Vercel + Neon Postgres + 对象存储 | 改 `provider = "postgresql"`，封面传 S3/R2 | 改动小，但 SQLite → Postgres 要重跑 migration；上传改直传 |
| Vercel + Turso（远程 SQLite） | Prisma 接 Turso，代码几乎不变 | 多一个外部依赖；连接延迟略高 |

MVP 建议先用 8.1 的单机方案：一台 2C2G 轻量云服务器足够，成本最低、备份最简单（就是拷文件）。

### 8.5 上线检查清单

- [ ] 域名解析生效，HTTPS 可访问，HTTP 自动跳转
- [ ] `.env` 中无默认密码，`SESSION`/`IP_SALT` 已换成随机值
- [ ] 后台登录成功、错误密码 5 次被锁定
- [ ] 建一篇含代码块与图片的文章 → 预览 → 发布 → 前台可见
- [ ] 修改标题后 URL 不变；修改 slug 后旧链接 404
- [ ] 草稿与已删除文章在前台返回真实 404
- [ ] 阅读量重复刷新只 +1；仪表盘数字与列表一致
- [ ] 删除 → 回收站 → 恢复，全流程通过
- [ ] 375px 真机打开，无横向滚动
- [ ] `sitemap.xml` / `robots.txt` 可访问，预览页带 `noindex`
- [ ] 备份脚本执行成功，`/var/backups/myblog` 有当日文件
- [ ] 容器重启后数据与登录态符合预期（会话 7 天）
- [ ] 服务器防火墙只开放 80/443/22

---

## 9. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| SQLite 单写者锁 | 高并发写入时 `SQLITE_BUSY` | 个人博客写入频率极低；开启 WAL 模式，Prisma 设 `busy_timeout` |
| 详情页动态渲染 | 流量大时 DB 压力 | 个人站可忽略；需要时加 CDN + 前端 beacon 计数 |
| 改 slug 导致旧链接失效 | 分享出去的链接 404 | 已在编辑页强提示；二期可加 `slug_history` 表做 301 |
| 图片存本地 | 换机迁移需同步两个目录 | 备份脚本同时打包 `uploads`；二期可迁对象存储 |
| 无自动化内容备份到云端 | 服务器故障丢数据 | 备份脚本可加 `rclone` 推到对象存储，成本接近 0 |
| 单管理员账号无二次验证 | 密码泄露即失守 | MVP 靠强密码 + 限流；二期可加 TOTP |
