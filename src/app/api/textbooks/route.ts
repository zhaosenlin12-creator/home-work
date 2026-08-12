import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX_FILE = path.join(process.cwd(), "public", "textbook-index.json");

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const index = loadIndex();
  if (!index) {
    return NextResponse.json({ ok: false, error: "教材索引缺失" }, { status: 500 });
  }

  const stage = req.nextUrl.searchParams.get("stage") || "";
  const subject = req.nextUrl.searchParams.get("subject") || "";
  const version = req.nextUrl.searchParams.get("version") || "";
  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  // 过滤学段/学科/版本
  let stages = index.stages as Array<{
    stage: string;
    subject: string;
    versions: Array<{ version: string; books: Array<{ title: string; path: string }> }>;
  }>;

  if (stage) stages = stages.filter((s) => s.stage === stage);
  if (subject) stages = stages.filter((s) => s.subject === subject);
  if (version)
    stages = stages.map((s) => ({
      ...s,
      versions: s.versions.filter((v) => v.version === version),
    }));

  // 关键词搜索（标题包含）
  if (q) {
    const kw = q.toLowerCase();
    stages = stages
      .map((s) => ({
        ...s,
        versions: s.versions
          .map((v) => ({
            ...v,
            books: v.books.filter((b) => b.title.toLowerCase().includes(kw)),
          }))
          .filter((v) => v.books.length > 0),
      }))
      .filter((s) => s.versions.length > 0);
  }

  return NextResponse.json({ ok: true, stages });
}
