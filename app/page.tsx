import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";
import { getHomepageCarouselIntervalSeconds, getHomepageSlides } from "@/lib/homepage-slides";
import { ContactButton } from "@/components/ContactButton";
import { ProductCard } from "@/components/product-card";
import { HomepageCarousel } from "@/components/homepage-carousel";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { getRequestLocale } from "@/lib/server-locale";
import { translateText, type Locale } from "@/lib/i18n";
import { canOptimizeImage } from "@/lib/image-hosts";
import type { Category, Product } from "@/data/products";
import type { HomepageSlide } from "@/lib/homepage-slides";

export const dynamic = "force-dynamic";

const faqItems = [
  { q: "¿Hacen envíos a todo México?", a: "Sí. Enviamos a todo México con seguimiento una vez que tu pedido sale de preparación." },
  { q: "¿Cuál es la política de devoluciones?", a: "Cada solicitud se revisa conforme a las condiciones del producto, el motivo de la compra y la legislación aplicable." },
  { q: "¿Qué tallas manejan?", a: "Disponibles en tallas S, M, L, XL, 2XL, 3XL y 4XL. Si tienes dudas con la talla, escríbenos por WhatsApp antes de comprar." },
  { q: "¿Cuánto tarda la entrega?", a: "Los tiempos de entrega son estimados y pueden variar según la preparación, el destino, la paquetería y las aduanas." },
];

async function HomeCarousel({ slides, interval }: { slides: Promise<HomepageSlide[]>; interval: Promise<number> }) {
  const [resolvedSlides, resolvedInterval] = await Promise.all([slides, interval]);
  return <HomepageCarousel slides={resolvedSlides} intervalSeconds={resolvedInterval} />;
}

async function Collections({ products, categories, locale }: { products: Promise<Product[]>; categories: Promise<Category[]>; locale: Locale }) {
  const [resolvedProducts, resolvedCategories] = await Promise.all([products, categories]);
  const t = (text: string) => translateText(locale, text);
  const collections = resolvedCategories.slice(0, 4);
  return (
    <div className="category-button-grid" aria-label={t("Colecciones")}>
      {collections.map((category, index) => {
        const categoryImage = category.image || resolvedProducts.find((product) => product.category === category.slug)?.image || resolvedProducts[index % resolvedProducts.length]?.image;
        return <Link key={category.slug} href={`/category/${category.slug}`} className="category-button">
          {categoryImage ? <span className="category-button-image"><Image src={categoryImage} alt="" fill sizes="(max-width: 820px) 1px, (max-width: 1204px) 25vw, 295px" unoptimized={!canOptimizeImage(categoryImage)} /></span> : null}
          <span className="category-button-label">{t(category.name)}</span>
        </Link>;
      })}
    </div>
  );
}

async function FeaturedProducts({ products, locale }: { products: Promise<Product[]>; locale: Locale }) {
  const resolvedProducts = await products;
  const t = (text: string) => translateText(locale, text);
  const featured = resolvedProducts.filter((product) => product.featured).slice(0, 4);
  return (
    featured.length > 0 ? (
      <div className="product-grid">
        {featured.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    ) : (
      <div className="empty-state">
        <p className="muted">
          {resolvedProducts.length === 0
            ? t("Estamos preparando nuestro catálogo. Si buscas algo en particular, estamos aquí para ayudarte.")
            : t("Estamos preparando la selección destacada. Mientras tanto, puedes explorar toda la tienda.")}
        </p>
        <Link href={resolvedProducts.length === 0 ? "/contact" : "/shop"} className="ghost-button">
          {resolvedProducts.length === 0 ? t("Contactar al equipo") : t("Explorar la tienda")}
        </Link>
      </div>
    )
  );
}

export default async function HomePage() {
  const products = getCatalogProducts();
  const categories = getCatalogCategories();
  const slides = getHomepageSlides();
  const interval = getHomepageCarouselIntervalSeconds();
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <>
      <Suspense fallback={<div className="homepage-carousel" aria-busy="true"><div className="homepage-carousel-viewport" /></div>}>
        <HomeCarousel slides={slides} interval={interval} />
      </Suspense>

      <section className="section" id="featured-collection">
        <div className="container-shell">
          <div className="section-head">
            <div><h2 className="section-title">{t("Colecciones")}</h2></div>
            <Link href="/shop" className="primary-button">{t("Ver todo")}</Link>
          </div>
          <Suspense fallback={<p className="muted" role="status">{t("Cargando productos...")}</p>}>
            <Collections products={products} categories={categories} locale={locale} />
          </Suspense>
        </div>
      </section>

      <section className="section" id="productos-destacados">
        <div className="container-shell">
          <div className="section-head">
            <div><h2 className="section-title">{t("Productos destacados")}</h2></div>
            <Link href="/shop" className="primary-button">{t("Ver todo")}</Link>
          </div>
          <Suspense fallback={<p className="muted" role="status">{t("Cargando productos...")}</p>}>
            <FeaturedProducts products={products} locale={locale} />
          </Suspense>
        </div>
      </section>

      <nav className="section home-service-links" aria-label={t("Información de compra")}>
        <div className="container-shell">
          <Link href="/shipping">{t("Envíos a todo México")}</Link>
          <Link href="/payments">{t("Pagos protegidos")}</Link>
          <Link href="/returns-policy">{t("Devoluciones")}</Link>
        </div>
      </nav>

      <section className="section">
        <div className="container-shell faq-shell">
          <div className="faq-copy">
            <h2>{t("Preguntas frecuentes")}</h2>
          </div>

          <div className="faq-list">
            {faqItems.map((item) => (
              <details key={item.q} className="faq-item">
                <summary><h3>{t(item.q)}</h3><span aria-hidden="true">+</span></summary>
                <p>{t(item.a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section newsletter-section">
        <div className="container-shell newsletter-box">
          <div>
            <h2>{t("Novedades y ofertas")}</h2>
          </div>

          <NewsletterSignup />
        </div>
      </section>

      <ContactButton />
    </>
  );
}
