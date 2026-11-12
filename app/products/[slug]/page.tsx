"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { formatPrice, type Product } from "@/data/products";
import { ContactButton } from "@/components/ContactButton";
import { useCart } from "@/components/cart-provider";
import { use, useEffect, useRef, useState, type TouchEvent } from "react";
import { TrustSignals } from "@/components/trust-signals";
import { useWishlist } from "@/components/wishlist";
import { metaEvents } from "@/components/MetaPixel";
import { useI18n } from "@/components/locale-provider";
import { siteConfig } from "@/lib/site-config";
import { translateProductColor, translateProductField, translateProductMaterials } from "@/lib/i18n";
import { normalizeRouteSlug } from "@/lib/text";

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
  const { addToCart, items } = useCart();
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(product?.gallery[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] ?? "");
  const [sizeQuantitiesByColor, setSizeQuantitiesByColor] = useState<Record<string, Record<string, number>>>({});
  const [quantityByColor, setQuantityByColor] = useState<Record<string, number>>({});
  const [addedNotice, setAddedNotice] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const { toggle, isSaved } = useWishlist();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [resolvedParams.slug]);

  useEffect(() => {
    fetch("/api/products").then(async (response) => {
      const data = await response.json() as { items?: Product[] };
      const databaseProduct = data.items?.find((item) => normalizeRouteSlug(item.slug) === normalizeRouteSlug(resolvedParams.slug));
      if (response.ok && databaseProduct) {
        setProduct(databaseProduct);
        setActiveImage(imageForColor(databaseProduct, databaseProduct.colors[0] ?? ""));
        setSelectedColor(databaseProduct.colors[0] ?? "");
        setSizeQuantitiesByColor({});
        setQuantityByColor({});
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
  const activeDetailImages = product?.detailImagesByColor?.[selectedColor] ?? [];

  const selectImage = (image: string) => {
    setActiveImage(image);
    const matchingColor = product.colors.find((color) => imageForColor(product, color) === image);
    if (matchingColor && matchingColor !== selectedColor) {
      setSelectedColor(matchingColor);
    }
  };

  const showAdjacentImage = (direction: 1 | -1) => {
    const index = product.gallery.indexOf(activeImage);
    const next = product.gallery[(Math.max(index, 0) + direction + product.gallery.length) % product.gallery.length];
    if (next) selectImage(next);
  };

  const swipeHandlers = {
    onTouchStart: (event: TouchEvent) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; },
    onTouchEnd: (event: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || product.gallery.length < 2) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) showAdjacentImage(dx < 0 ? 1 : -1);
    },
  };

  const hasSizes = Boolean(product.sizes?.length);
  const currentSizeQuantities = sizeQuantitiesByColor[selectedColor] ?? {};
  const currentQuantity = quantityByColor[selectedColor] ?? 1;
  const totalQuantity = hasSizes ? Object.values(currentSizeQuantities).reduce((sum, value) => sum + value, 0) : currentQuantity;
  const changeSizeQuantity = (size: string, delta: number) => setSizeQuantitiesByColor((current) => {
    const colorMap = current[selectedColor] ?? {};
    return { ...current, [selectedColor]: { ...colorMap, [size]: Math.max(0, (colorMap[size] ?? 0) + delta) } };
  });
  const changeQuantity = (delta: number) => setQuantityByColor((current) => ({ ...current, [selectedColor]: Math.max(1, (current[selectedColor] ?? 1) + delta) }));

  const currentProductId = String(product.databaseId ?? product.id);
  const cartQtyByColor = items.reduce((acc, item) => {
    if (String(item.id) !== currentProductId) return acc;
    const key = item.color ?? "";
    acc[key] = (acc[key] ?? 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const pendingCountForColor = (color: string) => hasSizes
    ? Object.values(sizeQuantitiesByColor[color] ?? {}).reduce((sum, value) => sum + value, 0)
    : (quantityByColor[color] ?? 0);

  const badgeCountForColor = (color: string) => (cartQtyByColor[color] ?? 0) + pendingCountForColor(color);

  const pendingLines = product.colors.flatMap((color) => {
    const price = priceForColor(product, color);
    const image = imageForColor(product, color);
    if (hasSizes) {
      return (product.sizes ?? []).map((size) => ({ color, size, count: sizeQuantitiesByColor[color]?.[size] ?? 0, price, image }));
    }
    return [{ color, size: undefined as string | undefined, count: quantityByColor[color] ?? 0, price, image }];
  }).filter((line) => line.count > 0);

  const grandTotalQuantity = pendingLines.reduce((sum, line) => sum + line.count, 0);
  const grandSubtotal = pendingLines.reduce((sum, line) => sum + line.count * line.price, 0);

  const addSelectionToCart = () => {
    if (grandTotalQuantity < 1) return false;
    for (const line of pendingLines) {
      const base = { id: product.databaseId ?? product.id, slug: product.slug, name: product.name, translations: product.translations, price: line.price, image: line.image, color: line.color };
      for (let index = 0; index < line.count; index += 1) addToCart({ ...base, size: line.size });
    }
    // Meta Pixel: AddToCart
    metaEvents.addToCart({ content_name: product.name, content_ids: [product.databaseId ?? product.id], content_type: "product", value: grandSubtotal, currency: "MXN", quantity: grandTotalQuantity });
    setSizeQuantitiesByColor({});
    setQuantityByColor({});
    setAddedNotice(true);
    window.setTimeout(() => setAddedNotice(false), 2000);
    return true;
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
    <div className="container-shell product-detail-page">
      <div className="product-breadcrumb">
        <button type="button" className="back-button" onClick={handleBackToProducts}>{t("Volver a productos")}</button>
      </div>

      <div className="product-detail-layout">
        <div className="gallery-grid">
          <button type="button" className="gallery-main-image" style={{ touchAction: "pan-y" }} {...swipeHandlers} onClick={() => setZoomOpen(true)} aria-label={t("Ampliar imagen del producto")}><img src={activeImage} alt={productName} /></button>
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
          {hasSizes ? null : <div className="quantity-control" aria-label={t("Cantidad")}>
            <span>{t("Cantidad")}</span>
            <div>
              <button type="button" onClick={() => changeQuantity(-1)} aria-label={t("Reducir cantidad")} disabled={isOutOfStock}>−</button>
              <strong>{currentQuantity}</strong>
              <button type="button" onClick={() => changeQuantity(1)} aria-label={t("Aumentar cantidad")} disabled={isOutOfStock}>+</button>
            </div>
          </div>}
          <div className="variant-control">
            <div><span>{t("Color")}</span><strong>{translateProductColor(locale, product.translations, selectedColor)}</strong></div>
            <div className="variant-options color-swatches">
              {product.colors.map((color) => {
                const colorImage = imageForColor(product, color);
                const active = selectedColor === color;
                return <button type="button" key={color} className={`color-swatch ${active ? "is-selected" : ""}`} aria-pressed={active} onClick={() => {
                  if (color === selectedColor) return;
                  setSelectedColor(color);
                  setActiveImage(colorImage);
                }} disabled={isOutOfStock}>
                  {badgeCountForColor(color) > 0 ? <span className="color-swatch-badge">{badgeCountForColor(color)}</span> : null}
                  <span className="color-swatch-image"><img src={colorImage} alt={translateProductColor(locale, product.translations, color)} loading="lazy" /></span>
                  <span className="color-swatch-label">{translateProductColor(locale, product.translations, color)}</span>
                </button>;
              })}
            </div>
          </div>
          {product.sizes?.length ? <div className="variant-control size-quantity-list" role="group" aria-label={t("Selecciona una talla")}>
            <div><span>{t("Talla")}</span><strong>{totalQuantity > 0 ? `${t("Cantidad")}: ${totalQuantity}` : t("Elige una talla")}</strong></div>
            {product.sizes.map((size) => {
              const count = currentSizeQuantities[size] ?? 0;
              return <div className={`size-quantity-row ${count > 0 ? "is-selected" : ""}`} key={size}>
                <strong>{size}</strong>
                <div className="size-quantity-stepper">
                  <button type="button" onClick={() => changeSizeQuantity(size, -1)} aria-label={`${t("Reducir cantidad")} ${size}`} disabled={isOutOfStock || count === 0}>−</button>
                  <span>{count}</span>
                  <button type="button" onClick={() => changeSizeQuantity(size, 1)} aria-label={`${t("Aumentar cantidad")} ${size}`} disabled={isOutOfStock}>+</button>
                </div>
              </div>;
            })}
          </div> : null}
          <div className="meta-row"><span>{t("Disponibilidad")}</span><span>{t(product.stock)}</span></div>
          <div className="meta-row"><span>{t("Materiales")}</span><span>{translateProductMaterials(locale, product.translations, product.materials).join(", ")}</span></div>
          <div className="meta-row"><span>{t("Dimensiones")}</span><span>{translateProductField(locale, product.translations, "dimensions", product.dimensions)}</span></div>
          <div className="meta-row"><span>{t("Envío")}</span><span>{t("MXN 150 en pedidos menores a MXN 1,500; gratis desde MXN 1,500")}</span></div>
          <div className="meta-row"><span>{t("Entrega estimada")}</span><span>{t("Aproximadamente 9-15 días")}</span></div>
          <div className="detail-actions detail-actions--buy">
            <button
              className="primary-button"
              disabled={isOutOfStock || grandTotalQuantity < 1}
              onClick={() => { addSelectionToCart(); }}
            >
              {isOutOfStock ? t("Agotado") : addedNotice ? `✓ ${t("Añadido")}` : t("Añadir al carrito")}
            </button>
            <button
              className="secondary-button"
              disabled={isOutOfStock || grandTotalQuantity < 1}
              onClick={() => { if (addSelectionToCart()) router.push("/checkout"); }}
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
            <Link href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : "/contact"} {...(siteConfig.whatsappNumber ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="ghost-button">{t("Consultar sobre este producto")}</Link>
          </div>
        </aside>
      </div>

      <div className="pdp-sticky-bar">
        <div className="pdp-sticky-summary">
          <span className="pdp-sticky-badge" aria-hidden="true">{grandTotalQuantity}</span>
          <div className="pdp-sticky-price-box">
            <strong className="pdp-sticky-price">{formatPrice(grandTotalQuantity > 0 ? grandSubtotal : 0)}</strong>
            <span className="pdp-sticky-count">{t("Seleccionado")}: {grandTotalQuantity}</span>
          </div>
        </div>
        <div className="pdp-sticky-actions">
          <button
            className="secondary-button"
            disabled={isOutOfStock || grandTotalQuantity < 1}
            onClick={() => { addSelectionToCart(); }}
          >
            {isOutOfStock ? t("Agotado") : addedNotice ? `✓ ${t("Añadido")}` : t("Añadir al carrito")}
          </button>
          <button
            className="primary-button"
            disabled={isOutOfStock || grandTotalQuantity < 1}
            onClick={() => { if (addSelectionToCart()) router.push("/checkout"); }}
          >
            {isOutOfStock ? t("Agotado") : t("Comprar ahora")}
          </button>
        </div>
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
      {activeDetailImages.length ?       <section className="product-detail-images" aria-label={t("Detalles del producto")}>
        <h2 className="section-title">{t("Detalles del producto")}</h2>
        <div>
          {activeDetailImages.map((image, index) => <img key={`${product.slug}-detail-${selectedColor}-${index}`} src={image} alt={`${productName} ${t("detalle")} ${index + 1}`} loading="lazy" />)}
        </div>
      </section> : null}
      <TrustSignals />

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t("Características")}</h2>
        </div>
        <div className="story-grid">
          <div className="story-card"><h3>{t("Diseño")}</h3><p>{t("Diseño inspirado en la Selección Mexicana, con detalles de la cultura azteca.")}</p></div>
          <div className="story-card"><h3>{t("Calidad")}</h3><p>{t("Materiales ligeros y transpirables que evacúan el sudor.")}</p></div>
          <div className="story-card"><h3>{t("Comodidad")}</h3><p>{t("Tela suave y de secado rápido, cómoda para partidos y entrenamientos.")}</p></div>
          <div className="story-card"><h3>{t("Tallas")}</h3><p>{t("Disponible de S a 4XL, para que encuentres tu talla ideal.")}</p></div>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <button type="button" className="primary-button" onClick={handleBackToProducts}>{t("Volver a productos")}</button>
      </div>
      <ContactButton />
      {zoomOpen ? <div className="image-lightbox" role="dialog" aria-modal="true" style={{ touchAction: "pan-y" }} {...swipeHandlers} aria-label={t("Vista previa de la imagen del producto")} onClick={() => setZoomOpen(false)}><button type="button" aria-label={t("Cerrar vista previa de la imagen")} onClick={() => setZoomOpen(false)}>×</button><img src={activeImage} alt={productName} /></div> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </div>
  );
}
