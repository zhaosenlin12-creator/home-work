// 练习题型注册表（可扩展：新增题型只需在此追加一条）
// 每种题型：元数据 + 出题提示词 + 评分器

export type ExerciseKind = {
  key: string;
  name: string;
  subject: string;
  /** 出题示例（喂给 AI） */
  sample: string;
  /** 评分规则说明（喂给 AI，帮助生成合适格式） */
  answerRule: string;
  /** 默认题目数 */
  defaultCount: number;
  /** 完成奖励积分（基础分，可按正确率折算） */
  reward: number;
  /** 支持难度 1-3 */
  supportsDifficulty: boolean;
  /** 是否支持知识点/主题输入 */
  supportsTopic: boolean;
};

export const EXERCISE_KINDS: Record<string, ExerciseKind> = {
  "mental-math": {
    key: "mental-math",
    name: "口算",
    subject: "math",
    sample: '{"question":"36 + 58 = ?","answer":"94"}',
    answerRule: "答案只填数字或算式结果，不加单位、不加等号",
    defaultCount: 10,
    reward: 5,
    supportsDifficulty: true,
    supportsTopic: false,
  },
  "math-word-problem": {
    key: "math-word-problem",
    name: "应用题",
    subject: "math",
    sample: '{"question":"小明有 24 颗糖，分给 3 个小朋友，每人几颗？","answer":"8"}',
    answerRule: "答案只填最终数字或数量，不加单位、不加过程、不加等号",
    defaultCount: 5,
    reward: 8,
    supportsDifficulty: true,
    supportsTopic: true,
  },
  "word-spell": {
    key: "word-spell",
    name: "单词拼写",
    subject: "english",
    sample: '{"question":"图书馆的英文单词是？","answer":"library"}',
    answerRule: "答案填英文单词，小写，不加冠词",
    defaultCount: 8,
    reward: 5,
    supportsDifficulty: true,
    supportsTopic: true,
  },
  "english-choice": {
    key: "english-choice",
    name: "英语选择",
    subject: "english",
    sample: '{"question":"I ___ a student. A. am  B. is  C. are  D. be","answer":"A"}',
    answerRule: "答案只填选项字母（A/B/C/D），不填单词",
    defaultCount: 8,
    reward: 5,
    supportsDifficulty: true,
    supportsTopic: true,
  },
  "dictation": {
    key: "dictation",
    name: "古诗默写",
    subject: "chinese",
    sample: '{"question":"《望庐山瀑布》中描写瀑布飞流直下的句子是？","answer":"飞流直下三千尺"}',
    answerRule: "答案填原句，不加标点、不加书名号",
    defaultCount: 5,
    reward: 5,
    supportsDifficulty: true,
    supportsTopic: true,
  },
  "chinese-fill": {
    key: "chinese-fill",
    name: "语文填空",
    subject: "chinese",
    sample: '{"question":"\\"春眠不觉晓，____闻啼鸟。\\"","answer":"处处"}',
    answerRule: "答案填应填的字词或短句，不加标点",
    defaultCount: 8,
    reward: 5,
    supportsDifficulty: true,
    supportsTopic: true,
  },
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "基础",
  2: "中等",
  3: "挑战",
};

export function getKind(kind: string): ExerciseKind | undefined {
  return EXERCISE_KINDS[kind];
}

/** 评分器：按题型判定用户答案是否正确（可扩展） */
export function scoreAnswer(kind: string, correct: string, user: string): boolean {
  const cRaw = String(correct || "").trim();
  const uRaw = String(user || "").trim();
  if (!uRaw) return false;

  switch (kind) {
    case "english-choice": {
      // 只比较选项字母
      const c = cRaw.toUpperCase().match(/[ABCD]/)?.[0] ?? "";
      const u = uRaw.toUpperCase().match(/[ABCD]/)?.[0] ?? "";
      return c !== "" && c === u;
    }
    case "mental-math":
    case "math-word-problem":
      return compareMath(normalizeText(cRaw), normalizeText(uRaw));
    case "word-spell":
    case "dictation":
    case "chinese-fill":
      return normalizeText(cRaw) === normalizeText(uRaw);
    default:
      return normalizeText(cRaw) === normalizeText(uRaw);
  }
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s，。！？、；：""''《》（）()]/g, "")
    .replace(/[，。！？]/g, "");
}

/** 数值比较：支持 "12×4"、"48"、"12*4" 等表达式求值 */
function compareMath(correct: string, user: string): boolean {
  const evalExpr = (s: string): number | null => {
    const clean = s.replace(/[xX×]/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    if (!/[\d+\-*/().]/.test(clean)) return null;
    // 只保留算式字符
    const expr = clean.replace(/[^\d+\-*/().]/g, "");
    if (!expr) return null;
    try {
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict"; return (${expr})`)();
      return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
    } catch {
      return null;
    }
  };
  const a = evalExpr(correct);
  const b = evalExpr(user);
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-6;
  return correct === user;
}
