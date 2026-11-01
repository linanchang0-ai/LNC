import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, hasAdminRole } from "@/lib/admin-auth";

function requestCookies(request: Request) {
  return () => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }).filter((cookie) => cookie.name) ?? [];
}

export async function POST(request: Request) {
  const auth = createAdminAuthClient(requestCookies(request));
  const { data } = auth ? await auth.auth.getUser() : { data: { user: null } };
  if (!await hasAdminRole(data.user?.id, ["admin", "operations"])) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const supabase = createAdminDataClient();
  if (!supabase) return NextResponse.json({ error: "El almacenamiento no está configurado." }, { status: 503 });

  const formData = await request.formData();
  const productId = formData.get("productId");
  const images = formData.getAll("images").filter((entry): entry is File => entry instanceof File);
  if (typeof productId !== "string" || !productId || !images.length) return NextResponse.json({ error: "Selecciona al menos una imagen." }, { status: 400 });
  if (images.some((image) => !image.type.startsWith("image/"))) return NextResponse.json({ error: "Solo se permiten archivos de imagen." }, { status: 400 });

  const urls: string[] = [];
  for (const image of images) {
    const extension = image.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("product-images").upload(path, await image.arrayBuffer(), { contentType: image.type, upsert: false });
    if (error) return NextResponse.json({ error: `No se pudo guardar la imagen: ${error.message}` }, { status: 400 });
    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    urls.push(publicUrl.publicUrl);
  }

  return NextResponse.json({ urls });
}