import { NextResponse } from "next/server";
import { getHomepageCarouselIntervalSeconds, getHomepageSlides } from "@/lib/homepage-slides";

export async function GET() {
  const [items, intervalSeconds] = await Promise.all([getHomepageSlides(), getHomepageCarouselIntervalSeconds()]);
  return NextResponse.json({ items, intervalSeconds }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}