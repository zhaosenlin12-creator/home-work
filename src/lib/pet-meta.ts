// 纯常量 + 纯函数，前端组件可直接 import（无 node 依赖）
// 服务端 fs 相关函数在 ./pet-assets.ts

export const SPECIES_LABELS: Record<string, string> = {
  cat: "猫咪",
  rabbit: "兔兔",
  dog: "汪汪",
  dragon: "神兽",
  panda: "熊猫",
};

/** DESIGN.md 配色 */
export const COLORS = {
  sky: "#79d5ff",
  mint: "#8ee6c4",
  cream: "#fff8ef",
  ink: "#23314f",
  inkSoft: "#6b7894",
  warmShadow: "rgba(35, 49, 79, 0.12)",
  // 稀有度
  common: "#54d2a8",
  rare: "#58a6ff",
  epic: "#c987ff",
  legendary: "#ffb347",
  // 仪式色
  hatchGlow: "#ffe082",
  evolveGlow: "#ff8fd7",
  spotlightHalo: "#ffffff",
} as const;

/** 等级稀有度（DESIGN.md） */
export function rarity(level: number): { name: string; color: string } {
  if (level >= 5) return { name: "传奇", color: COLORS.legendary };
  if (level >= 4) return { name: "史诗", color: COLORS.epic };
  if (level >= 3) return { name: "稀有", color: COLORS.rare };
  return { name: "普通", color: COLORS.common };
}

/** 兼容 emoji 头像（默认/老数据） */
export const EMOJI_AVATARS = ["🐱", "🐰", "🐶", "🐼", "🦊", "🐸", "🐯", "🐨"];