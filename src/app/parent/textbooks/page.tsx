"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, X, Search } from "lucide-react";

type Book = { title: string; path: string };
type Version = { version: string; books: Book[] };
type Stage = { stage: string; subject: string; versions: Version[] };

export default function ParentTextbooksPage() {
  const [index, setIndex] = useState<{ stages: Stage[] } | null>(null);
  const [stage, setStage] = useState("小学");
  const [subject, setSubject] = useState("语文");
  const [version, setVersion] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Book | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/textbook-index.json")
      .then((r) => r.json())
      .then((d) => {
        setIndex(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stages = index?.stages ?? [];
  const subjects = useMemo(() => {
    const set = new Set<string>();
    stages.filter((s) => s.stage === stage).forEach((s) => set.add(s.subject));
    return Array.from(set);
  }, [stages, stage]);

  const versions = useMemo(() => {
    const node = stages.find((s) => s.stage === stage && s.subject === subject);
    return node ? node.versions : [];
  }, [stages, stage, subject]);

  const books = useMemo(() => {
    let list: Book[] = [];
    if (version) {
      const v = versions.find((x) => x.version === version);
      list = v ? v.books : [];
    } else {
      versions.forEach((v) => (list = list.concat(v.books)));
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(kw));
    }
    return list;
  }, [versions, version, keyword]);

  useEffect(() => {
    if (subjects.length && !subjects.includes(subject)) setSubject(subjects[0]);
  }, [subjects, subject]);
  useEffect(() => {
    setVersion("");
  }, [stage, subject]);

  function proxyUrl(p: string, download = false) {
    return `/api/textbooks/proxy?path=${encodeURIComponent(p)}${
      download ? "&download=1" : ""
    }`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="text-mint-dark" size={22} />
        <h1 className="text-xl font-extrabold text-ink">电子教材</h1>
      </div>
      <p className="text-xs text-ink-soft">
        国家中小学教材资源，按学段、学科、版本查阅，点开即可在线阅读或下载。
      </p>

      <div className="flex gap-2">
        {["小学", "初中"].map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`flex-1 py-2 rounded-2xl text-sm font-bold border transition ${
              stage === s
                ? "bg-mint text-white border-mint"
                : "bg-white/60 text-ink-soft border-white/70"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setSubject(sub)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
              subject === sub
                ? "bg-mint-soft text-mint-dark border-mint/40"
                : "bg-white/50 text-ink-soft border-white/70"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="flex-1 bg-white/70 border border-white/70 rounded-2xl px-3 py-2 text-sm text-ink outline-none"
        >
          <option value="">全部版本</option>
          {versions.map((v) => (
            <option key={v.version} value={v.version}>
              {v.version}（{v.books.length}）
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索书名，如 三年级"
            className="w-full bg-white/70 border border-white/70 rounded-2xl pl-9 pr-3 py-2 text-sm text-ink outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-ink-soft py-10">教材目录加载中…</div>
      ) : books.length === 0 ? (
        <div className="text-center text-ink-soft py-10">暂无匹配教材</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {books.map((b) => (
            <button
              key={b.path}
              onClick={() => {
                setSelected(b);
                setViewerLoading(true);
              }}
              className="flex items-center gap-3 bg-white hover:bg-cream border border-white/70 rounded-2xl px-4 py-3 text-left transition shadow-card"
            >
              <BookOpen size={18} className="text-mint-dark shrink-0" />
              <span className="flex-1 text-sm font-medium text-ink truncate">{b.title}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-white">
            <span className="text-sm font-bold text-ink truncate pr-2">{selected.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={proxyUrl(selected.path, true)}
                className="flex items-center gap-1 text-xs font-semibold text-mint-dark bg-mint-soft px-2.5 py-1.5 rounded-xl"
              >
                <Download size={14} /> 下载
              </a>
              <button
                onClick={() => {
                  setSelected(null);
                  setViewerLoading(false);
                }}
                className="p-1.5 rounded-xl bg-ink/5 text-ink"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="relative flex-1 bg-white">
            {viewerLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-soft bg-white">
                <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">正在打开教材，首次加载需要一点时间…</span>
              </div>
            )}
            <iframe
              src={proxyUrl(selected.path)}
              onLoad={() => setViewerLoading(false)}
              className="w-full h-full bg-white"
              title={selected.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
