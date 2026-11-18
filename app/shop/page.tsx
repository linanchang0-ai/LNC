"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { categories as fallbackCategories, type Category, type Product } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { useI18n } from "@/components/locale-provider";
import { fetchCatalogProducts } from "@/lib/catalog-client";

const ALL = "all";

function buildQuery(next: { category: string; price: string; sort: string }) {
  const params = new URLSearchParams();
  if (next.category !== ALL) params.set("category", next.category);
  if (next.price !== ALL) params.set("price", next.price);
  if (next.sort !== "featured") params.set("sort", next.sort);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

function ShopContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsLoadFailed, setProductsLoadFailed] = useState(false);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);

  const category = searchParams.get("category") || ALL;
  const price = searchParams.get("price") || ALL;
  const sort = searchParams.get("sort") || "featured";

  useEffect(() => {
    fetchCatalogProducts().then(setProducts).catch(() => setProductsLoadFailed(true)).finally(() => setProductsLoaded(true));
    fetch("/api/categories").then(async (response) => {
      const data = await response.json() as { items?: Category[] };
      if (response.ok && data.items) setCategories(data.items);
    }).catch(() => undefined);
  }, []);

  const updateFilters = (next: Partial<{ category: string; price: string; sort: string }>) => {
    const merged = { category, price, sort, ...next };
    router.replace(buildQuery(merged), { scroll: false });
  };

  const filteredProducts = products
    .filter((product) => category === ALL || product.category === category)
    .filter((product) => {
      if (price === "under-2000") return product.price < 2000;
      if (price === "2000-5000") return product.price >= 2000 && product.price <= 5000;
      if (price === "over-5000") return product.price > 5000;
      return true;
    })
    .sort((first, second) => {
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;
      if (sort === "newest") return String(second.id).localeCompare(String(first.id));
      return Number(Boolean(second.featured)) - Number(Boolean(first.featured));
    });

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>{t("Tienda")}</h1>
        <p>{t("Camisetas de fútbol para hinchas: ediciones local y visitante, varias tallas y colores, listas para tu próximo partido.")}</p>
      </div>

      <div className="shop-toolbar">
        <div className="shop-filters" aria-label={t("Filtros de productos")}>
          <label>{t("Categoría")}<select value={category} onChange={(event) => updateFilters({ category: event.target.value })}><option value={ALL}>{t("Todas las categorías")}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{t(item.name)}</option>)}</select></label>
          <label>{t("Precio")}<select value={price} onChange={(event) => updateFilters({ price: event.target.value })}><option value={ALL}>{t("Todos los precios")}</option><option value="under-2000">{t("Menos de MXN 2,000")}</option><option value="2000-5000">{t("MXN 2,000–5,000")}</option><option value="over-5000">{t("Más de MXN 5,000")}</option></select></label>
        </div>
        <label className="sort-control">{t("Ordenar por")}<select value={sort} onChange={(event) => updateFilters({ sort: event.target.value })}><option value="featured">{t("Destacados")}</option><option value="newest">{t("Más recientes")}</option><option value="price-low">{t("Precio: menor a mayor")}</option><option value="price-high">{t("Precio: mayor a menor")}</option></select></label>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {productsLoaded && productsLoadFailed ? <p className="error-box" role="alert">{t("No pudimos cargar los productos. Inténtalo de nuevo más tarde.")}</p> : null}
      {productsLoaded && !productsLoadFailed && filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p className="muted">
            {products.length === 0
              ? t("Estamos preparando nuestro catálogo. Si buscas algo en particular, estamos aquí para ayudarte.")
              : t("No encontramos productos con estos filtros. Prueba otra selección.")}
          </p>
          {products.length === 0 ? <Link href="/contact" className="ghost-button">{t("Contactar al equipo")}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}
