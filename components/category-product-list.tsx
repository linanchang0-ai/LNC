"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/data/products";
import { useI18n } from "@/components/locale-provider";

type ProductSort = "price" | "popular" | "recent";

export function CategoryProductList({ products, popularProductIds, popularityAvailable }: { products: Product[]; popularProductIds: string[]; popularityAvailable: boolean }) {
  const { t } = useI18n();
  const [sort, setSort] = useState<ProductSort>("recent");
  const [priceDescending, setPriceDescending] = useState(false);
  const popularRanks = useMemo(() => new Map(popularProductIds.map((id, index) => [id, index])), [popularProductIds]);
  const sortedProducts = useMemo(() => [...products].sort((first, second) => {
    if (sort === "price") return (first.price - second.price) * (priceDescending ? -1 : 1);
    if (sort === "popular") {
      if (popularityAvailable) {
        const firstRank = popularRanks.get(String(first.databaseId ?? first.id)) ?? Number.MAX_SAFE_INTEGER;
        const secondRank = popularRanks.get(String(second.databaseId ?? second.id)) ?? Number.MAX_SAFE_INTEGER;
        return firstRank - secondRank;
      }
      const firstPopular = Number(Boolean(first.featured)) + Number(first.badge === "Best Seller");
      const secondPopular = Number(Boolean(second.featured)) + Number(second.badge === "Best Seller");
      return secondPopular - firstPopular;
    }
    const firstCreated = first.createdAt ? Date.parse(first.createdAt) : 0;
    const secondCreated = second.createdAt ? Date.parse(second.createdAt) : 0;
    return secondCreated - firstCreated;
  }), [popularRanks, popularityAvailable, priceDescending, products, sort]);

  const selectSort = (nextSort: ProductSort) => {
    if (nextSort === "price" && sort === "price") setPriceDescending((descending) => !descending);
    else if (nextSort === "price") setPriceDescending(false);
    setSort(nextSort);
  };

  return (
    <>
      <div className="filter-bar category-sort-controls" aria-label={t("Ordenar productos")}>
        <button className="filter-chip" type="button" aria-pressed={sort === "price"} onClick={() => selectSort("price")}>
          {t("Precio")}{sort === "price" ? (priceDescending ? " ↓" : " ↑") : ""}
        </button>
        <button className="filter-chip" type="button" aria-pressed={sort === "popular"} onClick={() => selectSort("popular")}>
          {t("Más populares")}
        </button>
        <button className="filter-chip" type="button" aria-pressed={sort === "recent"} onClick={() => selectSort("recent")}>
          {t("Más recientes")}
        </button>
      </div>
      {sort === "popular" && !popularityAvailable ? <p className="muted" role="status">{t("Los datos de popularidad no están disponibles; mostramos primero los productos destacados.")}</p> : null}
      {sortedProducts.length > 0 ? (
        <div className="product-grid">
          {sortedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-state"><p className="muted">{t("No hay productos disponibles.")}</p></div>
      )}
    </>
  );
}
