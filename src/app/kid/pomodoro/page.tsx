"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  Coffee,
  PartyPopper,
  Volume2,
  Bell,
  Check,
} from "lucide-react";

type PomData = {
  sessions: { id: number; duration_min: number; completed_at: string }[];
  todayCount: number;
  totalMin: number;
};

type Mode = "work" | "rest";
type Status = "idle" | "running" | "paused" | "done";

const WORK_SECONDS = 25 * 60;
const REST_SECONDS = 5 * 60;
const TICK_MS = 1000;

export default function KidPomodoro() {
  const [data, setData] = useState<PomData | null>(null);
  const [seconds, setSeconds] = useState(WORK_SECONDS);
  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<Mode>("work");
  const [me, setMe] = useState<{ id: number } | null>(null);
  const [justDone, setJustDone] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(seconds); // 真实剩余秒（用于暂停/继续精确计时）

  // 同步剩余秒的 ref
  useEffect(() => {
    remainingRef.current = seconds;
  }, [seconds]);

  // 加载数据
  useEffect(() => {
    api<{ id: number }>("/api/auth/me")
      .then((d) => {
        setMe(d as never);
        return api<PomData>(`/api/pomodoro?childId=${d.id}`);
      })
      .then(setData)
      .catch(() => {});
  }, []);

  // 首次加载时解锁浏览器通知
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // 计时主循环
  useEffect(() => {
    if (status === "running") {
      timerRef.current = setInterval(() => {
        remainingRef.current -= 1;
        if (remainingRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setSeconds(0);
          setStatus("done");
          handleComplete();
          notifyFinished();
          return;
        }
        setSeconds(remainingRef.current);
      }, TICK_MS);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleComplete() {
    if (mode !== "work" || !me) return;
    setJustDone(true);
    try {
      await api("/api/pomodoro", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, durationMin: 25 }),
      });
      const d = await api<PomData>(`/api/pomodoro?childId=${me.id}`);
      setData(d);
    } catch {
      /* ignore */
    }
  }

  /** 时间到 - 触发语音 + 通知 + 蜂鸣音 */
  function notifyFinished() {
    if (!soundOn) return;
    const text =
      mode === "work"
        ? "嗯，专注时间到啦！休息一下吧。"
        : "休息结束啦！继续加油！";
    speak(text);
    beep();
    showNotification(text);
  }

  /** 浏览器内置 TTS（无需后端，跨浏览器） */
  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 1.0;
      u.pitch = 1.1;
      u.volume = 1.0;
      // 优先使用中文女声
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find(
        (v) =>
          v.lang.startsWith("zh") &&
          (v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("女") ||
            v.name.includes("Xiaoxiao") ||
            v.name.includes("Microsoft") ||
            v.name.includes("Google"))
      );
      if (zh) u.voice = zh;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  /** 蜂鸣音（Web Audio API） */
  function beep() {
    if (typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const playNote = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      // 三连音（上行）：do-mi-sol
      playNote(523, 0, 0.18);
      playNote(659, 0.2, 0.18);
      playNote(784, 0.4, 0.4);
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    } catch {
      /* ignore */
    }
  }

  /** 系统通知 */
  function showNotification(text: string) {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    try {
      new Notification("森灵番茄钟", {
        body: text,
        icon: "/favicon.ico",
        tag: "pomodoro",
      });
    } catch {
      /* ignore */
    }
  }

  function start() {
    if (status === "done") {
      remainingRef.current = mode === "work" ? WORK_SECONDS : REST_SECONDS;
      setSeconds(remainingRef.current);
    }
    setStatus("running");
    setJustDone(false);
  }

  /** 暂停：保留剩余秒，仅停止计时 */
  function pause() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setStatus("paused");
  }

  /** 继续：恢复计时 */
  function resume() {
    setStatus("running");
  }

  /** 停止：结束当前番茄钟，不重置（用户可选择放弃或继续） */
  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setStatus("idle");
    // 注意：停止不重置秒数，让用户看到停留位置
  }

  /** 重置：恢复到初始秒数 */
  function reset() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    remainingRef.current = mode === "work" ? WORK_SECONDS : REST_SECONDS;
    setSeconds(remainingRef.current);
    setStatus("idle");
    setJustDone(false);
  }

  function switchMode(m: Mode) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setMode(m);
    remainingRef.current = m === "work" ? WORK_SECONDS : REST_SECONDS;
    setSeconds(remainingRef.current);
    setStatus("idle");
    setJustDone(false);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const total = mode === "work" ? WORK_SECONDS : REST_SECONDS;
  const progress = (total - seconds) / total;

  // 状态标签
  const statusLabel =
    status === "running"
      ? mode === "work"
        ? "专注中"
        : "休息中"
      : status === "paused"
      ? "已暂停"
      : status === "done"
      ? mode === "work"
        ? "专注完成"
        : "休息结束"
      : "准备开始";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink">专注番茄钟</h2>
        <button
          onClick={() => setSoundOn((v) => !v)}
          className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1 ${
            soundOn
              ? "bg-mint text-white shadow-card"
              : "bg-cream text-ink-soft"
          }`}
          title={soundOn ? "关闭提示音" : "开启提示音"}
        >
          {soundOn ? <Volume2 size={14} /> : <Bell size={14} />}
          {soundOn ? "提示音 开" : "提示音 关"}
        </button>
      </div>

      <div className="glass-strong rounded-3xl p-6 text-center">
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => switchMode("work")}
            className={`btn-game px-5 py-2 text-sm ${
              mode === "work" ? "btn-primary" : "bg-white/60 text-ink-soft shadow-none"
            }`}
          >
            <Timer size={15} /> 专注 25 分
          </button>
          <button
            onClick={() => switchMode("rest")}
            className={`btn-game px-5 py-2 text-sm ${
              mode === "rest" ? "btn-warning" : "bg-white/60 text-ink-soft shadow-none"
            }`}
          >
            <Coffee size={15} /> 休息 5 分
          </button>
        </div>

        <div className="relative w-52 h-52 mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="rgba(35,49,79,0.08)"
              strokeWidth="14"
            />
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke={mode === "work" ? "#4ecdc4" : "#ffd93d"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className={`text-5xl font-extrabold tabular-nums ${
                status === "done" ? "text-mint-dark" : "text-ink"
              }`}
            >
              {mm}:{ss}
            </div>
            <div
              className={`text-sm mt-1 font-semibold ${
                status === "running"
                  ? "text-secondary-deep"
                  : status === "paused"
                  ? "text-warning"
                  : status === "done"
                  ? "text-mint-dark"
                  : "text-ink-soft"
              }`}
            >
              {statusLabel}
            </div>
          </div>
        </div>

        {justDone && mode === "work" && (
          <div className="mt-4 bg-secondary/15 rounded-2xl px-4 py-3 text-secondary-deep font-bold animate-pop flex items-center justify-center gap-2">
            <PartyPopper size={18} /> 完成一个番茄钟！+5 积分
          </div>
        )}

        {/* 控件：开始 / 暂停+继续+停止 / 重置 */}
        <div className="flex flex-wrap justify-center items-center gap-3 mt-6">
          {status === "idle" && (
            <button
              onClick={start}
              data-testid="pomodoro-start"
              className="rounded-full w-16 h-16 !p-0 btn-game btn-secondary flex items-center justify-center"
              aria-label="开始"
            >
              <Play size={26} />
            </button>
          )}

          {status === "running" && (
            <>
              <button
                onClick={pause}
                data-testid="pomodoro-pause"
                className="rounded-full w-16 h-16 !p-0 btn-game btn-warning flex items-center justify-center"
                aria-label="暂停"
                title="暂停（可继续）"
              >
                <Pause size={26} />
              </button>
              <button
                onClick={stop}
                data-testid="pomodoro-stop"
                className="rounded-full w-16 h-16 !p-0 btn-game btn-primary flex items-center justify-center"
                aria-label="停止"
                title="停止（保留当前进度）"
              >
                <Square size={22} />
              </button>
            </>
          )}

          {status === "paused" && (
            <>
              <button
                onClick={resume}
                data-testid="pomodoro-resume"
                className="rounded-full w-16 h-16 !p-0 btn-game btn-secondary flex items-center justify-center"
                aria-label="继续"
                title="从暂停处继续"
              >
                <Play size={26} />
              </button>
              <button
                onClick={reset}
                data-testid="pomodoro-reset"
                className="rounded-full w-16 h-16 !p-0 btn-game bg-coral text-white flex items-center justify-center"
                aria-label="重置"
                title="重置回初始时间"
              >
                <RotateCcw size={22} />
              </button>
            </>
          )}

          {status === "done" && (
            <button
              onClick={reset}
              data-testid="pomodoro-done"
              className="rounded-full w-16 h-16 !p-0 btn-game btn-primary flex items-center justify-center"
              aria-label="再来一次"
            >
              <Check size={26} />
            </button>
          )}
        </div>

        {/* 状态说明 */}
        <div className="mt-4 text-xs text-ink-soft leading-relaxed">
          {status === "running" && (
            <span>
              <Pause size={11} className="inline" /> 暂停 可继续 ·{" "}
              <Square size={11} className="inline" /> 停止 保留进度
            </span>
          )}
          {status === "paused" && (
            <span>
              <Play size={11} className="inline" /> 继续 从暂停处 ·{" "}
              <RotateCcw size={11} className="inline" /> 重置 回到起点
            </span>
          )}
          {status === "idle" && (
            <span>点开始按钮启动，专注 25 分钟或休息 5 分钟</span>
          )}
          {status === "done" && (
            <span>时间到！语音提醒已播报，点 "再来一次" 重新开始</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-3xl p-4 text-center">
          <div className="text-3xl font-extrabold text-secondary-deep tabular-nums">
            {data?.todayCount ?? 0}
          </div>
          <div className="text-xs text-ink-soft mt-1">今日番茄钟</div>
        </div>
        <div className="glass rounded-3xl p-4 text-center">
          <div className="text-3xl font-extrabold text-primary tabular-nums">
            {data?.totalMin ?? 0}
          </div>
          <div className="text-xs text-ink-soft mt-1">累计专注(分)</div>
        </div>
      </div>

      {data && data.sessions.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <h3 className="font-bold text-ink mb-2">最近记录</h3>
          <div className="space-y-1.5">
            {data.sessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex justify-between text-sm py-1 border-b border-white/60 last:border-0"
              >
                <span className="text-ink/80 flex items-center gap-1.5">
                  <Timer size={13} className="text-secondary-deep" /> 专注 {s.duration_min} 分钟
                </span>
                <span className="text-ink-soft text-xs">
                  {s.completed_at.slice(5, 16).replace("T", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
