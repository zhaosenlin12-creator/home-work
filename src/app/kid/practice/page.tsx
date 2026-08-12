"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import {
  Calculator,
  Languages,
  ScrollText,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BookOpen,
  Gift,
  FileText,
  Play,
  RotateCcw,
} from "lucide-react";
import { DIFFICULTY_LABELS } from "@/lib/exercise-kinds";

const KIND_OPTIONS = [
  { key: "mental-math", name: "口算", icon: Calculator },
  { key: "math-word-problem", name: "应用题", icon: FileText },
  { key: "word-spell", name: "单词拼写", icon: Languages },
  { key: "english-choice", name: "英语选择", icon: BookOpen },
  { key: "dictation", name: "古诗默写", icon: ScrollText },
  { key: "chinese-fill", name: "语文填空", icon: FileText },
];

const COUNTS = [5, 8, 10, 15, 20];

export default function KidPractice() {
  const [me, setMe] = useState<{ id: number } | null>(null);
  const [kind, setKind] = useState("mental-math");
  const [difficulty, setDifficulty] = useState(2);
  const [count, setCount] = useState(8);
  const [topic, setTopic] = useState("");
  const [fromWrong, setFromWrong] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gen, setGen] = useState<GenResult | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [history, setHistory] = useState<ExerciseRow[]>([]);
  const [error, setError] = useState("");
  const { refresh: refreshPoints } = usePoints();

  async function load() {
    try {
      const m = await api<{ id: number }>("/api/auth/me");
      setMe(m as never);
      const h = await api<{ exercises: ExerciseRow[] }>(`/api/exercises?childId=${m.id}`);
      setHistory(h.exercises);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function start(opts?: { exerciseId?: number }) {
    if (!me) return;
    setLoading(true);
    setResult(null);
    setGen(null);
    setError("");
    try {
      if (opts?.exerciseId) {
        // 加载家长布置或历史待完成的练习
        const g = await api<GenResult>(`/api/exercises/${opts.exerciseId}`);
        setGen(g);
        setAnswers(new Array(g.items.length).fill(""));
      } else {
        const g = await api<GenResult>("/api/ai/generate-tasks", {
          method: "POST",
          body: JSON.stringify({
            childId: me.id,
            kind,
            count,
            difficulty,
            topic: topic.trim(),
            fromWrong,
          }),
        });
        setGen(g);
        setAnswers(new Array(g.items.length).fill(""));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!me || !gen) return;
    if (answers.some((a) => !a.trim())) {
      setError("请答完所有题目再提交");
      return;
    }
    try {
      const r = await api<SubmitResult>(`/api/exercises/${gen.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(r);
      refreshPoints();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pending = history.find((e) => e.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink">每日练习</h2>
        <span className="text-xs text-ink-soft">完成练习得积分，错题自动进错题本</span>
      </div>

      {/* 待完成练习（家长布置或上次未完成的） */}
      {pending && !gen && !result && (
        <div className="glass-strong rounded-3xl p-4 border-2 border-secondary/40">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-extrabold text-ink">{pending.title}</div>
              <div className="text-xs text-ink-soft mt-0.5">
                {pending.kindName} · 共 {pending.total_items} 题 · 未完成
              </div>
            </div>
            <button
              onClick={() => start({ exerciseId: pending.id })}
              className="btn-game btn-secondary px-4 py-2 flex items-center gap-1.5"
            >
              <Play size={14} /> 继续作答
            </button>
          </div>
          <p className="text-xs text-ink-soft/80">
            这是老师/家长给你布置的练习，完成后才能获得积分哦。
          </p>
        </div>
      )}

      {/* 出题选项 */}
      {!gen && !result && (
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-1.5">
            <Sparkles size={16} className="text-secondary-deep" /> 选择练习类型
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                className={`rounded-2xl p-2.5 flex flex-col items-center gap-1 transition-all ${
                  kind === k.key
                    ? "bg-gradient-to-b from-sky-soft to-mint-soft border-2 border-secondary shadow-card"
                    : "bg-white/60 border-2 border-transparent"
                }`}
              >
                <k.icon size={20} className={kind === k.key ? "text-secondary-deep" : "text-ink-soft"} />
                <span className="text-xs font-bold text-ink">{k.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/60 rounded-2xl p-2.5">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wide">难度</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-xl transition-all ${
                      difficulty === d
                        ? "bg-secondary text-white"
                        : "bg-cream text-ink-soft hover:bg-white"
                    }`}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/60 rounded-2xl p-2.5">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wide">题数</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {COUNTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCount(c)}
                    className={`text-xs font-bold py-1.5 px-2 rounded-xl transition-all ${
                      count === c ? "bg-secondary text-white" : "bg-cream text-ink-soft hover:bg-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/60 rounded-2xl p-2.5 mb-3">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wide">知识点/主题（可选）</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：两位数乘法、动物单词、春天古诗"
              className="w-full mt-1 px-3 py-2 rounded-xl bg-white text-ink text-sm outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-ink-soft px-1 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fromWrong}
              onChange={(e) => setFromWrong(e.target.checked)}
              className="w-4 h-4 accent-secondary"
            />
            针对我的错题出题
          </label>

          <button
            onClick={() => start()}
            disabled={loading}
            className="btn-game btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> AI 正在出题…
              </>
            ) : (
              <>
                <Sparkles size={16} /> AI 出题，开始练习
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-ink-soft/70 mt-2">
            题目由 DeepSeek AI 根据年级和选项实时生成
          </p>
        </div>
      )}

      {error && <div className="text-coral text-sm text-center font-bold">{error}</div>}

      {/* 做题区 */}
      {gen && !result && (
        <div className="glass-strong rounded-3xl p-4 animate-pop">
          <div className="flex items-center justify-between mb-3">
            <div className="font-extrabold text-ink">{gen.title}</div>
            <div className="text-xs font-bold text-warning bg-accent/25 rounded-full px-3 py-1">
              全对 +{gen.rewardPoints * 2} 积分
            </div>
          </div>
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {gen.items.map((it, i) => (
              <div key={i} className="bg-white/70 rounded-2xl p-3">
                <div className="text-sm font-bold text-ink mb-2">
                  {i + 1}. {it.question}
                </div>
                <input
                  value={answers[i] ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => a.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder="输入答案"
                  className="w-full px-3 py-2 rounded-xl border border-mint/60 focus:outline-none focus:ring-2 focus:ring-secondary bg-white text-ink"
                />
              </div>
            ))}
          </div>
          <button onClick={submit} className="btn-game btn-success w-full mt-4 py-3">
            提交答案
          </button>
        </div>
      )}

      {/* 结果区 */}
      {result && (
        <div className="glass-strong rounded-3xl p-5 text-center animate-pop">
          <div className="flex items-center justify-center mb-2">
            {result.allCorrect ? (
              <CheckCircle2 size={48} className="text-success" />
            ) : result.correct >= result.total / 2 ? (
              <Sparkles size={48} className="text-secondary-deep" />
            ) : (
              <RotateCcw size={48} className="text-coral" />
            )}
          </div>
          <div className="text-xl font-extrabold text-ink">
            答对 {result.correct} / {result.total}
          </div>
          <div className="text-sm text-warning font-bold mt-1">+{result.reward} 积分</div>
          {result.wrongs.length > 0 ? (
            <div className="mt-4 text-left">
              <div className="text-xs font-bold text-coral mb-2">错题已自动收入错题本：</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.wrongs.map((w, i) => (
                  <div key={i} className="bg-white/70 rounded-xl p-2.5 text-sm">
                    <div className="font-semibold text-ink">
                      [{w.subject}] {w.question}
                    </div>
                    <div className="text-coral text-xs mt-0.5">你的答案：{w.wrong}</div>
                    <div className="text-mint-dark text-xs">正确答案：{w.right}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-success font-bold">全部答对，太棒了！</div>
          )}
          <button onClick={() => start()} className="btn-game btn-secondary w-full mt-4 py-2.5">
            再来一组
          </button>
        </div>
      )}

      {/* 历史练习 */}
      {history.length > 0 && !gen && (
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-sm font-bold text-ink-soft mb-2">练习记录</h3>
          <div className="space-y-2">
            {history.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  {e.status === "done" ? (
                    <CheckCircle2 size={15} className={e.correct_count === e.total_items ? "text-success" : "text-coral"} />
                  ) : (
                    <Sparkles size={15} className="text-secondary-deep" />
                  )}
                  <span className="font-semibold text-ink truncate">{e.title}</span>
                  <span className="text-xs text-ink-soft shrink-0">{e.kindName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">
                    {e.status === "done" ? (
                      <span className={e.correct_count === e.total_items ? "text-success" : "text-coral"}>
                        {e.correct_count}/{e.total_items}
                      </span>
                    ) : (
                      <span className="text-secondary-deep">未完成</span>
                    )}
                  </span>
                  {e.status === "pending" && (
                    <button
                      onClick={() => start({ exerciseId: e.id })}
                      className="text-xs bg-secondary text-white rounded-lg px-2 py-1 flex items-center gap-0.5"
                    >
                      <Play size={10} /> 做
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type GenResult = {
  ok: boolean;
  id: number;
  kind: string;
  kindName: string;
  title: string;
  rewardPoints: number;
  difficulty?: number;
  difficultyLabel?: string;
  items: { question: string }[];
};

type SubmitResult = {
  correct: number;
  total: number;
  allCorrect: boolean;
  reward: number;
  wrongs: { subject: string; question: string; wrong: string; right: string }[];
};

type ExerciseRow = {
  id: number;
  kind: string;
  kindName: string;
  title: string;
  total_items: number;
  correct_count: number;
  status: string;
};
