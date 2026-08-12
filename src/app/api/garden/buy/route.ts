import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { FERTILIZER_ITEMS } from "@/lib/garden-shop";

// 花园商店：POST /api/garden/buy  { childId?, itemKey, quantity? }
//  扣积分 + 加库存（肥料袋等）
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: { childId?: number; itemKey?: string; quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const itemKey = String(body.itemKey || "");
  const item = (FERTILIZER_ITEMS as Record<string, typeof FERTILIZER_ITEMS.fertilizer>)[itemKey];
  if (!item) return NextResponse.json({ error: "道具不存在" }, { status: 400 });
  const quantity = Math.max(1, Math.min(99, Number(body.quantity) || 1));
  const totalCost = item.cost * quantity;

  const db = getDb();
  // 前置校验
  const childRow = db
    .prepare("SELECT points FROM children WHERE id = ?")
    .get(childId) as { points: number } | undefined;
  if (!childRow) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  if (childRow.points < totalCost) {
    return NextResponse.json(
      { error: `积分不足（需要 ${totalCost}，当前 ${childRow.points}）` },
      { status: 400 }
    );
  }

  const result = withTransaction(db, () => {
    const r = db
      .prepare("UPDATE children SET points = points - ? WHERE id = ? AND points >= ?")
      .run(totalCost, childId, totalCost);
    if (r.changes !== 1) throw new Error("积分不足"); // 理论上不会走到（前置已校验）
    db.prepare(
      "INSERT INTO garden_inventory (child_id, item_key, count) VALUES (?, ?, ?) ON CONFLICT(child_id, item_key) DO UPDATE SET count = count + ?"
    ).run(childId, item.key, quantity, quantity);
    const inv = db
      .prepare(
        "SELECT count FROM garden_inventory WHERE child_id = ? AND item_key = ?"
      )
      .get(childId, item.key) as { count: number };
    return { itemKey: item.key, quantity, totalCost, count: inv.count };
  });
  return NextResponse.json({ ok: true, ...result });
}
