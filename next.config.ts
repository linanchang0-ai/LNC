import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 仅使用 WebP：iOS 16.0–16.3 的 Safari 误报支持 AVIF，解码失败且不会回退，
    // 会导致手机端图片空白；WebP 自 iOS 14 起稳定支持。
    formats: ["image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "hffptjdlcrpewcdhvcub.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
