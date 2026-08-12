"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { LogoTree } from "@/components/icons";
import { UserRound, Baby, Lock } from "lucide-react";

type Kid = { name: string; avatar_emoji: string; avatar_image: string };

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"parent" | "kid">("parent");
  const [username, setUsername] = useState("demo");
  const [parentPw, setParentPw] = useState("123456");
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedKid, setSelectedKid] = useState("");
  const [kidPw, setKidPw] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ children: Kid[] }>("/api/public/children")
      .then((d) => {
        setKids(d.children);
        if (d.children.length > 0) setSelectedKid(d.children[0].name);
      })
      .catch(() => {});
  }, []);

  async function loginParent() {
    setError("");
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; type: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ mode: "parent", username, password: parentPw }),
      });
      if (res.ok) router.push("/parent/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loginKid() {
    if (!selectedKid) {
      setError("请选择孩子");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; type: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ mode: "child", name: selectedKid, password: kidPw }),
      });
      if (res.ok) router.push("/kid/home");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-strong rounded-3xl p-6 animate-modal-pop">
        <div className="text-center mb-6">
          <div className="inline-block animate-float">
            <LogoTree size={64} />
          </div>
          <h1 className="text-2xl font-extrabold text-ink mt-2">森霖 · 家庭学习</h1>
          <p className="text-sm text-ink-soft mt-1">和孩子一起快乐成长</p>
        </div>

        <div className="flex bg-white/60 rounded-2xl p-1 mb-5 border border-white/70">
          <button
            onClick={() => setTab("parent")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "parent" ? "bg-white shadow text-ink" : "text-ink-soft"
            }`}
          >
            <UserRound size={15} /> 家长登录
          </button>
          <button
            onClick={() => setTab("kid")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "kid" ? "bg-white shadow text-ink" : "text-ink-soft"
            }`}
          >
            <Baby size={15} /> 孩子登录
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 text-danger text-sm rounded-xl px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {tab === "parent" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-soft font-medium">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-secondary"
                placeholder="用户名"
              />
            </div>
            <div>
              <label className="text-xs text-ink-soft font-medium">密码</label>
              <div className="relative mt-1">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60" />
                <input
                  type="password"
                  value={parentPw}
                  onChange={(e) => setParentPw(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="密码"
                />
              </div>
            </div>
            <button
              onClick={loginParent}
              disabled={loading}
              className="btn-game btn-secondary w-full py-3.5 text-base"
            >
              {loading ? "登录中…" : "进入家长端"}
            </button>
            <p className="text-center text-xs text-ink-soft">
              演示账号：demo / 123456
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-soft font-medium">选择孩子</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {kids.map((k) => (
                  <button
                    key={k.name}
                    onClick={() => setSelectedKid(k.name)}
                    className={`py-3 rounded-2xl border-2 transition-all ${
                      selectedKid === k.name
                        ? "border-secondary bg-secondary/10"
                        : "border-transparent bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="flex justify-center">
                      <Avatar image={k.avatar_image} emoji={k.avatar_emoji} name={k.name} size={64} />
                    </div>
                    <div className="text-xs mt-1 font-bold text-ink">{k.name}</div>
                  </button>
                ))}
                {kids.length === 0 && (
                  <div className="col-span-3 text-center text-xs text-ink-soft py-3">
                    还没有孩子，请先登录家长端添加
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-soft font-medium">密码（默认 123456）</label>
              <input
                type="password"
                value={kidPw}
                onChange={(e) => setKidPw(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-secondary"
                placeholder="密码"
              />
            </div>
            <button
              onClick={loginKid}
              disabled={loading}
              className="btn-game btn-primary w-full py-3.5 text-base"
            >
              {loading ? "登录中…" : "进入我的学习空间"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}