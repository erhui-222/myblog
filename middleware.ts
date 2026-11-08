import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "blog_session";

/**
 * 注意：middleware 跑在 Edge 运行时，连不上数据库，只能判断 cookie 是否存在。
 * 它只是体验层的「门帘」，真正的鉴权在 admin/layout.tsx 与各 API 的会话校验里。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = `?from=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
