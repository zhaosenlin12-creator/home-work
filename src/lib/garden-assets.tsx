// 花园资源 React 组件（矢量插画）
// 页面统一引用此模块，替代旧的 Kenney 像素 PNG。
"use client";

import {
  buildGardenSvg,
  buildBushSvg,
  buildScarecrowSvg,
  buildPebbleSvg,
  buildBeehiveSvg,
  buildMountainSvg,
  buildCloudSvg,
  buildPlotSvg,
  buildSunSvg,
  buildHouseSvg,
  buildFenceSvg,
  buildGrassTuftSvg,
  buildFlowerBedSvg,
  buildButterflySvg,
  buildRainbowSvg,
  type GardenType,
} from "./garden-svg";

const NAME_LABELS: Record<GardenType, string> = {
  tree: "大树",
  sunflower: "向日葵",
  flower: "小花",
  watermelon: "大西瓜",
  pumpkin: "大南瓜",
  strawberry: "草莓",
};

export function gardenLabel(type: GardenType): string {
  return NAME_LABELS[type] ?? type;
}

export function GardenPlant({
  type,
  stage,
  className,
  style,
}: {
  type: GardenType;
  stage: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildGardenSvg(type, stage) }}
    />
  );
}

export function GardenBush({
  variant = 0,
  className,
  style,
}: {
  variant?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildBushSvg(variant) }}
    />
  );
}

export function Scarecrow({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildScarecrowSvg() }}
    />
  );
}

export function Pebble({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildPebbleSvg() }}
    />
  );
}

export function Beehive({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildBeehiveSvg() }}
    />
  );
}

export function MountainBand({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildMountainSvg() }}
    />
  );
}

export function Cloud({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildCloudSvg() }}
    />
  );
}

export function GardenPlot({
  variant = 0,
  className,
  style,
}: {
  variant?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildPlotSvg(variant) }}
    />
  );
}

export function Sun({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildSunSvg() }}
    />
  );
}

export function House({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildHouseSvg() }}
    />
  );
}

export function Fence({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildFenceSvg() }}
    />
  );
}

export function GrassTuft({
  variant = 0,
  className,
  style,
}: {
  variant?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildGrassTuftSvg(variant) }}
    />
  );
}

export function FlowerBed({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildFlowerBedSvg() }}
    />
  );
}

export function Butterfly({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildButterflySvg() }}
    />
  );
}

export function Rainbow({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: buildRainbowSvg() }}
    />
  );
}

export type { GardenType };