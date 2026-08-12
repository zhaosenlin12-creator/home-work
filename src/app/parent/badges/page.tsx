"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import {
  Award,
  CheckCircle2,
  Sunrise,
  Timer,
  BookOpen,
  Footprints,
  Home,
  Wallet,
  Lock,
  Plus,
  Trash2,
  Gift,
  Medal,
  X,
  Sparkles,
  Star,
  Smile,
  Rocket,
  Heart,
  Target,
  Sun,
  Music,
  Palette,
} from "lucide-react";

type Badge = {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned?: boolean;
};
type Child = { id: number; name: string; avatar_emoji: string; avatar_image: string };
type Reward = { id: number; title: string; cost: number; icon: string };

// 勋章图标库（lucide 图标名 → 组件）——符合"禁 emoji、全矢量"规范
const BADGE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Award,
  Sunrise,
  Timer,
  BookOpen,
  Footprints,
  Home,
  Wallet,
  Sparkles,
  Star,
  Smile,
  Rocket,
  Heart,
  Target,
  Sun,
  Music,
  Palette,
};

// 旧 emoji 兼容映射（历史数据）
const EMOJI_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "🌅": Sunrise,
  "⏱️": Timer,
  "📚": BookOpen,
  "🏃": Footprints,
  "🧹": Home,
  "💰": Wallet,
};

const BADGE_ICON_CHOICES = [
  "Award",
  "Star",
  "Sparkles",
  "Smile",
  "Rocket",
  "Heart",
  "Target",
  "Sun",
  "Music",
  "Palette",
  "Sunrise",
  "Timer",
  "BookOpen",
  "Footprints",
  "Home",
  "Wallet",
];

const REWARD_ICONS = ["🎁", "🎡", "📺", "⭐", "🧁", "🍦", "🎮", "📚", "🏀", "🎨"];

export default function ParentBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [earned, setEarned] = useState<Record<number, number[]>>({});
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<"badges" | "rewards">("badges");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("Award");
  const [newCost, setNewCost] = useState("50");
  const [newRewardIcon, setNewRewardIcon] = useState("🎁");
  const [toast, setToast] = useState("");
  // 分发弹窗状态
  const [grantBadge, setGrantBadge] = useState<Badge | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function loadBadges() {
    const [b, c] = await Promise.all([
      api<{ badges: Badge[] }>("/api/badges"),
      api<{ children: Child[] }>("/api/children"),
    ]);
    setBadges(b.badges);
    setChildren(c.children);
    if (c.children.length > 0 && !selectedChild) setSelectedChild(c.children[0].id);
  }

  async function loadRewards() {
    const d = await api<{ rewards: Reward[] }>("/api/rewards");
    setRewards(d.rewards);
  }

  async function load() {
    await Promise.all([loadBadges(), loadRewards()]);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  // 加载所有孩子的勋章获得情况（用于分发按钮状态）
  useEffect(() => {
    if (children.length === 0) return;
    children.forEach((c) => {
      api<{ badges: (Badge & { earned: boolean })[] }>(`/api/badges?childId=${c.id}`)
        .then((d) => {
          setEarned((e) => ({
            ...e,
            [c.id]: d.badges.filter((x) => x.earned).map((x) => x.id),
          }));
        })
        .catch(() => {});
    });
  }, [children]);

  /** 创建勋章 */
  async function addBadge() {
    if (!newTitle.trim()) {
      showToast("请填写勋章名称");
      return;
    }
    try {
      await api("/api/badges", {
        method: "POST",
        body: JSON.stringify({ name: newTitle, description: newDesc, icon: newIcon }),
      });
      setNewTitle("");
      setNewDesc("");
      setNewIcon("Award");
      setShowAdd(false);
      showToast("勋章已创建");
      loadBadges();
    } catch (e) {
      showToast((e as Error).message || "创建失败");
    }
  }

  /** 删除勋章 */
  async function deleteBadge(b: Badge) {
    if (!confirm(`确定删除勋章「${b.name}」吗？已分发的记录也会清除。`)) return;
    try {
      await api(`/api/badges?id=${b.id}`, { method: "DELETE" });
      showToast("勋章已删除");
      loadBadges();
    } catch (e) {
      showToast((e as Error).message || "删除失败");
    }
  }

  /** 分发勋章给某个孩子 */
  async function grantToChild(childId: number) {
    if (!grantBadge) return;
    try {
      await api("/api/badges/grant", {
        method: "POST",
        body: JSON.stringify({ childId, badgeId: grantBadge.id }),
      });
      showToast(`已发给${children.find((c) => c.id === childId)?.name ?? "孩子"}`);
      setGrantBadge(null);
      loadBadges();
    } catch (e) {
      showToast((e as Error).message || "分发失败");
    }
  }

  /** 撤销勋章 */
  async function revoke(childId: number, badgeId: number) {
    try {
      await api(`/api/badges/grant?childId=${childId}&badgeId=${badgeId}`, {
        method: "DELETE",
      });
      showToast("已撤销该勋章");
      loadBadges();
    } catch (e) {
      showToast((e as Error).message || "撤销失败");
    }
  }

  async function addReward() {
    if (!newTitle.trim()) return;
    try {
      await api("/api/rewards", {
        method: "POST",
        body: JSON.stringify({ title: newTitle, cost: Number(newCost) || 50, icon: newRewardIcon }),
      });
      setNewTitle("");
      setNewCost("50");
      setNewRewardIcon("🎁");
      setShowAdd(false);
      showToast("奖励已添加");
      loadRewards();
    } catch (e) {
      showToast((e as Error).message || "添加失败");
    }
  }

  async function deleteReward(id: number) {
    if (!confirm("确定删除这个奖励吗？已兑换记录会保留。")) return;
    try {
      await api(`/api/rewards?id=${id}`, { method: "DELETE" });
      showToast("奖励已删除");
      loadRewards();
    } catch (e) {
      showToast((e as Error).message || "删除失败");
    }
  }

  function badgeIcon(b: Badge) {
    return BADGE_ICON_MAP[b.icon] ?? EMOJI_ICON_MAP[b.icon] ?? Award;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
          <Award size={20} className="text-warning" /> 勋章与奖励
        </h2>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 p-1 bg-white/60 rounded-2xl">
        <button
          onClick={() => setActiveTab("badges")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all ${
            activeTab === "badges" ? "bg-mint text-white shadow" : "text-ink-soft hover:text-ink"
          }`}
        >
          <Medal size={15} /> 勋章墙
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all ${
            activeTab === "rewards" ? "bg-warning text-white shadow" : "text-ink-soft hover:text-ink"
          }`}
        >
          <Gift size={15} /> 积分奖励
        </button>
      </div>

      {toast && (
        <div className="bg-mint-soft text-mint-dark rounded-2xl px-4 py-3 text-center font-medium animate-pop">
          {toast}
        </div>
      )}

      {activeTab === "badges" ? (
        <>
          {/* 添加勋章按钮 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-ink-soft">为孩子创建并分发专属勋章</div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="btn-game btn-secondary px-3 py-1.5 text-sm flex items-center gap-1"
            >
              <Plus size={15} /> 添加勋章
            </button>
          </div>

          {/* 添加勋章表单 */}
          {showAdd && (
            <div className="glass-strong rounded-3xl p-4 space-y-3 animate-pop">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="勋章名称，如：本周小明星"
                className="w-full px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-mint"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="勋章说明（选填），如：本周坚持完成所有任务"
                className="w-full px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none text-sm focus:ring-2 focus:ring-mint"
              />
              <div>
                <div className="text-xs text-ink-soft mb-1.5">选择图标</div>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_ICON_CHOICES.map((iconName) => {
                    const Icon = BADGE_ICON_MAP[iconName];
                    return (
                      <button
                        key={iconName}
                        onClick={() => setNewIcon(iconName)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          newIcon === iconName
                            ? "bg-mint text-white shadow-card"
                            : "bg-white/70 text-ink-soft hover:bg-mint-soft"
                        }`}
                        title={iconName}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={addBadge}
                disabled={!newTitle.trim()}
                className="w-full bg-mint text-white rounded-2xl py-3 font-semibold disabled:opacity-50 hover-lift"
              >
                保存勋章
              </button>
            </div>
          )}

          {/* 勋章卡片列表 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {badges.map((b) => {
              const Icon = badgeIcon(b);
              // 当前已获得该勋章的孩子
              const owners = children.filter((c) => (earned[c.id] ?? []).includes(b.id));
              return (
                <div key={b.id} className="glass-strong rounded-3xl p-5 text-center transition-all hover-lift relative">
                  <div className="flex justify-center h-14 items-center">
                    <Icon size={46} className="text-warning animate-pet-bob-soft" />
                  </div>
                  <div className="font-bold mt-2 text-ink">{b.name}</div>
                  <div className="text-xs text-ink-soft mt-1 min-h-8">{b.description}</div>

                  {/* 已获得的孩子 */}
                  <div className="mt-2 flex justify-center gap-1 flex-wrap min-h-7">
                    {owners.length > 0 ? (
                      owners.map((c) => (
                        <span
                          key={c.id}
                          className="flex items-center gap-1 bg-success/15 text-success rounded-full px-2 py-0.5 text-xs font-bold"
                          title={`${c.name} 已获得 · 点击撤销`}
                        >
                          <CheckCircle2 size={12} />
                          {c.name}
                          <button
                            onClick={() => revoke(c.id, b.id)}
                            className="ml-0.5 text-success/60 hover:text-coral"
                            title={`撤销${c.name}的勋章`}
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-soft">尚未分发</span>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setGrantBadge(b)}
                      className="flex-1 bg-mint text-white rounded-xl py-1.5 text-xs font-bold flex items-center justify-center gap-1 hover-lift"
                    >
                      <Gift size={12} /> 发给孩子
                    </button>
                    <button
                      onClick={() => deleteBadge(b)}
                      className="p-1.5 rounded-xl bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
                      title="删除勋章"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink">可兑换奖励</h3>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="btn-game btn-secondary px-3 py-1.5 text-sm flex items-center gap-1"
            >
              <Plus size={15} /> 添加奖励
            </button>
          </div>

          {showAdd && (
            <div className="glass-strong rounded-3xl p-4 space-y-3 animate-pop">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="奖励名称，如：周末去游乐园"
                className="w-full px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-warning"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="所需积分"
                  className="w-28 px-4 py-2.5 rounded-2xl bg-white/70 border border-white/80 outline-none text-sm"
                />
                <select
                  value={newRewardIcon}
                  onChange={(e) => setNewRewardIcon(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-2xl bg-white/70 border border-white/80 outline-none text-sm"
                >
                  {REWARD_ICONS.map((ico) => (
                    <option key={ico} value={ico}>
                      {ico}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addReward}
                disabled={!newTitle.trim()}
                className="w-full bg-warning text-white rounded-2xl py-3 font-semibold disabled:opacity-50"
              >
                保存奖励
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map((r) => (
              <div key={r.id} className="glass-strong rounded-3xl p-4 flex items-center gap-3">
                <div className="text-4xl">{r.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink truncate">{r.title}</div>
                  <div className="text-sm text-warning font-extrabold">{r.cost} 积分</div>
                </div>
                <button
                  onClick={() => deleteReward(r.id)}
                  className="p-2 rounded-xl bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {rewards.length === 0 && (
              <div className="col-span-full glass rounded-3xl p-6 text-center text-ink-soft text-sm">
                还没有设置奖励，点击「添加奖励」让孩子可以用积分兑换。
              </div>
            )}
          </div>
        </>
      )}

      {/* 分发勋章弹窗 */}
      {grantBadge && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={() => setGrantBadge(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-card animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-ink text-lg flex items-center gap-1.5">
                <Gift size={20} className="text-warning" /> 分发勋章
              </h3>
              <button
                onClick={() => setGrantBadge(null)}
                className="w-8 h-8 rounded-full bg-cream text-ink-soft flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-amber-50 rounded-2xl p-3 mb-4">
              {(() => {
                const Icon = badgeIcon(grantBadge);
                return <Icon size={36} className="text-warning shrink-0" />;
              })()}
              <div className="min-w-0">
                <div className="font-bold text-ink">{grantBadge.name}</div>
                <div className="text-xs text-ink-soft truncate">{grantBadge.description || "—"}</div>
              </div>
            </div>
            <div className="text-sm text-ink-soft mb-2">选择要发给的孩子</div>
            <div className="space-y-2">
              {children.map((c) => {
                const hasIt = (earned[c.id] ?? []).includes(grantBadge.id);
                return (
                  <button
                    key={c.id}
                    disabled={hasIt}
                    onClick={() => grantToChild(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      hasIt
                        ? "bg-success/10 text-success opacity-70"
                        : "bg-cream hover:bg-mint-soft"
                    }`}
                  >
                    <Avatar image={c.avatar_image} emoji={c.avatar_emoji} size={34} rounded={true} />
                    <span className="flex-1 text-left font-bold text-ink">{c.name}</span>
                    {hasIt ? (
                      <span className="text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> 已拥有
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-mint-dark flex items-center gap-1">
                        <Gift size={13} /> 发放
                      </span>
                    )}
                  </button>
                );
              })}
              {children.length === 0 && (
                <div className="text-center text-ink-soft text-sm py-3">还没有孩子</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
