import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAnyUser, canAccessChild } from "@/lib/auth";
import { validateInt } from "@/lib/validate";
import { getKind } from "@/lib/exercise-kinds";

// 练习列表：GET /api/exercises?childId=（家长/孩子均可，校验归属）
export async function GET(request: Request) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const childId = validateInt(searchParams.get("childId"), 1, 1_000_000);
  if (!childId || !canAccessChild(childId, user)) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }

  const list = getDb()
    .prepare(
      "SELECT * FROM exercises WHERE child_id = ? ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 30"
    )
    .all(childId) as {
    id: number;
    kind: string;
    title: string;
    subject: string;
    total_items: number;
    correct_count: number;
    status: string;
    reward_points: number;
    created_at: string;
  }[];

  return NextResponse.json({
    exercises: list.map((e) => ({
      ...e,
      kindName: getKind(e.kind)?.name ?? e.kind,
    })),
  });
}