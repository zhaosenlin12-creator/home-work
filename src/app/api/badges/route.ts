import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAnyUser, requireParent, canAccessChild } from "@/lib/auth";
import { trimLen, validateInt } from "@/lib/validate";

// 勋章
// GET  ?childId=            → 全部勋章 + 该孩子已获得（家长/孩子均可，校验归属）
// POST                     → 家长创建新勋章 { name, description, icon }
// DELETE ?id=              → 家长删除勋章（仅未分发的可删，已分发的级联清理记录）

export async function GET(request: Request) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("childId"));
  const childId = requested || (user.type === "child" ? user.user.id : 0);
  if (!childId || !canAccessChild(childId, user)) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }
  const db = getDb();

  const badges = db.prepare("SELECT * FROM badges ORDER BY id").all() as {
    id: number;
    name: string;
    description: string;
    icon: string;
  }[];
  const earned = db
    .prepare("SELECT badge_id FROM child_badges WHERE child_id = ?")
    .all(childId) as { badge_id: number }[];
  const earnedIds = new Set(earned.map((e) => e.badge_id));

  return NextResponse.json({
    badges: badges.map((b) => ({ ...b, earned: earnedIds.has(b.id) })),
  });
}

export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const name = trimLen(body.name, 30);
  if (!name) return NextResponse.json({ error: "请填写勋章名称（≤30 字）" }, { status: 400 });
  const description = trimLen(body.description, 60) || "";
  const icon = trimLen(body.icon, 40) || "Award";

  const db = getDb();
  const r = db
    .prepare("INSERT INTO badges (name, description, icon) VALUES (?, ?, ?)")
    .run(name, description, icon);
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}

export async function DELETE(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = validateInt(searchParams.get("id"), 1, 1_000_000);
  if (!id) return NextResponse.json({ error: "勋章 ID 无效" }, { status: 400 });

  const db = getDb();
  const badge = db.prepare("SELECT id FROM badges WHERE id = ?").get(id);
  if (!badge) return NextResponse.json({ error: "勋章不存在" }, { status: 404 });

  // 级联清理分发记录
  db.prepare("DELETE FROM child_badges WHERE badge_id = ?").run(id);
  db.prepare("DELETE FROM badges WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
