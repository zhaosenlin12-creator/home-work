import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireParent, canAccessChild } from "@/lib/auth";

// 家长端：审核孩子的学习计划打卡
// POST /api/study-plans/review { childId, logId, action: "approve" | "reject" }
export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  
  let body: { childId: number; logId: number; action: "approve" | "reject" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { childId, logId, action } = body;
  if (!childId || !logId || !action) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  if (!canAccessChild(childId, { type: "parent", user: parent })) {
    return NextResponse.json({ error: "无权操作该孩子数据" }, { status: 403 });
  }

  const db = getDb();
  
  // 查询打卡记录
  const log = db.prepare(`
    SELECT l.id, l.plan_id, l.status, p.points, p.child_id
    FROM study_plan_logs l
    JOIN study_plans p ON l.plan_id = p.id
    WHERE l.id = ? AND l.child_id = ?
  `).get(logId, childId) as { id: number; plan_id: number; status: string; points: number; child_id: number } | undefined;

  if (!log) {
    return NextResponse.json({ error: "打卡记录不存在" }, { status: 404 });
  }

  if (log.status !== "pending") {
    return NextResponse.json({ error: "该记录已处理" }, { status: 400 });
  }

  if (action === "reject") {
    // 拒绝：删除打卡记录
    withTransaction(db, () => {
      db.prepare("DELETE FROM study_plan_logs WHERE id = ?").run(logId);
    });
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // 批准：更新状态并加积分
  withTransaction(db, () => {
    db.prepare("UPDATE study_plan_logs SET status = 'approved' WHERE id = ?").run(logId);
    db.prepare("UPDATE children SET points = points + ? WHERE id = ?").run(log.points, childId);
  });

  return NextResponse.json({ ok: true, action: "approved", reward: log.points });
}
