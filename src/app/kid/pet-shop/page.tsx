"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import { Store, Star, CheckCircle2, Lock, ArrowLeft, Sparkles } from "lucide-react";

type ShopItem = {
  key: string;
  name: string;
  desc: string;
  price: number;
  requireTasks: number;
  image: string;
  owned: boolean;
  isActive: boolean;
  ownedLevel: number;
  affordable: boolean;
  tasksOk: boolean;
};

export default function KidPetShop() {
  const [data, setData] = useState<{
    catalog: ShopItem[];
    points: number;
    doneTasks: number;
  } | null>(null);
  const [me, setMe] = useState<{ id: number } | null>(null);
  const [toast, setToast] = useState("");
  const { refresh: refreshPoints } = usePoints();

  async function load() {
    try {
      const m = await api<{ id: number }>("/api/auth/me");
      setMe(m as never);
      const d = await api<{ catalog: ShopItem[]; points: number; doneTasks: number }>(
        `/api/pet/shop?childId=${m.id}`
      );
      setData(d);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(item: ShopItem) {
    if (!me) return;
    try {
      await api("/api/pet/shop/buy", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, species: item.key }),
      });
      setToast(`成功领养「${item.name}」！`);
      setTimeout(() => setToast(""), 2500);
      refreshPoints();
      load();
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  if (!data) return <div className="text-center py-20 text-ink-soft">加载中…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/kid/pet" className="btn-game btn-secondary px-2.5 py-1.5">
            <ArrowLeft size={16} />
          </Link>
          <h2 className="text-lg font-extrabold text-ink flex items-center gap-1.5">
            <Store size={20} className="text-warning" /> 宠物商城
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1 bg-accent/25 rounded-full px-3 py-1 text-warning">
            <Star size={13} fill="currentColor" /> {data.points}
          </span>
          <span className="bg-success/15 rounded-full px-3 py-1 text-success">
            完成 {data.doneTasks} 任务
          </span>
        </div>
      </div>

      {toast && (
        <div className={`glass-strong rounded-2xl px-4 py-3 text-center font-bold animate-pop ${toast.includes("不足") || toast.includes("解锁") ? "text-coral" : "text-secondary-deep"}`}>
          {toast}
        </div>
      )}

      {/* 初始可选 */}
      <div>
        <h3 className="text-sm font-bold text-ink-soft mb-2">基础宠物（初始可选）</h3>
        <div className="grid grid-cols-3 gap-3">
          {data.catalog
            .filter((i) => i.price === 0)
            .map((i) => (
              <PetCard key={i.key} item={i} onBuy={buy} />
            ))}
        </div>
      </div>

      {/* 商城专属 */}
      <div>
        <h3 className="text-sm font-bold text-ink-soft mb-2 flex items-center gap-1.5">
          <Sparkles size={14} className="text-purple" /> 稀有宠物（任务 + 积分解锁）
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {data.catalog
            .filter((i) => i.price > 0)
            .map((i) => (
              <PetCard key={i.key} item={i} onBuy={buy} />
            ))}
        </div>
      </div>

      <p className="text-center text-xs text-ink-soft">
        完成学习任务赚积分，解锁更多宠物伙伴吧！
      </p>
    </div>
  );
}

function PetCard({ item, onBuy }: { item: ShopItem; onBuy: (i: ShopItem) => void }) {
  const locked = !item.tasksOk;
  return (
    <div className={`glass-strong rounded-3xl p-3 text-center flex flex-col ${item.owned ? "" : "hover-lift"}`}>
      <div className="relative">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full aspect-square object-contain pet-illustration ${locked ? "opacity-60" : "animate-pet-bob-soft"}`}
        />
        {item.isActive && (
          <span className="absolute top-0 right-0 bg-secondary text-white text-[10px] font-bold rounded-full px-2 py-0.5">
            使用中
          </span>
        )}
      </div>
      <div className="font-bold text-ink">{item.name}</div>
      <div className="text-[11px] text-ink-soft min-h-7">{item.desc}</div>
      {item.owned ? (
        <div className="mt-2 text-xs font-bold text-success flex items-center justify-center gap-1">
          <CheckCircle2 size={13} /> 已拥有{item.ownedLevel > 0 ? ` Lv.${item.ownedLevel}` : ""}
        </div>
      ) : (
        <>
          <div className="mt-2 flex flex-col gap-1 items-center">
            {!item.tasksOk && (
              <span className="text-[10px] font-bold text-coral flex items-center gap-0.5">
                <Lock size={10} /> 需完成 {item.requireTasks} 任务
              </span>
            )}
            <span className={`text-sm font-extrabold flex items-center gap-0.5 ${item.affordable ? "text-warning" : "text-coral"}`}>
              <Star size={13} fill="currentColor" /> {item.price}
            </span>
          </div>
          <button
            onClick={() => onBuy(item)}
            disabled={locked || !item.affordable}
            className={`btn-game mt-2 py-1.5 text-xs ${
              locked || !item.affordable
                ? "bg-white/60 text-ink-soft cursor-not-allowed shadow-none"
                : "btn-secondary"
            }`}
          >
            {locked ? "未解锁" : item.affordable ? "购买" : "积分不足"}
          </button>
        </>
      )}
    </div>
  );
}