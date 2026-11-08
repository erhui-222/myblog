# WORKBUDDY.md

本文件是本仓库的**协作契约**。任何在本仓库工作的 agent（或人）动手前先读这里，它规定了技术栈、架构红线、编码约定和完成标准。

---

## 1. 这是什么

一个个人博客系统：**用户端**（首页 / 文章详情 / 关于我，公开访问）+ **博主管理后台**（登录 / 仪表盘 / 文章管理 / 回收站）。

单作者、单管理员、低并发。`POST` 只由一个人写，读的人是访客。**任何设计决策都优先服从「一个人长期维护得动」**，不要为想象中的规模提前架构。

## 2. 先读什么

| 文档 | 内容 | 什么时候读 |
| --- | --- | --- |
| `memory-bank/PRD.md` | 做什么：功能清单、业务规则、页面组件、验收要点 | 动手前必读对应章节 |
| `memory-bank/TECH_DESIGN.md` | 怎么做：选型理由、Schema、接口表、算法细节、部署 | 涉及结构决策时读 |

两份文档冲突时以 **PRD 为准**（需求优先），并在实现后回写修正文档，不要默默按代码走。

## 3. 当前状态

> 截至 2026-11-08：**文档阶段完成，代码尚未初始化**。仓库里只有 `memory-bank/` 两份文档。

下一个动作是 **M0**（见第 12 节）。执行 M0 前不要假设 `package.json`、`prisma/`、`app/` 存在。

## 4. 技术栈（已定，不要替换）

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | Next.js 15 App Router | 一个进程出 SSR 页面 + JSON 接口 |
| 语言 | TypeScript（strict） | 不用 `any`，不关 `strictNullChecks` |
| UI | React 19 + Tailwind CSS 4 | 只用 Tailwind 类，不写 `style={{}}` |
| 交互组件 | Radix UI primitives（按需） | 只取 Dialog / Toast / Switch 等，**不要**全量初始化 shadcn |
| ORM | Prisma 6 | SQLite（`provider = "sqlite"`） |
| 数据库 | SQLite + WAL | 备份用 `VACUUM INTO` |
| 认证 | 自建 Session 表 + HttpOnly Cookie | 不用 NextAuth / JWT |
| 密码 | bcrypt（cost 12） | |
| Markdown | unified 管线（remark-gfm / rehype-slug / rehype-pretty-code + shiki / rehype-sanitize） | 服务端渲染成 HTML |
| 编辑器 | 自研 textarea + 分栏预览 | 不引 Monaco / CodeMirror |
| 图表 | 纯 SVG 手写 | 只有一张环形图，不引 ECharts |
| 测试 | Vitest（纯函数）+ Playwright（主链路） | |
| 部署 | Docker Compose（app + Caddy）+ 单台 VPS | |

**新增任何依赖前先问一句：现有栈能不能做？** 能就不加。加要说明理由并记进 `TECH_DESIGN.md` 的选型表。

## 5. 常用命令

```bash
npm run dev              # 本地开发
npm run build            # 生产构建
npm run lint             # ESLint
npm run test             # Vitest
npm run test:e2e         # Playwright
npx prisma migrate dev   # 改完 schema 后建迁移
npx prisma generate      # 生成 client
npx prisma studio        # 看数据
npx prisma migrate deploy   # 生产环境应用迁移（容器启动时自动跑）
```

## 6. 目录职责

```
app/            页面与路由，只负责取数、组装 props、metadata、重定向
  api/          Route Handlers，唯一对外写入口
components/     site(前台) / article(正文) / about / admin(后台) / ui(通用原子)
lib/            纯函数与横切能力：db auth slug excerpt markdown views env
  services/     业务规则与数据库访问，页面和 API 共用
prisma/         schema + migrations
scripts/        backup.sh seed.ts
```

## 7. 架构铁律

违反其中任何一条，代码就是错的，不是「风格问题」。

1. **`app/` 里不出现 `prisma.*`**。所有查询走 `lib/services/`，页面只调 service 函数。
2. **service 不接收 `Request` / `Response`**。只收普通参数（`{ slug, page }`），返回普通对象。这样页面、API、脚本能共用。
3. **`middleware.ts` 不是安全边界**。Edge 运行时连不上数据库，它只能判断 cookie 是否存在并做重定向。真正的鉴权是 `app/admin/layout.tsx` 里的 `requireAdmin()` 和每个 `/api/admin/*` 里的会话校验（返回 401）。
4. **写操作走 Route Handler，不用 Server Actions**。PRD 要求 401 语义，Server Action 表达不了。
5. **渲染策略按页面固定**：首页/详情/后台/预览 = 动态 SSR；关于我 = `revalidate = 3600`。不要随意加 `force-static` 或全页缓存——详情页缓存会让阅读量统计失真。
6. **前台用 `slug` 定位文章，后台用 `id`**。后台路由用 slug 会因 slug 可变导致书签失效。
7. **默认 Server Component**。只有需要状态/事件的组件才加 `'use client'`：`MobileMenu`、`MarkdownEditor`、`ArticleForm`、`ArticleToolbar`、`ConfirmDialog`、`Toast`。客户端组件不自己拉数据（长列表翻页除外）。

## 8. 数据层约定与已知坑

这三条是真踩过会浪费半天的问题，实现时直接照做。

| 坑 | 正确做法 |
| --- | --- |
| SQLite 不支持 `enum` | `status` 用 `String`，取值 `'DRAFT' \| 'PUBLISHED'`，约束放 zod（`lib/validation/post.ts`）。迁 Postgres 时再转原生 enum |
| SQLite 不支持 `mode: 'insensitive'` | 搜索直接 `contains`。SQLite 的 `LIKE` 对 ASCII 本就忽略大小写，中文无大小写概念 |
| 备份不能直接 `cp` 数据库文件 | WAL 模式下会拷到不一致快照，必须 `sqlite3 db "VACUUM INTO '...'"` |

**阅读量去重**用时间桶，不要写定时任务或范围查询：

```ts
const bucket = Math.floor(Date.now() / (30 * 60 * 1000));
// PostViewLog 上建 @@unique([postId, ipHash, bucket])
// 插入撞唯一约束（P2002）= 30 分钟内重复访问 → 捕获并忽略，不 increment views
```

**必须遵守的字段语义**（PRD 有验收项）：

- `publishedAt`：首次从草稿变已发布时写入，**之后改回草稿再发布不重置**。首页排序靠它。
- `deletedAt`：非空即为已删除（进回收站），所有前台查询必须带 `deletedAt: null`。
- `views`：只增不减，仅彻底删除时随记录消失。

## 9. 接口约定

统一信封，不要各写各的：

```ts
{ ok: true,  data: T }
{ ok: false, error: { code: string; message: string; fields?: Record<string, string> } }
```

错误码固定这几个：`UNAUTHORIZED`(401) `FORBIDDEN`(403) `NOT_FOUND`(404) `SLUG_CONFLICT`(409) `VALIDATION_FAILED`(422) `RATE_LIMITED`(429) `INTERNAL`(500)。

- 入参一律 zod 校验，**前端表单复用同一个 schema**，不写第二套规则。
- 页面级异常用 `app/error.tsx` 和 `app/not-found.tsx`，不在页面里 try/catch 吞掉错误。
- 前台访问非 `published` 或已删除文章，必须返回**真实 HTTP 404 状态码**，不能渲染 200 的空壳页。

## 10. 编码约定

| 项 | 约定 |
| --- | --- |
| 组件文件 | PascalCase，`ArticleCard.tsx`，一个组件一个文件 |
| 其他文件 | kebab-case，`reading-time.ts` |
| Props 类型 | 就地定义 `XxxProps`，不建全局 types 大杂烩 |
| 样式 | 只写 Tailwind 类；动态值走 CSS 变量，不拼字符串类名 |
| 文案 | 面向用户的中文，简体；不用英文占位符交付 |
| 时区 | 统一 `Asia/Shanghai`，时间展示 `YYYY-MM-DD HH:mm` |
| 环境变量 | 全部经 `lib/env.ts` 用 zod 校验；缺失即启动失败，不写 `process.env.X!` |
| 注释 | 只写「为什么」，不写「是什么」；不为显而易见的代码加注释 |

## 11. Git 与流程

- 提交信息用 Conventional Commits：`feat: 后台文章列表支持关键词搜索`、`fix: 修正阅读量重复计数`。
- 一个里程碑一个分支：`feat/m0-scaffold`、`feat/m1-public-site`；合并前 `npm run build` 必须通过。
- **不要提交**：`.env`、`data/`、`public/uploads/`、`*.db`、`node_modules`。这些必须进 `.gitignore`。
- 不要用 `--no-verify` 跳过钩子；钩子报错就修根因。

## 12. 里程碑与完成定义

| 阶段 | 目标 | 验收方式 |
| --- | --- | --- |
| M0 | 骨架 + Prisma 建表 + 环境变量 + 管理员初始化 + 全部空壳路由 | 每个路由能打开；重启后管理员仍在；`prisma studio` 见四张表 |
| M1 | 用户端只读：Markdown 渲染 → 详情 → 首页 → 关于我 | `view-source` 能看到正文 HTML；PRD 3.1–3.3 验收要点全过 |
| M2 | 登录 + 后台外壳 + 列表筛选 + 表单 + 预览 + 软删除 | 「写作→预览→发布→前台可见→改标题链接不变→删除→404」跑通 |
| M3 | 统计聚合 + 阅读量 + 回收站 | 仪表盘数字与列表逐项对得上 |
| M4 | 响应式四档 + 异常态 + SEO + 容器化 | 上线检查清单 13 项全过 |

**任何任务算「完成」，必须同时满足：**

1. `npm run build` 通过，无 TS 报错、无 ESLint 错误。
2. 对应 PRD 章节的验收要点逐条自查过，不是「看起来能用」。
3. 在 375px 和 1440px 各看过一眼，无横向滚动、无元素重叠。
4. 涉及数据变更的，回写了 `memory-bank/` 里对应的文档。

## 13. 不要做的事

- ❌ 不要引入微服务、消息队列、Redis、GraphQL、tRPC——这个项目不需要。
- ❌ 不要为了「好看」删掉 PRD 里的规则（比如把 404 改成软 404 提示页）。
- ❌ 不要在未经确认的情况下改数据库已有字段语义（`publishedAt` / `deletedAt` / `views`）。
- ❌ 不要在前端存 token 到 localStorage —— 会话走 HttpOnly Cookie。
- ❌ 不要用 `any` 或 `@ts-ignore` 糊过类型错误。
- ❌ 不要直接 `rm` 生产数据目录或执行无备份的迁移。

## 14. 需要决策时

遇到 PRD 未覆盖、且影响数据结构或用户可见行为的问题：**先按 PRD 的既有倾向选最简方案做，同时在提交说明里标注假设**，然后提醒用户回写 `PRD.md`。不要为了等确认停住不动，也不要不打招呼地扩大范围。
