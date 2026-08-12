import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild } from "@/lib/auth";

// 孩子查看自己的兑换记录
export async function GET() {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const claims = getDb()
    .prepare(
      `SELECT r.title, rc.claimed_at
       FROM reward_claims rc
       JOIN rewards r ON rc.reward_id = r.id
       WHERE rc.child_id = ?
       ORDER BY rc.claimed_at DESC`
    )
    .all(child.id);
  return NextResponse.json({ claims });
}
