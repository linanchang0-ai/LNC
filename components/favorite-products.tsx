"use client";

import Link from "next/link";
import { type Product } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist";
import { useEffect, useState } from "react";

export function FavoriteProducts() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/products").then(async (response) => {
      const data = await response.json() as { items?: Product[] };
      if (response.ok && data.items) setProducts(data.items);
    }).catch(() => undefined).finally(() => setProductsLoaded(true));
  }, []);
  const favorites = products.filter((product) => ids.includes(product.id));

  if (!productsLoaded) return null;

  if (favorites.length === 0) {
    return <div className="empty-state"><p className="muted">Tu lista de favoritos está vacía. Guarda las piezas que más te gusten para encontrarlas aquí.</p><Link href="/shop" className="primary-button">Explorar colección</Link></div>;
  }

  return <div className="product-grid">{favorites.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
