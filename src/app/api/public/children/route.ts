import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// 公开：返回孩子头像列表（用于孩子登录页选择），仅返回头像信息
export async function GET() {
  const children = getDb()
    .prepare("SELECT name, avatar_emoji, avatar_image FROM children ORDER BY id")
    .all();
  return NextResponse.json({ children });
}