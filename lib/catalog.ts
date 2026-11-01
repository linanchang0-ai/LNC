import { categories as fallbackCategories, products, type Category, type Product } from "@/data/products";
import { createAdminDataClient } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase";

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  category: Product["category"];
  price: number;
  created_at: string;
  old_price: number | null;
  short_description: string;
  description: string;
  materials: string[];
  dimensions: string;
  colors: string[];
  size_options: string[] | null;
  stock: string;
  inventory_quantity: number | null;
  shipping_fee: number | null;
  featured: boolean;
  limited: boolean;
  image_url: string;
  color_images: Record<string, string> | null;
  color_prices: Record<string, number> | null;
  gallery: string[];
  detail_images: string[] | null;
  is_published: boolean;
};

type CategoryRow = {
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

const useDemoCatalog = process.env.NODE_ENV === "development";

export async function getCatalogCategories(): Promise<Category[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return useDemoCatalog ? fallbackCategories : [];
  const { data, error } = await supabase.from("categories").select("slug, name, description, image_url").order("name");
  if (error) return useDemoCatalog ? fallbackCategories : [];
  if (!data) return [];

  return (data as CategoryRow[]).map((category) => {
    const fallback = fallbackCategories.find((item) => item.slug === category.slug);
    return {
      slug: category.slug,
      name: category.name,
      label: category.description || fallback?.label || `Explora nuestra colección de ${category.name}.`,
      description: category.description || fallback?.description || `Productos seleccionados en ${category.name}.`,
      image: category.image_url || fallback?.image || "",
    };
  });
}

export async function getCatalogProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return useDemoCatalog ? products : [];
  const fields = "id, slug, name, category, price, old_price, short_description, description, materials, dimensions, colors, size_options, stock, inventory_quantity, shipping_fee, featured, limited, image_url, color_images, color_prices, gallery, detail_images, is_published, created_at";
  const fallbackFields = [
    fields.replace(", color_prices", ""),
    fields.replace(", size_options", ""),
    fields.replace(", size_options, stock", ", stock").replace(", color_prices", ""),
  ];
  const initialResult = await supabase.from("products").select(fields).eq("is_published", true);
  let data: unknown = initialResult.data;
  let error = initialResult.error;
  for (const fallbackFieldsQuery of fallbackFields) {
    if (error?.code !== "42703") break;
    const fallbackResult = await supabase.from("products").select(fallbackFieldsQuery).eq("is_published", true);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  const rows = data as unknown as CatalogRow[] | null;
  if (error) return useDemoCatalog ? products : [];
  if (!rows) return [];

  return rows.map((row) => {
    const fallback = products.find((product) => product.slug === row.slug);
    return {
      ...(fallback ?? { badge: undefined, details: [], oldPrice: undefined }),
      id: row.id,
      databaseId: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      createdAt: row.created_at,
      oldPrice: row.old_price === null ? undefined : Number(row.old_price),
      shortDescription: row.short_description,
      description: row.description,
      materials: row.materials,
      dimensions: row.dimensions,
      colors: row.colors,
      sizes: row.size_options ?? [],
      stock: row.inventory_quantity === null ? row.stock : row.inventory_quantity === 0 ? "Agotado" : row.inventory_quantity <= 5 ? "Pocas unidades" : "En stock",
      inventoryQuantity: row.inventory_quantity ?? undefined,
      shippingFee: Number(row.shipping_fee ?? 0),
      featured: row.featured,
      limited: row.limited,
      image: row.image_url || row.gallery?.[0] || "",
      colorImages: row.color_images ?? {},
      colorPrices: row.color_prices ?? {},
      gallery: row.image_url ? [row.image_url, ...(row.gallery?.[0] === row.image_url ? row.gallery.slice(1) : row.gallery ?? [])] : row.gallery ?? [],
      detailImages: row.detail_images ?? [],
    };
  });
}

export async function getCatalogPopularProductIds(): Promise<{ ids: string[]; available: boolean }> {
  const database = createAdminDataClient();
  if (!database) return { ids: [], available: false };

  const quantities = new Map<string, number>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await database
      .from("order_items")
      .select("product_id, quantity, orders!inner(payment_status)")
      .eq("orders.payment_status", "Pagado")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Could not load paid order items for product popularity.", error);
      return { ids: [], available: false };
    }

    for (const item of data ?? []) {
      if (!item.product_id) continue;
      const productId = String(item.product_id);
      quantities.set(productId, (quantities.get(productId) ?? 0) + Number(item.quantity ?? 0));
    }

    if ((data?.length ?? 0) < pageSize) break;
  }

  return {
    ids: [...quantities.entries()].sort((first, second) => second[1] - first[1]).map(([id]) => id),
    available: true,
  };
}