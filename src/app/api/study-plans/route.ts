import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { validateInt, trimLen } from "@/lib/validate";

// 家长端：学习计划 CRUD
// GET /api/study-plans?childId= &page= &limit= → 某孩子的计划（分页）
// GET /api/study-plans?pending=1 → 待审核列表（按家长维度，无需 childId）
export async function GET(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const db = getDb();

  // 待审核列表（跨孩子汇总，按家长查询）
  if (searchParams.get("pending") === "1") {
    const pending = db.prepare(`
      SELECT l.id as log_id, l.done_date, l.status, l.created_at,
             p.id as plan_id, p.title, p.subject, p.points, p.child_id,
             c.name as child_name
      FROM study_plan_logs l
      JOIN study_plans p ON l.plan_id = p.id
      JOIN children c ON p.child_id = c.id
      WHERE l.status = 'pending' AND c.parent_id = ?
      ORDER BY l.created_at DESC
      LIMIT 50
    `).all(parent.id);
    return NextResponse.json({ pending });
  }

  const childId = validateInt(searchParams.get("childId"), 1, 1_000_000);
  if (!childId) return NextResponse.json({ error: "请选择孩子" }, { status: 400 });

  const child = db
    .prepare("SELECT id FROM children WHERE id = ? AND parent_id = ?")
    .get(childId, parent.id);
  if (!child) return NextResponse.json({ error: "无权访问该孩子" }, { status: 403 });

  // 分页参数
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;

  // 总数
  const total = db.prepare("SELECT COUNT(*) as cnt FROM study_plans WHERE child_id = ?").get(childId) as { cnt: number };

  // 计划列表
  const plans = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM study_plan_logs l WHERE l.plan_id = p.id AND l.status = 'approved') AS done_count
       FROM study_plans p WHERE p.child_id = ? ORDER BY p.weekday, p.id LIMIT ? OFFSET ?`
    )
    .all(childId, limit, offset);

  return NextResponse.json({ 
    plans, 
    page, 
    limit, 
    total: total.cnt,
    hasMore: offset + plans.length < total.cnt
  });
}

export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = validateInt(body.childId, 1, 1_000_000);
  if (!childId) return NextResponse.json({ error: "请选择孩子" }, { status: 400 });

  const db = getDb();
  const child = db
    .prepare("SELECT id FROM children WHERE id = ? AND parent_id = ?")
    .get(childId, parent.id);
  if (!child) return NextResponse.json({ error: "无权访问该孩子" }, { status: 403 });

  const title = trimLen(body.title, 60);
  if (!title) return NextResponse.json({ error: "请填写计划标题（≤60 字）" }, { status: 400 });

  const weekday = Number(body.weekday ?? 0);
  const normalizedWeekday = Number.isInteger(weekday) && weekday >= 0 && weekday <= 7 ? weekday : 0;
  const subject = trimLen(body.subject, 20) || "study";
  const durationMin = Math.max(5, Math.min(240, Number(body.durationMin) || 30));
  const points = Math.max(1, Math.min(100, Number(body.points) || 10));
  const needsReview = body.needsReview === false ? 0 : 1;

  const r = db
    .prepare(
      `INSERT INTO study_plans (child_id, weekday, title, subject, duration_min, points, needs_review)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(childId, normalizedWeekday, title, subject, durationMin, points, needsReview);
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
