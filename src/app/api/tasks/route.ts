import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireAnyUser, canAccessChild } from "@/lib/auth";
import { requiredStr, trimLen, validateInt } from "@/lib/validate";

// 任务列表：?childId=xxx&status=pending（孩子端/家长端通用，校验数据归属）
export async function GET(request: Request) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const childId = validateInt(searchParams.get("childId"), 1, 1_000_000);
  if (!childId) return NextResponse.json({ error: "缺少 childId" }, { status: 400 });
  if (!canAccessChild(childId, user)) {
    return NextResponse.json({ error: "无权访问该孩子的数据" }, { status: 403 });
  }

  // 支持 status 过滤
  const status = searchParams.get("status");
  let sql = "SELECT * FROM tasks WHERE child_id = ?";
  const params: any[] = [childId];
  if (status && ["todo", "pending", "done"].includes(status)) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += ` ORDER BY CASE status WHEN 'todo' THEN 0 WHEN 'pending' THEN 1 WHEN 'done' THEN 2 ELSE 3 END, due_date ASC, id DESC`;

  const tasks = getDb().prepare(sql).all(...params);
  return NextResponse.json({ tasks });
}

// 布置/创建任务（家长端布置，孩子端也可发布愿望任务；校验归属）
export async function POST(request: Request) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: {
    childId?: unknown;
    title?: unknown;
    description?: unknown;
    type?: unknown;
    points?: unknown;
    dueDate?: unknown;
    subject?: unknown;
    needsReview?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const childId = validateInt(body.childId, 1, 1_000_000);
  const title = requiredStr(body.title, 100);
  if (!childId || !title) {
    return NextResponse.json({ error: "缺少孩子或任务标题（标题 ≤100 字）" }, { status: 400 });
  }
  if (!canAccessChild(childId, user)) {
    return NextResponse.json({ error: "无权为该孩子布置任务" }, { status: 403 });
  }

  const points = validateInt(body.points, 1, 1000);
  const type = trimLen(body.type, 20) || "study";
  const dueDate = trimLen(body.dueDate, 10);
  const subject = trimLen(body.subject, 20) || "";
  // 审核制：默认所有任务都需要家长确认后才发积分（防刷分）。
  // 只有家长明确勾选「完成后立即发积分 / 无需确认」时才跳过审核。
  const explicit = typeof body.needsReview === "boolean" ? body.needsReview : undefined;
  const needsReview: number = explicit === false ? 0 : 1;

  const result = withTransaction(getDb(), () => {
    const r = getDb()
      .prepare(
        `INSERT INTO tasks (child_id, title, description, type, subject, points, status, due_date, needs_review)
         VALUES (?, ?, ?, ?, ?, ?, 'todo', ?, ?)`
      )
      .run(
        childId,
        title,
        trimLen(body.description, 500),
        type,
        subject,
        points ?? 10,
        dueDate,
        needsReview
      );
    return Number(r.lastInsertRowid);
  });
  return NextResponse.json({ ok: true, id: result, needsReview });
}