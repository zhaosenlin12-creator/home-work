import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";

// 孩子端：完成学习计划打卡
// POST /api/kid/study-plan/checkin { childId?, planId }
//  需要审核：进入待审核状态（暂不加分）
//  无需审核：直接加分
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: { childId?: number; planId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const planId = Number(body.planId);
  if (!planId) return NextResponse.json({ error: "缺少计划" }, { status: 400 });

  const db = getDb();
  // 前置校验：计划存在且属于该孩子且有效
  const plan = db
    .prepare(
      "SELECT id, points, needs_review FROM study_plans WHERE id = ? AND child_id = ? AND active = 1"
    )
    .get(planId, childId) as { id: number; points: number; needs_review: number } | undefined;
  if (!plan) return NextResponse.json({ error: "计划不存在或已停用" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  // 前置校验：是否已打过卡
  const exists = db
    .prepare("SELECT id FROM study_plan_logs WHERE plan_id = ? AND child_id = ? AND done_date = ?")
    .get(planId, childId, today);
  if (exists) {
    return NextResponse.json({ error: "今天已经打过卡啦" }, { status: 400 });
  }

  // 审核制：需要审核的任务进入待审核状态，不立即加分
  const needsReview = plan.needs_review !== 0;
  const status = needsReview ? "pending" : "approved";

  withTransaction(db, () => {
    db.prepare(
      "INSERT INTO study_plan_logs (plan_id, child_id, done_date, status) VALUES (?, ?, ?, ?)"
    ).run(planId, childId, today, status);
    // 无需审核的任务才直接加分
    if (!needsReview) {
      db.prepare("UPDATE children SET points = points + ? WHERE id = ?").run(plan.points, childId);
    }
  });

  if (needsReview) {
    return NextResponse.json({ 
      ok: true, 
      reward: 0, 
      pending: true,
      message: "等待家长审核，审核通过后发放积分",
      date: today 
    });
  }

  return NextResponse.json({ ok: true, reward: plan.points, date: today });
}
