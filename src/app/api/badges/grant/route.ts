import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent, canAccessChild } from "@/lib/auth";
import { validateInt } from "@/lib/validate";

// 勋章分发
// POST   /api/badges/grant  { childId, badgeId }      → 给某孩子分发勋章
// DELETE /api/badges/grant?childId=&badgeId=          → 撤销某孩子勋章

export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const childId = validateInt(body.childId, 1, 1_000_000);
  const badgeId = validateInt(body.badgeId, 1, 1_000_000);
  if (!childId || !badgeId) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }
  if (!canAccessChild(childId, { type: "parent", user: parent })) {
    return NextResponse.json({ error: "无权操作该孩子" }, { status: 403 });
  }

  const db = getDb();
  const badge = db.prepare("SELECT id FROM badges WHERE id = ?").get(badgeId);
  if (!badge) return NextResponse.json({ error: "勋章不存在" }, { status: 404 });

  const exists = db
    .prepare("SELECT id FROM child_badges WHERE child_id = ? AND badge_id = ?")
    .get(childId, badgeId);
  if (exists) {
    return NextResponse.json({ error: "该孩子已拥有此勋章" }, { status: 400 });
  }

  db.prepare("INSERT INTO child_badges (child_id, badge_id) VALUES (?, ?)").run(
    childId,
    badgeId
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const childId = validateInt(searchParams.get("childId"), 1, 1_000_000);
  const badgeId = validateInt(searchParams.get("badgeId"), 1, 1_000_000);
  if (!childId || !badgeId) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }
  if (!canAccessChild(childId, { type: "parent", user: parent })) {
    return NextResponse.json({ error: "无权操作该孩子" }, { status: 403 });
  }

  const db = getDb();
  db.prepare("DELETE FROM child_badges WHERE child_id = ? AND badge_id = ?").run(
    childId,
    badgeId
  );
  return NextResponse.json({ ok: true });
}
