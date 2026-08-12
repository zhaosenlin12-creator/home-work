import { NextResponse, type NextRequest } from "next/server";

// 与 src/lib/session.ts 中的 SESSION_COOKIE 保持一致。
// 注意：middleware 运行在 Edge Runtime，不能 import 依赖 node:* 的模块。
const SESSION_COOKIE = "senlin_session";

// 注意：middleware 运行在 Edge Runtime，不能访问 node:sqlite，
// 这里只做轻量 cookie 存在性检查；精确角色校验在页面/API 内部完成。
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源 / 登录页 / API 放行
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // 家长端 / 孩子端都需要登录
  if (
    (pathname.startsWith("/parent") || pathname.startsWith("/kid")) &&
    !token
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
