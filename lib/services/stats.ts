import { prisma } from "../db";

export type DashboardStats = {
  total: number;
  published: number;
  draft: number;
  monthNew: number;
  totalViews: number;
  averageViews: number;
  trashCount: number;
  recent: {
    id: string;
    title: string;
    status: string;
    views: number;
    updatedAt: Date;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const alive = { deletedAt: null };

  const [total, published, draft, monthNew, viewsAgg, trashCount, recent] = await Promise.all([
    prisma.post.count({ where: alive }),
    prisma.post.count({ where: { ...alive, status: "PUBLISHED" } }),
    prisma.post.count({ where: { ...alive, status: "DRAFT" } }),
    prisma.post.count({ where: { ...alive, createdAt: { gte: monthStart } } }),
    prisma.post.aggregate({ where: alive, _sum: { views: true } }),
    prisma.post.count({ where: { deletedAt: { not: null } } }),
    prisma.post.findMany({
      where: alive,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, views: true, updatedAt: true },
    }),
  ]);

  const totalViews = viewsAgg._sum.views ?? 0;

  return {
    total,
    published,
    draft,
    monthNew,
    totalViews,
    averageViews: published === 0 ? 0 : Math.round(totalViews / published),
    trashCount,
    recent,
  };
}
