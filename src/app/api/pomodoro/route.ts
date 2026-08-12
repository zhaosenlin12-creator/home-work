import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { validateInt } from "@/lib/validate";

// 番茄钟：GET ?childId= 列表；POST 记录一次完成（仅孩子，且只能操作自己）
export async function GET(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("childId"));
  const childId = requested || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }

  const sessions = getDb()
    .prepare(
      "SELECT * FROM pomodoro_sessions WHERE child_id = ? ORDER BY completed_at DESC LIMIT 30"
    )
    .all(childId);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM pomodoro_sessions WHERE child_id = ? AND completed_at LIKE ?"
    )
    .get(childId, `${today}%`) as { c: number };
  const totalMin = getDb()
    .prepare(
      "SELECT COALESCE(SUM(duration_min), 0) AS m FROM pomodoro_sessions WHERE child_id = ?"
    )
    .get(childId) as { m: number };

  return NextResponse.json({ sessions, todayCount: todayCount.c, totalMin: totalMin.m });
}

export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: number; taskId?: number; durationMin?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const durationMin = validateInt(body.durationMin, 1, 180) ?? 25;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  // 关联任务需属于同一孩子
  const taskId = body.taskId ? Number(body.taskId) : null;
  if (taskId) {
    const t = getDb()
      .prepare("SELECT child_id FROM tasks WHERE id = ?")
      .get(taskId) as { child_id: number } | undefined;
    if (!t || t.child_id !== childId) {
      return NextResponse.json({ error: "任务归属不匹配" }, { status: 403 });
    }
  }

  const result = getDb()
    .prepare(
      "INSERT INTO pomodoro_sessions (child_id, task_id, duration_min, started_at, completed_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(childId, taskId, durationMin, now, now);

  getDb().prepare("UPDATE children SET points = points + ? WHERE id = ?").run(5, childId);
  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}