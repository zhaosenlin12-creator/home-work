import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { requiredStr, validateInt } from "@/lib/validate";

// 奖励列表：GET ?parentId=（家长只能看自己的）
export async function GET(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const parentId = validateInt(searchParams.get("parentId"), 1, 1_000_000) || parent.id;
  if (parentId !== parent.id) {
    return NextResponse.json({ error: "无权查看该家长的奖励" }, { status: 403 });
  }
  const rewards = getDb()
    .prepare("SELECT * FROM rewards WHERE parent_id = ? ORDER BY id")
    .all(parentId);
  return NextResponse.json({ rewards });
}

// 家长配置奖励：POST
export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: { title?: unknown; cost?: unknown; icon?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const title = requiredStr(body.title, 50);
  if (!title) return NextResponse.json({ error: "请填写奖励名称（≤50 字）" }, { status: 400 });
  const cost = validateInt(body.cost, 1, 1_000_000);
  if (!cost) return NextResponse.json({ error: "积分需为 1-1000000 的整数" }, { status: 400 });

  const result = getDb()
    .prepare("INSERT INTO rewards (parent_id, title, cost, icon) VALUES (?, ?, ?, ?)")
    .run(parent.id, title, cost, typeof body.icon === "string" ? body.icon.slice(0, 8) : "🎁");
  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

// 家长删除奖励：DELETE ?id=
export async function DELETE(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = validateInt(searchParams.get("id"), 1, 1_000_000);
  if (!id) return NextResponse.json({ error: "缺少奖励 ID" }, { status: 400 });
  const db = getDb();
  const reward = db.prepare("SELECT parent_id FROM rewards WHERE id = ?").get(id) as
    | { parent_id: number }
    | undefined;
  if (!reward) return NextResponse.json({ error: "奖励不存在" }, { status: 404 });
  if (reward.parent_id !== parent.id) {
    return NextResponse.json({ error: "无权删除该奖励" }, { status: 403 });
  }
  db.prepare("DELETE FROM rewards WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}