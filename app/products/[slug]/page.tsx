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

function imageForColor(product: Product, color: string) {
  return product.colorImages?.[color] ?? product.gallery[product.colors.indexOf(color)] ?? product.image;
}

function priceForColor(product: Product, color: string) {
  return product.colorPrices?.[color] ?? product.price;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
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
    name: product.name,
    description: product.description,
    image: product.gallery,
    brand: { "@type": "Brand", name: "LNC SPORTS" },
    offers: { "@type": "Offer", priceCurrency: "MXN", price: selectedPrice, availability: isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="product-breadcrumb">
        <button type="button" className="back-button" onClick={handleBackToProducts}>Volver a productos</button>
      </div>

      <div className="product-detail-layout">
        <div className="gallery-grid">
          <button type="button" className="gallery-main-image" onClick={() => setZoomOpen(true)} aria-label="Zoom product image"><img src={activeImage} alt={product.name} /></button>
          <div className="gallery-thumbnails">
            {product.gallery.map((image, index) => <button type="button" key={`${product.slug}-${index}`} className={activeImage === image ? "is-active" : ""} onClick={() => selectImage(image)} aria-label={`Ver imagen ${index + 1} de ${product.name}`}><img src={image} alt={`${product.name} miniatura ${index + 1}`} /></button>)}
          </div>
        </div>

        <aside className="detail-panel">
          <h1 className="product-detail-title">{product.name}</h1>
          <div className="detail-rating" aria-label="5 de 5 estrellas">★★★★★ <span>5.0 · Opiniones</span></div>
          <div className="detail-price-row">
            <div className="price">{formatPrice(selectedPrice)}</div>
            {product.oldPrice ? <span className="old-price">{formatPrice(product.oldPrice)}</span> : null}
          </div>
          <p className="muted" style={{ margin: "8px 0 18px" }}>{product.shortDescription}</p>
          <div className="quantity-control" aria-label="Cantidad">
            <span>Cantidad</span>
            <div>
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Reducir cantidad" disabled={isOutOfStock}>−</button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Aumentar cantidad" disabled={isOutOfStock}>+</button>
            </div>
          </div>
          <div className="variant-control">
            <div><span>Color</span><strong>{selectedColor}</strong></div>
            <div className="variant-options">
              {product.colors.map((color) => <button type="button" key={color} className={selectedColor === color ? "is-selected" : ""} onClick={() => { setSelectedColor(color); setActiveImage(imageForColor(product, color)); }} disabled={isOutOfStock}>{color}</button>)}
            </div>
          </div>
          {product.sizes?.length ? <div className="variant-control">
            <div><span>Talla</span><strong>{selectedSize || "Elige una talla"}</strong></div>
            <div className="variant-options" role="group" aria-label="Selecciona una talla">
              {product.sizes.map((size) => <button type="button" key={size} className={selectedSize === size ? "is-selected" : ""} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)} disabled={isOutOfStock}>{size}</button>)}
            </div>
          </div> : null}
          <div className="meta-row"><span>Disponibilidad</span><span>{product.stock}</span></div>
          <div className="meta-row"><span>Materiales</span><span>{product.materials.join(", ")}</span></div>
          <div className="meta-row"><span>Dimensiones</span><span>{product.dimensions}</span></div>
          <div className="meta-row"><span>Envío</span><span>{product.shippingFee ? formatPrice(product.shippingFee) : "Gratis"}</span></div>
          <div className="meta-row"><span>Entrega estimada</span><span>10-25 días hábiles</span></div>
          <div className="detail-actions">
            <button
              className="primary-button"
              disabled={isOutOfStock}
              onClick={() => {
                for (let index = 0; index < quantity; index += 1) addToCart({ id: product.databaseId ?? product.id, slug: product.slug, name: product.name, price: selectedPrice, image: imageForColor(product, selectedColor), color: selectedColor, size: selectedSize || undefined, shippingFee: product.shippingFee });
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
              {isOutOfStock ? "Agotado" : "Añadir al carrito"}
            </button>
            <button
              className="secondary-button"
              disabled={isOutOfStock}
              onClick={() => {
                for (let index = 0; index < quantity; index += 1) addToCart({ id: product.databaseId ?? product.id, slug: product.slug, name: product.name, price: selectedPrice, image: imageForColor(product, selectedColor), color: selectedColor, size: selectedSize || undefined, shippingFee: product.shippingFee });
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
              {isOutOfStock ? "Agotado" : "Comprar ahora"}
            </button>
          </div>
          <div className="detail-assurances">
            <div><strong>Pago seguro con PayPal</strong><span>Compra protegida</span></div>
            <div><strong>Envío a todo México</strong><span>Seguimiento cuando esté disponible</span></div>
            <div><strong>Políticas transparentes</strong><span><Link href="/returns-policy">Consulta las condiciones</Link></span></div>
            <div><strong>Atención personalizada</strong><span>Estamos para ayudarte</span></div>
          </div>
          <div className="detail-actions" style={{ marginTop: 12 }}>
            <button className={`ghost-button ${isSaved(product.id) ? "is-saved" : ""}`} onClick={() => toggle(product.id, product.slug)}>{isSaved(product.id) ? "♥ Guardado" : "♡ Favoritos"}</button>
            <Link href="/contact" className="ghost-button">Consultar sobre este producto</Link>
          </div>
        </aside>
      </div>

      <section style={{ marginTop: 26 }}>
        <h2 className="section-title">Descripción del producto</h2>
        <p className="muted" style={{ marginTop: 12 }}>{product.description}</p>
        <ul className="detail-list">
          {product.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </section>
      {product.detailImages?.length ? <section className="product-detail-images" aria-label="Detalles del producto">
        <h2 className="section-title">Detalles del producto</h2>
        <div>
          {product.detailImages.map((image, index) => <img key={`${product.slug}-detail-${index}`} src={image} alt={`${product.name} detalle ${index + 1}`} loading="lazy" />)}
        </div>
      </section> : null}
      <TrustSignals />

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Características</h2>
        </div>
        <div className="story-grid">
          <div className="story-card"><h3>Diseño</h3><p>Formas sobrias y presencia visual que elevan el ambiente.</p></div>
          <div className="story-card"><h3>Calidad</h3><p>Materiales seleccionados y acabados pensados para durar.</p></div>
          <div className="story-card"><h3>Materiales</h3><p>Texturas premium, durabilidad y detalles funcionales.</p></div>
          <div className="story-card"><h3>Incluye</h3><p>La pieza preparada para integrarse a tu espacio desde el primer día.</p></div>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <button type="button" className="ghost-button" onClick={handleBackToProducts}>Volver a productos</button>
      </div>
      <ContactButton />
      {zoomOpen ? <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Vista previa de la imagen del producto" onClick={() => setZoomOpen(false)}><button type="button" aria-label="Cerrar vista previa de la imagen" onClick={() => setZoomOpen(false)}>×</button><img src={activeImage} alt={product.name} /></div> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </div>
  );
}
