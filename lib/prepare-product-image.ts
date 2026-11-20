"use client";

const MAX_UPLOAD_IMAGE_BYTES = 7 * 1024 * 1024;
const STORAGE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function prepareProductImage(file: File): Promise<File> {
  if (file.type !== "image/jpeg" && STORAGE_IMAGE_TYPES.has(file.type) && file.size <= MAX_UPLOAD_IMAGE_BYTES) return file;

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("无法读取该图片。请在手机相册中转换为 JPEG 后重试。"));
      element.src = sourceUrl;
    });
    const scale = file.type === "image/jpeg"
      ? Math.min(1, 1600 / image.naturalWidth, 8000 / image.naturalHeight)
      : Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片。请更新浏览器后重试。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!compressed || compressed.type !== "image/jpeg") throw new Error("图片压缩失败，请重试。");
    if (file.type === "image/jpeg" && file.size <= MAX_UPLOAD_IMAGE_BYTES && compressed.size >= file.size) return file;
    if (compressed.size > MAX_UPLOAD_IMAGE_BYTES) throw new Error("图片压缩后仍超过 7 MB，请选择较小的图片。");
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.jpg`;
    return new File([compressed], name, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
