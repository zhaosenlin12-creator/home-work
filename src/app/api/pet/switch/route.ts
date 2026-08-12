import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { validateInt } from "@/lib/validate";

// 切换激活宠物：POST /api/pet/switch { childId?, petId }
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: unknown; petId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const petId = validateInt(body.petId, 1, 1_000_000);
  if (!petId) return NextResponse.json({ error: "缺少宠物" }, { status: 400 });

  const db = getDb();
  const pet = db
    .prepare("SELECT id, child_id FROM pets WHERE id = ? AND child_id = ?")
    .get(petId, childId);
  if (!pet) return NextResponse.json({ error: "宠物不存在" }, { status: 404 });

  db.prepare("UPDATE pets SET is_active = 0 WHERE child_id = ?").run(childId);
  db.prepare("UPDATE pets SET is_active = 1 WHERE id = ?").run(petId);
  return NextResponse.json({ ok: true });
}