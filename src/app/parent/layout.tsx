"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, ListChecks, Medal, BookOpen, CalendarClock, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { LogoTree } from "@/components/icons";

const NAV = [
  { key: "/parent/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { key: "/parent/children", label: "孩子管理", icon: Users },
  { key: "/parent/tasks", label: "任务管理", icon: ListChecks },
  { key: "/parent/study-plan", label: "学习计划", icon: CalendarClock },
  { key: "/parent/textbooks", label: "教材", icon: BookOpen },
  { key: "/parent/badges", label: "勋章奖励", icon: Medal },
];

export default function ParentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ name: string } | null>(null);

  useEffect(() => {
    api<{ type: string; name: string }>("/api/auth/me")
      .then((d) => {
        // 角色隔离：家长端只允许家长 session，孩子 session 踢回登录
        if (d.type !== "parent") {
          router.replace("/login");
          return;
        }
        setMe(d as never);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 glass-strong rounded-b-3xl">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoTree size={34} />
            <span className="font-extrabold text-ink">森霖 · 家长端</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft hidden sm:block">
              {me ? `你好，${me.name}` : "加载中…"}
            </span>
            <button
              onClick={logout}
              className="text-sm text-coral flex items-center gap-1 hover:underline font-medium"
            >
              <LogOut size={15} /> 退出
            </button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const active = pathname === n.key;
            const Icon = n.icon;
            return (
              <Link
                key={n.key}
                href={n.key}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition-all ${
                  active
                    ? "border-mint text-ink bg-mint-soft/50"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}