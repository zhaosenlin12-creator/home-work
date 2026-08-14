#!/usr/bin/env node
/**
 * 预下载教材脚本
 *
 * 部署后执行一次，将常用教材（默认三年级语数英核心 6 本）下载缓存到本地，
 * 学生端加载教材时直接命中本地缓存，不依赖外网速度。
 *
 * 用法:
 *   node scripts/predownload-textbooks.mjs              # 预下载核心教材（三年级语数英，6本）
 *   node scripts/predownload-textbooks.mjs --all        # 预下载索引中全部教材（量大，耗时久）
 *   node scripts/predownload-textbooks.mjs --subject 数学 # 只下载某学科
 *   node scripts/predownload-textbooks.mjs --dry-run    # 只列出将下载的教材，不实际下载
 *
 * 缓存目录: data/textbook_cache/（与 /api/textbooks/proxy 共享同一缓存键）
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_FILE = path.join(ROOT, "public", "textbook-index.json");
const CACHE_DIR = path.join(ROOT, "data", "textbook_cache");

// 多源下载（与 proxy 路由一致）：jsDelivr CDN 国内快，GitHub Raw 兜底
const SOURCES = [
  "https://cdn.jsdelivr.net/gh/TapXWorld/ChinaTextbook@master/",
  "https://raw.githubusercontent.com/TapXWorld/ChinaTextbook/master/",
];

// 默认核心教材：三年级 语数英（统编/人教/人教版PEP）
const CORE = [
  { subject: "语文", version: "统编版" },
  { subject: "数学", version: "人教版" },
  { subject: "英语", version: "人教版（PEP）（三年级起点）（主编：吴欣）" },
];

function cacheKey(repoPath) {
  return crypto.createHash("sha256").update(repoPath).digest("hex") + ".pdf";
}

async function download(repoPath) {
  const encoded = repoPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  // jsDelivr 单文件限 50MB，超限文件直接跳过（会 403/301），只走 GitHub Raw 长超时
  const sources =
    expectedSize(repoPath) > 50 * 1024 * 1024
      ? SOURCES.filter((s) => !s.includes("jsdelivr.net"))
      : SOURCES;

  for (const base of sources) {
    const url = base + encoded;
    try {
      const ctrl = new AbortController();
      const isJsDelivr = base.includes("jsdelivr.net");
      // CDN 30s；GitHub Raw 大文件耐心等 5 分钟
      const timer = setTimeout(() => ctrl.abort(), isJsDelivr ? 30_000 : 300_000);
      const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
      clearTimeout(timer);
      if (r.ok && r.body) return { ok: true, r, src: url };
    } catch {
      /* try next source */
    }
  }
  return { ok: false, r: null, src: "" };
}

// 已缓存文件大小即预期大小；未缓存时返回 0（走默认源列表）
function expectedSize(repoPath) {
  const file = path.join(CACHE_DIR, cacheKey(repoPath));
  if (fs.existsSync(file)) return fs.statSync(file).size;
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const dry = args.includes("--dry-run");
  const subjectOnly = args.find((a) => a.startsWith("--subject="));
  const subjectFilter = subjectOnly ? subjectOnly.split("=")[1] : null;

  if (!fs.existsSync(INDEX_FILE)) {
    console.error("✗ 找不到教材索引: public/textbook-index.json");
    process.exit(1);
  }
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // 收集目标教材
  const targets = [];
  for (const stage of index.stages || []) {
    for (const v of stage.versions || []) {
      for (const book of v.books || []) {
        const title = book.title;
        if (subjectFilter && stage.subject !== subjectFilter) continue;
        if (!all) {
          // 核心模式：只选三年级上下册（标题以"三年级上册/下册"结尾）+ CORE 学科/版本
          const isThird = /三年级(上|下)册$/.test(title);
          const isCore = CORE.some(
            (c) => stage.subject === c.subject && v.version === c.version
          );
          if (!isThird || !isCore) continue;
        }
        targets.push({
          title,
          path: book.path,
          subject: stage.subject,
          version: v.version,
        });
      }
    }
  }

  console.log(`共 ${targets.length} 本教材待处理${all ? "（全部）" : "（三年级核心）"}\n`);

  let okCount = 0;
  let hitCount = 0;
  let failCount = 0;

  for (const t of targets) {
    const file = cacheKey(t.path);
    const dest = path.join(CACHE_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(`⏭  已有缓存 (${mb}MB)  ${t.title}`);
      hitCount++;
      continue;
    }
    if (dry) {
      console.log(`☐  待下载  ${t.title}`);
      continue;
    }
    const { ok, r, src } = await download(t.path);
    if (ok) {
      // 写入临时文件再原子改名，避免半截文件被当成缓存
      const tmp = dest + ".tmp";
      await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(tmp));
      const size = fs.statSync(tmp).size;
      if (size < 1024) {
        fs.unlinkSync(tmp);
        throw new Error("文件过小，疑似错误响应");
      }
      fs.renameSync(tmp, dest);
      console.log(`✓  下载完成 (${(size / 1024 / 1024).toFixed(1)}MB)  ${t.title}  <- ${new URL(src).host}`);
      okCount++;
    } else {
      console.error(`✗  下载失败  ${t.title}`);
      failCount++;
    }
  }

  console.log(
    `\n完成: ${okCount} 新下载, ${hitCount} 已有缓存, ${failCount} 失败` +
      (dry ? "（dry-run 未实际下载）" : "")
  );
  if (failCount > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("预下载脚本出错:", e.message);
  process.exit(1);
});
