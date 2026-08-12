import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { petImage } from "@/lib/pet-assets";
import { requiredStr, trimLen } from "@/lib/validate";

// 基础宠物（cwk 十级资源库初始可选 5 种；老 key 兼容）
const ALLOWED_SPECIES = [
  "cat", "rabbit", "dog", "dragon", "panda",
  "baize", "PANDA", "coffeecat", "hashiqi", "xuebao",
];

// 家长端：孩子列表
export async function GET() {
  const parent = await requireParent();
  if (!parent) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const children = getDb()
    .prepare(
      `SELECT c.*,
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS done_count,
        COALESCE(SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_count
       FROM children c
       LEFT JOIN tasks t ON t.child_id = c.id
       WHERE c.parent_id = ?
       GROUP BY c.id
       ORDER BY c.id`
    )
    .all(parent.id);
  return NextResponse.json({ children });
}

// 家长端：添加孩子
export async function POST(request: Request) {
  const parent = await requireParent();
  if (!parent) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  let body: {
    name?: unknown;
    password?: unknown;
    avatar_emoji?: unknown;
    avatar_image?: unknown;
    grade?: unknown;
    species?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const name = requiredStr(body.name, 30);
  if (!name) {
    return NextResponse.json({ error: "请填写孩子名字（≤30 字）" }, { status: 400 });
  }
  const password = trimLen(body.password, 128) || "123456";
  const species = ALLOWED_SPECIES.includes(String(body.species)) ? String(body.species) : "cat";
  const db = getDb();

  const avatarImage = trimLen(body.avatar_image, 300) || petImage(species, 1);
  const result = db
    .prepare(
      `INSERT INTO children (parent_id, name, password_hash, avatar_emoji, avatar_image, grade, points)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      parent.id,
      name,
      hashPassword(password),
      typeof body.avatar_emoji === "string" ? body.avatar_emoji.slice(0, 8) : "🐣",
      avatarImage,
      trimLen(body.grade, 20) || "一年级"
    );
  const childId = Number(result.lastInsertRowid);

  // 自动领养宠物（同步使用真实图片）
  db.prepare(
    "INSERT INTO pets (child_id, name, species, avatar_image) VALUES (?, ?, ?, ?)"
  ).run(childId, "小伴", species, petImage(species, 1));

  return NextResponse.json({ ok: true, id: childId });
}