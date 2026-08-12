import { getDb } from "./db";
import { getSession } from "./session";

export type Parent = {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  created_at: string;
};

export type Child = {
  id: number;
  parent_id: number;
  name: string;
  avatar_emoji: string;
  avatar_image: string;
  grade: string;
  points: number;
  created_at: string;
};

/** 要求已登录家长；未登录返回 null */
export async function requireParent(): Promise<Parent | null> {
  const session = await getSession();
  if (!session || session.user_type !== "parent") return null;
  const parent = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.user_id) as Parent | undefined;
  return parent ?? null;
}

/** 要求已登录孩子；未登录返回 null */
export async function requireChild(): Promise<Child | null> {
  const session = await getSession();
  if (!session || session.user_type !== "child") return null;
  const child = getDb()
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(session.user_id) as Child | undefined;
  return child ?? null;
}

/** 任意登录（家长或孩子均可） */
export async function requireAnyUser(): Promise<
  { type: "parent"; user: Parent } | { type: "child"; user: Child } | null
> {
  const session = await getSession();
  if (!session) return null;
  if (session.user_type === "parent") {
    const parent = getDb()
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(session.user_id) as Parent | undefined;
    return parent ? { type: "parent", user: parent } : null;
  }
  const child = getDb()
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(session.user_id) as Child | undefined;
  return child ? { type: "child", user: child } : null;
}

/**
 * 数据归属校验（防越权核心）：
 * - 孩子登录：childId 必须等于自己 id
 * - 家长登录：childId 必须是自己的孩子
 * 返回 true 表示有权操作该 childId；否则 false。
 */
export function canAccessChild(
  childId: number,
  actor: { type: "parent"; user: Parent } | { type: "child"; user: Child }
): boolean {
  if (actor.type === "child") {
    return actor.user.id === childId;
  }
  const row = getDb()
    .prepare("SELECT parent_id FROM children WHERE id = ?")
    .get(childId) as { parent_id: number } | undefined;
  return !!row && row.parent_id === actor.user.id;
}
