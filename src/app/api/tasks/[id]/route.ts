import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireAnyUser, canAccessChild } from "@/lib/auth";

// 任务状态流转：POST /api/tasks/[id]
//   body: { action: "complete" | "uncomplete" | "approve" | "reject" }
// 审核制：needs_review=1 的任务，孩子完成 → pending（暂不加分），家长 approve → 加分；reject → 回 todo
// 原子化：条件 UPDATE 防并发重复加分/扣分
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const taskId = validateTaskId(id);
  if (!taskId) return NextResponse.json({ error: "任务 ID 无效" }, { status: 400 });
  const db = getDb();

  const task = db
    .prepare("SELECT id, child_id, points, status, needs_review FROM tasks WHERE id = ?")
    .get(taskId) as
    | { id: number; child_id: number; points: number; status: string; needs_review: number }
    | undefined;
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  if (!canAccessChild(task.child_id, user)) {
    return NextResponse.json({ error: "无权操作该任务" }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    body = { action: "complete" };
  }
  const action = body.action === "uncomplete" ? "uncomplete" : body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : "complete";

  // 家长审核动作（仅家长角色）
  if (action === "approve" || action === "reject") {
    if (user.type !== "parent") {
      return NextResponse.json({ error: "只有家长可以审核" }, { status: 403 });
    }
    if (action === "approve") {
      withTransaction(db, () => {
        const changed = db
          .prepare("UPDATE tasks SET status = 'done' WHERE id = ? AND status = 'pending'")
          .run(taskId).changes;
        if (changed === 1) {
          db.prepare("UPDATE children SET points = points + ? WHERE id = ?").run(
            task.points,
            task.child_id
          );
          db.prepare("UPDATE pets SET exp = exp + ? WHERE child_id = ?").run(
            Math.max(5, Math.floor(task.points / 2)),
            task.child_id
          );
        }
      });
    } else {
      db.prepare("UPDATE tasks SET status = 'todo' WHERE id = ? AND status = 'pending'").run(taskId);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "complete") {
    if (task.status === "pending") {
      return NextResponse.json({ error: "任务正在等待家长确认" }, { status: 400 });
    }
    // 需审核任务 → 进入 pending（不加分）；否则直接 done + 加分
    if (task.needs_review === 1) {
      const changed = db
        .prepare("UPDATE tasks SET status = 'pending' WHERE id = ? AND status = 'todo'")
        .run(taskId).changes;
      return NextResponse.json({ ok: true, pending: changed === 1 });
    }
    withTransaction(db, () => {
      const changed = db
        .prepare("UPDATE tasks SET status = 'done' WHERE id = ? AND status = 'todo'")
        .run(taskId).changes;
      if (changed === 1) {
        db.prepare("UPDATE children SET points = points + ? WHERE id = ?").run(
          task.points,
          task.child_id
        );
        db.prepare("UPDATE pets SET exp = exp + ? WHERE child_id = ?").run(
          Math.max(5, Math.floor(task.points / 2)),
          task.child_id
        );
      }
    });
  } else {
    // uncomplete：done 或 pending 都可退回 todo（pending 撤销不加分也不扣分）
    withTransaction(db, () => {
      const changed = db
        .prepare("UPDATE tasks SET status = 'todo' WHERE id = ? AND status IN ('done', 'pending')")
        .run(taskId).changes;
      if (changed === 1 && task.status === "done") {
        db.prepare("UPDATE children SET points = MAX(0, points - ?) WHERE id = ?").run(
          task.points,
          task.child_id
        );
      }
    });
  }

  return NextResponse.json({ ok: true });
}

function validateTaskId(v: string): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}