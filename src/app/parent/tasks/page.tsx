"use client";

// useSearchParams 需包 Suspense 边界（Next 15 静态预渲染要求）
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Plus, BookOpen, Sparkles, CheckCircle2, XCircle, ClipboardList, FileQuestion, RefreshCw } from "lucide-react";
import Avatar from "@/components/Avatar";

type Child = { id: number; name: string; avatar_emoji: string; avatar_image: string };
type Task = {
  id: number;
  child_id: number;
  title: string;
  description: string;
  type: string;
  points: number;
  status: string;
  due_date: string;
  subject?: string;
  needs_review?: number;
};

const TYPES = [
  { key: "study", label: "学习" },
  { key: "reading", label: "阅读" },
  { key: "sport", label: "运动" },
  { key: "housework", label: "家务" },
  { key: "art", label: "艺术" },
];

const SUBJECTS: Record<string, string> = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  science: "科学",
};

export default function ParentTasks() {
  return (
    <Suspense
      fallback={<div className="text-center py-20 text-ink-soft">加载中…</div>}
    >
      <ParentTasksInner />
    </Suspense>
  );
}

function ParentTasksInner() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterChild, setFilterChild] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("study");
  const [points, setPoints] = useState("10");
  const [dueDate, setDueDate] = useState("");
  // 错题表单
  const [wChild, setWChild] = useState<number | null>(null);
  const [wSubject, setWSubject] = useState("数学");
  const [wQuestion, setWQuestion] = useState("");
  const [wWrong, setWWrong] = useState("");
  const [wCorrect, setWCorrect] = useState("");
  const [wReason, setWReason] = useState("");
  const [subject, setSubject] = useState("chinese");
  const [skipReview, setSkipReview] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiKind, setAiKind] = useState("mental-math");
  const [aiDifficulty, setAiDifficulty] = useState(2);
  const [aiCount, setAiCount] = useState(10);
  const [aiTopic, setAiTopic] = useState("");
  const [aiFromWrong, setAiFromWrong] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [toast, setToast] = useState("");

  async function loadChildren() {
    const d = await api<{ children: Child[] }>("/api/children");
    setChildren(d.children);
    return d.children;
  }

  async function loadTasks(childId?: number | null) {
    const cid = childId ?? filterChild;
    if (cid) {
      const d = await api<{ tasks: Task[] }>(`/api/tasks?childId=${cid}`);
      setTasks(d.tasks);
    } else {
      setTasks([]);
    }
  }

  useEffect(() => {
    loadChildren()
      .then((kids) => {
        const qChild = Number(searchParams.get("childId"));
        const target = qChild || kids[0]?.id || null;
        setFilterChild(target);
        return loadTasks(target);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectChild(id: number) {
    setFilterChild(id);
    loadTasks(id);
  }

  async function createTask() {
    if (!filterChild || !title.trim()) return;
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          childId: filterChild,
          title,
          description: desc,
          type,
          points: Number(points),
          dueDate,
          subject,
          needsReview: !skipReview,
        }),
      });
      setToast("任务已布置");
      setTimeout(() => setToast(""), 2500);
      setTitle("");
      setDesc("");
      setShowForm(false);
      loadTasks();
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  async function addWrong() {
    if (!wChild || !wQuestion.trim()) return;
    try {
      await api("/api/wrong-questions", {
        method: "POST",
        body: JSON.stringify({
          childId: wChild,
          subject: wSubject,
          question: wQuestion,
          wrongAnswer: wWrong,
          correctAnswer: wCorrect,
          reason: wReason,
        }),
      });
      setToast("错题已收录");
      setTimeout(() => setToast(""), 2500);
      setWQuestion("");
      setWWrong("");
      setWCorrect("");
      setWReason("");
      setShowWrong(false);
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  const selectedName = children.find((c) => c.id === filterChild)?.name ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <ClipboardList size={18} /> 任务管理
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWrong(!showWrong)}
            className="bg-peach text-white rounded-2xl px-4 py-2 text-sm font-medium flex items-center gap-1 hover:opacity-90 transition-all active:scale-95"
          >
            <BookOpen size={16} /> 录错题
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-mint text-white rounded-2xl px-4 py-2 text-sm font-medium flex items-center gap-1 hover:bg-mint-dark transition-all active:scale-95"
          >
            <Plus size={16} /> 布置任务
          </button>
          <button
            onClick={() => setShowAi(!showAi)}
            className="bg-purple text-white rounded-2xl px-4 py-2 text-sm font-medium flex items-center gap-1 hover:opacity-90 transition-all active:scale-95"
          >
            <Sparkles size={16} /> AI 出题
          </button>
        </div>
      </div>

      {toast && (
        <div className="bg-mint-soft text-mint-dark rounded-2xl px-4 py-3 text-center font-medium animate-pop">
          {toast}
        </div>
      )}

      {/* 孩子筛选 */}
      <div className="flex gap-2 flex-wrap">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => selectChild(c.id)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
              filterChild === c.id ? "bg-mint text-white" : "bg-white text-ink-soft shadow-card"
            }`}
          >
            <Avatar image={c.avatar_image} emoji={c.avatar_emoji} size={26} rounded={true} />
            {c.name}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl p-5 shadow-card animate-pop space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`给${selectedName || "孩子"}布置什么任务？`}
            className="w-full px-4 py-3 rounded-2xl bg-cream outline-none focus:border-2 focus:border-mint"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="任务说明（可选）"
            rows={2}
            className="w-full px-4 py-3 rounded-2xl bg-cream outline-none resize-none"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              {["chinese", "math", "english", "science"].map((s2) => <option key={s2} value={s2}>{SUBJECTS[s2]}</option>)}
            </select>
            <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm col-span-2" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft px-1 cursor-pointer">
            <input
              type="checkbox"
              checked={skipReview}
              onChange={(e) => setSkipReview(e.target.checked)}
              className="w-4 h-4 accent-mint"
            />
            完成后立即发积分（无需我确认，不推荐）
          </label>
          <p className="text-xs text-ink-soft/70 px-1">
            默认情况下，孩子标记完成后会进入「等待确认」，你确认后才发积分，防止虚报刷分。
          </p>
          <button
            onClick={createTask}
            disabled={!title.trim()}
            className="w-full bg-mint text-white rounded-2xl py-3 font-semibold hover:bg-mint-dark transition-all active:scale-95 disabled:opacity-50"
          >
            布置任务
          </button>
        </div>
      )}

      {showWrong && (
        <div className="bg-white rounded-3xl p-5 shadow-card animate-pop space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={wChild ?? ""} onChange={(e) => setWChild(Number(e.target.value))} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              <option value="" disabled>选择孩子</option>
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={wSubject} onChange={(e) => setWSubject(e.target.value)} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              {["数学", "语文", "英语", "科学"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <input value={wQuestion} onChange={(e) => setWQuestion(e.target.value)} placeholder="题目" className="w-full px-4 py-3 rounded-2xl bg-cream outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={wWrong} onChange={(e) => setWWrong(e.target.value)} placeholder="错误答案" className="px-4 py-3 rounded-2xl bg-cream outline-none" />
            <input value={wCorrect} onChange={(e) => setWCorrect(e.target.value)} placeholder="正确答案" className="px-4 py-3 rounded-2xl bg-cream outline-none" />
          </div>
          <input value={wReason} onChange={(e) => setWReason(e.target.value)} placeholder="错误原因（可选）" className="w-full px-4 py-3 rounded-2xl bg-cream outline-none" />
          <button onClick={addWrong} disabled={!wChild || !wQuestion.trim()} className="w-full bg-peach text-white rounded-2xl py-3 font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
            收录错题
          </button>
        </div>
      )}

      {showAi && (
        <div className="bg-white rounded-3xl p-5 shadow-card animate-pop space-y-3">
          <h3 className="font-bold text-ink flex items-center gap-1.5">
            <Sparkles size={16} className="text-purple" /> AI 出题 · 发布给{selectedName || "孩子"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <select value={aiKind} onChange={(e) => setAiKind(e.target.value)} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              <option value="mental-math">口算（数学）</option>
              <option value="math-word-problem">应用题（数学）</option>
              <option value="word-spell">单词拼写（英语）</option>
              <option value="english-choice">英语选择（英语）</option>
              <option value="dictation">古诗默写（语文）</option>
              <option value="chinese-fill">语文填空（语文）</option>
            </select>
            <select value={aiDifficulty} onChange={(e) => setAiDifficulty(Number(e.target.value))} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              <option value={1}>难度：基础</option>
              <option value={2}>难度：中等</option>
              <option value={3}>难度：挑战</option>
            </select>
            <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm">
              <option value={5}>5 题</option>
              <option value={8}>8 题</option>
              <option value={10}>10 题</option>
              <option value={15}>15 题</option>
            </select>
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="知识点/主题（可选）"
              className="px-3 py-2.5 rounded-2xl bg-cream outline-none text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft px-1 cursor-pointer">
            <input
              type="checkbox"
              checked={aiFromWrong}
              onChange={(e) => setAiFromWrong(e.target.checked)}
              className="w-4 h-4 accent-purple"
            />
            针对孩子错题出题
          </label>
          <button
            onClick={async () => {
              if (!filterChild || aiBusy) return;
              setAiBusy(true);
              try {
                await api("/api/ai/generate-tasks", {
                  method: "POST",
                  body: JSON.stringify({
                    childId: filterChild,
                    kind: aiKind,
                    count: aiCount,
                    difficulty: aiDifficulty,
                    topic: aiTopic.trim(),
                    fromWrong: aiFromWrong,
                  }),
                });
                setToast("AI 已出题，孩子打开「每日练习」即可作答");
                setTimeout(() => setToast(""), 3000);
                setShowAi(false);
              } catch (e) {
                setToast((e as Error).message);
              } finally {
                setAiBusy(false);
              }
            }}
            disabled={aiBusy}
            className="w-full bg-purple text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {aiBusy ? (
              <>
                <RefreshCw size={15} className="animate-spin" /> AI 出题中…
              </>
            ) : (
              <>
                <FileQuestion size={15} /> 生成练习
              </>
            )}
          </button>
          <p className="text-xs text-ink-soft">题目由 DeepSeek AI 根据年级和所选参数实时生成，孩子完成后自动评分、错题自动进错题本</p>
        </div>
      )}

      {/* 任务列表 */}
      <div className="bg-white rounded-3xl p-5 shadow-card">
        <h3 className="font-bold text-ink mb-3">{selectedName ? `${selectedName} 的任务` : "任务列表"}</h3>
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-cream-deep last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.title}</div>
                <div className="text-xs text-ink-soft">
                  {TYPES.find((x) => x.key === t.type)?.label ?? t.type}
                  {t.due_date && ` · ${t.due_date}截止`}
                </div>
              </div>
              <span className={`text-xs rounded-xl px-2.5 py-1 shrink-0 ${
                t.status === "done"
                  ? "bg-mint-soft text-mint-dark"
                  : t.status === "pending"
                  ? "bg-sunny-soft text-amber-600"
                  : "bg-cream text-ink-soft"
              }`}>
                {t.status === "done" ? "已完成" : t.status === "pending" ? "待确认" : "待完成"}
              </span>
              {t.status === "pending" && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={async () => { try { await api(`/api/tasks/${t.id}`, { method: "POST", body: JSON.stringify({ action: "approve" }) }); setToast("已确认，积分到账"); } catch (e) { setToast((e as Error).message || "确认失败，请重试"); } setTimeout(() => setToast(""), 2000); loadTasks(); }}
                    className="bg-mint text-white rounded-lg px-2 py-1 text-xs flex items-center gap-0.5"
                  >
                    <CheckCircle2 size={12} /> 确认
                  </button>
                  <button
                    onClick={async () => { try { await api(`/api/tasks/${t.id}`, { method: "POST", body: JSON.stringify({ action: "reject" }) }); setToast("已驳回，任务回到待完成"); } catch (e) { setToast((e as Error).message || "驳回失败，请重试"); } setTimeout(() => setToast(""), 2000); loadTasks(); }}
                    className="bg-peach text-white rounded-lg px-2 py-1 text-xs flex items-center gap-0.5"
                  >
                    <XCircle size={12} /> 驳回
                  </button>
                </div>
              )}
              <span className="text-sm font-bold text-amber-600 shrink-0">+{t.points}</span>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-sm text-ink-soft text-center py-4">选择孩子查看任务，或布置一个新任务</div>
          )}
        </div>
      </div>
    </div>
  );
}
