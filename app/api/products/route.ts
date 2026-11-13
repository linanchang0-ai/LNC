import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json(
    { items: await getCatalogProducts() },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
