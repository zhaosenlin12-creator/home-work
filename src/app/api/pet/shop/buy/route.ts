import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { PET_CATALOG } from "@/lib/pet-catalog";

// 商城购买：POST /api/pet/shop/buy { childId?, species }
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: unknown; species?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const species = String(body.species || "");
  const meta = PET_CATALOG.find((s) => s.key === species);
  if (!meta) return NextResponse.json({ error: "宠物种类不存在" }, { status: 400 });

  const db = getDb();
  const childRow = db.prepare("SELECT points FROM children WHERE id = ?").get(childId) as
    | { points: number }
    | undefined;
  if (!childRow) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  const owned = db
    .prepare("SELECT id FROM pets WHERE child_id = ? AND species = ?")
    .get(childId, species);
  if (owned) return NextResponse.json({ error: "已经拥有该宠物" }, { status: 400 });

  const doneTasks = db
    .prepare("SELECT COUNT(*) AS c FROM tasks WHERE child_id = ? AND status = 'done'")
    .get(childId) as { c: number };
  if (doneTasks.c < meta.requireTasks) {
    return NextResponse.json(
      { error: `需累计完成 ${meta.requireTasks} 个任务才能解锁` },
      { status: 400 }
    );
  }
  if (childRow.points < meta.price) {
    return NextResponse.json({ error: "积分不足" }, { status: 400 });
  }

  // 原子扣积分 + 购买
  db.exec("BEGIN");
  try {
    const r = db
      .prepare("UPDATE children SET points = points - ? WHERE id = ? AND points >= ?")
      .run(meta.price, childId, meta.price);
    if (r.changes !== 1) {
      db.exec("ROLLBACK");
      return NextResponse.json({ error: "积分不足" }, { status: 400 });
    }
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 20)
        : meta.name;
    const ins = db
      .prepare(
        "INSERT INTO pets (child_id, name, species, is_active, source) VALUES (?, ?, ?, 0, 'shop')"
      )
      .run(childId, name, species);
    // 若孩子还没有激活宠物，激活新买的
    const hasActive = db
      .prepare("SELECT id FROM pets WHERE child_id = ? AND is_active = 1")
      .get(childId);
    if (!hasActive) {
      db.prepare("UPDATE pets SET is_active = 1 WHERE id = ?").run(Number(ins.lastInsertRowid));
    }
    db.exec("COMMIT");
    return NextResponse.json({ ok: true, id: Number(ins.lastInsertRowid), name });
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}