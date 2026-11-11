import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, hasAdminRole } from "@/lib/admin-auth";
import { DEFAULT_HOMEPAGE_CAROUSEL_INTERVAL_SECONDS } from "@/lib/homepage-slides";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const maxImageBytes = 8 * 1024 * 1024;

function requestCookies(request: Request) {
  return () => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }).filter((cookie) => cookie.name) ?? [];
}

async function authorizedSupabase(request: Request) {
  const auth = createAdminAuthClient(requestCookies(request));
  const { data } = auth ? await auth.auth.getUser() : { data: { user: null } };
  if (!await hasAdminRole(data.user?.id, ["admin", "operations"])) return null;
  return createAdminDataClient();
}

export async function GET(request: Request) {
  const supabase = await authorizedSupabase(request);
  if (!supabase) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });
  const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("homepage_slides").select("id, image_path, image_url, alt_text, href, sort_order, is_active, created_at").order("sort_order").order("created_at"),
    supabase.from("homepage_carousel_settings").select("interval_seconds").eq("id", "default").maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "无法加载轮播图。请先执行数据库迁移。" }, { status: 500 });
  if (settingsError) return NextResponse.json({ error: "无法加载轮播设置。请先执行数据库迁移。" }, { status: 500 });
  return NextResponse.json({ items: data ?? [], intervalSeconds: settings?.interval_seconds ?? DEFAULT_HOMEPAGE_CAROUSEL_INTERVAL_SECONDS });
}

export async function POST(request: Request) {
  const supabase = await authorizedSupabase(request);
  if (!supabase) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get("image");
  const altText = String(formData.get("altText") ?? "").trim();
  const hrefValue = String(formData.get("href") ?? "").trim();
  const href = hrefValue || null;
  if (!(image instanceof File)) return NextResponse.json({ error: "请选择一张图片。" }, { status: 400 });
  if (!allowedTypes[image.type]) return NextResponse.json({ error: "图片格式仅支持 JPEG、PNG、WebP 或 GIF。" }, { status: 400 });
  if (image.size === 0 || image.size > maxImageBytes) return NextResponse.json({ error: "图片大小需大于 0 且不超过 8 MB。" }, { status: 400 });
  if (altText.length > 200) return NextResponse.json({ error: "替代文字不能超过 200 个字符。" }, { status: 400 });
  if (href && (!href.startsWith("/") || href.startsWith("//")) && !href.startsWith("https://")) return NextResponse.json({ error: "跳转链接请使用站内路径或 HTTPS 地址。" }, { status: 400 });

  const path = `homepage/${crypto.randomUUID()}.${allowedTypes[image.type]}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, await image.arrayBuffer(), { contentType: image.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: `图片上传失败：${uploadError.message}` }, { status: 400 });

  const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
  const { data: latest } = await supabase.from("homepage_slides").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sortOrder = (latest?.sort_order ?? -1) + 1;
  const { data, error } = await supabase.from("homepage_slides").insert({ image_path: path, image_url: publicUrl.publicUrl, alt_text: altText, href, sort_order: sortOrder }).select("id, image_path, image_url, alt_text, href, sort_order, is_active, created_at").single();
  if (error) {
    await supabase.storage.from("product-images").remove([path]);
    return NextResponse.json({ error: "轮播图记录保存失败。请确认已执行数据库迁移。" }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await authorizedSupabase(request);
  if (!supabase) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });
  let body: { id?: string; altText?: string; href?: string | null; sortOrder?: number; isActive?: boolean; intervalSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求数据无效。" }, { status: 400 });
  }
  if (body.intervalSeconds !== undefined) {
    if (!Number.isInteger(body.intervalSeconds) || body.intervalSeconds < 1 || body.intervalSeconds > 60) {
      return NextResponse.json({ error: "轮播间隔需设置为 1 到 60 秒。" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("homepage_carousel_settings")
      .upsert({ id: "default", interval_seconds: body.intervalSeconds })
      .select("interval_seconds")
      .single();
    if (error) return NextResponse.json({ error: "无法保存轮播间隔设置。" }, { status: 500 });
    return NextResponse.json({ intervalSeconds: data.interval_seconds });
  }

  if (!body.id) return NextResponse.json({ error: "轮播图 ID 无效。" }, { status: 400 });

  const update: { alt_text?: string; href?: string | null; sort_order?: number; is_active?: boolean } = {};
  if (body.altText !== undefined) {
    if (body.altText.length > 200) return NextResponse.json({ error: "替代文字不能超过 200 个字符。" }, { status: 400 });
    update.alt_text = body.altText.trim();
  }
  if (body.href !== undefined) {
    const href = body.href?.trim() || null;
    if (href && (!href.startsWith("/") || href.startsWith("//")) && !href.startsWith("https://")) return NextResponse.json({ error: "跳转链接请使用站内路径或 HTTPS 地址。" }, { status: 400 });
    update.href = href;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0) return NextResponse.json({ error: "排序值无效。" }, { status: 400 });
    update.sort_order = body.sortOrder;
  }
  if (body.isActive !== undefined) update.is_active = body.isActive;
  if (!Object.keys(update).length) return NextResponse.json({ error: "没有可保存的修改。" }, { status: 400 });

  const { data, error } = await supabase.from("homepage_slides").update(update).eq("id", body.id).select("id, image_path, image_url, alt_text, href, sort_order, is_active, created_at").single();
  if (error) return NextResponse.json({ error: "无法更新轮播图。" }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const supabase = await authorizedSupabase(request);
  if (!supabase) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求数据无效。" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "轮播图 ID 无效。" }, { status: 400 });

  const { data: slide, error: lookupError } = await supabase.from("homepage_slides").select("id, image_path").eq("id", body.id).maybeSingle();
  if (lookupError || !slide) return NextResponse.json({ error: "找不到这张轮播图。" }, { status: 404 });
  const { error } = await supabase.from("homepage_slides").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "无法删除轮播图记录。" }, { status: 500 });
  await supabase.storage.from("product-images").remove([slide.image_path]);
  return NextResponse.json({ ok: true });
}