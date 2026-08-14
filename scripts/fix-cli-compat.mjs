#!/usr/bin/env node
/**
 * 修复 @ionic/cli-framework-output 兼容性：
 * 它需要 CommonJS 版本的 string-width / strip-ansi（v4/v6），
 * 而 fast-install 装的是最新 ESM 版（v8/v7）导致 stringWidth is not a function。
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = "https://registry.npmmirror.com";

const FIXES = [
  { name: "string-width", version: "4.2.3" },
  { name: "strip-ansi", version: "6.0.1" },
  { name: "ansi-regex", version: "5.0.1" },
  { name: "emoji-regex", version: "8.0.0" },
  { name: "is-fullwidth-code-point", version: "3.0.0" },
  { name: "wrap-ansi", version: "7.0.0" },
  { name: "ansi-styles", version: "4.3.0" },
  { name: "@types/fs-extra", version: "latest" },
  { name: "@types/slice-ansi", version: "latest" },
];

function bashPath(p) {
  return p.replace(/^([A-Za-z]):\\/, "/$1/").replace(/\\/g, "/");
}

for (const { name, version } of FIXES) {
  const dest = path.join(ROOT, "node_modules", name);
  try {
    const meta = await (
      await fetch(`${REGISTRY}/${encodeURIComponent(name)}/${version}`)
    ).json();
    const tarFile = path.join(
      os.tmpdir(),
      `fix-${name.replace("/", "__")}-${Date.now()}.tgz`
    );
    await pipeline(
      Readable.fromWeb((await fetch(meta.dist.tarball)).body),
      fs.createWriteStream(tarFile)
    );
    const staging = path.join(os.tmpdir(), `fix-stage-${name}-${Date.now()}`);
    fs.mkdirSync(staging, { recursive: true });
    execSync(`tar -xzf "${bashPath(tarFile)}" -C "${bashPath(staging)}"`, {
      stdio: "pipe",
    });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(path.join(staging, "package"), dest, { recursive: true });
    const ver = JSON.parse(
      fs.readFileSync(path.join(dest, "package.json"), "utf-8")
    ).version;
    console.log(`✓ ${name}@${ver}（${fs.existsSync(path.join(dest, "index.js")) ? "CJS" : "module"}）`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message?.slice(0, 120)}`);
  }
}
