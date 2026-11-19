export const imageRemoteHosts = [
  "hffptjdlcrpewcdhvcub.supabase.co",
  "images.unsplash.com",
];

export function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.port && imageRemoteHosts.includes(url.hostname);
  } catch {
    return false;
  }
}
