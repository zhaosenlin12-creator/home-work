import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { validateInt } from "@/lib/validate";

// 孩子兑换奖励：POST /api/rewards/claim  { childId?, rewardId }
// 原子化条件 UPDATE：防并发超扣 + 防负数积分漏洞
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: unknown; rewardId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = validateInt(body.childId, 1, 1_000_000) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const rewardId = validateInt(body.rewardId, 1, 1_000_000);
  if (!rewardId) return NextResponse.json({ error: "缺少奖励" }, { status: 400 });

  const db = getDb();
  const reward = db.prepare("SELECT id, cost, title, parent_id FROM rewards WHERE id = ?").get(rewardId) as
    | { id: number; cost: number; title: string; parent_id: number }
    | undefined;
  if (!reward) return NextResponse.json({ error: "奖励不存在" }, { status: 404 });

  const childRow = db.prepare("SELECT id, points, parent_id FROM children WHERE id = ?").get(childId) as
    | { id: number; points: number; parent_id: number }
    | undefined;
  if (!childRow) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  // 奖励必须属于该孩子的家长（防跨家庭兑换）
  if (reward.parent_id !== childRow.parent_id) {
    return NextResponse.json({ error: "奖励不可用" }, { status: 403 });
  }
  if (childRow.points < reward.cost) {
    return NextResponse.json({ error: "积分不足" }, { status: 400 });
  }

  // 原子化：UPDATE ... WHERE points >= cost，防止并发兑换超扣
  const ok = withTransaction(db, () => {
    const r = db
      .prepare("UPDATE children SET points = points - ? WHERE id = ? AND points >= ?")
      .run(reward.cost, childId, reward.cost);
    if (r.changes !== 1) return false;
    db.prepare("INSERT INTO reward_claims (child_id, reward_id) VALUES (?, ?)").run(
      childId,
      rewardId
    );
    return true;
  });

  if (!ok) return NextResponse.json({ error: "积分不足" }, { status: 400 });
  return NextResponse.json({ ok: true, title: reward.title });
}