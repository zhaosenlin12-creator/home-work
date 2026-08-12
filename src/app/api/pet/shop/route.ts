import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { speciesImage, PET_CATALOG } from "@/lib/pet-catalog";

type Owned = { id: number; species: string; is_active: number; level: number };

// 宠物商城：GET /api/pet/shop （目录 + 拥有状态 + 可购判断）
export async function GET(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const childId = Number(searchParams.get("childId")) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }

  const db = getDb();
  const owned = db
    .prepare("SELECT id, species, is_active, level FROM pets WHERE child_id = ?")
    .all(childId) as Owned[];
  const ownedSpecies = new Set(owned.map((p) => p.species));
  const doneTasks = db
    .prepare("SELECT COUNT(*) AS c FROM tasks WHERE child_id = ? AND status = 'done'")
    .get(childId) as { c: number };
  const childRow = db
    .prepare("SELECT points FROM children WHERE id = ?")
    .get(childId) as { points: number };

  const catalog = PET_CATALOG.map((meta) => {
    const ownedPet = owned.find((p) => p.species === meta.key);
    return {
      ...meta,
      image: speciesImage(meta.key),
      owned: !!ownedPet,
      isActive: ownedPet?.is_active === 1,
      ownedLevel: ownedPet?.level ?? 0,
      affordable: childRow.points >= meta.price,
      tasksOk: doneTasks.c >= meta.requireTasks,
    };
  });

  return NextResponse.json({
    catalog,
    points: childRow.points,
    doneTasks: doneTasks.c,
  });
}
