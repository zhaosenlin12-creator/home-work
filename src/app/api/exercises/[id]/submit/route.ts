import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild } from "@/lib/auth";
import { getKind, scoreAnswer } from "@/lib/exercise-kinds";
import { validateInt } from "@/lib/validate";

// 提交练习答案：POST /api/exercises/[id]/submit  { answers: string[] }
// 自动评分 → 记录错题 → 按正确率发奖励积分
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const exerciseId = validateInt(id, 1, 1_000_000);
  if (!exerciseId) return NextResponse.json({ error: "练习 ID 无效" }, { status: 400 });

  let body: { answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  if (!Array.isArray(body.answers)) {
    return NextResponse.json({ error: "答案格式错误" }, { status: 400 });
  }

  const db = getDb();
  const exercise = db
    .prepare("SELECT * FROM exercises WHERE id = ? AND child_id = ?")
    .get(exerciseId, child.id) as
    | {
        id: number;
        child_id: number;
        kind: string;
        subject: string;
        total_items: number;
        status: string;
        reward_points: number;
        correct_count: number;
      }
    | undefined;
  if (!exercise) return NextResponse.json({ error: "练习不存在" }, { status: 404 });
  if (exercise.status === "done") {
    return NextResponse.json({ error: "该练习已完成，不能重复提交" }, { status: 400 });
  }

  const items = db
    .prepare("SELECT id, question, answer FROM exercise_items WHERE exercise_id = ? ORDER BY id")
    .all(exerciseId) as { id: number; question: string; answer: string }[];
  if (items.length === 0) return NextResponse.json({ error: "练习无题目" }, { status: 400 });

  const answers = (body.answers as unknown[]).slice(0, items.length).map((a) => String(a ?? "").trim().slice(0, 200));
  const answeredCount = answers.filter((a) => a !== "").length;
  if (answeredCount === 0) {
    return NextResponse.json({ error: "至少回答一道题才能提交" }, { status: 400 });
  }
  if (answeredCount < items.length) {
    return NextResponse.json(
      { error: `还有 ${items.length - answeredCount} 道题未作答，请全部答完再提交` },
      { status: 400 }
    );
  }

  const kindMeta = getKind(exercise.kind);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  let correctCount = 0;
  const wrongs: { subject: string; question: string; wrong: string; right: string }[] = [];

  withTransaction(db, () => {
    const updItem = db.prepare(
      "UPDATE exercise_items SET user_answer = ?, is_correct = ?, answered_at = ? WHERE id = ?"
    );
    items.forEach((it, i) => {
      const userAns = answers[i];
      const ok = scoreAnswer(exercise.kind, it.answer, userAns);
      if (ok) correctCount++;
      updItem.run(userAns, ok ? 1 : 0, now, it.id);
      if (!ok) {
        wrongs.push({
          subject: subjectName(kindMeta?.subject ?? exercise.subject),
          question: it.question,
          wrong: userAns || "（未作答）",
          right: it.answer,
        });
      }
    });

    db.prepare(
      "UPDATE exercises SET status = 'done', correct_count = ?, total_items = ? WHERE id = ?"
    ).run(correctCount, items.length, exerciseId);

    // 错题自动记录进错题本（仅自动收录，不重复已有的可后续优化）
    const insWrong = db.prepare(
      `INSERT INTO wrong_questions (child_id, subject, question, wrong_answer, correct_answer, reason)
       VALUES (?, ?, ?, ?, ?, '练习自动收录')`
    );
    for (const w of wrongs) {
      insWrong.run(child.id, w.subject, w.question, w.wrong, w.right);
    }

    // 按正确率发奖励：全对双倍，部分对按比例，全错 0 分
    const reward = computeReward(exercise.reward_points, correctCount, items.length);
    if (reward > 0) {
      db.prepare("UPDATE children SET points = points + ? WHERE id = ?").run(reward, child.id);
    }
  });

  const allCorrect = correctCount === items.length;
  return NextResponse.json({
    ok: true,
    correct: correctCount,
    total: items.length,
    allCorrect,
    reward: computeReward(exercise.reward_points, correctCount, items.length),
    wrongs,
  });
}

function computeReward(reward: number, correct: number, total: number): number {
  if (total === 0) return 0;
  if (correct === total) return reward * 2;
  if (correct === 0) return 0;
  return Math.max(1, Math.round(reward * (correct / total)));
}

function subjectName(subject: string): string {
  const map: Record<string, string> = { math: "数学", english: "英语", chinese: "语文", science: "科学" };
  return map[subject] || subject;
}
