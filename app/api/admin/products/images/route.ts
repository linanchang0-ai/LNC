import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, hasAdminRole } from "@/lib/admin-auth";

const MAX_UPLOAD_IMAGE_BYTES = 7 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type UploadImageMetadata = { type: string; size: number };
type SignedImageUpload = { path: string; token: string; url: string };

function isUploadImageMetadata(image: unknown): image is UploadImageMetadata {
  return Boolean(
    image &&
    typeof image === "object" &&
    "type" in image &&
    typeof image.type === "string" &&
    "size" in image &&
    typeof image.size === "number" &&
    Number.isInteger(image.size) &&
    image.size > 0 &&
    image.size <= MAX_UPLOAD_IMAGE_BYTES
  );
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud de imágenes no es válida." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("productId" in body) || !("images" in body)) {
    return NextResponse.json({ error: "La solicitud de imágenes no es válida." }, { status: 400 });
  }

  const { productId, images } = body;
  if (typeof productId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return NextResponse.json({ error: "El producto seleccionado no es válido." }, { status: 400 });
  }
  if (!Array.isArray(images) || !images.length) {
    return NextResponse.json({ error: "Selecciona al menos una imagen." }, { status: 400 });
  }

  const imageMetadata = images.filter(isUploadImageMetadata);
  if (imageMetadata.length !== images.length || imageMetadata.some((image) => !(image.type in IMAGE_EXTENSIONS))) {
    return NextResponse.json({ error: "Las imágenes deben ser JPEG, PNG, WebP o GIF y no superar 7 MB." }, { status: 400 });
  }

  const uploads: SignedImageUpload[] = [];
  for (const image of imageMetadata) {
    const extension = IMAGE_EXTENSIONS[image.type];
    const path = `${productId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage.from("product-images").createSignedUploadUrl(path, { upsert: false });
    if (error) return NextResponse.json({ error: `No se pudo preparar la carga de imagen: ${error.message}` }, { status: 502 });
    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    uploads.push({ path: data.path, token: data.token, url: publicUrl.publicUrl });
  }

  return NextResponse.json({ uploads });
}