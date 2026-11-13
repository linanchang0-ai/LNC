import { NextResponse } from "next/server";
import { getCatalogCategories } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json(
    { items: await getCatalogCategories() },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}