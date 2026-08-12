import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild, canAccessChild } from "@/lib/auth";

// 移除植物：DELETE /api/garden/plant/[id]  { childId? }
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const plantId = Number(id);
  if (!plantId) return NextResponse.json({ error: "植物 ID 无效" }, { status: 400 });

  let body: { childId?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const childId = Number(body.childId) || child.id;
  if (!canAccessChild(childId, { type: "child", user: child })) {
    return NextResponse.json({ error: "无权操作该数据" }, { status: 403 });
  }

  const db = getDb();
  const plant = db
    .prepare("SELECT id FROM garden_plants WHERE id = ? AND child_id = ?")
    .get(plantId, childId);
  if (!plant) return NextResponse.json({ error: "植物不存在" }, { status: 404 });
  db.prepare("DELETE FROM garden_plants WHERE id = ?").run(plantId);
  return NextResponse.json({ ok: true });
}
