"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import { Gift, Star, Lock, CheckCircle2 } from "lucide-react";

type Reward = { id: number; title: string; cost: number; icon: string };

type Claim = { title: string; claimed_at: string };

export default function KidRewards() {
  const { points, refresh: refreshPoints } = usePoints();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const [r, c] = await Promise.all([
        api<{ rewards: Reward[] }>("/api/rewards/store"),
        api<{ claims: Claim[] }>("/api/rewards/claims"),
      ]);
      setRewards(r.rewards);
      setClaims(c.claims);
    } catch {
      setToast("奖励加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function redeem(reward: Reward) {
    if (reward.cost > (points ?? 0)) return;
    setBusyId(reward.id);
    try {
      await api("/api/rewards/claim", {
        method: "POST",
        body: JSON.stringify({ rewardId: reward.id }),
      });
      setToast(`兑换成功：${reward.title}，已通知家长兑现`);
      refreshPoints();
      load();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(""), 2500);
    }
  }

  if (loading) return <div className="text-center py-20 text-ink-soft">加载中…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
          <Gift size={20} className="text-warning" /> 积分兑换屋
        </h2>
        <div className="bg-accent/25 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 border border-accent/40">
          <Star size={14} className="text-warning" fill="currentColor" />
          <span className="font-extrabold text-ink tabular-nums text-sm">{points ?? 0}</span>
        </div>
      </div>

      {toast && (
        <div className="bg-mint-soft text-mint-dark rounded-2xl px-4 py-3 text-center font-medium animate-pop text-sm">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rewards.map((r) => {
          const can = (points ?? 0) >= r.cost;
          return (
            <div
              key={r.id}
              className={`glass-strong rounded-3xl p-4 flex flex-col gap-3 transition-all ${
                can ? "" : "opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">{r.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink truncate">{r.title}</div>
                  <div className="text-sm text-warning font-extrabold flex items-center gap-1">
                    <Star size={12} fill="currentColor" /> {r.cost} 积分
                  </div>
                </div>
              </div>
              <button
                onClick={() => redeem(r)}
                disabled={!can || busyId === r.id}
                className={`w-full py-2.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-1 transition-all ${
                  can
                    ? "bg-warning text-white hover:opacity-90 active:scale-95"
                    : "bg-ink/10 text-ink-soft cursor-not-allowed"
                }`}
              >
                {busyId === r.id ? (
                  "兑换中…"
                ) : can ? (
                  <>
                    <Gift size={14} /> 立即兑换
                  </>
                ) : (
                  <>
                    <Lock size={14} /> 积分不足
                  </>
                )}
              </button>
            </div>
          );
        })}
        {rewards.length === 0 && (
          <div className="col-span-full glass rounded-3xl p-6 text-center text-ink-soft text-sm">
            爸爸妈妈还没设置奖励，去提醒他们吧～
          </div>
        )}
      </div>

      {claims.length > 0 && (
        <div>
          <h3 className="font-bold text-ink mb-2 text-sm">已兑换记录</h3>
          <div className="space-y-2">
            {claims.map((c, i) => (
              <div key={i} className="glass rounded-2xl px-4 py-3 flex items-center gap-2 text-sm opacity-80">
                <CheckCircle2 size={14} className="text-success" />
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-xs text-ink-soft">{c.claimed_at.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
