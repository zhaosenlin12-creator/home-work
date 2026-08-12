import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";

// 施肥：POST /api/garden/fertilize  { childId?, plotIndex | plantId }
//  扣 1 袋 fertilizer，让植物 stage+1（上限 5）
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: { childId?: number; plotIndex?: number; plantId?: number };
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
  // 事务外前置校验，避免 withTransaction throw 变 500
  const inv = db
    .prepare(
      "SELECT count FROM garden_inventory WHERE child_id = ? AND item_key = 'fertilizer'"
    )
    .get(childId) as { count: number } | undefined;
  const count = inv?.count ?? 0;
  if (count < 1) return NextResponse.json({ error: "肥料不足，先去商店买吧" }, { status: 400 });

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
  if (row.stage >= 5) return NextResponse.json({ error: "已长到最大级，不需要施肥" }, { status: 400 });

  const nextStage = row.stage + 1;
  withTransaction(db, () => {
    db.prepare("UPDATE garden_plants SET stage = ? WHERE id = ?").run(nextStage, row.id);
    db.prepare(
      "UPDATE garden_inventory SET count = count - 1 WHERE child_id = ? AND item_key = 'fertilizer'"
    ).run(childId);
  });
  return NextResponse.json({ ok: true, stage: nextStage, plantId: row.id, count: count - 1 });
}
