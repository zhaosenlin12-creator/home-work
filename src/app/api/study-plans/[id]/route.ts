import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { validateInt, trimLen } from "@/lib/validate";

// 家长端：编辑/删除学习计划
// PATCH /api/study-plans/[id]  { weekday?, title?, subject?, durationMin?, points?, active? }
// DELETE /api/study-plans/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const planId = validateInt(id, 1, 1_000_000);
  if (!planId) return NextResponse.json({ error: "计划 ID 无效" }, { status: 400 });

  const db = getDb();
  const plan = db.prepare("SELECT * FROM study_plans WHERE id = ?").get(planId) as
    | { id: number; child_id: number }
    | undefined;
  if (!plan) return NextResponse.json({ error: "计划不存在" }, { status: 404 });
  const child = db
    .prepare("SELECT id FROM children WHERE id = ? AND parent_id = ?")
    .get(plan.child_id, parent.id);
  if (!child) return NextResponse.json({ error: "无权操作该计划" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const sets: string[] = [];
  const vals: unknown[] = [];

  const title = trimLen(body.title, 60);
  if (title !== undefined && title !== null) {
    if (!title) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    sets.push("title = ?");
    vals.push(title);
  }
  if (body.weekday !== undefined && body.weekday !== null) {
    const w = Number(body.weekday);
    const nw = Number.isInteger(w) && w >= 0 && w <= 7 ? w : 0;
    sets.push("weekday = ?");
    vals.push(nw);
  }
  const subject = trimLen(body.subject, 20);
  if (subject !== undefined && subject !== null) {
    sets.push("subject = ?");
    vals.push(subject);
  }
  if (body.durationMin !== undefined && body.durationMin !== null) {
    sets.push("duration_min = ?");
    vals.push(Math.max(5, Math.min(240, Number(body.durationMin) || 30)));
  }
  if (body.points !== undefined && body.points !== null) {
    sets.push("points = ?");
    vals.push(Math.max(1, Math.min(100, Number(body.points) || 10)));
  }
  if (body.active !== undefined && body.active !== null) {
    sets.push("active = ?");
    vals.push(body.active ? 1 : 0);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
  }

  vals.push(planId);
  db.prepare(`UPDATE study_plans SET ${sets.join(", ")} WHERE id = ?`).run(
    ...(vals as (string | number)[])
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const planId = validateInt(id, 1, 1_000_000);
  if (!planId) return NextResponse.json({ error: "计划 ID 无效" }, { status: 400 });

  const db = getDb();
  const plan = db.prepare("SELECT * FROM study_plans WHERE id = ?").get(planId) as
    | { id: number; child_id: number }
    | undefined;
  if (!plan) return NextResponse.json({ error: "计划不存在" }, { status: 404 });
  const child = db
    .prepare("SELECT id FROM children WHERE id = ? AND parent_id = ?")
    .get(plan.child_id, parent.id);
  if (!child) return NextResponse.json({ error: "无权操作该计划" }, { status: 403 });

  db.prepare("DELETE FROM study_plans WHERE id = ?").run(planId);
  return NextResponse.json({ ok: true });
}
