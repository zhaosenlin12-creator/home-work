import { NextResponse } from "next/server";
import { requireAnyUser } from "@/lib/auth";

export async function GET() {
  const user = await requireAnyUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.type === "parent") {
    return NextResponse.json({ type: "parent", ...user.user });
  }
  return NextResponse.json({ type: "child", ...user.user });
}