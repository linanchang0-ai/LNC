// 批量压缩备份图片并（可选）回传 Supabase 同路径。
// 用法：
//   node scripts/image-compress.mjs          仅 dry-run，输出预估体积，不上传
//   node scripts/image-compress.mjs --upload 实际压缩并 upsert 到原路径
// 原图已在 image-backup/<日期>/ 留档，可回滚。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doUpload = process.argv.includes("--upload");

function loadEnv() {
  const text = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "product-images";
const backupDir = fs.readdirSync(path.join(root, "image-backup")).sort().at(-1);
const backupRoot = path.join(root, "image-backup", backupDir);
const manifest = JSON.parse(fs.readFileSync(path.join(backupRoot, "manifest.json"), "utf8"));

const results = [];
let uploadErrors = [];

for (const item of manifest.images) {
  const file = path.join(backupRoot, item.path);
  const meta = await sharp(file).metadata();
  const pipeline = sharp(file).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true });

  let outBuf;
  let contentType;
  if (meta.format === "png") {
    const r = await pipeline.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer({ resolveWithObject: true });
    outBuf = r.data;
    contentType = "image/png";
  } else {
    const r = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    outBuf = r.data;
    contentType = "image/jpeg";
  }

  const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0);
  const alreadySmall = maxDim <= 1200 && item.bytes <= 250_000;
  const grew = outBuf.length >= item.bytes;
  const skip = alreadySmall || grew;

  results.push({
    path: item.path,
    format: meta.format,
    width: meta.width,
    height: meta.height,
    origBytes: item.bytes,
    newBytes: outBuf.length,
    skip,
    reason: alreadySmall ? "already-small" : grew ? "no-gain" : "compress",
  });

  if (skip || !doUpload) continue;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(item.path, outBuf, { upsert: true, contentType });
  if (error) {
    console.error(`上传失败 ${item.path}: ${error.message}`);
    uploadErrors.push({ path: item.path, message: error.message });
  }
}

const need = results.filter((r) => !r.skip);
const origTotal = results.reduce((s, r) => s + r.origBytes, 0);
const newTotal = results.reduce((s, r) => s + (r.skip ? r.origBytes : r.newBytes), 0);

console.log(`模式: ${doUpload ? "实际上传" : "dry-run（未上传）"}`);
console.log(`总图片: ${results.length}，需压缩: ${need.length}，跳过: ${results.length - need.length}`);
console.log(`总体积: ${(origTotal / 1048576).toFixed(1)} MB -> ${(newTotal / 1048576).toFixed(1)} MB`);
if (uploadErrors.length) console.log(`上传失败: ${uploadErrors.length}`);

const reportPath = path.join(backupRoot, doUpload ? "compress-result.json" : "compress-preview.json");
fs.writeFileSync(reportPath, JSON.stringify({ doUpload, results, uploadErrors }, null, 2));
console.log(`报告: ${reportPath}`);
if (uploadErrors.length) process.exitCode = 1;
