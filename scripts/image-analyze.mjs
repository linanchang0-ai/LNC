// 只读分析备份图片：格式、尺寸、体积，以及压缩到 1200px q80 后的预估体积。不上传。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupDir = process.argv[2] || fs.readdirSync(path.join(root, "image-backup")).sort().at(-1);
const backupRoot = path.join(root, "image-backup", backupDir);
const manifest = JSON.parse(fs.readFileSync(path.join(backupRoot, "manifest.json"), "utf8"));

const rows = [];
for (const item of manifest.images) {
  const file = path.join(backupRoot, item.path);
  const meta = await sharp(file).metadata();
  const out = await sharp(file)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  rows.push({
    path: item.path,
    fmt: meta.format,
    w: meta.width,
    h: meta.height,
    origKB: Math.round(item.bytes / 1024),
    newKB: Math.round(out.info.size / 1024),
    skip: Math.max(meta.width ?? 0, meta.height ?? 0) <= 1200 && item.bytes <= 250_000,
  });
}

rows.sort((a, b) => b.origKB - a.origKB);
for (const r of rows) {
  console.log(`${r.skip ? "SKIP " : "COMP "}| ${r.fmt} ${r.w}x${r.h} | ${r.origKB}KB -> ${r.newKB}KB | ${r.path.split("/").pop()}`);
}

const need = rows.filter((r) => !r.skip);
const origTotal = rows.reduce((s, r) => s + r.origKB, 0);
const newTotal = rows.reduce((s, r) => s + (r.skip ? r.origKB : r.newKB), 0);
console.log(`\n需压缩: ${need.length} / ${rows.length}`);
console.log(`总体积: ${(origTotal / 1024).toFixed(1)} MB -> ${(newTotal / 1024).toFixed(1)} MB`);
const formats = [...new Set(rows.map((r) => r.fmt))];
console.log(`格式: ${formats.join(", ")}`);
