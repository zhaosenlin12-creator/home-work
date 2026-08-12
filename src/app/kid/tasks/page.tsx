"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import {
  Plus,
  Check,
  RotateCcw,
  BookOpen,
  Footprints,
  Home,
  BookMarked,
  Palette,
  Pin,
  X,
} from "lucide-react";

type Task = {
  id: number;
  child_id: number;
  title: string;
  description: string;
  type: string;
  points: number;
  status: "todo" | "pending" | "done";
  due_date: string;
};

const TYPE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string; color: string }> = {
  study: { icon: BookOpen, label: "学习", color: "text-blue" },
  sport: { icon: Footprints, label: "运动", color: "text-success" },
  housework: { icon: Home, label: "家务", color: "text-warning" },
  reading: { icon: BookMarked, label: "阅读", color: "text-purple" },
  art: { icon: Palette, label: "艺术", color: "text-primary" },
};

export default function KidTasks() {
  const { refresh: refreshPoints } = usePoints();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [me, setMe] = useState<{ id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("10");
  const [type, setType] = useState("study");

  async function load() {
    try {
      const meRes = await api<{ type: string; id: number }>("/api/auth/me");
      setMe(meRes as never);
      const d = await api<{ tasks: Task[] }>(`/api/tasks?childId=${meRes.id}`);
      setTasks(d.tasks);
      setError("");
    } catch {
      setError("任务加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(task: Task) {
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "POST",
        body: JSON.stringify({ action: task.status === "todo" ? "complete" : "uncomplete" }),
      });
      refreshPoints();
      load();
    } catch (e) {
      setError((e as Error).message || "操作失败，请稍后重试");
    }
  }

  async function createTask() {
    if (!title.trim() || !me) return;
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, title, points: Number(points), type }),
      });
      setTitle("");
      setShowForm(false);
      refreshPoints();
      load();
    } catch (e) {
      setError((e as Error).message || "发布失败，请稍后重试");
    }
  }

  const todo = tasks.filter((t) => t.status === "todo");
  const pending = tasks.filter((t) => t.status === "pending");
  const done = tasks.filter((t) => t.status === "done");

  if (loading) return <div className="text-center py-20 text-ink-soft">加载中…</div>;

  if (error && tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-ink-soft">{error}</div>
        <button onClick={() => { setLoading(true); load(); }} className="btn-game btn-secondary mt-4 text-sm">
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 操作失败提示 */}
      {error && tasks.length > 0 && (
        <div className="bg-peach-soft border border-coral/30 text-coral rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-between gap-2 animate-pop">
          <span>{error}</span>
          <button onClick={() => setError("")} className="shrink-0 text-coral/70 hover:text-coral">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink">我的任务墙</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-game btn-secondary px-4 py-2 text-sm"
        >
          <Plus size={16} /> 心愿任务
        </button>
      </div>

      {/* 等待家长确认 */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-ink text-sm">等待家长确认</h3>
          {pending.map((t) => {
            const meta = TYPE_META[t.type] ?? { icon: Pin, label: t.type, color: "text-ink-soft" };
            const Icon = meta.icon;
            return (
              <div key={t.id} className="glass rounded-3xl p-4 flex items-center gap-3 opacity-80">
                <div className="w-9 h-9 rounded-full bg-sunny-soft flex items-center justify-center text-amber-600 shrink-0">
                  <span className="text-xs font-bold">审</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-ink">{t.title}</div>
                  <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                    <span className={`flex items-center gap-1 ${meta.color}`}>
                      <Icon size={13} /> {meta.label}
                    </span>
                    <span className="text-amber-600">等待妈妈/爸爸确认</span>
                  </div>
                </div>
                <div className="bg-sunny-soft rounded-xl px-2.5 py-1 text-xs font-extrabold text-amber-700 shrink-0">
                  +{t.points}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="glass-strong rounded-3xl p-4 animate-pop space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="我想完成的愿望任务…"
            className="w-full px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-secondary"
          />
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-2xl bg-white/70 outline-none text-sm border border-white/80"
            >
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-20 px-3 py-2.5 rounded-2xl bg-white/70 outline-none text-sm text-center border border-white/80"
            />
            <button
              onClick={createTask}
              className="btn-game btn-primary px-4 text-sm"
            >
              发布
            </button>
          </div>
        </div>
      )}

      {/* 待完成 */}
      <div className="space-y-3">
        {todo.map((t) => {
          const meta = TYPE_META[t.type] ?? { icon: Pin, label: t.type, color: "text-ink-soft" };
          const Icon = meta.icon;
          return (
            <div key={t.id} className="glass-strong rounded-3xl p-4 flex items-center gap-3 animate-pop">
              <button
                onClick={() => toggle(t)}
                className="w-9 h-9 rounded-full border-2 border-secondary flex items-center justify-center text-transparent hover:bg-secondary/15 transition-all shrink-0"
              >
                <Check size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-ink">{t.title}</div>
                <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                  <span className={`flex items-center gap-1 ${meta.color}`}>
                    <Icon size={13} /> {meta.label}
                  </span>
                  {t.due_date && <span>· {t.due_date}</span>}
                </div>
              </div>
              <div className="bg-accent/20 rounded-xl px-2.5 py-1 text-sm font-extrabold text-warning shrink-0 flex items-center gap-1">
                +{t.points}
              </div>
            </div>
          );
        })}
        {todo.length === 0 && (
          <div className="glass rounded-3xl p-6 text-center text-ink-soft">
            太棒了，没有待办任务！
          </div>
        )}
      </div>

      {/* 已完成 */}
      {done.length > 0 && (
        <div>
          <h3 className="font-bold text-ink mb-2">已完成</h3>
          <div className="space-y-2">
            {done.slice(0, 8).map((t) => (
              <div key={t.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3 opacity-70">
                <button
                  onClick={() => toggle(t)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white shrink-0"
                >
                  <RotateCcw size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-through truncate text-ink">{t.title}</div>
                </div>
                <span className="text-xs text-ink-soft shrink-0">已得 +{t.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}