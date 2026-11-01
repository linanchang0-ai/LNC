"use client";

import { useEffect, useState } from "react";

const WISHLIST_KEY = "lnc_sports_wishlist";
const WISHLIST_EVENT = "lnc-sports:wishlist-change";

type ProductId = string | number;

function readWishlist(): ProductId[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is ProductId => typeof id === "number" || typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids: ProductId[]) {
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
}

export function useWishlist() {
  const [ids, setIds] = useState<ProductId[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const sync = () => setIds(readWishlist());
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    fetch("/api/account?resource=favorites").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { items?: string[] };
      const savedIds = data.items ?? [];
      setIsAuthenticated(true);
      setIds(savedIds);
      writeWishlist(savedIds);
    }).catch(() => undefined);
  }, []);

  const toggle = async (id: ProductId, productSlug?: string) => {
    const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
    setIds(next);
    writeWishlist(next);
    const slug = productSlug;
    if (!isAuthenticated || !slug) return;
    const response = await fetch(`/api/account?resource=favorites`, {
      method: ids.includes(id) ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productSlug: slug }),
    });
    if (!response.ok) {
      setIds(ids);
      writeWishlist(ids);
    }
  };

  return { ids, toggle, isSaved: (id: ProductId) => ids.includes(id) };
}
