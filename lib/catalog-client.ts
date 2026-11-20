"use client";

import { type Product } from "@/data/products";

let catalogPromise: Promise<Product[]> | null = null;

/**
 * 多个组件并发调用时复用在途请求，完成后清除缓存以便后续读取最新目录。
 */
export function fetchCatalogProducts(): Promise<Product[]> {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { items?: Product[] };
        if (!response.ok || !Array.isArray(data.items)) {
          throw new Error("No se pudieron cargar los productos.");
        }
        return data.items;
      })
      .finally(() => {
        catalogPromise = null;
      });
  }
  return catalogPromise;
}
