"use client";

import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const { addToCart } = useCart();
  const isOutOfStock = product.stock.toLowerCase().includes("agotado");
  const productName = t(product.name);

  const addProduct = () => {
    if (isOutOfStock) return;
    addToCart({
      id: product.databaseId ?? product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <article className={`product-card ${isOutOfStock ? "is-out-of-stock" : ""}`}>
      <div className="product-image-wrap">
        <Link href={`/products/${product.slug}`} className="product-image-link" aria-label={`${t("Ver")} ${productName}`}>
          <img src={product.image} alt={productName} />
        </Link>
        <div className="product-card-topline">
          {product.badge ? <span className="badge">{product.badge === "Best Seller" ? t("Más vendido") : product.badge === "Limited" ? t("Edición limitada") : product.badge}</span> : null}
        </div>
        <div className="product-card-actions">
          {product.sizes?.length && !isOutOfStock
            ? <Link className="quick-add-button" href={`/products/${product.slug}`}>{t("Elegir talla")}</Link>
            : <button type="button" className="quick-add-button" onClick={addProduct} disabled={isOutOfStock}>{isOutOfStock ? t("Agotado") : t("Añadir al carrito")}</button>}
        </div>
      </div>
      <div className="product-body">
        <h3><Link href={`/products/${product.slug}`}>{productName}</Link></h3>
        <p>{t(product.shortDescription)}</p>
        <div className="product-rating" aria-label={t("5 de 5 estrellas")}>
          <span aria-hidden="true">★★★★★</span><span>5.0</span>
        </div>
        <div className="price-row">
          <div>
            <div className="price">{formatPrice(product.price)}</div>
            {product.oldPrice ? <span className="old-price">{formatPrice(product.oldPrice)}</span> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
