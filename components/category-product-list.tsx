"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/data/products";

type ProductSort = "price" | "popular" | "recent";

export function CategoryProductList({ products, popularProductIds, popularityAvailable }: { products: Product[]; popularProductIds: string[]; popularityAvailable: boolean }) {
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
      <div className="filter-bar category-sort-controls" aria-label="Ordenar productos">
        <button className="filter-chip" type="button" aria-pressed={sort === "price"} onClick={() => selectSort("price")}>
          Precio{sort === "price" ? (priceDescending ? " ↓" : " ↑") : ""}
        </button>
        <button className="filter-chip" type="button" aria-pressed={sort === "popular"} onClick={() => selectSort("popular")}>
          Más populares
        </button>
        <button className="filter-chip" type="button" aria-pressed={sort === "recent"} onClick={() => selectSort("recent")}>
          Más recientes
        </button>
      </div>
      {sort === "popular" && !popularityAvailable ? <p className="muted" role="status">销量数据暂不可用，已优先展示精选商品。</p> : null}
      {sortedProducts.length > 0 ? (
        <div className="product-grid">
          {sortedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-state"><p className="muted">No hay productos disponibles.</p></div>
      )}
    </>
  );
}
