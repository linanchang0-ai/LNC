"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { formatPrice, type Product } from "@/data/products";
import { ContactButton } from "@/components/ContactButton";
import { useCart } from "@/components/cart-provider";
import { use, useEffect, useState } from "react";
import { TrustSignals } from "@/components/trust-signals";
import { useWishlist } from "@/components/wishlist";
import { metaEvents } from "@/components/MetaPixel";
import { useI18n } from "@/components/locale-provider";
import { translateProductColor, translateProductField, translateProductMaterials } from "@/lib/i18n";

function imageForColor(product: Product, color: string) {
  return product.colorImages?.[color] ?? product.gallery[product.colors.indexOf(color)] ?? product.image;
}

function priceForColor(product: Product, color: string) {
  return product.colorPrices?.[color] ?? product.price;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t, locale } = useI18n();
  const resolvedParams = use(params);
  const [product, setProduct] = useState<Product>();
  const [productLoaded, setProductLoaded] = useState(false);
  const { addToCart } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product?.gallery[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] ?? "");
  const [zoomOpen, setZoomOpen] = useState(false);
  const { toggle, isSaved } = useWishlist();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [resolvedParams.slug]);

  useEffect(() => {
    fetch("/api/products").then(async (response) => {
      const data = await response.json() as { items?: Product[] };
      const databaseProduct = data.items?.find((item) => item.slug === resolvedParams.slug);
      if (response.ok && databaseProduct) {
        setProduct(databaseProduct);
        setActiveImage(imageForColor(databaseProduct, databaseProduct.colors[0] ?? ""));
        setSelectedColor(databaseProduct.colors[0] ?? "");
        setSelectedSize(databaseProduct.sizes?.[0] ?? "");
        // Meta Pixel: ViewContent
        metaEvents.viewContent({
          content_name: databaseProduct.name,
          content_ids: [databaseProduct.databaseId ?? databaseProduct.id],
          content_type: "product",
          value: databaseProduct.price,
          currency: "MXN",
        });
      }
    }).catch(() => undefined).finally(() => setProductLoaded(true));
  }, [resolvedParams.slug]);

  if (!productLoaded) return null;
  if (!product) notFound();

  const isOutOfStock = product.stock.toLowerCase().includes("agotado");
  const selectedPrice = priceForColor(product, selectedColor);
  const productName = translateProductField(locale, product.translations, "name", product.name);
  const productDescription = translateProductField(locale, product.translations, "description", product.description);

  const selectImage = (image: string) => {
    setActiveImage(image);
    const matchingColor = product.colors.find((color) => imageForColor(product, color) === image);
    if (matchingColor) setSelectedColor(matchingColor);
  };

  const handleBackToProducts = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/shop");
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description: productDescription,
    image: product.gallery,
    brand: { "@type": "Brand", name: "LNC SPORTS" },
    offers: { "@type": "Offer", priceCurrency: "MXN", price: selectedPrice, availability: isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="product-breadcrumb">
        <button type="button" className="back-button" onClick={handleBackToProducts}>{t("Volver a productos")}</button>
      </div>

      <div className="product-detail-layout">
        <div className="gallery-grid">
          <button type="button" className="gallery-main-image" onClick={() => setZoomOpen(true)} aria-label={t("Ampliar imagen del producto")}><img src={activeImage} alt={productName} /></button>
          <div className="gallery-thumbnails">
            {product.gallery.map((image, index) => <button type="button" key={`${product.slug}-${index}`} className={activeImage === image ? "is-active" : ""} onClick={() => selectImage(image)} aria-label={`${t("Ver imagen")} ${index + 1} ${t("de")} ${productName}`}><img src={image} alt={`${productName} ${t("miniatura")} ${index + 1}`} /></button>)}
          </div>
        </div>

        <aside className="detail-panel">
          <h1 className="product-detail-title">{productName}</h1>
          <div className="detail-rating" aria-label={t("5 de 5 estrellas")}>★★★★★ <span>5.0 · {t("Opiniones")}</span></div>
          <div className="detail-price-row">
            <div className="price">{formatPrice(selectedPrice)}</div>
            {product.oldPrice ? <span className="old-price">{formatPrice(product.oldPrice)}</span> : null}
          </div>
          <p className="muted" style={{ margin: "8px 0 18px" }}>{translateProductField(locale, product.translations, "shortDescription", product.shortDescription)}</p>
          <div className="quantity-control" aria-label={t("Cantidad")}>
            <span>{t("Cantidad")}</span>
            <div>
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label={t("Reducir cantidad")} disabled={isOutOfStock}>−</button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label={t("Aumentar cantidad")} disabled={isOutOfStock}>+</button>
            </div>
          </div>
          <div className="variant-control">
            <div><span>{t("Color")}</span><strong>{translateProductColor(locale, product.translations, selectedColor)}</strong></div>
            <div className="variant-options">
              {product.colors.map((color) => <button type="button" key={color} className={selectedColor === color ? "is-selected" : ""} onClick={() => { setSelectedColor(color); setActiveImage(imageForColor(product, color)); }} disabled={isOutOfStock}>{translateProductColor(locale, product.translations, color)}</button>)}
            </div>
          </div>
          {product.sizes?.length ? <div className="variant-control">
            <div><span>{t("Talla")}</span><strong>{selectedSize || t("Elige una talla")}</strong></div>
            <div className="variant-options" role="group" aria-label={t("Selecciona una talla")}>
              {product.sizes.map((size) => <button type="button" key={size} className={selectedSize === size ? "is-selected" : ""} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)} disabled={isOutOfStock}>{size}</button>)}
            </div>
          </div> : null}
          <div className="meta-row"><span>{t("Disponibilidad")}</span><span>{t(product.stock)}</span></div>
          <div className="meta-row"><span>{t("Materiales")}</span><span>{translateProductMaterials(locale, product.translations, product.materials).join(", ")}</span></div>
          <div className="meta-row"><span>{t("Dimensiones")}</span><span>{translateProductField(locale, product.translations, "dimensions", product.dimensions)}</span></div>
          <div className="meta-row"><span>{t("Envío")}</span><span>{product.shippingFee ? formatPrice(product.shippingFee) : t("Gratis")}</span></div>
          <div className="meta-row"><span>{t("Entrega estimada")}</span><span>{t("10-25 días hábiles")}</span></div>
          <div className="detail-actions">
            <button
              className="primary-button"
              disabled={isOutOfStock}
              onClick={() => {
                for (let index = 0; index < quantity; index += 1) addToCart({ id: product.databaseId ?? product.id, slug: product.slug, name: product.name, translations: product.translations, price: selectedPrice, image: imageForColor(product, selectedColor), color: selectedColor, size: selectedSize || undefined, shippingFee: product.shippingFee });
                // Meta Pixel: AddToCart
                metaEvents.addToCart({
                  content_name: product.name,
                  content_ids: [product.databaseId ?? product.id],
                  content_type: "product",
                  value: selectedPrice * quantity,
                  currency: "MXN",
                  quantity,
                });
              }}
            >
              {isOutOfStock ? t("Agotado") : t("Añadir al carrito")}
            </button>
            <button
              className="secondary-button"
              disabled={isOutOfStock}
              onClick={() => {
                for (let index = 0; index < quantity; index += 1) addToCart({ id: product.databaseId ?? product.id, slug: product.slug, name: product.name, translations: product.translations, price: selectedPrice, image: imageForColor(product, selectedColor), color: selectedColor, size: selectedSize || undefined, shippingFee: product.shippingFee });
                // Meta Pixel: AddToCart
                metaEvents.addToCart({
                  content_name: product.name,
                  content_ids: [product.databaseId ?? product.id],
                  content_type: "product",
                  value: selectedPrice * quantity,
                  currency: "MXN",
                  quantity,
                });
                router.push("/checkout");
              }}
            >
              {isOutOfStock ? t("Agotado") : t("Comprar ahora")}
            </button>
          </div>
          <div className="detail-assurances">
            <div><strong>{t("Pago seguro con PayPal")}</strong><span>{t("Compra protegida")}</span></div>
            <div><strong>{t("Envío a todo México")}</strong><span>{t("Seguimiento cuando esté disponible")}</span></div>
            <div><strong>{t("Políticas transparentes")}</strong><span><Link href="/returns-policy">{t("Consulta las condiciones")}</Link></span></div>
            <div><strong>{t("Atención personalizada")}</strong><span>{t("Estamos para ayudarte")}</span></div>
          </div>
          <div className="detail-actions" style={{ marginTop: 12 }}>
            <button className={`ghost-button ${isSaved(product.id) ? "is-saved" : ""}`} onClick={() => toggle(product.id, product.slug)}>{isSaved(product.id) ? `♥ ${t("Guardado")}` : `♡ ${t("Favoritos")}`}</button>
            <Link href="/contact" className="ghost-button">{t("Consultar sobre este producto")}</Link>
          </div>
        </aside>
      </div>

      <section style={{ marginTop: 26 }}>
        <h2 className="section-title">{t("Descripción del producto")}</h2>
        <p className="muted" style={{ marginTop: 12 }}>{productDescription}</p>
        <ul className="detail-list">
          {product.details.map((detail) => (
            <li key={detail}>{t(detail)}</li>
          ))}
        </ul>
      </section>
      {product.detailImages?.length ?       <section className="product-detail-images" aria-label={t("Detalles del producto")}>
        <h2 className="section-title">{t("Detalles del producto")}</h2>
        <div>
          {product.detailImages.map((image, index) => <img key={`${product.slug}-detail-${index}`} src={image} alt={`${productName} ${t("detalle")} ${index + 1}`} loading="lazy" />)}
        </div>
      </section> : null}
      <TrustSignals />

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t("Características")}</h2>
        </div>
        <div className="story-grid">
          <div className="story-card"><h3>{t("Diseño")}</h3><p>{t("Formas sobrias y presencia visual que elevan el ambiente.")}</p></div>
          <div className="story-card"><h3>{t("Calidad")}</h3><p>{t("Materiales seleccionados y acabados pensados para durar.")}</p></div>
          <div className="story-card"><h3>{t("Materiales")}</h3><p>{t("Texturas premium, durabilidad y detalles funcionales.")}</p></div>
          <div className="story-card"><h3>{t("Incluye")}</h3><p>{t("La pieza preparada para integrarse a tu espacio desde el primer día.")}</p></div>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <button type="button" className="ghost-button" onClick={handleBackToProducts}>{t("Volver a productos")}</button>
      </div>
      <ContactButton />
      {zoomOpen ? <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={t("Vista previa de la imagen del producto")} onClick={() => setZoomOpen(false)}><button type="button" aria-label={t("Cerrar vista previa de la imagen")} onClick={() => setZoomOpen(false)}>×</button><img src={activeImage} alt={productName} /></div> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </div>
  );
}
