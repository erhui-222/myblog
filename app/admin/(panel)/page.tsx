import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { StatusDonut } from "@/components/admin/StatusDonut";
import { EmptyState } from "@/components/site/EmptyState";
import { formatDateTime } from "@/lib/format";
import { getDashboardStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">仪表盘</h1>
          <p className="mt-1 text-sm text-muted">内容概况与阅读情况</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/posts/new"
            className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm text-paper transition-opacity hover:opacity-90"
          >
            写新文章
          </Link>
          <Link
            href="/admin/posts"
            className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm text-muted transition-colors hover:text-ink"
          >
            文章管理
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="文章总数" value={stats.total} hint="不含回收站" />
        <StatCard label="已发布" value={stats.published} hint="访客可见" />
        <StatCard label="草稿" value={stats.draft} hint="仅自己可见" />
        <StatCard label="本月新增" value={stats.monthNew} hint="按创建时间统计" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="累计阅读" value={stats.totalViews} hint="按 30 分钟去重" />
        <StatCard label="平均阅读" value={stats.averageViews} hint="累计 / 已发布" />
        <StatCard label="回收站" value={stats.trashCount} hint="30 天后自动清理" />
        <StatCard
          label="待办"
          value={stats.draft === 0 ? "—" : `${stats.draft} 篇草稿`}
          hint="未发布的内容"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-medium text-muted">发布状态分布</h2>
          <StatusDonut published={stats.published} draft={stats.draft} />
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">最近更新</h2>
            <Link href="/admin/posts" className="text-xs text-faint transition-colors hover:text-ink">
              全部 →
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <EmptyState
              title="还没有文章"
              description="从第一篇开始吧，写完可以随时预览再发布。"
              actionText="写第一篇文章"
              actionHref="/admin/posts/new"
            />
          ) : (
            <ul className="divide-y divide-line">
              {stats.recent.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="group flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${
                            post.status === "PUBLISHED"
                              ? "bg-[#eaf1ea] text-ok"
                              : "bg-[#f2efe8] text-muted"
                          }`}
                        >
                          {post.status === "PUBLISHED" ? "已发布" : "草稿"}
                        </span>
                        <span className="truncate text-sm text-ink transition-colors group-hover:text-accent">
                          {post.title}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-faint">
                      {post.views} 阅读 · {formatDateTime(post.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
