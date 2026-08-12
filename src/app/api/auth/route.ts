import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { trimLen } from "@/lib/validate";

export async function POST(request: Request) {
  let body: { mode?: unknown; username?: unknown; name?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const mode = trimLen(body.mode, 10);
  const username = trimLen(body.username, 50);
  const name = trimLen(body.name, 30);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }
  // 企业级：限制登录请求体大小防御（密码过长拒绝，避免 hash 耗时放大）
  if (password.length > 128) {
    return NextResponse.json({ error: "密码过长" }, { status: 400 });
  }

  const db = getDb();

  if (mode === "parent") {
    if (!username) {
      return NextResponse.json({ error: "请输入用户名" }, { status: 400 });
    }
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as
      | { id: number; username: string; password_hash: string; name: string }
      | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }
    await createSession("parent", user.id);
    return NextResponse.json({ ok: true, type: "parent", name: user.name });
  }

  if (mode === "child") {
    if (!name) {
      return NextResponse.json({ error: "请选择/输入孩子名字" }, { status: 400 });
    }
    const child = db
      .prepare("SELECT * FROM children WHERE name = ?")
      .get(name) as
      | { id: number; name: string; password_hash: string }
      | undefined;
    if (!child || !verifyPassword(password, child.password_hash)) {
      return NextResponse.json({ error: "孩子名字或密码错误" }, { status: 401 });
    }
    await createSession("child", child.id);
    return NextResponse.json({ ok: true, type: "child", name: child.name });
  }

  return NextResponse.json({ error: "登录方式不正确" }, { status: 400 });
}
