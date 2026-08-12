import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { CROP_REWARD } from "@/lib/garden-shop";

// 收获：POST /api/garden/harvest { childId?, plotIndex | plantId }
//  满级 + 未收获 → 加积分，删除植物（地空）
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
  let row: { id: number; stage: number; plant_type: string; harvested: number } | undefined;
  if (Number.isInteger(body.plotIndex) && Number(body.plotIndex) >= 0) {
    row = db
      .prepare(
        "SELECT id, stage, plant_type, harvested FROM garden_plants WHERE child_id = ? AND plot_index = ?"
      )
      .get(childId, Number(body.plotIndex)) as typeof row;
  } else if (Number(body.plantId)) {
    row = db
      .prepare(
        "SELECT id, stage, plant_type, harvested FROM garden_plants WHERE id = ? AND child_id = ?"
      )
      .get(Number(body.plantId), childId) as typeof row;
  }
  if (!row) return NextResponse.json({ error: "植物不存在" }, { status: 404 });
  if (row.harvested === 1)
    return NextResponse.json({ error: "已经收获过啦" }, { status: 400 });
  if (row.stage < 5)
    return NextResponse.json({ error: "还没长到最大级，继续加油！" }, { status: 400 });

  const reward = CROP_REWARD[row.plant_type]?.reward ?? 20;
  const cropName = CROP_REWARD[row.plant_type]?.name ?? row.plant_type;

  withTransaction(db, () => {
    db.prepare(
      "UPDATE garden_plants SET harvested = 1, harvested_at = datetime('now') WHERE id = ?"
    ).run(row!.id);
    db.prepare("UPDATE children SET points = points + ? WHERE id = ?").run(reward, childId);
  });

  return NextResponse.json({
    ok: true,
    plantId: row.id,
    plantType: row.plant_type,
    cropName,
    reward,
  });
}