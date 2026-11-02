import Link from "next/link";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";
import { getHomepageCarouselIntervalSeconds, getHomepageSlides } from "@/lib/homepage-slides";
import { ContactButton } from "@/components/ContactButton";
import { ProductCard } from "@/components/product-card";
import { HomepageCarousel } from "@/components/homepage-carousel";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const faqItems = [
  { q: "¿Hacen envíos a todo México?", a: "Sí. Enviamos a todo México con seguimiento una vez que tu pedido sale de preparación." },
  { q: "¿Cuál es la política de devoluciones?", a: "Cada solicitud se revisa conforme a las condiciones del producto, el motivo de la compra y la legislación aplicable." },
  { q: "¿Los productos son para uso diario?", a: "Sí. Seleccionamos materiales resistentes y acabados pensados para acompañarte todos los días." },
  { q: "¿Cuánto tarda la entrega?", a: "Los tiempos de entrega son estimados y pueden variar según la preparación, el destino, la paquetería y las aduanas." },
];

export default async function HomePage() {
  const [products, categories, slides, carouselIntervalSeconds, locale] = await Promise.all([getCatalogProducts(), getCatalogCategories(), getHomepageSlides(), getHomepageCarouselIntervalSeconds(), getRequestLocale()]);
  const t = (text: string) => translateText(locale, text);
  const collections = categories.slice(0, 4);
  const featured = products.filter((product) => product.featured).slice(0, 4);
  return (
    <>
      <HomepageCarousel slides={slides} intervalSeconds={carouselIntervalSeconds} />

      <section className="section" id="featured-collection">
        <div className="container-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">{t("Colecciones")}</h2>
            </div>
            <Link href="/shop" className="ghost-button">
              {t("Ver todo")}
            </Link>
          </div>

          <div className="category-button-grid" aria-label={t("Colecciones")}>
            {collections.map((category, index) => {
              const categoryImage = category.image || products.find((product) => product.category === category.slug)?.image || products[index % products.length]?.image;
              return <Link key={category.slug} href={`/category/${category.slug}`} className="category-button">
                {categoryImage ? <span className="category-button-image"><img src={categoryImage} alt="" /></span> : null}
                <span className="category-button-label">{category.name}</span>
              </Link>;
            })}
          </div>
        </div>
      </section>

      <section className="section" id="productos-destacados">
        <div className="container-shell">
          <div className="section-head">
            <div>
              <h2 className="section-title">{t("Productos destacados")}</h2>
            </div>
            <Link href="/shop" className="ghost-button">
              {t("Ver todo")}
            </Link>
          </div>

          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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
