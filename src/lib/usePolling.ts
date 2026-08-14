"use client";

import { useEffect, useRef } from "react";

/**
 * 跨端自动刷新 hook
 *
 * 解决"家长操作后孩子端看不到新数据（需手动刷新）"问题：
 * - 每 intervalMs 轮询执行一次 refresh（默认 30s，家庭局域网开销可忽略）
 * - 页面从后台切回前台时立即刷新（visibilitychange）
 * - 组件卸载自动清理，不泄漏
 *
 * 用法：
 *   usePolling(load);            // 默认 30s
 *   usePolling(load, 15_000);    // 15s
 *
 * 注意：refresh 内不要 setLoading(true)，避免轮询导致界面闪烁。
 */
export function usePolling(refresh: () => void | Promise<void>, intervalMs = 30_000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const tick = () => {
      void refreshRef.current();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
