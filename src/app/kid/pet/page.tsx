"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePoints } from "@/lib/points-context";
import {
  Apple,
  Volleyball,
  Drumstick,
  Heart,
  Sparkles,
  PawPrint,
  Star,
  Store,
} from "lucide-react";
import { rarity, SPECIES_LABELS } from "@/lib/pet-meta";

type Pet = {
  id: number;
  name: string;
  species: string;
  avatar_image: string;
  level: number;
  exp: number;
  hunger: number;
  happiness: number;
  is_active: number;
  source: string;
};
type Me = { id: number; points: number };

const COST = { feed: 3, play: 5 } as const;

export default function KidPet() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const { refresh: refreshPoints } = usePoints();
  const [toast, setToast] = useState("");
  const [anim, setAnim] = useState("");
  const [levelUp, setLevelUp] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showAdopt, setShowAdopt] = useState(false);

  async function load() {
    try {
      const m = await api<Me>("/api/auth/me");
      setMe(m as never);
      const d = await api<{ pet: Pet; pets: Pet[] }>(`/api/pet?childId=${m.id}`);
      setPets(d.pets);
      setError("");
    } catch {
      setError("宠物信息加载失败，请刷新重试");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pet = pets.find((p) => p.is_active === 1) ?? pets[0] ?? null;

  async function act(action: "feed" | "play") {
    if (!me || !pet) return;
    const cost = COST[action];
    if (me.points < cost) {
      setToast(`积分不足！该操作需要 ${cost} 积分`);
      setTimeout(() => setToast(""), 2000);
      return;
    }
    setAnim("animate-wiggle");
    setTimeout(() => setAnim(""), 600);
    const before = pet.level;
    try {
      const d = await api<{
        exp: number;
        level: number;
        hunger: number;
        happiness: number;
        expGain: number;
        avatarImage: string;
        pointsLeft: number;
      }>("/api/pet/feed", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, action }),
      });
      setToast(
        action === "feed"
          ? `吃饱啦 +${d.expGain} 经验（-${cost} 积分）`
          : `玩得好开心 +${d.expGain} 经验（-${cost} 积分）`
      );
      setTimeout(() => setToast(""), 2000);
      if (d.level > before) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 3500);
      }
      setMe((m) => (m ? { ...m, points: d.pointsLeft } : m));
      refreshPoints();
      setPets((list) =>
        list.map((p) =>
          p.id === pet.id
            ? {
                ...p,
                exp: d.exp,
                level: d.level,
                hunger: d.hunger,
                happiness: d.happiness,
                avatar_image: d.avatarImage,
              }
            : p
        )
      );
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  async function switchPet(id: number) {
    if (!me) return;
    try {
      await api("/api/pet/switch", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, petId: id }),
      });
      load();
    } catch {
      /* ignore */
    }
  }

  async function adopt(species: string) {
    if (!me) return;
    try {
      await api("/api/pet/adopt", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, species }),
      });
      setShowAdopt(false);
      load();
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(""), 2500);
    }
  }

  if (!loaded) {
    return <div className="text-center py-20 text-ink-soft">加载中…</div>;
  }

  if (error && !pet) {
    return (
      <div className="text-center py-20">
        <div className="text-ink-soft">{error}</div>
        <button onClick={() => { setLoaded(false); load(); }} className="btn-game btn-secondary mt-4 text-sm">
          重新加载
        </button>
      </div>
    );
  }

  // 无宠物 → 首次领养引导
  if (!pet) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-ink">选择你的宠物伙伴</h2>
        <div className="glass-strong rounded-3xl p-6 text-center animate-modal-pop">
          <PawPrint size={56} className="text-secondary mx-auto mb-3" />
          <p className="text-ink-soft mb-4">领养一只宠物，陪你一起学习成长吧！</p>
          <div className="grid grid-cols-3 gap-3">
            {BASE_SPECIES.map((s) => (
              <button
                key={s}
                onClick={() => adopt(s)}
                className="glass rounded-2xl p-3 hover-lift"
              >
                <img src={baseImage(s)} alt="" className="w-full h-20 object-contain" />
                <div className="text-sm font-bold text-ink mt-1">
                  {SPECIES_LABELS[s] ?? s}
                </div>
              </button>
            ))}
          </div>
        </div>
        {toast && <div className="text-center text-coral text-sm">{toast}</div>}
      </div>
    );
  }

  const r = rarity(pet.level);
  const expToNext = pet.level * 50;
  const expRatio = Math.min(100, (pet.exp / expToNext) * 100);
  const canAdoptSecond = pet.level >= 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink">我的宠物伙伴</h2>
        <Link href="/kid/pet-shop" className="btn-game btn-warning px-3 py-1.5 text-xs">
          <Store size={14} /> 宠物商城
        </Link>
      </div>

      {/* 宠物切换器 */}
      {pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => switchPet(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-bold transition-all shrink-0 ${
                p.is_active === 1
                  ? "bg-secondary text-white shadow-card"
                  : "glass text-ink-soft"
              }`}
            >
              <img src={p.avatar_image} alt="" className="w-6 h-6 object-contain" />
              {p.name} Lv.{p.level}
            </button>
          ))}
        </div>
      )}

      <div className={`glass-strong rounded-3xl p-5 overflow-hidden text-center relative ${levelUp ? "halo-evolve animate-modal-pop" : ""}`}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky via-secondary to-accent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-accent/20 blur-2xl" />

        <div className="relative z-10 pt-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: r.color, color: "white" }}>
              {r.name}
            </span>
            <span className="bg-white/70 rounded-full px-3 py-1 text-xs font-bold text-ink border border-white">
              Lv.{pet.level}
            </span>
            {me && (
              <span className="flex items-center gap-1 text-xs font-bold text-warning bg-accent/20 rounded-full px-3 py-1">
                <Star size={12} fill="currentColor" /> {me.points}
              </span>
            )}
          </div>

          <div className="relative inline-block">
            <div className={`absolute -inset-3 rounded-full ${levelUp ? "halo-hatch animate-pulse-num" : ""}`} />
            <div className={`w-44 h-44 mx-auto rounded-full bg-white/70 backdrop-blur flex items-center justify-center overflow-hidden border-4 border-white shadow-card relative ${anim || "animate-pet-bob"}`}>
              {pet.avatar_image ? (
                <img src={pet.avatar_image} alt={pet.name} className="w-full h-full object-contain pet-illustration" />
              ) : (
                <PawPrint size={80} className="text-secondary" />
              )}
            </div>
            <Sparkles size={24} className="absolute -top-1 -right-1 text-accent-deep animate-wiggle" fill="currentColor" />
          </div>

          <h3 className="text-2xl font-extrabold mt-3 text-ink">{pet.name}</h3>
          <div className="text-sm text-ink-soft mt-0.5">
            {SPECIES_LABELS[pet.species] ?? pet.species} ·
            {pet.level >= 10 ? "可以领养新的伙伴啦！" : "10 级解锁第二只宠物"}
          </div>

          <div className="space-y-2.5 mt-5 text-left">
            <Bar icon={<Drumstick size={15} className="text-primary shrink-0" />} label="饱食" value={pet.hunger} color="#ff9a7a" />
            <Bar icon={<Heart size={15} className="text-primary shrink-0" />} label="开心" value={pet.happiness} color="#ff7a7a" />
            <Bar icon={<Sparkles size={15} className="text-secondary-deep shrink-0" />} label={`经验 ${pet.exp}/${expToNext}`} value={expRatio} color="#8ee6c4" />
          </div>
        </div>
      </div>

      {levelUp && (
        <div className="glass rounded-3xl p-4 text-center border border-accent animate-modal-pop">
          <div className="text-3xl mb-1 animate-bounce-in inline-block">
            <Sparkles size={36} className="text-accent-deep" fill="currentColor" />
          </div>
          <div className="font-extrabold text-ink">你的宠物进化啦！</div>
          <div className="text-sm text-ink-soft mt-1">
            {pet.name} 现在是 <strong className="text-ink">{rarity(pet.level).name}</strong> 品质
            {pet.level === 10 && " · 已解锁第二只宠物位！"}
          </div>
        </div>
      )}

      {/* 领养第二只入口（10级后显示） */}
      {canAdoptSecond && !showAdopt && pets.length < 2 && (
        <button
          onClick={() => setShowAdopt(true)}
          className="btn-game btn-purple w-full py-3"
        >
          领养第二只宠物（10 级达成！）
        </button>
      )}
      {showAdopt && (
        <div className="glass-strong rounded-3xl p-4 animate-pop">
          <div className="text-sm font-bold text-ink mb-3">选择新的伙伴</div>
          <div className="grid grid-cols-3 gap-3">
            {BASE_SPECIES.map((s) => (
              <button key={s} onClick={() => adopt(s)} className="glass rounded-2xl p-2 hover-lift">
                <img src={baseImage(s)} alt="" className="w-full h-16 object-contain" />
                <div className="text-xs font-bold text-ink mt-1">{SPECIES_LABELS[s] ?? s}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => act("feed")} className="btn-game btn-orange py-5 flex-col gap-1.5">
          <Apple size={26} /> 喂食 <span className="text-xs opacity-80">-{COST.feed} 积分</span>
        </button>
        <button onClick={() => act("play")} className="btn-game btn-purple py-5 flex-col gap-1.5">
          <Volleyball size={26} /> 陪它玩 <span className="text-xs opacity-80">-{COST.play} 积分</span>
        </button>
      </div>

      {toast && (
        <div className={`glass-strong rounded-2xl px-4 py-3 text-center font-bold animate-pop ${toast.includes("不足") ? "text-coral" : "text-secondary-deep"}`}>
          {toast}
        </div>
      )}

      <p className="text-center text-xs text-ink-soft">
        喂食/互动消耗积分，完成任务、专注、练习都能赚积分哦
      </p>
    </div>
  );
}

const BASE_SPECIES = ["baize", "PANDA", "coffeecat", "hashiqi", "xuebao"];

function baseImage(species: string): string {
  return `/pets/cwk/${species}/03.jpg`;
}

function Bar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-medium text-ink w-24">{label}</span>
      <div className="flex-1 h-3 bg-white/70 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs text-ink-soft w-12 text-right tabular-nums">{Math.round(value)}</span>
    </div>
  );
}