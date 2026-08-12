"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ListChecks, Timer, PawPrint, User, Star, BookOpen, Gift } from "lucide-react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { PointsProvider, usePoints } from "@/lib/points-context";

const TABS = [
  { key: "/kid/home", label: "首页", icon: Home },
  { key: "/kid/tasks", label: "任务", icon: ListChecks },
  { key: "/kid/pomodoro", label: "番茄钟", icon: Timer },
  { key: "/kid/pet", label: "宠物", icon: PawPrint },
  { key: "/kid/textbooks", label: "教材", icon: BookOpen },
  { key: "/kid/rewards", label: "兑换", icon: Gift },
  { key: "/kid/profile", label: "我的", icon: User },
];

export default function KidLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PointsProvider>
      <KidShell>{children}</KidShell>
    </PointsProvider>
  );
}

function KidShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { points, refresh } = usePoints();
  const [me, setMe] = useState<
    | { name: string; avatar_emoji: string; avatar_image: string }
    | null
  >(null);

  useEffect(() => {
    api<{ type: string; name: string; avatar_emoji: string; avatar_image: string }>(
      "/api/auth/me"
    )
      .then((d) => {
        // 角色隔离：孩子端只允许孩子 session，家长 session 踢回登录
        if (d.type !== "child") {
          router.replace("/login");
          return;
        }
        setMe(d as never);
        refresh();
      })
      .catch(() => router.replace("/login"));
  }, [router, refresh]);

  const activeKey =
    TABS.find((t) => pathname === t.key)?.key ??
    (pathname.startsWith("/kid") ? pathname : "/kid/home");

  return (
    <div className="max-w-md mx-auto min-h-screen relative">
      <header className="sticky top-0 z-20 px-5 pt-4 pb-3 flex items-center justify-between glass-strong rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Avatar image={me?.avatar_image} emoji={me?.avatar_emoji} size={48} />
          <div>
            <div className="font-bold text-ink">
              {me ? `${me.name} 的学习空间` : "加载中…"}
            </div>
            <div className="text-xs text-ink-soft">今天也要加油哦</div>
          </div>
        </div>
        <div className="bg-accent/25 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 border border-accent/40">
          <Star size={16} className="text-warning" fill="currentColor" />
          <span className="font-extrabold text-ink tabular-nums">{points ?? 0}</span>
        </div>
      </header>

      <main className="px-5 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 max-w-md mx-auto glass-strong rounded-t-3xl">
        <div className="grid grid-cols-7">
          {TABS.map((t) => {
            const active = activeKey === t.key;
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={t.key}
                className="flex flex-col items-center py-2.5 gap-0.5"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.6 : 2}
                  className={active ? "text-secondary-deep" : "text-ink-soft"}
                />
                <span
                  className={`text-[11px] ${active ? "text-secondary-deep font-bold" : "text-ink-soft"}`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}