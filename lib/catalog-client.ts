"use client";

import { type Product } from "@/data/products";

let catalogPromise: Promise<Product[]> | null = null;

/**
 * 同标签页内共享一次商品目录请求：多个组件（头部搜索、收藏、购物车校验、商店页、详情页）
 * 并发调用时复用同一个在途 Promise，避免重复拉取整份目录。失败后清空缓存以便重试。
 */
export function fetchCatalogProducts(): Promise<Product[]> {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/products")
      .then(async (response) => {
        const data = await response.json() as { items?: Product[] };
        if (!response.ok || !Array.isArray(data.items)) {
          throw new Error("No se pudieron cargar los productos.");
        }
        return data.items;
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}
