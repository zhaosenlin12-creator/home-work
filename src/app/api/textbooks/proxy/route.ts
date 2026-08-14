import { NextRequest } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 多源回退：jsDelivr CDN（国内快，首选）→ GitHub Raw（兜底，直连国内偏慢）
// 注意：ghproxy.com / mirror.ghproxy.com 等镜像已停止服务，不再使用
const REPO_SOURCES = [
  "https://cdn.jsdelivr.net/gh/TapXWorld/ChinaTextbook@master/",
  "https://raw.githubusercontent.com/TapXWorld/ChinaTextbook/master/",
];

// 超过此大小的 PDF 不落盘，仅尝试流式转发（但优先缓存常规教材）
const MAX_CACHE_BYTES = 120 * 1024 * 1024;

function errorHtml(message: string, rawPath: string) {
  const raw = `https://raw.githubusercontent.com/TapXWorld/ChinaTextbook/master/${encodeURIComponent(
    rawPath
  )}`;
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>教材加载失败</title>
<style>body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#f7f8fb;color:#334;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{background:#fff;border-radius:16px;padding:28px 32px;max-width:360px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.08)}
h2{margin:0 0 8px;font-size:18px}.tip{color:#889;font-size:13px;line-height:1.6;margin:10px 0 16px}
a.btn{display:inline-block;background:#2f7d6b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:12px;font-size:14px}
a.sec{display:inline-block;margin-top:10px;color:#2f7d6b;font-size:13px;text-decoration:underline}</style></head>
<body><div class="box"><h2>教材加载失败 😢</h2>
<p class="tip">${message}。请确认网络可访问外网，或稍后重试；也可点击下方链接在浏览器直接打开。</p>
<a class="btn" href="" onclick="location.reload()">重新加载</a><br>
<a class="sec" href="${raw}" target="_blank" rel="noreferrer">点此浏览器直连打开</a></div></body></html>`;
}

async function fetchWithSources(
  repoPath: string,
  sources: string[]
): Promise<Response | null> {
  const encoded = repoPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  // jsDelivr CDN 快但单文件限 50MB；GitHub Raw 慢但对大文件唯一可行。
  // 按源区分超时：CDN 30s，直连 150s（大文件耐心等待）
  for (const base of sources) {
    const url = base + encoded;
    try {
      const ctrl = new AbortController();
      const isJsDelivr = base.includes("jsdelivr.net");
      const timeoutMs = isJsDelivr ? 30_000 : 150_000;
      const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      if (r.ok && r.body) {
        return r;
      }
    } catch (e) {
      // fetch failed, try next source
    }
  }
  return null;
}

function serveCache(cacheFile: string, repoPath: string, download: boolean) {
  const stat = fs.statSync(cacheFile);
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Length": String(stat.size),
    "Cache-Control": "public, max-age=86400",
    "X-Cache": "HIT",
  };
  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename*=UTF-8''${encodeURIComponent(
        path.basename(repoPath)
      )}`;
  }
  return new Response(Readable.toWeb(fs.createReadStream(cacheFile)) as any, {
    headers,
  });
}

export async function GET(req: NextRequest) {
  const repoPath = req.nextUrl.searchParams.get("path");
  if (
    !repoPath ||
    !repoPath.endsWith(".pdf") ||
    repoPath.includes("..") ||
    repoPath.startsWith("/")
  ) {
    return new Response("非法路径", { status: 400 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const cacheDir = path.join(process.cwd(), "data", "textbook_cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  // 用完整路径的 sha256 作为缓存键，避免长路径被截断导致不同教材互相覆盖
  const safeName = crypto.createHash("sha256").update(repoPath).digest("hex");
  const cacheFile = path.join(cacheDir, safeName + ".pdf");
  const tmpFile = path.join(cacheDir, safeName + ".pdf.tmp");

  // 命中缓存：直接返回本地文件（即时、不依赖外网）
  if (fs.existsSync(cacheFile)) {
    return serveCache(cacheFile, repoPath, download);
  }

  // 未命中：尝试多源下载
  const upstream = await fetchWithSources(repoPath, REPO_SOURCES);
  if (!upstream) {
    return new Response(errorHtml("国家教材源暂时不可用", repoPath), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const lenHeader = upstream.headers.get("content-length");
  const len = lenHeader ? Number(lenHeader) : 0;

  // 超大文件或未知大小：不缓存，但直接返回空/错误更稳；仍尝试流式，错误已在外层处理
  if (len > MAX_CACHE_BYTES || len === 0) {
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=3600",
      "X-Cache": "STREAM",
    };
    if (len) headers["Content-Length"] = String(len);
    if (download) {
      headers["Content-Disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(
          path.basename(repoPath)
        )}`;
    }
    return new Response(upstream.body, { headers });
  }

  // 下载到临时文件
  try {
    const out = fs.createWriteStream(tmpFile);
    await pipeline(
      Readable.fromWeb(upstream.body as never),
      out
    );
    fs.renameSync(tmpFile, cacheFile);
    return serveCache(cacheFile, repoPath, download);
  } catch (err) {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
    return new Response(errorHtml("教材下载中断，请稍后重试", repoPath), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
