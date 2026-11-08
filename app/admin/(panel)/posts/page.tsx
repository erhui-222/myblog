import { ArticleToolbar } from "@/components/admin/ArticleToolbar";
import { RowActions } from "@/components/admin/RowActions";
import { EmptyState } from "@/components/site/EmptyState";
import { Pagination } from "@/components/site/Pagination";
import { formatDateTime } from "@/lib/format";
import { adminList } from "@/lib/services/posts";
import { listQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function normalize(raw: SearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const item = Array.isArray(value) ? value[0] : value;
    if (item !== undefined && item !== "") result[key] = item;
  }
  return result;
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = normalize(await searchParams);
  const parsed = listQuerySchema.safeParse(raw);
  const query = parsed.success
    ? parsed.data
    : listQuerySchema.parse({});

  const { rows, total, totalPages, page } = await adminList(query);

  const queryForLinks: Record<string, string | undefined> = {
    keyword: query.keyword || undefined,
    status: query.status === "ALL" ? undefined : query.status,
    sort: query.sort,
    order: query.order,
    pageSize: String(query.pageSize),
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">文章管理</h1>
        <p className="mt-1 text-sm text-muted">
          共 {total} 篇{query.keyword ? `（搜索：${query.keyword}）` : ""}
        </p>
      </div>

      <ArticleToolbar />

      {rows.length === 0 ? (
        query.keyword || query.status !== "ALL" ? (
          <EmptyState
            title="没有符合条件的文章"
            description="换个关键词，或者清空筛选条件再看看。"
            actionText="清空筛选"
            actionHref="/admin/posts"
          />
        ) : (
          <EmptyState
            title="还没有文章"
            description="写下第一篇吧，可以先存草稿，预览确认后再发布。"
            actionText="写第一篇文章"
            actionHref="/admin/posts/new"
          />
        )
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-[#faf8f4] text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">标题</th>
                  <th className="w-24 px-3 py-2.5 font-medium">状态</th>
                  <th className="w-20 px-3 py-2.5 text-right font-medium">阅读</th>
                  <th className="w-44 px-3 py-2.5 font-medium">更新时间</th>
                  <th className="w-36 px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((post) => (
                  <tr key={post.id} className="border-b border-line/70 last:border-none hover:bg-[#fcfaf6]">
                    <td className="px-4 py-3">
                      <span className="line-clamp-1 text-ink" title={post.title}>
                        {post.title}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-faint">
                        /posts/{post.slug}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${
                          post.status === "PUBLISHED"
                            ? "bg-[#eaf1ea] text-ok"
                            : "bg-[#f2efe8] text-muted"
                        }`}
                      >
                        {post.status === "PUBLISHED" ? "已发布" : "草稿"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {post.views}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-faint">
                      {formatDateTime(post.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <RowActions
                          id={post.id}
                          slug={post.slug}
                          status={post.status}
                          title={post.title}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((post) => (
              <li key={post.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-medium text-ink">{post.title}</p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${
                      post.status === "PUBLISHED"
                        ? "bg-[#eaf1ea] text-ok"
                        : "bg-[#f2efe8] text-muted"
                    }`}
                  >
                    {post.status === "PUBLISHED" ? "已发布" : "草稿"}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-faint">
                  {post.views} 阅读 · {formatDateTime(post.updatedAt)}
                </p>
                <div className="mt-3 border-t border-line/70 pt-2">
                  <RowActions
                    id={post.id}
                    slug={post.slug}
                    status={post.status}
                    title={post.title}
                  />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/admin/posts"
            searchParams={queryForLinks}
          />
        </>
      )}
    </div>
  );
}
