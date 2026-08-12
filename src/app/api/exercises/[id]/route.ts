import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAnyUser, canAccessChild } from "@/lib/auth";
import { validateInt } from "@/lib/validate";
import { getKind } from "@/lib/exercise-kinds";

// 单个练习详情（含题目）：GET /api/exercises/[id]
// 用于孩子端加载「家长布置、待完成」的练习并作答
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const exerciseId = validateInt(id, 1, 1_000_000);
  if (!exerciseId) return NextResponse.json({ error: "练习 ID 无效" }, { status: 400 });

  const db = getDb();
  const ex = db
    .prepare("SELECT * FROM exercises WHERE id = ?")
    .get(exerciseId) as
    | { id: number; child_id: number; kind: string; title: string; status: string; reward_points: number; total_items: number; correct_count: number }
    | undefined;
  if (!ex) return NextResponse.json({ error: "练习不存在" }, { status: 404 });
  if (!canAccessChild(ex.child_id, user)) {
    return NextResponse.json({ error: "无权访问该练习" }, { status: 403 });
  }

  const items = db
    .prepare("SELECT id, question FROM exercise_items WHERE exercise_id = ? ORDER BY id")
    .all(exerciseId) as { id: number; question: string }[];

  return NextResponse.json({
    id: ex.id,
    kind: ex.kind,
    kindName: getKind(ex.kind)?.name ?? ex.kind,
    title: ex.title,
    status: ex.status,
    rewardPoints: ex.reward_points,
    totalItems: ex.total_items,
    correctCount: ex.correct_count,
    items: items.map((it) => ({ question: it.question })),
  });
}
