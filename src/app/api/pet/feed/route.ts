import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { petImage } from "@/lib/pet-assets";

// 宠物喂食/互动：POST /api/pet/feed  { childId?, action: "feed" | "play" }
// 企业级：消耗积分（喂食 -3 / 互动 -5），积分不足拒绝，防无限刷
const COST = { feed: 3, play: 5 } as const;

export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const action = body.action === "play" ? "play" : "feed";
  const cost = COST[action];
  const db = getDb();

  let pet = db
    .prepare("SELECT * FROM pets WHERE child_id = ? AND is_active = 1")
    .get(childId) as
    | {
        id: number;
        species: string;
        exp: number;
        level: number;
        hunger: number;
        happiness: number;
      }
    | undefined;
  // 兼容旧数据：无激活宠物时回退第一只
  if (!pet) {
    pet = db
      .prepare("SELECT * FROM pets WHERE child_id = ? ORDER BY id LIMIT 1")
      .get(childId) as typeof pet;
  }
  if (!pet) return NextResponse.json({ error: "还没有宠物" }, { status: 404 });

  const childRow = db.prepare("SELECT points FROM children WHERE id = ?").get(childId) as
    | { points: number }
    | undefined;
  if (!childRow || childRow.points < cost) {
    return NextResponse.json({ error: `积分不足，该操作需要 ${cost} 积分` }, { status: 400 });
  }

  let expGain = 5;
  let hunger = pet.hunger;
  let happiness = pet.happiness;
  if (action === "feed") {
    hunger = Math.min(100, hunger + 15);
    happiness = Math.min(100, happiness + 5);
    expGain = 5;
  } else {
    happiness = Math.min(100, happiness + 20);
    hunger = Math.max(0, hunger - 5);
    expGain = 8;
  }

  let level = pet.level;
  let exp = pet.exp + expGain;
  if (exp >= level * 50) {
    exp = exp - level * 50;
    level = level + 1;
  }

  // 事务：扣积分 + 更新宠物
  const avatarImage = petImage(pet.species, level);
  withTransaction(db, () => {
    db.prepare("UPDATE children SET points = MAX(0, points - ?) WHERE id = ?").run(cost, childId);
    db.prepare(
      "UPDATE pets SET exp = ?, level = ?, hunger = ?, happiness = ?, avatar_image = ? WHERE id = ?"
    ).run(exp, level, hunger, happiness, avatarImage, pet.id);
  });

  return NextResponse.json({
    ok: true,
    exp,
    level,
    hunger,
    happiness,
    expGain,
    avatarImage,
    cost,
    pointsLeft: Math.max(0, childRow.points - cost),
  });
}