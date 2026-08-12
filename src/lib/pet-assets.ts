// 仅服务端使用：fs 读目录、按 species+level 选图
// 前端组件请用 ./pet-meta.ts（无 node 依赖）

import fs from "node:fs";
import path from "node:path";

const PETS_DIR = path.join(process.cwd(), "public", "pets");

// 老版映射（5 基础物种 → 子目录）
const SPECIES_DIR: Record<string, string> = {
  cat: "cats",
  rabbit: "rabbits",
  dog: "dogs",
  dragon: "sacred",
  panda: "pixel-animals",
};

// 完整十级资源库：cwk/<species>/ 每物种 10 张图，对应 Lv1-10（来自 camp-pk-system pet-mirror/cwk）
const CWK_DIR = path.join(PETS_DIR, "cwk");

const cache = new Map<string, string[]>();
function listFiles(dir: string): string[] {
  if (!cache.has(dir)) {
    try {
      cache.set(
        dir,
        fs
          .readdirSync(dir)
          .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
          .sort((a, b) => num(a) - num(b))
      );
    } catch {
      cache.set(dir, []);
    }
  }
  return cache.get(dir)!;
}

/** 从文件名提取开头数字用于排序（04.1.jpg → 4.1） */
function num(f: string): number {
  const m = f.match(/^(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : Infinity;
}

/** 是否存在 cwk 物种目录 */
export function hasCwkSpecies(species: string): boolean {
  return fs.existsSync(path.join(CWK_DIR, species));
}

/** 根据物种和等级返回宠物主图 URL；cwk 资源 = 10 张对应 Lv1-10，其余按比例渐进 */
export function petImage(species: string, level: number): string {
  const lv = Math.max(1, Math.min(100, Math.floor(level)));

  // 优先完整十级资源库
  if (hasCwkSpecies(species)) {
    const files = listFiles(path.join(CWK_DIR, species));
    if (files.length > 0) {
      const idx = Math.min(files.length - 1, lv - 1);
      return `/pets/cwk/${species}/${files[idx]}`;
    }
  }

  // 回退老版子目录（按比例渐进）
  const dir = SPECIES_DIR[species] ?? "cats";
  const files = listFiles(path.join(PETS_DIR, dir));
  if (files.length === 0) return "";
  const ratio = Math.max(0, Math.min(1, (lv - 1) / 9));
  const idx = Math.min(files.length - 1, Math.floor(ratio * files.length));
  return `/pets/${dir}/${files[idx]}`;
}

/** kenney 化身候选列表（家长添加孩子时的可选头像） */
export function avatarChoices(): { name: string; url: string }[] {
  const dir = path.join(PETS_DIR, "kenney-avatars");
  return listFiles(dir)
    .filter((f) => !f.startsWith("_"))
    .map((f) => ({
      name: f.replace(/\.(png|jpg)$/i, ""),
      url: `/pets/kenney-avatars/${f}`,
    }));
}

/** cwk 全部物种 key 列表（宠物商城目录数据源） */
export function cwkSpeciesKeys(): string[] {
  try {
    return fs
      .readdirSync(CWK_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}