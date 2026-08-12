"use client";

// 全局积分状态：任何页面操作积分后调用 refresh()，右上角立即更新
import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import { api } from "./api";

type PointsCtx = {
  points: number | null;
  /** 拉取最新积分（积分变化后调用） */
  refresh: () => Promise<void>;
};

const Ctx = createContext<PointsCtx>({ points: null, refresh: async () => {} });

export function PointsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const m = await api<{ points?: number }>("/api/auth/me");
      if (typeof m.points === "number") setPoints(m.points);
    } catch {
      /* 未登录等忽略 */
    }
  }, []);

  return <Ctx.Provider value={{ points, refresh }}>{children}</Ctx.Provider>;
}

export function usePoints() {
  return useContext(Ctx);
}
