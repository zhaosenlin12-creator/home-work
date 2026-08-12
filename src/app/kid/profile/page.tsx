"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  BookOpen,
  Flower2,
  Gift,
  Sparkles,
  Star,
  Award,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import BadgeIcon from "@/components/BadgeIcon";

type Me = {
  id: number;
  name: string;
  avatar_emoji: string;
  avatar_image: string;
  grade: string;
  points: number;
};
type Badge = { id: number; name: string; description: string; icon: string; earned: boolean };

export default function KidProfile() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then((d) => {
        setMe(d as never);
        return api<{ badges: Badge[] }>(`/api/badges?childId=${d.id}`);
      })
      .then((d) => setBadges(d.badges))
      .catch(() => {});
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const entries = [
    { href: "/kid/diary", icon: BookOpen, label: "写日记", cls: "text-warning" },
    { href: "/kid/garden", icon: Flower2, label: "小花园", cls: "text-success" },
    { href: "/kid/rewards", icon: Gift, label: "兑换奖励", cls: "text-primary" },
    { href: "/kid/ai", icon: Sparkles, label: "AI 助教", cls: "text-purple" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative glass-strong rounded-3xl p-5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky via-secondary to-accent" />
        <div className="absolute right-4 top-4 opacity-20 animate-float">
          <PawMark />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <Avatar image={me?.avatar_image} emoji={me?.avatar_emoji} size={88} />
          <div>
            <div className="text-xl font-extrabold text-ink">{me?.name}</div>
            <div className="text-sm text-ink-soft">{me?.grade} · 我的学习小天地</div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 relative z-10">
          <div className="flex-1 bg-white/55 backdrop-blur rounded-2xl px-4 py-2 text-center border border-white/70">
            <div className="text-xl font-extrabold tabular-nums flex items-center justify-center gap-1">
              <Star size={17} className="text-warning" fill="currentColor" /> {me?.points ?? 0}
            </div>
            <div className="text-xs text-ink-soft">积分</div>
          </div>
          <div className="flex-1 bg-white/55 backdrop-blur rounded-2xl px-4 py-2 text-center border border-white/70">
            <div className="text-xl font-extrabold tabular-nums flex items-center justify-center gap-1">
              <Award size={17} className="text-purple" /> {badges.filter((b) => b.earned).length}
            </div>
            <div className="text-xs text-ink-soft">勋章</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <Link
              key={e.href}
              href={e.href}
              className={`glass rounded-2xl p-3 flex flex-col items-center gap-1.5 hover-lift ${e.cls}`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-bold text-ink">{e.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="glass-strong rounded-3xl p-4">
        <h3 className="font-bold text-ink mb-3 flex items-center gap-1.5">
          <Award size={17} className="text-purple" /> 我的勋章墙
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {badges.length === 0 && (
            <div className="col-span-3 text-center text-xs text-ink-soft py-3">
              还没有勋章，等家长来发吧
            </div>
          )}
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl p-3 text-center ${
                b.earned ? "bg-accent/20" : "bg-white/40 opacity-60"
              }`}
              title={b.description}
            >
              <div className="flex justify-center h-9 items-center">
                {b.earned ? (
                  <BadgeIcon icon={b.icon} size={32} className="text-warning" />
                ) : (
                  <Lock size={26} className="text-ink-soft" />
                )}
              </div>
              <div className="text-[11px] font-semibold mt-1 text-ink">{b.name}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={logout}
        className="btn-game btn-primary w-full py-3.5"
      >
        <LogOut size={18} /> 退出登录
      </button>
    </div>
  );
}

function PawMark() {
  return (
    <svg width="88" height="88" viewBox="0 0 64 64" fill="currentColor">
      <ellipse cx="20" cy="24" rx="7" ry="8" />
      <ellipse cx="32" cy="16" rx="7" ry="8" />
      <ellipse cx="44" cy="24" rx="7" ry="8" />
      <ellipse cx="14" cy="36" rx="6" ry="7" />
      <ellipse cx="50" cy="36" rx="6" ry="7" />
      <ellipse cx="32" cy="44" rx="14" ry="12" />
    </svg>
  );
}