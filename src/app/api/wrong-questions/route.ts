import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent, canAccessChild } from "@/lib/auth";
import { requiredStr, trimLen, validateInt } from "@/lib/validate";

// 错题本：GET ?childId=（家长只能看自己孩子的）
export async function GET(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const childId = validateInt(searchParams.get("childId"), 1, 1_000_000);

  if (childId) {
    if (!canAccessChild(childId, { type: "parent", user: parent })) {
      return NextResponse.json({ error: "无权访问该孩子的数据" }, { status: 403 });
    }
    const rows = getDb()
      .prepare("SELECT * FROM wrong_questions WHERE child_id = ? ORDER BY created_at DESC")
      .all(childId);
    return NextResponse.json({ wrongQuestions: rows });
  }

  // 无 childId → 只看自己孩子的错题（join 校验 parent_id）
  const rows = getDb()
    .prepare(
      `SELECT wq.* FROM wrong_questions wq
       JOIN children c ON c.id = wq.child_id
       WHERE c.parent_id = ?
       ORDER BY wq.created_at DESC LIMIT 50`
    )
    .all(parent.id);
  return NextResponse.json({ wrongQuestions: rows });
}

// 家长录入错题：POST（childId 必须是自己的孩子）
export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let body: {
    childId?: unknown;
    subject?: unknown;
    question?: unknown;
    wrongAnswer?: unknown;
    correctAnswer?: unknown;
    reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = validateInt(body.childId, 1, 1_000_000);
  const question = requiredStr(body.question, 500);
  if (!childId || !question) {
    return NextResponse.json({ error: "缺少孩子或题目（≤500 字）" }, { status: 400 });
  }
  if (!canAccessChild(childId, { type: "parent", user: parent })) {
    return NextResponse.json({ error: "无权为该孩子录入错题" }, { status: 403 });
  }
  const result = getDb()
    .prepare(
      `INSERT INTO wrong_questions (child_id, subject, question, wrong_answer, correct_answer, reason)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      childId,
      trimLen(body.subject, 20) || "数学",
      question,
      trimLen(body.wrongAnswer, 200),
      trimLen(body.correctAnswer, 200),
      trimLen(body.reason, 300)
    );
  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}