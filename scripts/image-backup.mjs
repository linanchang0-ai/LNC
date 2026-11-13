// 批量备份 Supabase 商品原图到本地 image-backup/<日期>/ 目录。
// 仅下载留档，不做任何上传或覆盖。运行：node scripts/image-backup.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

const { data: products, error } = await supabase
  .from("products")
  .select("image_url, color_images, gallery, detail_images_by_color, slug");

if (error) throw new Error(`查询商品失败：${error.message}`);

const urls = new Map();
const add = (u) => {
  if (u && typeof u === "string" && u.startsWith("http")) {
    const rel = decodeURIComponent(u.slice(base.length));
    urls.set(rel, u);
  }
};

for (const p of products ?? []) {
  add(p.image_url);
  (p.gallery ?? []).forEach(add);
  Object.values(p.color_images ?? {}).forEach(add);
  Object.values(p.detail_images_by_color ?? {}).forEach((arr) => (arr ?? []).forEach(add));
}

const rels = [...urls.keys()];
console.log(`商品数: ${(products ?? []).length}，唯一图片: ${rels.length}`);

const backupRoot = path.join(root, "image-backup", new Date().toISOString().slice(0, 10));
fs.mkdirSync(backupRoot, { recursive: true });

const manifest = [];
let failed = [];
for (const rel of rels) {
  const dest = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(urls.get(rel));
  if (!res.ok) {
    console.error(`下载失败 ${res.status}: ${rel}`);
    failed.push(rel);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  manifest.push({ path: rel, bytes: buf.length });
}

const total = manifest.reduce((sum, item) => sum + item.bytes, 0);
fs.writeFileSync(
  path.join(backupRoot, "manifest.json"),
  JSON.stringify({ savedAt: new Date().toISOString(), bucket: BUCKET, images: manifest, failed }, null, 2),
);

console.log(`已备份: ${manifest.length} 张，共 ${(total / 1048576).toFixed(1)} MB`);
console.log(`失败: ${failed.length}`);
console.log(`备份目录: ${backupRoot}`);
if (failed.length) process.exitCode = 1;
