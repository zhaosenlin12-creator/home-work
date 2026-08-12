"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Star, CheckCircle2, ListChecks, BookOpenCheck, UserPlus } from "lucide-react";
import Avatar from "@/components/Avatar";

type Child = {
  id: number;
  name: string;
  avatar_emoji: string;
  avatar_image: string;
  grade: string;
  points: number;
  done_count: number;
  todo_count: number;
};
type AvatarChoice = { key: string; name: string; url: string };

export default function ParentChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [avatars, setAvatars] = useState<AvatarChoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("一年级");
  const [species, setSpecies] = useState("cat");
  const [avatar, setAvatar] = useState("");
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [wrongs, setWrongs] = useState<Record<number, any[]>>({});
  const [editTarget, setEditTarget] = useState<Child | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("一年级");

  async function load() {
    const d = await api<{ children: Child[] }>("/api/children");
    setChildren(d.children);
  }

  useEffect(() => {
    load().catch(() => {});
    api<{ images: AvatarChoice[] }>("/api/public/avatars")
      .then((d) => {
        setAvatars(d.images);
        if (d.images.length > 0) {
          setAvatar(d.images[0].url);
          setSpecies(d.images[0].key);
        }
      })
      .catch(() => {});
  }, []);

  async function add() {
    if (!name.trim()) return;
    try {
      await api("/api/children", {
        method: "POST",
        body: JSON.stringify({
          name,
          grade,
          species,
          avatar_image: avatar,
          password: "123456",
        }),
      });
      setToast(`成功添加「${name}」（密码 123456）`);
      setTimeout(() => setToast(""), 3000);
      setName("");
      setShowForm(false);
      load();
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  async function toggleWrongs(childId: number) {
    if (expanded === childId) {
      setExpanded(null);
      return;
    }
    setExpanded(childId);
    const d = await api<{ wrongQuestions: any[] }>(`/api/wrong-questions?childId=${childId}`);
    setWrongs((w) => ({ ...w, [childId]: d.wrongQuestions }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-ink flex items-center gap-1.5">
          <UserPlus size={20} className="text-mint-dark" /> 孩子管理
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-mint text-white rounded-2xl px-4 py-2 text-sm font-semibold flex items-center gap-1 hover-lift shadow-card"
        >
          <Plus size={16} /> 添加孩子
        </button>
      </div>

      {toast && (
        <div className="bg-mint-soft text-mint-dark rounded-2xl px-4 py-3 text-center font-semibold animate-pop border border-mint/30">
          {toast}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-3xl p-5 shadow-card animate-pop space-y-4 border border-cream">
          <div>
            <label className="text-xs text-ink-soft">孩子名字</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：小森"
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-cream outline-none focus:border-2 focus:border-mint"
            />
          </div>
          <div>
            <label className="text-xs text-ink-soft">年级</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-cream outline-none"
            >
              {["幼儿园", "一年级", "二年级", "三年级", "四年级", "五年级", "六年级"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-soft">宠物种类（头像即宠物图，从下方点选）</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {avatars.map((a) => (
                <button
                  key={a.key}
                  onClick={() => {
                    setSpecies(a.key);
                    setAvatar(a.url);
                  }}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                    species === a.key
                      ? "bg-mint text-white shadow-card"
                      : "bg-cream text-ink-soft hover:bg-mint-soft"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-soft">头像预览（点击下方任一头像即可切换）</label>
            <div className="grid grid-cols-5 gap-2 mt-1.5">
              {avatars.map((a) => (
                <button
                  key={a.url}
                  onClick={() => {
                    setAvatar(a.url);
                    setSpecies(a.key);
                  }}
                  className={`aspect-square rounded-2xl overflow-hidden transition-all bg-white ${
                    avatar === a.url
                      ? "ring-2 ring-mint scale-95"
                      : "hover:scale-105"
                  }`}
                  title={a.name}
                >
                  <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={add}
            disabled={!name.trim()}
            className="w-full bg-mint text-white rounded-2xl py-3 font-bold hover-lift shadow-card disabled:opacity-50"
          >
            添加（默认密码 123456）
          </button>
        </div>
      )}

      <div className="space-y-4">
        {children.map((c) => (
          <div key={c.id} className="bg-white rounded-3xl p-5 shadow-card hover-lift">
            <div className="flex items-center gap-4">
              <Avatar image={c.avatar_image} emoji={c.avatar_emoji} name={c.name} size={64} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-ink">{c.name}</div>
                <div className="text-xs text-ink-soft flex items-center gap-2 flex-wrap">
                  <span className="bg-white/60 rounded-full px-2 py-0.5">{c.grade}</span>
                  <span className="flex items-center gap-0.5">
                    <Star size={11} className="text-warning" fill="currentColor" /> {c.points}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 size={11} className="text-success" /> {c.done_count}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ListChecks size={11} className="text-secondary-deep" /> {c.todo_count}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleWrongs(c.id)}
                className="text-xs bg-peach-soft text-coral rounded-xl px-3 py-2 hover-lift"
              >
                {expanded === c.id ? "收起错题" : "查看错题"}
              </button>
              <button
                onClick={() => {
                  setEditTarget(c);
                  setEditName(c.name);
                  setEditGrade(c.grade);
                }}
                className="text-xs bg-sky-soft text-ink rounded-xl px-3 py-2 hover-lift"
              >
                编辑
              </button>
            </div>

            {expanded === c.id && (
              <div className="mt-4 pt-4 border-t border-cream animate-pop">
                <h4 className="text-sm font-bold mb-2 text-ink flex items-center gap-1.5">
                  <BookOpenCheck size={16} className="text-primary" /> 错题本（{wrongs[c.id]?.length ?? 0} 条）
                </h4>
                <div className="space-y-2">
                  {(wrongs[c.id] ?? []).map((w: any) => (
                    <div key={w.id} className="bg-cream rounded-2xl p-3">
                      <div className="text-sm font-semibold">
                        <span className="text-ink-soft">[{w.subject}]</span> {w.question}
                      </div>
                      <div className="text-xs text-coral mt-1">错答：{w.wrong_answer || "—"}</div>
                      <div className="text-xs text-mint-dark">正答：{w.correct_answer || "—"}</div>
                      {w.reason && (
                        <div className="text-xs text-ink-soft mt-0.5">原因：{w.reason}</div>
                      )}
                    </div>
                  ))}
                  {(wrongs[c.id] ?? []).length === 0 && (
                    <div className="text-sm text-ink-soft text-center py-2">暂无错题记录</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {children.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center text-ink-soft shadow-card">
            还没有孩子，点击右上角添加吧
          </div>
        )}
      </div>

      {/* 编辑孩子弹窗 */}
      {editTarget && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-card animate-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-ink text-lg mb-4">编辑「{editTarget.name}」</h3>
            <label className="text-xs font-bold text-ink-soft">名字</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
              className="w-full mt-1 mb-3 px-4 py-2.5 rounded-2xl border border-mint/60 focus:outline-none focus:ring-2 focus:ring-secondary bg-white text-ink"
            />
            <label className="text-xs font-bold text-ink-soft">年级</label>
            <select
              value={editGrade}
              onChange={(e) => setEditGrade(e.target.value)}
              className="w-full mt-1 mb-5 px-4 py-2.5 rounded-2xl border border-mint/60 focus:outline-none focus:ring-2 focus:ring-secondary bg-white text-ink"
            >
              {["一年级","二年级","三年级","四年级","五年级","六年级","初一","初二","初三"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 btn-game bg-white text-ink-soft border border-cream"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    await api(`/api/children/${editTarget.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ name: editName, grade: editGrade }),
                    });
                    setToast("已保存");
                    setTimeout(() => setToast(""), 2000);
                    setEditTarget(null);
                    load();
                  } catch (e) {
                    setToast((e as Error).message);
                    setTimeout(() => setToast(""), 2500);
                  }
                }}
                className="flex-1 btn-game btn-primary"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-card animate-pop z-50">
          {toast}
        </div>
      )}
    </div>
  );
}