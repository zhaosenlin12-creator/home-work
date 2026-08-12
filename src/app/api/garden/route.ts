import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { GARDEN_PLOTS, SEED_CATALOG } from "@/lib/garden-shop";

// 花园：GET ?childId= / POST 种新植物（仅孩子）
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
  // 默认只显示未收获；?includeHarvested=1 时返回已收获
  const includeHarvested = searchParams.get("includeHarvested") === "1";
  const where = includeHarvested
    ? "WHERE child_id = ?"
    : "WHERE child_id = ? AND harvested = 0";
  const plants = db
    .prepare(
      `SELECT id, plant_type, stage, plot_index, planted_at, watered_at, harvested FROM garden_plants ${where} ORDER BY plot_index, id`
    )
    .all(childId);
  const inventoryRows = db
    .prepare("SELECT item_key, count FROM garden_inventory WHERE child_id = ?")
    .all(childId) as { item_key: string; count: number }[];
  const inventory = Object.fromEntries(
    inventoryRows.map((r) => [r.item_key, r.count])
  );
  return NextResponse.json({ plants, inventory, plots: GARDEN_PLOTS, seedCatalog: SEED_CATALOG });
}

export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: { childId?: number; plantType?: string; plotIndex?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const ALLOWED_PLANTS = ["tree", "sunflower", "flower", "watermelon", "pumpkin", "strawberry"];
  const plantType = ALLOWED_PLANTS.includes(String(body.plantType))
    ? String(body.plantType)
    : "tree";
  const plotIndex = Number.isInteger(body.plotIndex)
    ? Number(body.plotIndex)
    : -1;
  if (plotIndex < 0 || plotIndex >= GARDEN_PLOTS) {
    return NextResponse.json({ error: "无效地块" }, { status: 400 });
  }

  const db = getDb();
  const occupied = db
    .prepare(
      "SELECT id FROM garden_plants WHERE child_id = ? AND plot_index = ? AND harvested = 0"
    )
    .get(childId, plotIndex);
  if (occupied) return NextResponse.json({ error: "该地块已种植植物" }, { status: 400 });

  const id = withTransaction(db, () => {
    const r = db
      .prepare(
        "INSERT INTO garden_plants (child_id, plant_type, stage, plot_index) VALUES (?, ?, 1, ?)"
      )
      .run(childId, plantType, plotIndex);
    return Number(r.lastInsertRowid);
  });
  return NextResponse.json({ ok: true, id });
}