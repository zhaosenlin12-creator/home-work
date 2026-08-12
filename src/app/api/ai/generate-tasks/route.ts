import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAnyUser, canAccessChild } from "@/lib/auth";
import { callDeepSeek, extractJson } from "@/lib/ai";
import { getKind, DIFFICULTY_LABELS } from "@/lib/exercise-kinds";
import { trimLen, validateInt } from "@/lib/validate";

type GenerateBody = {
  childId?: unknown;
  kind?: unknown;
  count?: unknown;
  difficulty?: unknown;
  topic?: unknown;
  fromWrong?: unknown;
  allowFallback?: unknown;
};

// AI 出题：POST /api/ai/generate-tasks
// 家长（给孩子出题）或孩子（自主练习）均可调用
export async function POST(request: Request) {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const childId = validateInt(body.childId, 1, 1_000_000);
  if (!childId || !canAccessChild(childId, user)) {
    return NextResponse.json({ error: "无权为该孩子出题" }, { status: 403 });
  }

  const kindMeta = getKind(String(body.kind || "mental-math"));
  if (!kindMeta) return NextResponse.json({ error: "题型不支持" }, { status: 400 });

  const count = validateInt(body.count, 1, 20) ?? kindMeta.defaultCount;
  const difficulty = validateInt(body.difficulty, 1, 3) ?? 2;
  const topic = trimLen(body.topic, 100) || "";
  const fromWrong = body.fromWrong === true || body.fromWrong === "true";
  const allowFallback = body.allowFallback === true || body.allowFallback === "true";

  const db = getDb();
  const child = db
    .prepare("SELECT id, grade FROM children WHERE id = ?")
    .get(childId) as { id: number; grade: string } | undefined;
  if (!child) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  const creator = user.type === "parent" ? "parent" : "child";
  const title = topic
    ? `${kindMeta.name} · ${DIFFICULTY_LABELS[difficulty]} · ${topic}`
    : `${kindMeta.name}练习 · ${child.grade} · ${DIFFICULTY_LABELS[difficulty]}`;

  // 收集错题（若家长要求针对错题出题）
  let wrongContext = "";
  if (fromWrong) {
    const wrongs = db
      .prepare(
        `SELECT subject, question, wrong_answer, correct_answer
         FROM wrong_questions
         WHERE child_id = ? AND subject = ?
         ORDER BY created_at DESC LIMIT 10`
      )
      .all(childId, kindMeta.subject === "math" ? "数学" : kindMeta.subject === "english" ? "英语" : "语文") as {
      question: string;
      wrong_answer: string;
      correct_answer: string;
    }[];
    if (wrongs.length) {
      wrongContext =
        "该孩子近期错题如下，请围绕这些薄弱点出题（可改编、可拓展），但不要原样重复：\n" +
        wrongs
          .map(
            (w, i) =>
              `${i + 1}. 题目：${w.question}； 孩子错答：${w.wrong_answer || "/"}； 正确：${w.correct_answer || "/"}`
          )
          .join("\n");
    }
  }

  // 尝试 AI 出题
  let items: { question: string; answer: string }[] = [];
  let aiError = "";
  try {
    const system = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      grade: child.grade,
      kindName: kindMeta.name,
      subject: kindMeta.subject,
      difficulty,
      difficultyLabel: DIFFICULTY_LABELS[difficulty],
      count,
      topic,
      wrongContext,
      sample: kindMeta.sample,
      answerRule: kindMeta.answerRule,
    });
    const reply = await callDeepSeek(
      [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 1600, temperature: 0.75, timeoutMs: 30_000 }
    );
    const parsed = extractJson<{ items?: { question?: string; answer?: string }[] }>(reply);
    if (parsed?.items?.length) {
      items = parsed.items
        .slice(0, count)
        .map((it) => ({
          question: String(it.question || "").trim().slice(0, 300),
          answer: String(it.answer || "").trim().slice(0, 200),
        }))
        .filter((it) => it.question && it.answer);
    }
    if (items.length === 0) {
      aiError = "AI 返回了空题目，无法使用";
    }
  } catch (e) {
    aiError = (e as Error).message || "AI 出题失败";
    console.error("[generate-tasks] AI 出题失败:", aiError);
  }

  // AI 失败时：默认报错；只有显式 allowFallback 才使用本地模板兜底
  if (items.length === 0) {
    if (!allowFallback) {
      return NextResponse.json(
        {
          error: `AI 出题失败：${aiError}。请检查 AI 密钥/网络，或开启「离线题库模式」后再试。`,
          aiError,
        },
        { status: 503 }
      );
    }
    items = fallbackItems(kindMeta.key, count, child.grade, difficulty);
  }

  // 入库
  const result = db
    .prepare(
      "INSERT INTO exercises (task_id, child_id, creator_type, subject, kind, title, total_items, status, reward_points, difficulty, topic, from_wrong) VALUES (NULL, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)"
    )
    .run(
      childId,
      creator,
      kindMeta.subject,
      kindMeta.key,
      title,
      items.length,
      kindMeta.reward,
      difficulty,
      topic,
      fromWrong ? 1 : 0
    );
  const exerciseId = Number(result.lastInsertRowid);
  const insItem = db.prepare(
    "INSERT INTO exercise_items (exercise_id, question, answer) VALUES (?, ?, ?)"
  );
  for (const it of items) {
    insItem.run(exerciseId, it.question, it.answer);
  }

  return NextResponse.json({
    ok: true,
    id: exerciseId,
    kind: kindMeta.key,
    kindName: kindMeta.name,
    subject: kindMeta.subject,
    title,
    difficulty,
    difficultyLabel: DIFFICULTY_LABELS[difficulty],
    rewardPoints: kindMeta.reward,
    fromWrong,
    aiGenerated: !aiError,
    fallback: !!aiError && allowFallback,
    items: items.map((it) => ({ question: it.question })),
  });
}

function buildSystemPrompt(): string {
  return `你是一名熟悉中国小学教材的资深教师。请根据要求生成练习题。

输出要求：
1. 只输出纯 JSON，不要 markdown 代码块、不要解释、不要多余文字。
2. JSON 格式必须是：{"items":[{"question":"...","answer":"..."}, ...]}
3. 题目必须多样化，不要和示例重复，不要只换数字。
4. 题目要符合要求的年级水平和难度。
5. 每道题要有唯一正确答案。`;
}

function buildUserPrompt(opts: {
  grade: string;
  kindName: string;
  subject: string;
  difficulty: number;
  difficultyLabel: string;
  count: number;
  topic: string;
  wrongContext: string;
  sample: string;
  answerRule: string;
}): string {
  const subjectName =
    opts.subject === "math" ? "数学" : opts.subject === "english" ? "英语" : "语文";
  const parts = [
    `请为${opts.grade}学生出 ${opts.count} 道${subjectName}${opts.kindName}题。`,
    `难度：${opts.difficultyLabel}（${opts.difficulty}/3）。`,
    opts.topic ? `知识点/主题：${opts.topic}。` : "",
    `评分规则：${opts.answerRule}`,
    `示例格式（仅参考，不要照搬）：${opts.sample}`,
    opts.wrongContext || "",
    "要求：",
    "- 题目贴近教材、生活场景或课本话题；",
    `- 难度严格控制在${opts.difficultyLabel}，不要过难也不要过简单；`,
    "- 每道题题干清晰，答案唯一；",
    "- 题目之间不要重复，换数字也算重复；",
    "- 必须输出合法 JSON。",
  ];
  return parts.filter(Boolean).join("\n");
}

/** 内置模板题（AI 不可用时兜底，仅显式允许时使用） */
function fallbackItems(
  kind: string,
  count: number,
  grade: string,
  difficulty: number
): { question: string; answer: string }[] {
  const pools: Record<string, { question: string; answer: string }[]> = {
    "mental-math": [
      { question: "46 + 37 = ?", answer: "83" },
      { question: "82 - 55 = ?", answer: "27" },
      { question: "7 × 8 = ?", answer: "56" },
      { question: "63 ÷ 9 = ?", answer: "7" },
      { question: "15 + 26 + 34 = ?", answer: "75" },
      { question: "100 - 47 = ?", answer: "53" },
      { question: "9 × 6 = ?", answer: "54" },
      { question: "72 ÷ 8 = ?", answer: "9" },
      { question: "58 + 39 = ?", answer: "97" },
      { question: "91 - 68 = ?", answer: "23" },
    ],
    "math-word-problem": [
      { question: "一箱苹果有 48 个，分给 6 个小朋友，每人几个？", answer: "8" },
      { question: "小明每天读 9 页书，7 天读多少页？", answer: "63" },
      { question: "一支笔 5 元，买 7 支需要多少元？", answer: "35" },
    ],
    "word-spell": [
      { question: "图书馆的英文单词是？", answer: "library" },
      { question: "祖国的英文单词是？", answer: "motherland" },
      { question: "勇敢的英文单词是？", answer: "brave" },
      { question: "科学的英文单词是？", answer: "science" },
      { question: "文化的英文单词是？", answer: "culture" },
    ],
    "english-choice": [
      { question: "She ___ to school every day. A. go  B. goes  C. going  D. gone", answer: "B" },
      { question: "There ___ a book on the desk. A. is  B. are  C. be  D. am", answer: "A" },
    ],
    dictation: [
      { question: "《静夜思》中描写诗人抬头望月的诗句是？", answer: "举头望明月" },
      { question: "《春晓》中写春天夜雨的诗句是？", answer: "夜来风雨声" },
      { question: "《登鹳雀楼》中表达进取精神的诗句是？", answer: "更上一层楼" },
    ],
    "chinese-fill": [
      { question: "\"春眠不觉晓，____闻啼鸟。\"", answer: "处处" },
      { question: "\"举头望明月，____思故乡。\"", answer: "低头" },
      { question: "\"白日依山尽，____入海流。\"", answer: "黄河" },
    ],
  };
  const pool = pools[kind] ?? pools["mental-math"];
  // 按难度挑：简单取前 60%，中等取中段，挑战取后段
  const start = difficulty === 1 ? 0 : difficulty === 2 ? Math.floor(pool.length * 0.2) : Math.floor(pool.length * 0.4);
  const out: { question: string; answer: string }[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (start + i) % pool.length;
    out.push(pool[idx]);
  }
  return out.length ? out : [{ question: "1 + 1 = ?", answer: "2" }];
}
