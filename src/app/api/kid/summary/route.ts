import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 孩子端首页聚合：GET ?childId=（仅孩子，只能看自己）
export async function GET(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("childId"));
  const childId = requested || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }
  const db = getDb();

  const childRow = db.prepare("SELECT * FROM children WHERE id = ?").get(childId);
  if (!childRow) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  const todoCount = db
    .prepare("SELECT COUNT(*) AS c FROM tasks WHERE child_id = ? AND status = 'todo'")
    .get(childId) as { c: number };
  const today = new Date().toISOString().slice(0, 10);
  const todayDone = db
    .prepare(
      "SELECT COUNT(*) AS c FROM tasks WHERE child_id = ? AND status = 'done' AND (due_date = ? OR created_at LIKE ?)"
    )
    .get(childId, today, `${today}%`) as { c: number };
  let pet = db.prepare("SELECT * FROM pets WHERE child_id = ? AND is_active = 1").get(childId) as any;
  // 如果 avatar_image 为空，根据 species 生成默认图片
  if (pet && !pet.avatar_image) {
    const speciesLower = (pet.species || '').toLowerCase();
    if (speciesLower === 'panda') {
      pet.avatar_image = '/pets/cwk/PANDA/1.webp';
    } else if (speciesLower === 'cat') {
      pet.avatar_image = '/pets/cats/10500000385.jpg';
    } else if (speciesLower === 'rabbit') {
      pet.avatar_image = '/pets/rabbits/10001.jpg';
    } else {
      pet.avatar_image = '/pets/cwk/PANDA/1.webp'; // 默认
    }
  }
  const plants = db.prepare("SELECT * FROM garden_plants WHERE child_id = ?").get(childId);
  const badgeCount = db
    .prepare("SELECT COUNT(*) AS c FROM child_badges WHERE child_id = ?")
    .get(childId) as { c: number };

  return NextResponse.json({
    child: childRow,
    todoCount: todoCount.c,
    todayDone: todayDone.c,
    pet: pet ?? null,
    plants: plants ?? null,
    badgeCount: badgeCount.c,
  });
}