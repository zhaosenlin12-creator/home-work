"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Send, Sparkles, Bot } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "嗨！我是你的 AI 学习助手，有什么不会的题目、不知道怎么安排学习，都可以问我哦！",
};

export default function KidAI() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    const history = messages.filter(
      (m) => m.role !== "assistant" || m.content !== WELCOME.content
    );
    setMessages((m) => [...m, { role: "user", content: text }]);
    setThinking(true);
    try {
      const d = await api<{ reply: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history: history.slice(-6) }),
      });
      setMessages((m) => [...m, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: (e as Error).message || "出错了，稍后再试～" },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-9 h-9 rounded-2xl bg-purple/15 flex items-center justify-center">
          <Bot size={18} className="text-purple" />
        </span>
        <div>
          <div className="font-bold text-ink">AI 学习助手</div>
          <div className="text-[11px] text-ink-soft">问问题、拆任务、解难题</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "btn-secondary shadow-none rounded-br-lg text-white"
                  : "glass rounded-bl-lg text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="glass rounded-3xl rounded-bl-lg px-4 py-3 text-sm text-ink-soft flex items-center gap-2">
              <Sparkles size={14} className="animate-wiggle text-purple" /> 思考中…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="问问我吧～"
          className="flex-1 px-4 py-3 rounded-2xl glass outline-none focus:ring-2 focus:ring-secondary"
        />
        <button
          onClick={send}
          disabled={!input.trim() || thinking}
          className="btn-game btn-secondary px-5 !py-3"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}