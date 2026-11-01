import { NextResponse } from "next/server";
import { getCatalogCategories } from "@/lib/catalog";

export async function GET() {
  return NextResponse.json({ items: await getCatalogCategories() });
}