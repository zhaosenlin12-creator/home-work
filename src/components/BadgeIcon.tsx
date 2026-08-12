"use client";

import {
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
} from "lucide-react";

export type BadgeIconName = string;

// 勋章图标库（lucide 图标名 → 组件）——符合"禁 emoji、全矢量"规范
const LUCIDE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

/** 根据勋章 icon 字段解析对应矢量图标组件（lucide 名优先，emoji 兼容，兜底 Award） */
export function resolveBadgeIcon(
  icon: string
): React.ComponentType<{ size?: number; className?: string }> {
  return LUCIDE_ICON_MAP[icon] ?? EMOJI_ICON_MAP[icon] ?? Award;
}

/** 勋章图标渲染组件 */
export default function BadgeIcon({
  icon,
  size = 24,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const Icon = resolveBadgeIcon(icon);
  return <Icon size={size} className={className} />;
}
