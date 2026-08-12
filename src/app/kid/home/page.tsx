"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import {
  CheckCircle2,
  Star,
  Award,
  Calculator,
  BookOpen,
  Flower2,
  Gift,
  Sparkles,
  ArrowRight,
  Lightbulb,
  CalendarClock,
  Check,
  Clock,
} from "lucide-react";
import { PlantIcon, type PlantType } from "@/components/icons";

type Summary = {
  child: {
    id: number;
    name: string;
    avatar_emoji: string;
    avatar_image: string;
    points: number;
    grade: string;
  };
  todoCount: number;
  todayDone: number;
  pet: {
    name: string;
    species: string;
    level: number;
    avatar_image: string;
  } | null;
  plants: { plant_type: PlantType; stage: number } | null;
  badgeCount: number;
};

export default function KidHome() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Summary>("/api/kid/summary")
      .then(setData)
      .catch(() => setError("加载失败，请刷新重试"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-ink-soft">加载中…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="text-ink-soft">{error || "暂无数据"}</div>
        <button onClick={() => location.reload()} className="btn-game btn-secondary mt-4 text-sm">
          重新加载
        </button>
      </div>
    );
  }

  const quickEntries = [
    { href: "/kid/practice", icon: Calculator, label: "每日练习", cls: "bg-secondary/15 text-secondary-deep" },
    { href: "/kid/diary", icon: BookOpen, label: "写日记", cls: "bg-warning/15 text-warning" },
    { href: "/kid/garden", icon: Flower2, label: "小花园", cls: "bg-success/15 text-success" },
    { href: "/kid/rewards", icon: Gift, label: "兑换奖励", cls: "bg-primary/15 text-primary" },
    { href: "/kid/ai", icon: Sparkles, label: "AI 助手", cls: "bg-purple/15 text-purple" },
  ];

  const rarityCls =
    (data?.pet?.level ?? 0) >= 5
      ? "rarity-legendary"
      : (data?.pet?.level ?? 0) >= 4
      ? "rarity-epic"
      : (data?.pet?.level ?? 0) >= 3
      ? "rarity-rare"
      : "rarity-common";

  return (
    <div className="space-y-5">
      {/* Hero 横幅（玻璃拟态） */}
      <div className="relative glass rounded-3xl p-5 overflow-hidden">
        <div className="absolute -right-6 -top-8 w-32 h-32 rounded-full bg-sky/25 blur-2xl" />
        <div className="absolute right-8 bottom-2 w-16 h-16 rounded-full bg-accent/30 blur-xl" />
        <h2 className="text-xl font-extrabold text-ink">你好，{data?.child.name}！</h2>
        <p className="text-sm mt-1 text-ink/70">
          今天还有 <strong>{data?.todoCount}</strong> 个任务等着你
        </p>
        <div className="flex gap-3 mt-4 relative z-10">
          <div className="flex-1 bg-white/55 backdrop-blur rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/70">
            <CheckCircle2 size={20} className="text-success" />
            <div>
              <div className="text-lg font-extrabold leading-none tabular-nums">
                {data?.todayDone}
              </div>
              <div className="text-[11px] text-ink-soft">今日完成</div>
            </div>
          </div>
          <div className="flex-1 bg-white/55 backdrop-blur rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/70">
            <Star size={20} className="text-warning" fill="currentColor" />
            <div>
              <div className="text-lg font-extrabold leading-none tabular-nums">
                {data?.child.points}
              </div>
              <div className="text-[11px] text-ink-soft">我的积分</div>
            </div>
          </div>
          <div className="flex-1 bg-white/55 backdrop-blur rounded-2xl px-3 py-2 flex items-center gap-2 border border-white/70">
            <Award size={20} className="text-purple" />
            <div>
              <div className="text-lg font-extrabold leading-none tabular-nums">
                {data?.badgeCount}
              </div>
              <div className="text-[11px] text-ink-soft">勋章</div>
            </div>
          </div>
        </div>
      </div>

      {/* 今日学习计划 */}
      <TodayPlanCard />

      {/* 宠物 + 花园（大 hero 图 + 稀有度） */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/kid/pet"
          className="glass rounded-3xl p-3 hover-lift overflow-hidden"
        >
          <div className="aspect-square w-full bg-gradient-to-b from-white/80 to-secondary/15 rounded-2xl overflow-hidden flex items-center justify-center relative">
            {data?.pet?.avatar_image ? (
              <img
                src={data.pet.avatar_image}
                alt={data.pet.name}
                className="w-full h-full object-contain pet-illustration animate-pet-bob"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-white/80 to-secondary/15 rounded-2xl" />
            )}
            <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${rarityCls}`}>
              Lv.{data?.pet?.level ?? 1}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="font-bold text-ink truncate">{data?.pet?.name ?? "小伴"}</div>
            <ArrowRight size={15} className="text-ink-soft shrink-0" />
          </div>
          <div className="text-xs text-ink-soft">我的宠物</div>
        </Link>

        <Link
          href="/kid/garden"
          className="glass rounded-3xl p-3 hover-lift overflow-hidden"
        >
          <div className="aspect-square w-full bg-gradient-to-b from-white/80 to-sky/15 rounded-2xl overflow-hidden flex items-center justify-center relative">
            <PlantIcon
              type={data?.plants?.plant_type ?? "tree"}
              stage={data?.plants?.stage ?? 1}
              size={92}
            />
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-secondary text-white px-2 py-0.5 rounded-full">
              {data?.plants ? `阶段 ${data.plants.stage}` : "空"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="font-bold text-ink">我的花园</div>
            <ArrowRight size={15} className="text-ink-soft shrink-0" />
          </div>
          <div className="text-xs text-ink-soft">浇水让它长大</div>
        </Link>
      </div>

      {/* 快捷入口 */}
      <div>
        <h3 className="font-bold text-ink mb-2">快去做什么？</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickEntries.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className={`${q.cls} rounded-2xl p-3 flex flex-col items-center gap-1.5 hover-lift`}
              >
                <Icon size={22} />
                <span className="text-[11px] font-bold">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 提示卡 */}
      <div className="glass rounded-3xl p-4">
        <h3 className="font-bold text-ink mb-1.5 flex items-center gap-1.5">
          <Lightbulb size={16} className="text-warning" /> 小贴士
        </h3>
        <p className="text-sm text-ink/80">
          {data && data.todoCount > 0
            ? `还有 ${data.todoCount} 个任务没完成，做完一个就能给宠物喂食涨经验哦！`
            : "今天任务都完成啦，真棒！去奖励中心看看能换什么吧～"}
        </p>
      </div>
    </div>
  );
}

/* ===== 今日学习计划卡片 ===== */
type TodayPlan = {
  id: number;
  title: string;
  subject: string;
  duration_min: number;
  points: number;
  done: number;
  pending?: number;
};

function TodayPlanCard() {
  const [data, setData] = useState<{ plans: TodayPlan[]; doneCount: number; pendingCount: number; total: number } | null>(null);
  const [toast, setToast] = useState("");
  const { refresh: refreshPoints } = usePoints();

  async function load() {
    try {
      const d = await api<{ plans: TodayPlan[]; doneCount: number; pendingCount: number; total: number }>(
        "/api/kid/study-plan"
      );
      setData(d);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!data || data.total === 0) return null;

  async function checkin(planId: number) {
    if (!data) return;
    try {
      const r = await api<{ reward: number; pending?: boolean; message?: string }>("/api/kid/study-plan/checkin", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      if (r.pending) {
        setToast(r.message || "等待家长审核");
      } else {
        setToast(`完成「${data.plans.find((p) => p.id === planId)?.title ?? ""}」+${r.reward} 积分`);
      }
      setTimeout(() => setToast(""), 2500);
      refreshPoints();
      load();
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  const subjectColor: Record<string, string> = {
    study: "bg-secondary/15 text-secondary-deep",
    reading: "bg-purple/15 text-purple",
    math: "bg-primary/15 text-primary",
    english: "bg-warning/15 text-warning",
    chinese: "bg-coral/15 text-coral",
    sport: "bg-success/15 text-success",
    art: "bg-pink/15 text-pink",
    housework: "bg-sky/15 text-sky",
  };

  return (
    <div className="glass rounded-3xl p-4 border border-secondary/20 relative overflow-hidden">
      <div className="absolute -right-5 -top-6 w-24 h-24 rounded-full bg-secondary/15 blur-xl" />
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-ink flex items-center gap-1.5">
          <CalendarClock size={17} className="text-secondary-deep" /> 今日学习计划
        </h3>
        <span className="text-xs font-bold text-secondary-deep bg-secondary/15 rounded-full px-2.5 py-0.5">
          完成 {data.doneCount}/{data.total}
          {data.pendingCount > 0 && <span className="ml-1 text-amber-600">({data.pendingCount}待审核)</span>}
        </span>
      </div>
      <div className="space-y-2">
        {data.plans.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2.5 rounded-2xl p-2.5 border ${
              p.pending === 1
                ? "bg-amber-50 border-amber-300"
                : p.done === 1
                ? "bg-success/10 border-success/25"
                : "bg-white/55 border-white/70"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${subjectColor[p.subject] ?? subjectColor.study}`}>
              <BookOpen size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold truncate ${p.done === 1 ? "text-ink-soft line-through" : "text-ink"}`}>
                {p.title}
              </div>
              <div className="text-[11px] text-ink-soft flex items-center gap-1.5">
                <Clock size={10} /> {p.duration_min} 分钟
                <span className="flex items-center gap-0.5 text-warning font-bold">
                  <Star size={10} fill="currentColor" /> {p.points}
                </span>
              </div>
            </div>
            {p.pending === 1 ? (
              <div className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0" title="等待审核">
                <Clock size={14} />
              </div>
            ) : p.done === 1 ? (
              <div className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center shrink-0">
                <Check size={16} />
              </div>
            ) : (
              <button
                onClick={() => checkin(p.id)}
                className="w-8 h-8 rounded-full bg-mint text-white flex items-center justify-center shrink-0 hover-lift"
                aria-label={`完成${p.title}`}
              >
                <Check size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {toast && (
        <div className="mt-2 text-xs font-bold text-mint-dark text-center animate-pop">{toast}</div>
      )}
    </div>
  );
}