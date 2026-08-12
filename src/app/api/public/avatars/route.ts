import { NextResponse } from "next/server";
import { PET_CATALOG, speciesImage } from "@/lib/pet-catalog";
import { SPECIES_LABELS } from "@/lib/pet-meta";

// 公开：家长添加孩子时的头像候选
// 来源统一为宠物商店（5 种基础物种，cwk 资源库与老子目录均有真实图），
// 家长可"用宠物当作头像"，不需要先购买。
// 选定后，孩子的 avatar_image 写入该物种的 Lv.3 形态。
const AVATAR_KEYS = ["cat", "rabbit", "dog", "dragon", "panda"];

export async function GET() {
  const images = AVATAR_KEYS.map((key) => {
    const meta = PET_CATALOG.find((p) => p.key === key);
    return {
      key,
      name: meta?.name ?? SPECIES_LABELS[key] ?? key,
      url: speciesImage(key),
    };
  });
  return NextResponse.json({ images });
}
