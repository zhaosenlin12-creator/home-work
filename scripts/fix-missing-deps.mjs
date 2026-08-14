#!/usr/bin/env node
/** 补齐缺失依赖 v5：并发下载 → 解压到 /tmp staging → fs.cpSync 复制到 node_modules */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = "https://registry.npmmirror.com";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "deps-v5-"));

const MISSING = [
  "qrcode-generator"
];

// Git Bash tar 的 -C 只接受 /tmp 等 POSIX 路径；os.tmpdir() 的 Windows 路径转 POSIX
function bashPath(p) {
  return p.replace(/^([A-Za-z]):\\/, "/$1/").replace(/\\/g, "/");
}
function pkgToDir(name) {
  return name.startsWith("@")
    ? path.join(ROOT, "node_modules", ...name.split("/"))
    : path.join(ROOT, "node_modules", name);
}

async function download(name) {
  const meta = await (await fetch(`${REGISTRY}/${encodeURIComponent(name)}/latest`)).json();
  const tarFile = path.join(TMP, name.replace("/", "__") + ".tgz");
  await pipeline(Readable.fromWeb((await fetch(meta.dist.tarball)).body), fs.createWriteStream(tarFile));
  return { name, tarFile };
}

const need = MISSING.filter((n) => !fs.existsSync(path.join(pkgToDir(n), "package.json")));
console.log(`待处理 ${need.length} 个，8 并发下载...`);
const results = [];
const workers = Array.from({ length: 8 }, async (_, i) => {
  for (let j = i; j < need.length; j += 8) {
    try {
      results.push(await download(need[j]));
    } catch (e) {
      console.error(`✗ 下载失败 ${need[j]}: ${e.message?.slice(0, 80)}`);
    }
  }
});
await Promise.all(workers);
console.log(`下载完成 ${results.length}/${need.length}`);

let ok = 0, fail = 0;
for (const { name, tarFile } of results) {
  try {
    // 解压到 TMP 下的 staging（/tmp 风格路径，tar -C 可用）
    const staging = path.join(TMP, "stage-" + name.replace("/", "__"));
    fs.mkdirSync(staging, { recursive: true });
    execSync(`tar -xzf "${bashPath(tarFile)}" -C "${bashPath(staging)}"`, { stdio: "pipe" });
    // 复制 package 内容到 node_modules（fs.cpSync 不受 tar 路径限制）
    const src = path.join(staging, "package");
    const dest = pkgToDir(name);
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ ${name}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${name}: ${(e.stderr || e.message || "").toString().slice(0, 120)}`);
    fail++;
  }
}
console.log(`\n完成: ${ok} 就绪, ${fail} 失败`);
process.exitCode = fail > 0 ? 1 : 0;
