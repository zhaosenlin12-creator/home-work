import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild } from "@/lib/auth";

// 孩子查看可兑换奖励（自动取当前孩子家长的奖励列表）
export async function GET() {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const db = getDb();
  const childRow = db.prepare("SELECT parent_id FROM children WHERE id = ?").get(child.id) as
    | { parent_id: number }
    | undefined;
  if (!childRow) return NextResponse.json({ error: "孩子不存在" }, { status: 404 });

  const rewards = db
    .prepare("SELECT id, title, cost, icon FROM rewards WHERE parent_id = ? ORDER BY cost")
    .all(childRow.parent_id);
  return NextResponse.json({ rewards });
}
