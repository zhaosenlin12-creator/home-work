import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { requiredStr, validateInt } from "@/lib/validate";

// 日记：GET ?childId= 列表；POST 写日记（仅孩子，只能操作自己）
export async function GET(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requested = validateInt(searchParams.get("childId"), 1, 1_000_000);
  const childId = requested || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }

  const diaries = getDb()
    .prepare("SELECT * FROM diaries WHERE child_id = ? ORDER BY created_at DESC")
    .all(childId);
  return NextResponse.json({ diaries });
}

export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: unknown; content?: unknown; mood?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const content = requiredStr(body.content, 5000);
  if (!content) return NextResponse.json({ error: "日记内容不能为空（≤5000 字）" }, { status: 400 });

  const childId = validateInt(body.childId, 1, 1_000_000) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }

  const mood = typeof body.mood === "string" && body.mood.length <= 20 ? body.mood : "happy";
  const result = getDb()
    .prepare("INSERT INTO diaries (child_id, content, mood) VALUES (?, ?, ?)")
    .run(childId, content, mood);

  getDb().prepare("UPDATE children SET points = points + 3 WHERE id = ?").run(childId);
  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}