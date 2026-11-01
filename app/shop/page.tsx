"use client";

import { useEffect, useState } from "react";
import { categories as fallbackCategories, type Category, type Product } from "@/data/products";
import { ProductCard } from "@/components/product-card";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [category, setCategory] = useState("all");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("featured");
  useEffect(() => {
    fetch("/api/products").then(async (response) => {
      const data = await response.json() as { items?: Product[] };
      if (response.ok && data.items) setProducts(data.items);
    }).catch(() => undefined).finally(() => setProductsLoaded(true));
    fetch("/api/categories").then(async (response) => {
      const data = await response.json() as { items?: Category[] };
      if (response.ok && data.items) setCategories(data.items);
    }).catch(() => undefined);
  }, []);
  const filteredProducts = products
    .filter((product) => category === "all" || product.category === category)
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
        <h1>Tienda</h1>
        <p>Una colección seleccionada de objetos premium para tus rituales y espacios cotidianos.</p>
      </div>

      <div className="shop-toolbar">
        <div className="shop-filters" aria-label="Product filters">
          <label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las categorías</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
          <label>Precio<select value={price} onChange={(event) => setPrice(event.target.value)}><option value="all">Todos los precios</option><option value="under-2000">Menos de MXN 2,000</option><option value="2000-5000">MXN 2,000–5,000</option><option value="over-5000">Más de MXN 5,000</option></select></label>
        </div>
        <label className="sort-control">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Destacados</option><option value="newest">Más recientes</option><option value="price-low">Precio: menor a mayor</option><option value="price-high">Precio: mayor a menor</option></select></label>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {productsLoaded && filteredProducts.length === 0 ? <div className="empty-state"><p className="muted">No hay productos disponibles.</p></div> : null}
    </div>
  );
}
