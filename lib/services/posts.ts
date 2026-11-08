import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { buildExcerpt } from "../excerpt";
import { estimateReadingMinutes } from "../reading-time";
import { normalizeSlug, slugify } from "../slug";
import type { ListQuery, PostInput } from "../validation";

export const PUBLIC_PAGE_SIZE = 10;

const publishedWhere: Prisma.PostWhereInput = { status: "PUBLISHED", deletedAt: null };

export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  status: string;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  views: number;
  readingMinutes: number;
  deletedAt: Date | null;
};

const listSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  coverUrl: true,
  status: true,
  publishedAt: true,
  updatedAt: true,
  createdAt: true,
  views: true,
  readingMinutes: true,
  deletedAt: true,
} satisfies Prisma.PostSelect;

export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const fallback = `post-${Date.now().toString(36)}`;
  const seed = base || fallback;

  for (let i = 1; i <= 50; i += 1) {
    const candidate = i === 1 ? seed : `${seed}-${i}`;
    const existing = await prisma.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }

  return `${seed}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function listPublished(page: number, pageSize = PUBLIC_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const total = await prisma.post.count({ where: publishedWhere });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(safePage, totalPages);

  const rows = await prisma.post.findMany({
    where: publishedWhere,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: listSelect,
  });

  return { rows, total, totalPages, page: currentPage, pageSize };
}

export async function getPublishedBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { ...publishedWhere, slug },
  });
}

/** 后台预览用：不限制状态，但不允许已删除 */
export async function getPostBySlugAnyStatus(slug: string) {
  return prisma.post.findFirst({ where: { slug, deletedAt: null } });
}

export async function getAdjacentPosts(post: { id: string; publishedAt: Date | null }) {
  if (!post.publishedAt) return { prev: null, next: null };

  const [prev, next] = await Promise.all([
    prisma.post.findFirst({
      where: { ...publishedWhere, publishedAt: { lt: post.publishedAt } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.post.findFirst({
      where: { ...publishedWhere, publishedAt: { gt: post.publishedAt } },
      orderBy: { publishedAt: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  return { prev, next };
}

export async function adminList(query: ListQuery) {
  const where: Prisma.PostWhereInput = { deletedAt: null };

  if (query.status !== "ALL") where.status = query.status;
  if (query.keyword) {
    where.OR = [
      { title: { contains: query.keyword } },
      { summary: { contains: query.keyword } },
    ];
  }

  const orderBy: Prisma.PostOrderByWithRelationInput =
    query.sort === "created"
      ? { createdAt: query.order }
      : query.sort === "views"
        ? { views: query.order }
        : { updatedAt: query.order };

  const total = await prisma.post.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);

  const rows = await prisma.post.findMany({
    where,
    orderBy,
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    select: listSelect,
  });

  return { rows, total, totalPages, page, pageSize: query.pageSize };
}

export async function adminGetById(id: string) {
  return prisma.post.findFirst({ where: { id, deletedAt: null } });
}

export async function createPost(input: PostInput) {
  const slugBase = input.slug ? normalizeSlug(input.slug) : slugify(input.title);
  const slug = await ensureUniqueSlug(slugBase || slugify(input.title));
  const summary = input.summary?.trim() || buildExcerpt(input.content);

  return prisma.post.create({
    data: {
      title: input.title,
      slug,
      summary,
      content: input.content,
      coverUrl: input.coverUrl?.trim() || null,
      status: input.status,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      readingMinutes: estimateReadingMinutes(input.content),
    },
  });
}

export async function updatePost(id: string, input: PostInput) {
  const existing = await prisma.post.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  let slug = existing.slug;
  if (input.slug) {
    const normalized = normalizeSlug(input.slug);
    if (normalized && normalized !== existing.slug) {
      slug = await ensureUniqueSlug(normalized, id);
    }
  }

  // publishedAt 只在「首次从草稿变为已发布」时写入，此后不重置
  const publishNow = input.status === "PUBLISHED" && !existing.publishedAt;

  return prisma.post.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      summary: input.summary?.trim() || buildExcerpt(input.content),
      content: input.content,
      coverUrl: input.coverUrl?.trim() || null,
      status: input.status,
      publishedAt: publishNow ? new Date() : existing.publishedAt,
      readingMinutes: estimateReadingMinutes(input.content),
      previewTokenHash: null,
      previewTokenExpiresAt: null,
    },
  });
}

export async function softDeletePost(id: string) {
  const result = await prisma.post.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), previewTokenHash: null, previewTokenExpiresAt: null },
  });
  return result.count > 0;
}

export async function restorePost(id: string) {
  const post = await prisma.post.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!post) return { ok: false as const, reason: "NOT_FOUND" as const };

  const conflict = await prisma.post.findFirst({
    where: { slug: post.slug, id: { not: id } },
    select: { id: true },
  });

  const slug = conflict ? await ensureUniqueSlug(`${post.slug}-restored`) : post.slug;

  const restored = await prisma.post.update({
    where: { id },
    data: { deletedAt: null, slug },
  });

  return { ok: true as const, post: restored, slugChanged: slug !== post.slug };
}

export async function hardDeletePost(id: string) {
  const post = await prisma.post.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!post) return false;
  await prisma.post.delete({ where: { id } });
  return true;
}

export async function listTrash() {
  return prisma.post.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: listSelect,
  });
}

export async function countTrash() {
  return prisma.post.count({ where: { deletedAt: { not: null } } });
}

/** 定时清理：彻底删除超过 30 天的回收站文章 */
export async function purgeExpiredTrash(days = 30) {
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.post.deleteMany({
    where: { deletedAt: { not: null, lt: before } },
  });
  return result.count;
}
