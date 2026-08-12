import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { petImage } from "@/lib/pet-assets";
import { getSpeciesMeta, speciesImage } from "@/lib/pet-catalog";

type PetRow = {
  id: number;
  child_id: number;
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

function withImage(p: PetRow) {
  return { ...p, avatar_image: petImage(p.species, p.level) };
}

// 宠物状态：GET ?childId=（仅孩子，只能看自己；返回活跃宠物 + 全部宠物）
export async function GET(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("childId"));
  const childId = requested || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权访问该数据" }, { status: 403 });
  }

  const pets = getDb()
    .prepare("SELECT * FROM pets WHERE child_id = ? ORDER BY id")
    .all(childId) as PetRow[];
  const active = pets.find((p) => p.is_active === 1) ?? pets[0] ?? null;

  return NextResponse.json({
    pet: active ? withImage(active) : null,
    pets: pets.map(withImage),
  });
}