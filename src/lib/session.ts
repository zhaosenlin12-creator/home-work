import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getDb } from "./db";

export const SESSION_COOKIE = "senlin_session";
const TTL_MS = 7 * 24 * 3600 * 1000; // 7 天

export type SessionUser = {
  id: number;
  token: string;
  user_type: "parent" | "child";
  user_id: number;
  expires_at: string;
};

export async function createSession(
  userType: "parent" | "child",
  userId: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  getDb()
    .prepare(
      "INSERT INTO sessions (token, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)"
    )
    .run(token, userType, userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // 顺带清理过期会话，防止 sessions 表无限膨胀
  getDb().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  const row = getDb()
    .prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > ?"
    )
    .get(token, new Date().toISOString()) as
    | SessionUser
    | undefined;
  if (!row) return null;
  return row;
}
