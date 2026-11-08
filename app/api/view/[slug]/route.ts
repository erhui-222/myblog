import type { NextRequest } from "next/server";
import { internal, ok } from "@/lib/api";
import { getClientIp } from "@/lib/auth";
import { getPublishedBySlug } from "@/lib/services/posts";
import { recordView } from "@/lib/views";

type RouteContext = { params: Promise<{ slug: string }> };

/** 备用阅读上报入口：上了 CDN 缓存后可改由前端 beacon 调用 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const post = await getPublishedBySlug(slug);
    if (!post) return ok({ counted: false });

    const ip = await getClientIp();
    await recordView(post.id, ip);

    return ok({ counted: true });
  } catch (error) {
    console.error("[api/view/:slug]", error);
    return internal();
  }
}
