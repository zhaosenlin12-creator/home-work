"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import LanQRCode from "@/components/LanQRCode";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import {
  Users,
  CheckCircle2,
  BookOpen,
  Award,
  Gift,
  Trophy,
  Medal,
  ListChecks,
  Star,
  Smartphone,
} from "lucide-react";

type Overview = {
  children: {
    id: number;
    name: string;
    avatar_emoji: string;
    avatar_image: string;
    grade: string;
    points: number;
    done_count: number;
    todo_count: number;
  }[];
  todayDone: number;
  wrongCount: number;
  badgeCount: number;
  recentTasks: {
    id: number;
    title: string;
    status: string;
    child_name: string;
    avatar_emoji: string;
    avatar_image: string;
    points: number;
  }[];
  claims: { claimed_at: string; title: string; icon: string; child_name: string }[];
};

export default function ParentDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  // 跨端自动刷新：孩子完成任务/兑换奖励后家长看板自动更新
  usePolling(load, 30_000);

  async function load() {
    try {
      const d = await api<Overview>("/api/parent/overview");
      setData(d);
      setError("");
    } catch {
      if (!data) setError("仪表盘加载失败，请刷新重试");
    }
  }

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <div className="text-ink-soft">{error}</div>
        <button onClick={() => location.reload()} className="btn-game btn-secondary mt-4 text-sm">
          重新加载
        </button>
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-ink-soft">加载中…</div>;

  const stats = [
    { icon: Users, value: data.children.length, label: "孩子", cls: "bg-success/15 text-success" },
    { icon: CheckCircle2, value: data.todayDone, label: "今日完成", cls: "bg-accent/20 text-warning" },
    { icon: BookOpen, value: data.wrongCount, label: "错题", cls: "bg-primary/15 text-primary" },
    { icon: Award, value: data.badgeCount, label: "已发勋章", cls: "bg-purple/15 text-purple" },
  ];

  return (
    <div className="space-y-6">
      {/* 手机扫码快捷入口 */}
      <div className="glass-strong rounded-3xl p-4 flex items-center gap-4">
        <LanQRCode size={88} showText={false} />
        <div className="flex-1 text-sm text-ink/80 leading-relaxed">
          <div className="font-bold text-ink mb-1 flex items-center gap-1.5">
            <Smartphone size={15} className="text-mint-dark" /> 手机端访问
          </div>
          孩子手机连同一 Wi-Fi 后扫码进入学习空间；
          浏览器打开后点「添加到主屏幕」，即可像 App 一样使用。
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`glass-strong rounded-3xl p-5 hover-lift ${s.cls}`}>
              <Icon size={20} />
              <div className="text-3xl font-extrabold tabular-nums mt-1">{s.value}</div>
              <div className="text-xs mt-1 opacity-80">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="glass-strong rounded-3xl p-5">
        <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-warning" /> 孩子积分榜
        </h3>
        <div className="space-y-3">
          {data.children.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/50 backdrop-blur border border-white/70"
            >
              <span className="w-8 text-center">
                {i === 0 ? (
                  <Medal size={24} className="text-warning inline" />
                ) : i === 1 ? (
                  <Medal size={24} className="text-ink-soft inline" />
                ) : i === 2 ? (
                  <Medal size={24} className="text-warning/60 inline" />
                ) : (
                  <span className="text-sm font-extrabold text-ink-soft">#{i + 1}</span>
                )}
              </span>
              <Avatar image={c.avatar_image} emoji={c.avatar_emoji} size={52} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink">{c.name}</div>
                <div className="text-xs text-ink-soft">
                  {c.grade} · 已完成 {c.done_count} · 待做 {c.todo_count}
                </div>
              </div>
              <div className="text-xl font-extrabold text-warning tabular-nums flex items-center gap-1">
                <Star size={16} fill="currentColor" /> {c.points}
              </div>
              <Link
                href={`/parent/tasks?childId=${c.id}`}
                className="btn-game btn-secondary px-3 py-1.5 text-xs"
              >
                看任务
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-strong rounded-3xl p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <ListChecks size={18} className="text-secondary-deep" /> 最近任务
          </h3>
          <div className="space-y-2">
            {data.recentTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 py-2.5 border-b border-white/60 last:border-0"
              >
                <Avatar image={t.avatar_image} emoji={t.avatar_emoji} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-ink">{t.title}</div>
                  <div className="text-xs text-ink-soft">{t.child_name}</div>
                </div>
                <span
                  className={`text-xs rounded-xl px-2.5 py-1 font-bold ${
                    t.status === "done"
                      ? "bg-success/15 text-success"
                      : "bg-accent/20 text-warning"
                  }`}
                >
                  {t.status === "done" ? "已完成" : "待完成"}
                </span>
                <span className="text-sm font-bold text-warning shrink-0">+{t.points}</span>
              </div>
            ))}
            {data.recentTasks.length === 0 && (
              <div className="text-sm text-ink-soft py-4 text-center">还没有任务</div>
            )}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <Gift size={18} className="text-primary" /> 兑换动态
          </h3>
          <div className="space-y-2">
            {data.claims.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 border-b border-white/60 last:border-0"
              >
                <span className="w-9 h-9 rounded-xl bg-gradient-to-b from-white/80 to-primary/10 flex items-center justify-center">
                  <Gift size={18} className="text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{c.title}</div>
                  <div className="text-xs text-ink-soft">
                    {c.child_name} · {c.claimed_at.slice(0, 16).replace("T", " ")}
                  </div>
                </div>
              </div>
            ))}
            {data.claims.length === 0 && (
              <div className="text-sm text-ink-soft py-4 text-center">还没有兑换记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}