"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Send } from "lucide-react";
import { MoodIcon, type MoodType } from "@/components/icons";

type Diary = { id: number; content: string; mood: string; created_at: string };
type Me = { id: number };

const MOODS: { key: MoodType; label: string }[] = [
  { key: "happy", label: "开心" },
  { key: "excited", label: "兴奋" },
  { key: "calm", label: "平静" },
  { key: "sad", label: "难过" },
  { key: "angry", label: "生气" },
];

export default function KidDiary() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<MoodType>("happy");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const m = await api<Me>("/api/auth/me");
      setMe(m as never);
      const d = await api<{ diaries: Diary[] }>(`/api/diaries?childId=${m.id}`);
      setDiaries(d.diaries);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!content.trim() || !me) return;
    setSaving(true);
    try {
      await api("/api/diaries", {
        method: "POST",
        body: JSON.stringify({ childId: me.id, content, mood }),
      });
      setContent("");
      setMood("happy");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">我的小日记</h2>

      <div className="glass-strong rounded-3xl p-4">
        <div className="flex gap-2 mb-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMood(m.key)}
              className={`flex-1 py-2 rounded-2xl text-center transition-all ${
                mood === m.key
                  ? "bg-white shadow ring-2 ring-secondary"
                  : "bg-white/50 hover:bg-white"
              }`}
            >
              <MoodIcon type={m.key} size={34} />
              <span className="text-[10px] font-semibold text-ink-soft block mt-0.5">
                {m.label}
              </span>
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今天发生了什么有趣的事？写下来吧…"
          rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-white/70 border border-white/80 outline-none focus:ring-2 focus:ring-secondary resize-none"
        />
        <button
          onClick={save}
          disabled={saving || !content.trim()}
          className="btn-game btn-primary w-full py-3 mt-3 disabled:opacity-50"
        >
          <Send size={16} /> 写好啦（+3 积分）
        </button>
      </div>

      {diaries.length > 0 && (
        <div className="space-y-3">
          {diaries.map((d) => {
            const moodMeta = MOODS.find((m) => m.key === d.mood) ?? MOODS[0];
            return (
              <div key={d.id} className="glass rounded-3xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <MoodIcon type={moodMeta.key} size={30} />
                  <span className="text-xs text-ink-soft">
                    {d.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <p className="text-sm text-ink/90 whitespace-pre-wrap">{d.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}