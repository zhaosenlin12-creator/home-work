import { NextResponse } from "next/server";
import { getDb, withTransaction } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";
import { petImage } from "@/lib/pet-assets";
import { getSpeciesMeta } from "@/lib/pet-catalog";
import { requiredStr } from "@/lib/validate";

type PetRow = {
  id: number;
  species: string;
  level: number;
  is_active: number;
  source: string;
};

// 领养宠物：POST /api/pet/adopt { childId?, species, name? }
// 规则：无宠物 → 领养第一只（初始）；已有宠物且活跃宠物 ≥10 级 → 可领养第二只
export async function POST(request: Request) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { childId?: unknown; species?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }
  const species = String(body.species || "");
  const meta = getSpeciesMeta(species);
  if (!meta) return NextResponse.json({ error: "宠物种类不存在" }, { status: 400 });
  const name = requiredStr(body.name, 20) || "小伴";

  const db = getDb();
  const pets = db
    .prepare("SELECT id, species, level, is_active, source FROM pets WHERE child_id = ?")
    .all(childId) as PetRow[];
  if (pets.length > 0) {
    // 已有宠物：要求活跃宠物满 10 级才可领养第二只（商城购买走 /api/pet/shop/buy）
    const active = pets.find((p) => p.is_active === 1) ?? pets[0];
    if (!active || active.level < 10) {
      return NextResponse.json({ error: "当前宠物满 10 级后才能领养新伙伴" }, { status: 400 });
    }
  }

  // 已是当前激活的宠物不重复领养
  const result = withTransaction(db, () => {
    const r = db
      .prepare(
        "INSERT INTO pets (child_id, name, species, avatar_image, is_active, source) VALUES (?, ?, ?, ?, 1, 'level10')"
      )
      .run(childId, name, species, petImage(species, 1));
    return Number(r.lastInsertRowid);
  });

  // 新宠物激活，旧宠物取消激活
  db.prepare("UPDATE pets SET is_active = 0 WHERE child_id = ? AND id != ?").run(childId, result);
  return NextResponse.json({ ok: true, id: result });
}