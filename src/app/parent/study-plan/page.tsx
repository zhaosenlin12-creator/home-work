"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Plus,
  Trash2,
  Pencil,
  CalendarDays,
  BookOpen,
  Clock,
  Star,
  X,
  Check,
  CalendarClock,
  RefreshCw,
  ChevronDown,
  User,
} from "lucide-react";

type Child = { id: number; name: string; grade: string };
type Plan = {
  id: number;
  child_id: number;
  weekday: number;
  title: string;
  subject: string;
  duration_min: number;
  points: number;
  active: number;
  done_count: number;
  needs_review?: number;
};
type PendingLog = {
  log_id: number;
  plan_id: number;
  child_id: number;
  child_name: string;
  title: string;
  subject: string;
  points: number;
  done_date: string;
  created_at: string;
};

const WEEKDAYS = [
  { v: 0, label: "每天" },
  { v: 1, label: "周一" },
  { v: 2, label: "周二" },
  { v: 3, label: "周三" },
  { v: 4, label: "周四" },
  { v: 5, label: "周五" },
  { v: 6, label: "周六" },
  { v: 7, label: "周日" },
];

const SUBJECTS = [
  { key: "study", label: "学习" },
  { key: "reading", label: "阅读" },
  { key: "math", label: "数学" },
  { key: "english", label: "英语" },
  { key: "chinese", label: "语文" },
  { key: "sport", label: "运动" },
  { key: "art", label: "艺术" },
  { key: "housework", label: "家务" },
];

const SUBJECT_COLORS: Record<string, string> = {
  study: "bg-secondary/15 text-secondary-deep",
  reading: "bg-purple/15 text-purple",
  math: "bg-primary/15 text-primary",
  english: "bg-warning/15 text-warning",
  chinese: "bg-coral/15 text-coral",
  sport: "bg-success/15 text-success",
  art: "bg-pink/15 text-pink",
  housework: "bg-sky/15 text-sky",
};

export default function ParentStudyPlan() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<number>(0);
  const [weekday, setWeekday] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState("");
  
  // 待审核
  const [pending, setPending] = useState<PendingLog[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // 表单
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("study");
  const [durationMin, setDurationMin] = useState(30);
  const [points, setPoints] = useState(10);
  const [needsReview, setNeedsReview] = useState(true);

  async function loadChildren() {
    const d = await api<{ children: Child[] }>("/api/children");
    setChildren(d.children);
    if (d.children.length > 0) setChildId((c) => c || d.children[0].id);
  }

  async function loadPlans(cid: number, p: number = 1) {
    if (!cid) return;
    const d = await api<{ plans: Plan[]; page: number; total: number; hasMore: boolean }>(
      `/api/study-plans?childId=${cid}&page=${p}&limit=20`
    );
    if (p === 1) {
      setPlans(d.plans);
    } else {
      setPlans((prev) => [...prev, ...d.plans]);
    }
    setPage(d.page);
    setTotal(d.total);
    setHasMore(d.hasMore);
  }

  async function loadPending() {
    setPendingLoading(true);
    try {
      const d = await api<{ pending: PendingLog[] }>("/api/study-plans?pending=1");
      setPending(d.pending);
    } catch (e) {
      console.error("loadPending error:", e);
    }
    setPendingLoading(false);
  }

  useEffect(() => {
    loadChildren();
    loadPending();
  }, []);

  useEffect(() => {
    if (childId) loadPlans(childId, 1);
  }, [childId]);

  const filtered = plans.filter((p) => p.weekday === weekday);

  function loadMore() {
    if (hasMore && childId) {
      loadPlans(childId, page + 1);
    }
  }

  async function addPlan() {
    if (!title.trim()) {
      setToast("请填写计划标题");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    try {
      await api("/api/study-plans", {
        method: "POST",
        body: JSON.stringify({ childId, weekday, title, subject, durationMin, points, needsReview: needsReview ? 1 : 0 }),
      });
      setToast("已添加学习计划");
      setTimeout(() => setToast(""), 2000);
      setShowForm(false);
      setTitle("");
      setEditing(null);
      loadPlans(childId, 1);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  async function updatePlan() {
    if (!editing) return;
    if (!title.trim()) {
      setToast("请填写计划标题");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    try {
      await api(`/api/study-plans/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, subject, durationMin, points }),
      });
      setToast("已保存");
      setTimeout(() => setToast(""), 2000);
      setEditing(null);
      setShowForm(false);
      setTitle("");
      loadPlans(childId, 1);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  async function deletePlan(planId: number) {
    try {
      await api(`/api/study-plans/${planId}`, { method: "DELETE" });
      setToast("已删除");
      setTimeout(() => setToast(""), 2000);
      loadPlans(childId, 1);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  async function handleReview(logId: number, action: "approve" | "reject") {
    try {
      const r = await api<{ ok: boolean; action: string; reward?: number }>("/api/study-plans/review", {
        method: "POST",
        body: JSON.stringify({ 
          childId: pending.find(p => p.log_id === logId)?.child_id, 
          logId, 
          action 
        }),
      });
      if (r.ok) {
        setToast(action === "approve" ? `已批准 +${r.reward} 积分` : "已拒绝");
        setTimeout(() => setToast(""), 2000);
        loadPending();
        loadPlans(childId, 1);
      }
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setTitle(p.title);
    setSubject(p.subject);
    setDurationMin(p.duration_min);
    setPoints(p.points);
    setShowForm(true);
  }

  const activeChild = children.find((c) => c.id === childId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink flex items-center gap-1.5">
          <CalendarClock size={20} className="text-secondary-deep" /> 学习计划
        </h2>
        <button
          onClick={() => {
            loadPending();
          }}
          className="bg-amber-100 text-amber-700 rounded-2xl px-3 py-2 text-sm font-semibold flex items-center gap-1 hover:bg-amber-200"
        >
          <RefreshCw size={14} /> 审核 {pending.length > 0 && <span className="bg-coral text-white text-xs px-1.5 rounded-full">{pending.length}</span>}
        </button>
      </div>

      {toast && (
        <div className="bg-mint-soft text-mint-dark rounded-2xl px-4 py-3 text-center font-semibold animate-pop border border-mint/30">
          {toast}
        </div>
      )}

      {/* 待审核列表 */}
      {pending.length > 0 && (
        <div className="bg-amber-50 rounded-3xl p-4 shadow-card border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Check size={18} /> 待审核打卡 ({pending.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pending.map((p) => (
              <div key={p.log_id} className="bg-white rounded-2xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-ink-soft" />
                    <span className="text-xs text-ink-soft">{p.child_name}</span>
                  </div>
                  <div className="font-medium text-ink truncate">{p.title}</div>
                  <div className="text-xs text-ink-soft flex items-center gap-2">
                    <span>{p.done_date}</span>
                    <Star size={10} className="text-warning" /> {p.points} 积分
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(p.log_id, "approve")}
                    className="bg-mint text-white rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReview(p.log_id, "reject")}
                    className="bg-peach-soft text-coral rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 孩子选择 */}
      <div className="bg-white rounded-3xl p-4 shadow-card">
        <label className="text-xs text-ink-soft">选择孩子</label>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setChildId(c.id)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                childId === c.id
                  ? "bg-mint text-white shadow-card"
                  : "bg-cream text-ink-soft hover:bg-mint-soft"
              }`}
            >
              {c.name} · {c.grade}
            </button>
          ))}
        </div>
      </div>

      {/* 星期切换 */}
      <div className="bg-white rounded-3xl p-4 shadow-card">
        <div className="flex gap-1.5 overflow-x-auto">
          {WEEKDAYS.map((w) => (
            <button
              key={w.v}
              onClick={() => setWeekday(w.v)}
              className={`px-3.5 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                weekday === w.v
                  ? "bg-secondary text-white shadow-card"
                  : "bg-cream text-ink-soft hover:bg-mint-soft"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* 添加计划按钮 */}
      <button
        onClick={() => {
          setEditing(null);
          setTitle("");
          setSubject("study");
          setDurationMin(30);
          setPoints(10);
          setNeedsReview(true);
          setShowForm(true);
        }}
        className="w-full bg-mint text-white rounded-3xl py-3 text-sm font-bold flex items-center justify-center gap-1 hover-lift shadow-card"
      >
        <Plus size={18} /> 添加学习计划
      </button>

      {/* 表单 */}
      {showForm && (
        <div className="bg-white rounded-3xl p-5 shadow-card animate-pop space-y-3 border border-cream">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink">
              {editing ? "编辑计划" : `添加计划 · ${WEEKDAYS.find((w) => w.v === weekday)?.label} · ${activeChild?.name ?? ""}`}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="w-7 h-7 rounded-full bg-cream text-ink-soft flex items-center justify-center"
            >
              <X size={15} />
            </button>
          </div>
          <div>
            <label className="text-xs text-ink-soft">计划标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：读《西游记》两章"
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-cream outline-none focus:border-2 focus:border-mint"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-ink-soft">学科</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1 px-3 py-3 rounded-2xl bg-cream outline-none"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-soft">时长(分)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                min={5}
                max={240}
                className="w-full mt-1 px-3 py-3 rounded-2xl bg-cream outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink-soft">积分</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full mt-1 px-3 py-3 rounded-2xl bg-cream outline-none"
              />
            </div>
          </div>
          {/* 审核功能已移除：孩子完成计划后直接获得积分 */}
          <button
            onClick={editing ? updatePlan : addPlan}
            className="w-full bg-mint text-white rounded-2xl py-3 font-bold hover-lift shadow-card"
          >
            {editing ? "保存修改" : "添加"}
          </button>
        </div>
      )}

      {/* 计划列表 */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center text-ink-soft shadow-card">
            这个星期还没有安排计划，点上方添加吧
          </div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-3xl p-4 shadow-card hover-lift">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${SUBJECT_COLORS[p.subject] ?? SUBJECT_COLORS.study}`}>
                <BookOpen size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink truncate">{p.title}</div>
                <div className="flex items-center gap-3 text-xs text-ink-soft mt-0.5 flex-wrap">
                  <span className="flex items-center gap-0.5">
                    <Clock size={11} /> {p.duration_min} 分钟
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Star size={11} className="text-warning" /> {p.points} 积分
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Check size={11} className="text-success" /> 已打卡 {p.done_count} 次
                  </span>
                  {(p.needs_review ?? 1) === 1 && (
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs">需审核</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => openEdit(p)}
                className="text-xs bg-sky-soft text-ink rounded-xl px-3 py-2 hover-lift flex items-center gap-1"
              >
                <Pencil size={12} /> 编辑
              </button>
              <button
                onClick={() => deletePlan(p.id)}
                className="text-xs bg-peach-soft text-coral rounded-xl px-3 py-2 hover-lift flex items-center gap-1"
              >
                <Trash2 size={12} /> 删除
              </button>
            </div>
          </div>
        ))}
        
        {/* 加载更多 */}
        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full bg-cream text-ink-soft rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-1 hover:bg-mint-soft"
          >
            <ChevronDown size={16} /> 加载更多 ({plans.length}/{total})
          </button>
        )}
      </div>

      <p className="text-center text-xs text-ink-soft flex items-center justify-center gap-1">
        <CalendarDays size={12} /> 孩子每天登录会看到「今日学习计划」
      </p>
    </div>
  );
}
