import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";

// 孩子端：今日学习计划
// GET /api/kid/study-plan?childId= → 今天应做的计划项（含完成状态）
export async function GET(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const childId = Number(searchParams.get("childId")) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }

  const db = getDb();
  // 星期映射：SQLite weekday() 周日=0, 周一=1 ... 我们约定 1=周一..7=周日, 0=每天
  // JS 端 getDay() 周日=0, 周一=1..周六=6 → 映射为 周一=1..周日=7
  const jd = new Date().getDay(); // 0=周日
  const ourWeekday = jd === 0 ? 7 : jd; // 周一=1..周日=7
  const today = new Date().toISOString().slice(0, 10);

  const plans = db
    .prepare(
      `SELECT p.id, p.title, p.subject, p.duration_min, p.points,
        CASE WHEN l.id IS NULL THEN 0 
             WHEN l.status = 'pending' THEN 2
             ELSE 1 END AS done_status
       FROM study_plans p
       LEFT JOIN study_plan_logs l ON l.plan_id = p.id AND l.done_date = ? AND l.child_id = ?
       WHERE p.child_id = ? AND p.active = 1
         AND (p.weekday = 0 OR p.weekday = ?)
       ORDER BY p.id`
    )
    .all(today, childId, childId, ourWeekday);

  // done_status: 0=未完成, 1=已完成(已审核), 2=待审核
  const doneCount = plans.filter((p) => (p as { done_status: number }).done_status >= 1).length;
  const pendingCount = plans.filter((p) => (p as { done_status: number }).done_status === 2).length;
  
  // 转换格式兼容前端
  const formattedPlans = plans.map((p: any) => ({
    id: p.id,
    title: p.title,
    subject: p.subject,
    duration_min: p.duration_min,
    points: p.points,
    done: p.done_status >= 1 ? 1 : 0,
    pending: p.done_status === 2 ? 1 : 0,
  }));

  return NextResponse.json({ 
    plans: formattedPlans, 
    doneCount, 
    pendingCount,
    total: plans.length, 
    date: today 
  });
}
