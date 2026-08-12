// 花园植物矢量插画生成器（纯函数，无 React 依赖）
// 设计目标：明亮、可爱、阳光；配色对齐品牌（薄荷绿 / 珊瑚红 / 青绿）
// 全部为矢量，移动端清晰不糊，风格统一，零裂图风险。
// 同一份逻辑同时供页面组件与验证脚本复用，保证所见即所得。

export type GardenType =
  | "tree"
  | "sunflower"
  | "flower"
  | "watermelon"
  | "pumpkin"
  | "strawberry";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const C = {
  soilTop: "#D7B083",
  soilBot: "#A8784C",
  trunk: "#B07A4B",
  trunkDark: "#8A5A30",
  greenL: "#86EFAC",
  greenM: "#34D399",
  greenD: "#10B981",
  greenHi: "#BBF7D0",
  greenOut: "#059669",
  sunL: "#FCD34D",
  sunM: "#FBBF24",
  sunCore: "#7C4A21",
  sunCoreL: "#A9682F",
  flwL: "#F9A8D4",
  flwM: "#FB7185",
  flwCore: "#FDE68A",
  coral: "#FB7185",
  leafVein: "#059669",
  // 西瓜：红瓤绿皮
  wmRind: "#16A34A",
  wmRindDark: "#166534",
  wmFlesh: "#EF4444",
  wmSeed: "#1F2937",
  // 南瓜：橙皮
  pkSkin: "#F97316",
  pkSkinD: "#C2410C",
  pkStem: "#65A30D",
  // 草莓：红心+白花
  sbRed: "#DC2626",
  sbRedD: "#991B1B",
  sbLeaf: "#16A34A",
  sbSeed: "#FEF3C7",
};

/** 围绕中心生成一圈花瓣/叶片 */
function ring(cx: number, cy: number, innerR: number, outerR: number, count: number, color: string, angle0 = -90): string {
  const len = outerR - innerR;
  const cyP = (innerR + outerR) / 2;
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = angle0 + i * (360 / count);
    out += `<ellipse cx="${cx}" cy="${cy - cyP}" rx="${(len * 0.6).toFixed(1)}" ry="${(len / 2).toFixed(1)}" fill="${color}" transform="rotate(${a.toFixed(1)} ${cx} ${cy})"/>`;
  }
  return out;
}

/** 单枚叶片 */
function leaf(x: number, y: number, angle: number, scale: number, color: string): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${(20 * scale).toFixed(1)}" ry="${(8 * scale).toFixed(1)}" fill="${color}" transform="rotate(${angle} ${x} ${y})"/>`;
}

function soil(): string {
  return `<ellipse cx="100" cy="198" rx="32" ry="13" fill="${C.soilTop}"/><ellipse cx="100" cy="201" rx="32" ry="10" fill="${C.soilBot}"/>`;
}

function shadow(rx: number): string {
  return `<ellipse cx="100" cy="208" rx="${rx}" ry="9" fill="rgba(15,81,50,0.15)"/>`;
}

function treeBody(s: number): string {
  const parts: string[] = [shadow(34 + s * 4)];
  if (s <= 2) {
    parts.push(soil());
    const top = s === 1 ? 178 : 158;
    parts.push(`<path d="M100 198 Q100 ${top + 10} 100 ${top}" stroke="${C.greenD}" stroke-width="${s === 1 ? 4 : 5}" fill="none" stroke-linecap="round"/>`);
    const n = s === 1 ? 2 : 4;
    for (let i = 0; i < n; i++) {
      const ly = top + 6 + i * (s === 1 ? 0 : 12);
      const side = i % 2 === 0 ? -1 : 1;
      parts.push(leaf(100 + side * 12, ly, side * 35, s === 1 ? 0.6 : 0.8, C.greenM));
    }
  } else {
    const tw = s === 3 ? 12 : s === 4 ? 18 : 24;
    const th = s === 3 ? 74 : s === 4 ? 98 : 120;
    const ty = 198 - th;
    parts.push(`<rect x="${100 - tw / 2}" y="${ty}" width="${tw}" height="${th}" rx="${tw / 2}" fill="${C.trunk}"/>`);
    parts.push(`<rect x="${100 - tw / 2}" y="${ty}" width="${tw / 2.4}" height="${th}" rx="${tw / 4}" fill="${C.trunkDark}" opacity="0.5"/>`);
    if (s === 3) {
      parts.push(`<circle cx="100" cy="${ty - 4}" r="34" fill="${C.greenM}"/>`);
      parts.push(`<circle cx="88" cy="${ty - 14}" r="14" fill="${C.greenHi}" opacity="0.7"/>`);
    } else if (s === 4) {
      parts.push(`<circle cx="82" cy="${ty + 2}" r="34" fill="${C.greenM}"/>`);
      parts.push(`<circle cx="120" cy="${ty + 6}" r="30" fill="${C.greenD}"/>`);
      parts.push(`<circle cx="80" cy="${ty - 8}" r="13" fill="${C.greenHi}" opacity="0.7"/>`);
    } else {
      parts.push(`<circle cx="76" cy="${ty + 8}" r="36" fill="${C.greenD}"/>`);
      parts.push(`<circle cx="124" cy="${ty + 10}" r="34" fill="${C.greenM}"/>`);
      parts.push(`<circle cx="100" cy="${ty - 14}" r="40" fill="${C.greenM}"/>`);
      parts.push(`<circle cx="92" cy="${ty - 24}" r="15" fill="${C.greenHi}" opacity="0.75"/>`);
      // 果实点缀（珊瑚红，呼应品牌）
      parts.push(`<circle cx="86" cy="${ty + 20}" r="5" fill="${C.coral}"/>`);
      parts.push(`<circle cx="116" cy="${ty + 26}" r="5" fill="${C.coral}"/>`);
      parts.push(`<circle cx="104" cy="${ty - 2}" r="5" fill="${C.coral}"/>`);
    }
  }
  return parts.join("");
}

function sunflowerBody(s: number): string {
  const parts: string[] = [shadow(30 + s * 3)];
  if (s <= 2) {
    parts.push(soil());
    const top = s === 1 ? 180 : 160;
    parts.push(`<path d="M100 198 Q100 ${top + 10} 100 ${top}" stroke="${C.greenD}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(112, top + 6, 30, s === 1 ? 0.6 : 0.8, C.greenM));
    if (s === 2) parts.push(leaf(88, top + 12, -30, 0.8, C.greenM));
  } else {
    const top = s === 3 ? 132 : 96;
    const sw = s === 3 ? 6 : 8;
    parts.push(`<path d="M100 198 Q100 ${top + 40} 100 ${top}" stroke="${C.greenD}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(118, 170, 30, 1, C.greenM));
    parts.push(leaf(82, 150, -28, 1, C.greenM));
    if (s === 3) {
      parts.push(`<ellipse cx="100" cy="${top}" rx="16" ry="22" fill="${C.greenL}"/>`);
      parts.push(`<ellipse cx="100" cy="${top}" rx="9" ry="13" fill="${C.greenM}"/>`);
    } else if (s === 4) {
      parts.push(ring(100, top, 16, 30, 10, C.sunL));
      parts.push(`<circle cx="100" cy="${top}" r="15" fill="${C.sunCore}"/>`);
    } else {
      parts.push(ring(100, top, 20, 40, 16, C.sunM));
      parts.push(ring(100, top, 16, 30, 16, C.sunL));
      parts.push(`<circle cx="100" cy="${top}" r="18" fill="${C.sunCore}"/>`);
      parts.push(`<circle cx="100" cy="${top}" r="18" fill="none" stroke="${C.sunCoreL}" stroke-width="2" opacity="0.6"/>`);
      parts.push(`<circle cx="94" cy="${top - 4}" r="6" fill="${C.sunCoreL}" opacity="0.5"/>`);
    }
  }
  return parts.join("");
}

function flowerBody(s: number): string {
  const parts: string[] = [shadow(28 + s * 3)];
  if (s <= 2) {
    parts.push(soil());
    const top = s === 1 ? 180 : 162;
    parts.push(`<path d="M100 198 Q100 ${top + 10} 100 ${top}" stroke="${C.greenD}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(112, top + 6, 30, s === 1 ? 0.6 : 0.8, C.greenM));
    if (s === 2) parts.push(leaf(88, top + 12, -30, 0.8, C.greenM));
  } else {
    const top = s === 3 ? 134 : 100;
    const sw = s === 3 ? 6 : 7;
    parts.push(`<path d="M100 198 Q100 ${top + 40} 100 ${top}" stroke="${C.greenD}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(116, 168, 28, 0.9, C.greenM));
    if (s === 3) {
      parts.push(`<path d="M100 ${top + 18} Q88 ${top} 100 ${top - 18} Q112 ${top} 100 ${top + 18} Z" fill="${C.flwL}"/>`);
    } else if (s === 4) {
      parts.push(ring(100, top, 12, 24, 6, C.flwL));
      parts.push(`<circle cx="100" cy="${top}" r="9" fill="${C.flwCore}"/>`);
    } else {
      parts.push(ring(100, top, 15, 30, 6, C.flwM));
      parts.push(ring(100, top, 12, 26, 6, C.flwL));
      parts.push(`<circle cx="100" cy="${top}" r="11" fill="${C.flwCore}"/>`);
      parts.push(`<circle cx="100" cy="${top}" r="11" fill="none" stroke="#F59E0B" stroke-width="1.5" opacity="0.5"/>`);
    }
  }
  return parts.join("");
}

function watermelonBody(s: number): string {
  const parts: string[] = [shadow(30 + s * 3)];
  if (s <= 2) {
    parts.push(soil());
    const top = s === 1 ? 178 : 158;
    parts.push(`<path d="M100 198 Q100 ${top + 10} 100 ${top}" stroke="${C.greenD}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(112, top + 6, 30, s === 1 ? 0.6 : 0.85, C.greenM));
    if (s === 2) parts.push(leaf(88, top + 12, -30, 0.85, C.greenM));
  } else {
    const top = s === 3 ? 138 : s === 4 ? 116 : 100;
    const sw = s === 3 ? 6 : 8;
    parts.push(`<path d="M100 198 Q100 ${top + 40} 100 ${top}" stroke="${C.greenD}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(120, 170, 30, 1, C.greenM));
    parts.push(leaf(80, 150, -28, 1, C.greenM));
    if (s === 3) {
      // 小花蕾
      parts.push(`<ellipse cx="100" cy="${top}" rx="10" ry="14" fill="${C.greenL}"/>`);
      parts.push(`<ellipse cx="100" cy="${top}" rx="6" ry="9" fill="${C.greenM}"/>`);
    } else if (s === 4) {
      // 小瓜
      parts.push(`<ellipse cx="100" cy="${top}" rx="22" ry="18" fill="${C.wmRind}"/>`);
      parts.push(`<path d="M${top === 116 ? 100 : 100} ${top - 18} Q${top === 116 ? 96 : 96} ${top - 22} ${top === 116 ? 92 : 92} ${top - 14}" stroke="${C.wmRindDark}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      parts.push(`<line x1="${top === 116 ? 80 : 80}" y1="${top - 4}" x2="${top === 116 ? 120 : 120}" y2="${top - 4}" stroke="${C.wmRindDark}" stroke-width="1.5" opacity="0.6"/>`);
    } else {
      // 大西瓜（剖面感）
      parts.push(`<ellipse cx="100" cy="${top}" rx="34" ry="28" fill="${C.wmRind}"/>`);
      parts.push(`<path d="M100 ${top - 28} Q96 ${top - 32} 92 ${top - 24}" stroke="${C.wmRindDark}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      // 瓜纹
      for (let i = -2; i <= 2; i++) {
        const x = 100 + i * 16;
        parts.push(`<path d="M${x} ${top - 18} Q${x} ${top} ${x} ${top + 18}" stroke="${C.wmRindDark}" stroke-width="1.5" fill="none" opacity="0.55"/>`);
      }
      // 瓜子
      parts.push(`<ellipse cx="92" cy="${top + 2}" rx="2" ry="3" fill="${C.wmSeed}"/>`);
      parts.push(`<ellipse cx="108" cy="${top - 4}" rx="2" ry="3" fill="${C.wmSeed}"/>`);
      parts.push(`<ellipse cx="100" cy="${top + 8}" rx="2" ry="3" fill="${C.wmSeed}"/>`);
      // 高光
      parts.push(`<ellipse cx="84" cy="${top - 12}" rx="10" ry="6" fill="#FFFFFF" opacity="0.25"/>`);
    }
  }
  return parts.join("");
}

function pumpkinBody(s: number): string {
  const parts: string[] = [shadow(30 + s * 3)];
  if (s <= 2) {
    parts.push(soil());
    const top = s === 1 ? 178 : 158;
    parts.push(`<path d="M100 198 Q100 ${top + 10} 100 ${top}" stroke="${C.greenD}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(112, top + 6, 30, s === 1 ? 0.6 : 0.85, C.greenM));
    if (s === 2) parts.push(leaf(88, top + 12, -30, 0.85, C.greenM));
  } else {
    const top = s === 3 ? 138 : s === 4 ? 118 : 100;
    const sw = s === 3 ? 6 : 8;
    parts.push(`<path d="M100 198 Q100 ${top + 40} 100 ${top}" stroke="${C.greenD}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(122, 168, 30, 1, C.greenM));
    parts.push(leaf(78, 148, -28, 1, C.greenM));
    if (s === 3) {
      // 小黄花蕾
      parts.push(`<circle cx="100" cy="${top}" r="6" fill="${C.flwL}"/>`);
      parts.push(`<circle cx="100" cy="${top}" r="3" fill="${C.sunCore}"/>`);
    } else if (s === 4) {
      // 小南瓜
      parts.push(`<ellipse cx="100" cy="${top + 4}" rx="22" ry="20" fill="${C.pkSkin}"/>`);
      parts.push(`<path d="M82 ${top + 4} Q100 ${top + 30} 118 ${top + 4}" stroke="${C.pkSkinD}" stroke-width="2" fill="none" opacity="0.7"/>`);
      parts.push(`<path d="M82 ${top + 4} Q100 ${top - 16} 118 ${top + 4}" stroke="${C.pkStem}" stroke-width="2" fill="none" opacity="0.5"/>`);
      parts.push(`<rect x="98" y="${top - 24}" width="4" height="10" rx="2" fill="${C.pkStem}"/>`);
    } else {
      // 大南瓜（多个瓣）
      parts.push(`<ellipse cx="100" cy="${top + 4}" rx="34" ry="28" fill="${C.pkSkin}"/>`);
      parts.push(`<ellipse cx="84" cy="${top + 6}" rx="12" ry="22" fill="${C.pkSkin}" opacity="0.85"/>`);
      parts.push(`<ellipse cx="116" cy="${top + 6}" rx="12" ry="22" fill="${C.pkSkin}" opacity="0.85"/>`);
      parts.push(`<path d="M82 ${top + 4} Q100 ${top + 36} 118 ${top + 4}" stroke="${C.pkSkinD}" stroke-width="2" fill="none" opacity="0.8"/>`);
      parts.push(`<path d="M100 ${top - 24} L100 ${top + 8}" stroke="${C.pkStem}" stroke-width="3" stroke-linecap="round"/>`);
      parts.push(`<ellipse cx="100" cy="${top - 26}" rx="6" ry="4" fill="${C.greenM}"/>`);
      // 高光
      parts.push(`<ellipse cx="86" cy="${top - 10}" rx="10" ry="6" fill="#FFFFFF" opacity="0.25"/>`);
    }
  }
  return parts.join("");
}

function strawberryBody(s: number): string {
  const parts: string[] = [shadow(28 + s * 3)];
  if (s <= 2) {
    parts.push(soil());
    const top = s === 1 ? 178 : 158;
    parts.push(`<path d="M100 198 Q100 ${top + 10} 100 ${top}" stroke="${C.greenD}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(112, top + 6, 30, s === 1 ? 0.6 : 0.85, C.greenM));
    if (s === 2) parts.push(leaf(88, top + 12, -30, 0.85, C.greenM));
  } else {
    const top = s === 3 ? 132 : s === 4 ? 110 : 92;
    const sw = s === 3 ? 6 : 8;
    parts.push(`<path d="M100 198 Q100 ${top + 40} 100 ${top}" stroke="${C.greenD}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    parts.push(leaf(120, 170, 30, 1, C.greenM));
    parts.push(leaf(80, 152, -28, 1, C.greenM));
    if (s === 3) {
      // 白花
      parts.push(`<circle cx="100" cy="${top}" r="6" fill="#FFFFFF"/>`);
      parts.push(`<circle cx="100" cy="${top}" r="2" fill="${C.sunCore}"/>`);
    } else if (s === 4) {
      // 小草莓
      parts.push(`<path d="M100 ${top - 10} Q${top === 110 ? 84 : 84} ${top - 12} ${top === 110 ? 82 : 82} ${top + 4} Q${top === 110 ? 100 : 100} ${top + 14} ${top === 110 ? 118 : 118} ${top + 4} Q${top === 110 ? 116 : 116} ${top - 12} 100 ${top - 10} Z" fill="${C.sbRed}"/>`);
      // 籽
      parts.push(`<circle cx="92" cy="${top + 4}" r="1.2" fill="${C.sbSeed}"/>`);
      parts.push(`<circle cx="106" cy="${top + 2}" r="1.2" fill="${C.sbSeed}"/>`);
      parts.push(`<circle cx="100" cy="${top - 2}" r="1.2" fill="${C.sbSeed}"/>`);
      // 蒂叶
      parts.push(`<path d="M${top === 110 ? 84 : 84} ${top - 10} L${top === 110 ? 100 : 100} ${top - 16} L${top === 110 ? 116 : 116} ${top - 10}" stroke="${C.sbLeaf}" stroke-width="3" fill="${C.sbLeaf}" stroke-linejoin="round"/>`);
    } else {
      // 大草莓（多果簇）
      parts.push(`<path d="M100 ${top - 8} Q82 ${top - 6} 78 ${top + 12} Q100 ${top + 22} 122 ${top + 12} Q118 ${top - 6} 100 ${top - 8} Z" fill="${C.sbRed}"/>`);
      parts.push(`<path d="M86 ${top + 4} Q80 ${top + 16} 90 ${top + 22} Z" fill="${C.sbRedD}"/>`);
      parts.push(`<path d="M114 ${top + 4} Q120 ${top + 16} 110 ${top + 22} Z" fill="${C.sbRedD}"/>`);
      // 籽
      for (const [x, y] of [[88, 6], [100, 4], [112, 6], [92, 14], [108, 14], [100, 18]]) {
        parts.push(`<circle cx="${x}" cy="${top + y}" r="1.4" fill="${C.sbSeed}"/>`);
      }
      // 蒂叶
      parts.push(`<path d="M82 ${top - 8} L100 ${top - 16} L118 ${top - 8}" stroke="${C.sbLeaf}" stroke-width="4" fill="${C.sbLeaf}" stroke-linejoin="round"/>`);
      parts.push(`<path d="M88 ${top - 14} L100 ${top - 22} L112 ${top - 14}" stroke="${C.greenD}" stroke-width="3" fill="${C.greenD}" stroke-linejoin="round"/>`);
      // 高光
      parts.push(`<ellipse cx="86" cy="${top + 2}" rx="8" ry="4" fill="#FFFFFF" opacity="0.3"/>`);
    }
  }
  return parts.join("");
}

export function buildGardenSvg(type: GardenType, stage: number): string {
  const s = clamp(Math.round(stage), 1, 5);
  let body = "";
  if (type === "tree") body = treeBody(s);
  else if (type === "sunflower") body = sunflowerBody(s);
  else if (type === "flower") body = flowerBody(s);
  else if (type === "watermelon") body = watermelonBody(s);
  else if (type === "pumpkin") body = pumpkinBody(s);
  else body = strawberryBody(s);
  return `<svg viewBox="0 0 200 220" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${body}</svg>`;
}

/** 背景装饰灌木（半透明由 CSS 控制） */
export function buildBushSvg(variant = 0): string {
  const palette = [C.greenM, C.greenD, C.greenL];
  const c = palette[variant % palette.length];
  const blobs = [
    `<circle cx="60" cy="78" r="34" fill="${c}"/>`,
    `<circle cx="100" cy="64" r="40" fill="${c}"/>`,
    `<circle cx="138" cy="80" r="32" fill="${c}"/>`,
    `<circle cx="80" cy="92" r="30" fill="${c}" opacity="0.92"/>`,
    `<circle cx="120" cy="92" r="30" fill="${c}" opacity="0.92"/>`,
  ];
  const hi = `<circle cx="92" cy="52" r="16" fill="${C.greenHi}" opacity="0.7"/>`;
  return `<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${blobs.join("")}${hi}<ellipse cx="100" cy="112" rx="70" ry="10" fill="rgba(15,81,50,0.12)"/></svg>`;
}

/** 田地装饰：稻草人（远景中部） */
export function buildScarecrowSvg(): string {
  return `<svg viewBox="0 0 60 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="30" cy="116" rx="20" ry="4" fill="rgba(15,81,50,0.18)"/>
    <rect x="28" y="6" width="4" height="100" fill="#8B5E34"/>
    <rect x="14" y="40" width="32" height="5" rx="2" fill="#8B5E34"/>
    <circle cx="30" cy="20" r="12" fill="#FBBF24"/>
    <circle cx="30" cy="20" r="12" fill="none" stroke="#7C4A21" stroke-width="2"/>
    <path d="M22 22 L26 22 M34 22 L38 22" stroke="#7C4A21" stroke-width="2" stroke-linecap="round"/>
    <path d="M26 14 L26 8 L34 8 L34 14" fill="#7C4A21"/>
    <rect x="6" y="34" width="22" height="20" rx="4" fill="#DC2626"/>
    <path d="M30 36 L40 38" stroke="#34D399" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

/** 田地装饰：鹅卵石（远景角落） */
export function buildPebbleSvg(): string {
  return `<svg viewBox="0 0 80 30" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="14" cy="20" rx="10" ry="6" fill="#9CA3AF"/>
    <ellipse cx="40" cy="14" rx="13" ry="7" fill="#A1A1AA"/>
    <ellipse cx="64" cy="22" rx="9" ry="5" fill="#9CA3AF"/>
    <ellipse cx="40" cy="14" rx="4" ry="2" fill="#D4D4D8" opacity="0.6"/>
  </svg>`;
}

/** 田地装饰：蜂箱（远景右侧） */
export function buildBeehiveSvg(): string {
  return `<svg viewBox="0 0 60 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="30" cy="76" rx="20" ry="3" fill="rgba(15,81,50,0.18)"/>
    <polygon points="6,28 54,28 50,40 10,40" fill="#F59E0B"/>
    <polygon points="10,40 50,40 46,52 14,52" fill="#F59E0B"/>
    <polygon points="14,52 46,52 42,64 18,64" fill="#F59E0B"/>
    <rect x="6" y="28" width="48" height="4" fill="#7C4A21"/>
    <ellipse cx="30" cy="60" rx="3" ry="2" fill="#1F2937"/>
    <circle cx="44" cy="14" r="4" fill="#FDE68A"/>
    <path d="M44 14 L48 12 L48 16 Z" fill="#FCD34D"/>
    <path d="M40 12 L40 16" stroke="#1F2937" stroke-width="0.6"/>
  </svg>`;
}

/** 田地装饰：远山（顶部风景带） */
export function buildMountainSvg(): string {
  return `<svg viewBox="0 0 400 100" width="100%" height="100%" preserveAspectRatio="none" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M0 80 L40 50 L80 65 L130 30 L180 60 L230 35 L280 60 L340 40 L400 60 L400 100 L0 100 Z" fill="#86EFAC" opacity="0.7"/>
    <path d="M0 90 L60 75 L100 85 L160 65 L210 80 L260 70 L320 85 L380 70 L400 80 L400 100 L0 100 Z" fill="#34D399" opacity="0.6"/>
  </svg>`;
}

/** 田地装饰：白云 */
export function buildCloudSvg(): string {
  return `<svg viewBox="0 0 120 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="40" cy="40" rx="28" ry="16" fill="#FFFFFF" opacity="0.9"/>
    <ellipse cx="70" cy="34" rx="32" ry="18" fill="#FFFFFF" opacity="0.92"/>
    <ellipse cx="90" cy="42" rx="22" ry="14" fill="#FFFFFF" opacity="0.88"/>
    <ellipse cx="20" cy="46" rx="18" ry="12" fill="#FFFFFF" opacity="0.85"/>
  </svg>`;
}

/** 差异化地块：圆形/椭圆/六边形土壤（用于田地中具体地块的视觉） */
export function buildPlotSvg(variant = 0): string {
  const variants = [
    // 0: 标准圆
    `<ellipse cx="100" cy="120" rx="80" ry="34" fill="url(#soil0)"/>
     <ellipse cx="100" cy="118" rx="76" ry="30" fill="url(#soil0b)"/>
     <path d="M30 116 Q60 108 100 110 Q140 112 170 116" stroke="${C.greenM}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
     <ellipse cx="100" cy="132" rx="60" ry="6" fill="rgba(15,81,50,0.18)"/>`,
    // 1: 椭圆起伏（田垄感）
    `<path d="M20 120 Q100 90 180 120 Q100 132 20 120 Z" fill="url(#soil1)"/>
     <path d="M40 112 Q100 102 160 112" stroke="#FFF" stroke-width="2" fill="none" opacity="0.4"/>
     <ellipse cx="100" cy="132" rx="60" ry="6" fill="rgba(15,81,50,0.18)"/>`,
    // 2: 六边形带草边
    `<polygon points="100,86 168,114 168,150 100,178 32,150 32,114" fill="url(#soil2)"/>
     <polygon points="100,86 168,114 168,150 100,178 32,150 32,114" fill="none" stroke="${C.greenD}" stroke-width="3" opacity="0.7"/>
     <ellipse cx="100" cy="148" rx="50" ry="4" fill="rgba(15,81,50,0.18)"/>`,
  ];
  const defs = `<defs>
    <linearGradient id="soil0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.soilTop}"/><stop offset="1" stop-color="${C.soilBot}"/></linearGradient>
    <linearGradient id="soil0b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8C29A"/><stop offset="1" stop-color="${C.soilTop}"/></linearGradient>
    <linearGradient id="soil1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C79968"/><stop offset="1" stop-color="#8A5A30"/></linearGradient>
    <linearGradient id="soil2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.soilTop}"/><stop offset="1" stop-color="#7C4A21"/></linearGradient>
  </defs>`;
  return `<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${variants[variant % variants.length]}</svg>`;
}

// ========== 专业游戏场景装饰（v2 升级） ==========

/** 太阳：带光芒圆环，专业游戏常用 */
export function buildSunSvg(): string {
  return `<svg viewBox="0 0 120 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g>
      <g stroke="#FCD34D" stroke-width="6" stroke-linecap="round" opacity="0.9">
        <line x1="60" y1="6" x2="60" y2="20"/>
        <line x1="60" y1="100" x2="60" y2="114"/>
        <line x1="6" y1="60" x2="20" y2="60"/>
        <line x1="100" y1="60" x2="114" y2="60"/>
        <line x1="22" y1="22" x2="32" y2="32"/>
        <line x1="88" y1="88" x2="98" y2="98"/>
        <line x1="98" y1="22" x2="88" y2="32"/>
        <line x1="32" y1="88" x2="22" y2="98"/>
      </g>
      <circle cx="60" cy="60" r="32" fill="#FBBF24"/>
      <circle cx="60" cy="60" r="26" fill="#FDE68A"/>
      <circle cx="52" cy="52" r="8" fill="#FFF7DB" opacity="0.85"/>
    </g>
  </svg>`;
}

/** 远景小木屋：专业农场游戏标配建筑 */
export function buildHouseSvg(): string {
  return `<svg viewBox="0 0 200 160" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="100" cy="152" rx="92" ry="8" fill="rgba(15,81,50,0.14)"/>
    <!-- 屋顶 -->
    <polygon points="100,12 8,68 192,68" fill="#F97316"/>
    <polygon points="100,12 8,68 192,68" fill="none" stroke="#C2410C" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="100,26 32,68 168,68" fill="#FB923C" opacity="0.55"/>
    <!-- 屋身 -->
    <rect x="34" y="66" width="132" height="80" rx="6" fill="#FFF7E6"/>
    <rect x="34" y="66" width="132" height="80" rx="6" fill="none" stroke="#D9A05B" stroke-width="3"/>
    <!-- 窗户 -->
    <rect x="52" y="84" width="34" height="30" rx="4" fill="#7DD3FC" stroke="#D9A05B" stroke-width="3"/>
    <line x1="69" y1="84" x2="69" y2="114" stroke="#D9A05B" stroke-width="2"/>
    <line x1="52" y1="99" x2="86" y2="99" stroke="#D9A05B" stroke-width="2"/>
    <rect x="118" y="84" width="34" height="30" rx="4" fill="#7DD3FC" stroke="#D9A05B" stroke-width="3"/>
    <line x1="135" y1="84" x2="135" y2="114" stroke="#D9A05B" stroke-width="2"/>
    <line x1="118" y1="99" x2="152" y2="99" stroke="#D9A05B" stroke-width="2"/>
    <!-- 门 -->
    <rect x="88" y="98" width="26" height="48" rx="10" fill="#B07A4B" stroke="#8A5A30" stroke-width="3"/>
    <circle cx="108" cy="122" r="3" fill="#FDE68A"/>
    <!-- 烟囱 -->
    <rect x="146" y="30" width="20" height="42" rx="4" fill="#8A5A30"/>
    <rect x="142" y="24" width="28" height="10" rx="4" fill="#7C4A21"/>
  </svg>`;
}

/** 木质栅栏（横向条）：专业农场围栏 */
export function buildFenceSvg(): string {
  return `<svg viewBox="0 0 200 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="0" y="38" width="200" height="10" rx="5" fill="#C9945E"/>
    <rect x="0" y="16" width="200" height="10" rx="5" fill="#C9945E"/>
    <path d="M22 6 L28 54" stroke="#A8784C" stroke-width="9" stroke-linecap="round"/>
    <path d="M64 6 L70 54" stroke="#A8784C" stroke-width="9" stroke-linecap="round"/>
    <path d="M106 6 L112 54" stroke="#A8784C" stroke-width="9" stroke-linecap="round"/>
    <path d="M148 6 L154 54" stroke="#A8784C" stroke-width="9" stroke-linecap="round"/>
    <path d="M190 6 L196 54" stroke="#A8784C" stroke-width="9" stroke-linecap="round"/>
    <path d="M20 6 L26 54" stroke="#D7B083" stroke-width="4" stroke-linecap="round"/>
    <path d="M62 6 L68 54" stroke="#D7B083" stroke-width="4" stroke-linecap="round"/>
    <path d="M104 6 L110 54" stroke="#D7B083" stroke-width="4" stroke-linecap="round"/>
    <path d="M146 6 L152 54" stroke="#D7B083" stroke-width="4" stroke-linecap="round"/>
    <path d="M188 6 L194 54" stroke="#D7B083" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}

/** 前景草丛：点缀场景生机 */
export function buildGrassTuftSvg(variant = 0): string {
  const palettes: string[][] = [
    ["#34D399", "#10B981", "#86EFAC"],
    ["#10B981", "#059669", "#A7F3D0"],
    ["#6EE7B7", "#34D399", "#10B981"],
  ];
  const p = palettes[variant % palettes.length];
  return `<svg viewBox="0 0 80 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="40" cy="54" rx="34" ry="7" fill="rgba(15,81,50,0.12)"/>
    <path d="M20 54 Q18 34 26 24 Q24 40 34 52 Z" fill="${p[0]}"/>
    <path d="M40 54 Q38 26 48 12 Q46 36 58 52 Z" fill="${p[1]}"/>
    <path d="M58 54 Q56 34 64 22 Q62 40 72 52 Z" fill="${p[0]}"/>
    <path d="M30 54 Q28 38 36 30 Q34 44 44 54 Z" fill="${p[2]}" opacity="0.8"/>
    <path d="M52 54 Q50 36 58 28 Q56 42 64 54 Z" fill="${p[2]}" opacity="0.8"/>
  </svg>`;
}

/** 花丛（前景装饰） */
export function buildFlowerBedSvg(): string {
  return `<svg viewBox="0 0 160 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="80" cy="84" rx="70" ry="8" fill="rgba(15,81,50,0.12)"/>
    <!-- 茎叶 -->
    <path d="M30 84 Q28 60 34 44" stroke="#10B981" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M80 84 Q78 54 86 38" stroke="#10B981" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M130 84 Q128 62 134 48" stroke="#10B981" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- 花1 粉 -->
    <g>
      <ellipse cx="34" cy="38" rx="10" ry="14" fill="#F9A8D4" transform="rotate(0 34 38)"/>
      <ellipse cx="34" cy="38" rx="10" ry="14" fill="#F9A8D4" transform="rotate(72 34 38)"/>
      <ellipse cx="34" cy="38" rx="10" ry="14" fill="#F9A8D4" transform="rotate(144 34 38)"/>
      <ellipse cx="34" cy="38" rx="10" ry="14" fill="#F9A8D4" transform="rotate(216 34 38)"/>
      <ellipse cx="34" cy="38" rx="10" ry="14" fill="#F9A8D4" transform="rotate(288 34 38)"/>
      <circle cx="34" cy="38" r="7" fill="#FDE68A"/>
    </g>
    <!-- 花2 珊瑚红 -->
    <g>
      <ellipse cx="86" cy="30" rx="12" ry="16" fill="#FB7185" transform="rotate(0 86 30)"/>
      <ellipse cx="86" cy="30" rx="12" ry="16" fill="#FB7185" transform="rotate(60 86 30)"/>
      <ellipse cx="86" cy="30" rx="12" ry="16" fill="#FB7185" transform="rotate(120 86 30)"/>
      <ellipse cx="86" cy="30" rx="12" ry="16" fill="#FB7185" transform="rotate(180 86 30)"/>
      <ellipse cx="86" cy="30" rx="12" ry="16" fill="#FB7185" transform="rotate(240 86 30)"/>
      <ellipse cx="86" cy="30" rx="12" ry="16" fill="#FB7185" transform="rotate(300 86 30)"/>
      <circle cx="86" cy="30" r="8" fill="#FDE68A"/>
    </g>
    <!-- 花3 黄 -->
    <g>
      <ellipse cx="134" cy="42" rx="9" ry="12" fill="#FCD34D" transform="rotate(0 134 42)"/>
      <ellipse cx="134" cy="42" rx="9" ry="12" fill="#FCD34D" transform="rotate(72 134 42)"/>
      <ellipse cx="134" cy="42" rx="9" ry="12" fill="#FCD34D" transform="rotate(144 134 42)"/>
      <ellipse cx="134" cy="42" rx="9" ry="12" fill="#FCD34D" transform="rotate(216 134 42)"/>
      <ellipse cx="134" cy="42" rx="9" ry="12" fill="#FCD34D" transform="rotate(288 134 42)"/>
      <circle cx="134" cy="42" r="6" fill="#F97316"/>
    </g>
  </svg>`;
}

/** 蝴蝶（近景动态点缀） */
export function buildButterflySvg(): string {
  return `<svg viewBox="0 0 60 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g>
      <path d="M30 26 Q12 8 16 20 Q20 28 30 26 Z" fill="#FB7185" opacity="0.9"/>
      <path d="M30 26 Q48 8 44 20 Q40 28 30 26 Z" fill="#F9A8D4" opacity="0.9"/>
      <path d="M30 26 Q14 38 18 30 Q22 26 30 26 Z" fill="#FB7185" opacity="0.75"/>
      <path d="M30 26 Q46 38 42 30 Q38 26 30 26 Z" fill="#F9A8D4" opacity="0.75"/>
      <ellipse cx="30" cy="26" rx="3" ry="10" fill="#7C4A21"/>
      <path d="M33 18 Q40 12 38 8" stroke="#7C4A21" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="7" r="1.5" fill="#7C4A21"/>
    </g>
  </svg>`;
}

/** 彩虹（天空装饰） */
export function buildRainbowSvg(): string {
  const bands: [string, number][] = [
    ["#F87171", 70],
    ["#FBBF24", 62],
    ["#86EFAC", 54],
    ["#7DD3FC", 46],
    ["#C4B5FD", 38],
  ];
  const arcs = bands
    .map(
      ([c, r]) =>
        `<path d="M20 ${r + 30} A${r} ${r} 0 0 1 ${r * 2 + 20} ${r + 30}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`
    )
    .join("");
  return `<svg viewBox="0 0 160 110" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${arcs}</svg>`;
}
