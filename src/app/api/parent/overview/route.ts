import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent } from "@/lib/auth";

// 家长端仪表盘聚合
export async function GET() {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const db = getDb();

  const children = db
    .prepare(
      `SELECT c.*,
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS done_count,
        COALESCE(SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_count
       FROM children c
       LEFT JOIN tasks t ON t.child_id = c.id
       WHERE c.parent_id = ?
       GROUP BY c.id
       ORDER BY c.points DESC`
    )
    .all(parent.id) as {
    id: number;
    name: string;
    avatar_emoji: string;
    grade: string;
    points: number;
    done_count: number;
    todo_count: number;
  }[];

  const today = new Date().toISOString().slice(0, 10);
  const todayDone = db
    .prepare(
      `SELECT COUNT(*) AS c FROM tasks WHERE status = 'done' AND created_at LIKE ?`
    )
    .get(`${today}%`) as { c: number };

  const recentTasks = db
    .prepare(
      `SELECT t.*, c.name AS child_name, c.avatar_emoji FROM tasks t
       JOIN children c ON c.id = t.child_id
       WHERE c.parent_id = ?
       ORDER BY t.id DESC LIMIT 8`
    )
    .all(parent.id);

  const wrongCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM wrong_questions wq JOIN children c ON c.id = wq.child_id WHERE c.parent_id = ?`
    )
    .get(parent.id) as { c: number };

  const badgeCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM child_badges cb JOIN children c ON c.id = cb.child_id WHERE c.parent_id = ?`
    )
    .get(parent.id) as { c: number };

  const claims = db
    .prepare(
      `SELECT rc.claimed_at, r.title, r.icon, c.name AS child_name, c.avatar_emoji
       FROM reward_claims rc
       JOIN rewards r ON r.id = rc.reward_id
       JOIN children c ON c.id = rc.child_id
       WHERE c.parent_id = ?
       ORDER BY rc.claimed_at DESC LIMIT 6`
    )
    .all(parent.id);

  return NextResponse.json({
    children,
    todayDone: todayDone.c,
    wrongCount: wrongCount.c,
    badgeCount: badgeCount.c,
    recentTasks,
    claims,
  });
}
