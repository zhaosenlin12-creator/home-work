import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireParent, canAccessChild } from "@/lib/auth";
import { trimLen, validateInt } from "@/lib/validate";

// 编辑孩子资料：PATCH /api/children/[id]  body: { name?, grade?, avatar_image?, avatar_emoji? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parent = await requireParent();
  if (!parent) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const childId = validateInt(id, 1, 1_000_000);
  if (!childId) return NextResponse.json({ error: "孩子 ID 无效" }, { status: 400 });
  if (!canAccessChild(childId, { type: "parent", user: parent })) {
    return NextResponse.json({ error: "无权操作该孩子" }, { status: 403 });
  }

  let body: { name?: unknown; grade?: unknown; avatar_image?: unknown; avatar_emoji?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const db = getDb();
  const child = db.prepare("SELECT * FROM children WHERE id = ?").get(childId) as
    | Record<string, unknown>
    | undefined;
  if (!child) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  const sets: string[] = [];
  const vals: unknown[] = [];
  const name = trimLen(body.name, 30);
  if (name !== undefined && name !== null) {
    if (!name.trim()) return NextResponse.json({ error: "名字不能为空" }, { status: 400 });
    sets.push("name = ?");
    vals.push(name);
  }
  const grade = trimLen(body.grade, 20);
  if (grade !== undefined && grade !== null) {
    sets.push("grade = ?");
    vals.push(grade);
  }
  const avatarImage = trimLen(body.avatar_image, 300);
  if (avatarImage !== undefined && avatarImage !== null) {
    sets.push("avatar_image = ?");
    vals.push(avatarImage);
  }
  const avatarEmoji = trimLen(body.avatar_emoji, 8);
  if (avatarEmoji !== undefined && avatarEmoji !== null) {
    sets.push("avatar_emoji = ?");
    vals.push(avatarEmoji);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
  }

  vals.push(childId);
  db.prepare(`UPDATE children SET ${sets.join(", ")} WHERE id = ?`).run(
    ...(vals as (string | number)[])
  );
  return NextResponse.json({ ok: true });
}