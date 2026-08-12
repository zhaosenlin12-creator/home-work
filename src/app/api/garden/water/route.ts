import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";

// 浇水：POST /api/garden/water  { childId?, plotIndex | plantId }  → 植物升级
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: { childId?: number; plantId?: number; plotIndex?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }

  const db = getDb();
  let row: { id: number; stage: number } | undefined;
  if (Number.isInteger(body.plotIndex) && Number(body.plotIndex) >= 0) {
    row = db
      .prepare(
        "SELECT id, stage FROM garden_plants WHERE child_id = ? AND plot_index = ?"
      )
      .get(childId, Number(body.plotIndex)) as { id: number; stage: number } | undefined;
  } else if (Number(body.plantId)) {
    row = db
      .prepare(
        "SELECT id, stage FROM garden_plants WHERE id = ? AND child_id = ?"
      )
      .get(Number(body.plantId), childId) as { id: number; stage: number } | undefined;
  }
  if (!row) return NextResponse.json({ error: "植物不存在" }, { status: 404 });

  const nextStage = Math.min(5, row.stage + 1);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  db.prepare("UPDATE garden_plants SET stage = ?, watered_at = ? WHERE id = ?").run(
    nextStage,
    now,
    row.id
  );
  return NextResponse.json({ ok: true, stage: nextStage, plantId: row.id });
}
