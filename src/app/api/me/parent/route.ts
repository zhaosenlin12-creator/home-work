import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireChild } from "@/lib/auth";

// 当前登录孩子的家长 id
export async function GET() {
  const child = await requireChild();
  if (!child) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const row = getDb()
    .prepare("SELECT parent_id FROM children WHERE id = ?")
    .get(child.id) as { parent_id: number };
  return NextResponse.json({ parent_id: row.parent_id });
}
