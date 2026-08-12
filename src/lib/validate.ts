// 企业级输入校验工具（边界/健壮性）

/** 严格整数校验：非数字/非整数/越界返回 null，否则返回整数 */
export function validateInt(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** 安全转 int（无效时用 fallback），并 clamp 到 [min, max] */
export function toIntClamped(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** 字符串截断 + trim，防超大输入 */
export function trimLen(s: unknown, maxLen: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, maxLen);
}

/** 必填字符串：非空且截断后返回；空返回 null */
export function requiredStr(s: unknown, maxLen: number): string | null {
  const t = trimLen(s, maxLen);
  return t.length > 0 ? t : null;
}
