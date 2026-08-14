#!/usr/bin/env node
/**
 * 高速安装 npm 包（绕过 npm CLI 在沙箱环境的慢速解析）
 *
 * 原理：用 curl 直接下载 npmmirror 的 tarball（curl 实测 <1s），
 * 递归解析 dependencies，解压到 node_modules/。
 *
 * 用法: node scripts/fast-install.mjs <pkg1> <pkg2> ...
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = "https://registry.npmmirror.com";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "fast-install-"));
const queue = [];
const done = new Set();
const failed = [];

function curl(url, out) {
  execSync(`curl -sL -m 120 -o "${out}" "${url}"`, { stdio: "pipe" });
}

function getJson(url) {
  return JSON.parse(execSync(`curl -s -m 60 "${url}"`, { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" }));
}

// Git Bash 环境：Windows 路径转 POSIX 风格（避免 tar 把 C: 当远程主机）
function toBashPath(p) {
  return p.replace(/^([A-Za-z]):\\/, "/$1/").replace(/\\/g, "/");
}

function extractTarball(tarPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  // tar.gz 解压（Windows Git Bash 有 tar）
  execSync(`tar -xzf "${toBashPath(tarPath)}" -C "${toBashPath(destDir)}"`, { stdio: "pipe" });
  // tarball 内是 package/ 目录
  const inner = path.join(destDir, "package");
  if (fs.existsSync(inner)) {
    // 移动内容到 destDir
    for (const f of fs.readdirSync(inner)) {
      fs.renameSync(path.join(inner, f), path.join(destDir, f));
    }
    // 清理空 package 目录（safe-delete 拦截时忽略，内容已移动完成）
    try {
      fs.rmdirSync(inner);
    } catch {
      /* ignore */
    }
  }
}

// npm 包名 → 目录路径
function pkgToDir(name) {
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    return path.join("node_modules", scope, pkg);
  }
  return path.join("node_modules", name);
}

function resolveDeps(pkgName, version) {
  let meta;
  try {
    if (version && version !== "latest") {
      meta = getJson(`${REGISTRY}/${encodeURIComponent(pkgName)}/${version}`);
    } else {
      meta = getJson(`${REGISTRY}/${encodeURIComponent(pkgName)}/latest`);
    }
  } catch (e) {
    failed.push(pkgName);
    return;
  }
  if (!meta || !meta.dist) {
    failed.push(pkgName);
    return;
  }

  const deps = meta.dependencies || {};
  for (const [dep, ver] of Object.entries(deps)) {
    const key = dep;
    if (!done.has(key)) {
      done.add(key);
      queue.push({ name: dep, version: ver });
    }
  }

  const targetDir = path.join(ROOT, pkgToDir(pkgName));
  if (fs.existsSync(path.join(targetDir, "package.json"))) return; // 已存在跳过

  const tarPath = path.join(TMP, pkgName.replace("/", "__") + ".tgz");
  try {
    curl(meta.dist.tarball, tarPath);
    extractTarball(tarPath, targetDir);
    console.log(`✓ ${pkgName}@${meta.version}`);
  } catch (e) {
    failed.push(pkgName);
    console.error(`✗ ${pkgName}: ${e.message}`);
  }
}

async function main() {
  const targets = process.argv.slice(2);
  for (const t of targets) {
    if (!done.has(t)) {
      done.add(t);
      queue.push({ name: t, version: "latest" });
    }
  }

  while (queue.length > 0) {
    const { name, version } = queue.shift();
    try {
      resolveDeps(name, version);
    } catch (e) {
      failed.push(name);
    }
  }

  console.log(`\n完成。失败 ${failed.length} 个: ${failed.join(", ") || "无"}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("fast-install 出错:", e.message);
  process.exit(1);
});
