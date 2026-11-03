"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice, type Product } from "@/data/products";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { supportedLocales } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";
import { translateProductColor, translateProductField, translateText } from "@/lib/i18n";

const desktopNav = [
  { href: "/shop", label: "Comprar" },
  { href: "/#featured-collection", label: "Colecciones" },
  { href: "/#productos-destacados", label: "Destacados" },
  { href: "/about", label: "Nosotros" },
];

const whatsappHref = siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : "/contact";

const mobileSections = [
  {
    title: "TIENDA",
    links: [
      { href: "/", label: "Inicio" },
      { href: "/shop", label: "Todos los productos" },
      { href: "/order-lookup", label: "Consultar pedido" },
    ],
  },
  {
    title: "NOSOTROS",
    links: [
      { href: "/about", label: "Nuestra historia" },
      { href: whatsappHref, label: "Contacto" },
    ],
  },
  {
    title: "AYUDA",
    links: [
      { href: "/shipping", label: "Envíos" },
      { href: "/returns", label: "Devoluciones" },
      { href: "/returns-policy", label: "Preguntas frecuentes" },
    ],
  },
  {
    title: "CUENTA",
    links: [
      { href: "/account/favorites", label: "Favoritos" },
      { href: "/login", label: "Iniciar sesión" },
    ],
  },
];

export function Header() {
  const { locale: selectedLocale } = useI18n();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const locale = isAdmin ? "zh" : selectedLocale;
  const t = (text: string) => translateText(locale, text);
  const { items, itemCount, subtotal, shipping, discount, couponCode, total, applyCoupon, clearCoupon, updateQuantity, removeFromCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addedProduct, setAddedProduct] = useState<{ name: string; translations?: Product["translations"] } | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const searchResults = products.filter((product) => `${product.name} ${translateProductField(locale, product.translations, "name", product.name)} ${product.category} ${t(product.category)} ${product.shortDescription} ${translateProductField(locale, product.translations, "shortDescription", product.shortDescription)}`.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 6);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/products").then(async (response) => {
      const data = await response.json() as { items?: Product[] };
      if (response.ok && data.items) setProducts(data.items);
    }).catch(() => undefined);
  }, []);

  const redeemCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    const response = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, subtotal }) });
    const data = await response.json() as { code?: string; discount?: number; error?: string };
    if (!response.ok || !data.code || data.discount === undefined) {
      setCouponMessage(t(data.error ?? "No se pudo aplicar el cupón."));
      return;
    }
    applyCoupon(data.code, data.discount);
    setCouponMessage(t("Cupón aplicado."));
  };

  const changeLocale = (nextLocale: string) => {
    if (!supportedLocales.includes(nextLocale as (typeof supportedLocales)[number])) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `lnc-locale=${nextLocale}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    window.location.reload();
  };

  useEffect(() => {
    document.body.style.overflow = mobileOpen || cartOpen || searchOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, cartOpen, searchOpen]);

  useEffect(() => {
    const handleAdded = (event: Event) => {
      const product = (event as CustomEvent<{ name: string; translations?: Product["translations"] }>).detail;
      setAddedProduct(product);
      setCartOpen(true);
      window.setTimeout(() => setAddedProduct(null), 2800);
    };
    window.addEventListener("lnc-sports:add-to-cart", handleAdded);
    return () => window.removeEventListener("lnc-sports:add-to-cart", handleAdded);
  }, []);

  return (
    <>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      {!isAdmin ? <div className="locale-bar">
        <div className="container-shell locale-bar-inner">
          <label htmlFor="site-locale">{t("Idioma")}</label>
          <select id="site-locale" value={locale} onChange={(event) => changeLocale(event.target.value)} aria-label={t("Seleccionar idioma")}>
            <option value="en">English</option>
            <option value="zh">简体中文</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div> : null}
      <div className="announcement-bar" aria-label={t("Anuncio de la tienda")}>
        <div className="announcement-track">
          <span>{t("ENVÍO A TODO MÉXICO")}</span>
          <span>·</span>
          <span>{t("PAGO SEGURO")}</span>
          <span>·</span>
          <span>{t("POLÍTICAS TRANSPARENTES")}</span>
          <span>·</span>
          <span>{t("ENVÍO A TODO MÉXICO")}</span>
          <span>·</span>
          <span>{t("PAGO SEGURO")}</span>
          <span>·</span>
          <span>{t("POLÍTICAS TRANSPARENTES")}</span>
        </div>
      </div>

      <div className="container-shell">
        <div className="site-header-inner">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={t("Abrir menú")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            ☰
          </button>

          <Link href="/" className="brand" aria-label="LNC SPORTS home">
            <span className="brand-mark">L</span>
            <span>LNC SPORTS</span>
          </Link>

          <nav className="desktop-nav" aria-label={t("Navegación principal")}>
            {desktopNav.map((item) => (
              <Link key={item.label} href={item.href} className="desktop-nav-link">
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button type="button" className="header-link search-link" aria-label={t("Buscar")} onClick={() => setSearchOpen(true)}>
              {t("Buscar")}
            </button>
            <Link href="/login" className="header-link" aria-label={t("Cuenta")}>
              {t("Cuenta")}
            </Link>
            <Link href="/account/favorites" className="header-link" aria-label={t("Favoritos")}>
              {t("Favoritos")}
            </Link>
            <button type="button" className="header-link cart-link" aria-label={t("Carrito")} onClick={() => setCartOpen(true)}>
              {t("Carrito")}
              {itemCount > 0 ? <span className="cart-badge">{itemCount}</span> : null}
            </button>
          </div>

          <div className="mobile-header-actions">
            <button type="button" className="mobile-search-button" onClick={() => setSearchOpen(true)} aria-label={t("Buscar")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
            <button type="button" className="mobile-bag-button" onClick={() => setCartOpen(true)} aria-label={`${t("Carrito")}${itemCount > 0 ? `, ${itemCount} ${t("artículos")}` : ""}`}>
              <span>{t("Carrito")}</span>{itemCount > 0 ? <span className="cart-badge">{itemCount}</span> : null}
            </button>
          </div>
        </div>
      </div>
    </header>

      <div
        className={`mobile-menu-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`mobile-drawer ${mobileOpen ? "is-open" : ""}`} aria-label={t("Menú móvil")}>
        <div className="mobile-drawer-header">
          <span>{t("Menú")}</span>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label={t("Close menu")}>
            ×
          </button>
        </div>

        {mobileSections.map((group) => (
          <div key={group.title} className="mobile-group">
            <h3>{t(group.title)}</h3>
            <div className="mobile-links">
              {group.links.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {t(link.label)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className={`cart-drawer-backdrop ${cartOpen ? "is-open" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`} aria-label={t("Bolsa de compras")}>
        {addedProduct ? <div className="added-confirmation">{t("Añadido a tu carrito")} <span>✓</span><small>{translateProductField(locale, addedProduct.translations, "name", addedProduct.name)}</small></div> : null}
        <div className="cart-drawer-header">
          <div><span className="eyebrow subdued">{t("Tu selección")}</span><h2>{t("Carrito")} ({itemCount})</h2></div>
          <button type="button" onClick={() => setCartOpen(false)} aria-label={t("Cerrar bolsa")}>×</button>
        </div>
        {items.length === 0 ? (
          <div className="cart-drawer-empty"><p>{t("Tu carrito está vacío.")}</p><Link href="/shop" className="primary-button" onClick={() => setCartOpen(false)}>{t("Explorar colección")}</Link></div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map((item) => (
                <div key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`} className="cart-drawer-item">
                  <img src={item.image} alt={translateProductField(locale, item.translations, "name", item.name)} />
                  <div><strong>{translateProductField(locale, item.translations, "name", item.name)}</strong><span>{formatPrice(item.price)}</span>{item.color ? <span>{t("Color:")} {translateProductColor(locale, item.translations, item.color)}</span> : null}{item.size ? <span>{t("Talla:")} {item.size}</span> : null}<div className="drawer-quantity"><button type="button" onClick={() => updateQuantity(item.id, item.color, item.size, -1)} aria-label={t("Reducir cantidad")}>−</button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.color, item.size, 1)} aria-label={t("Aumentar cantidad")}>+</button><button type="button" onClick={() => removeFromCart(item.id, item.color, item.size)} aria-label={`${t("Eliminar")} ${translateProductField(locale, item.translations, "name", item.name)}`}>{t("Eliminar")}</button></div></div>
                </div>
              ))}
            </div>
            <div className="cart-drawer-summary"><div><span>{t("Subtotal")}</span><strong>{formatPrice(subtotal)}</strong></div><div className="drawer-coupon"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder={t("Código promocional")} /><button type="button" onClick={() => void redeemCoupon()}>{t("Aplicar")}</button></div>{couponMessage ? <small className="muted">{couponMessage}</small> : null}{discount > 0 ? <div><span>{t("Descuento")} {couponCode ? `(${couponCode})` : ""}</span><strong>-{formatPrice(discount)}</strong><button type="button" onClick={clearCoupon} aria-label={t("Quitar cupón")}>×</button></div> : null}<div><span>{t("Envío")}</span><strong>{shipping ? formatPrice(shipping) : t("GRATIS")}</strong></div><div><span>{t("Total")}</span><strong>{formatPrice(total)}</strong></div><Link href="/checkout" className="primary-button" onClick={() => setCartOpen(false)}>{t("Pagar")}</Link><Link href="/shop" className="ghost-button" onClick={() => setCartOpen(false)}>{t("Seguir comprando")}</Link></div>
          </>
        )}
      </aside>

      <div className={`search-overlay ${searchOpen ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label={t("Buscar productos")}>
        <div className="search-overlay-inner">
          <div className="search-overlay-top"><span>{t("Buscar")}</span><button type="button" onClick={() => setSearchOpen(false)} aria-label={t("Cerrar búsqueda")}>×</button></div>
          <input autoFocus={searchOpen} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t("Buscar productos...")} />
          <div className="search-results">
            {!searchTerm ? <p>{t("Busca por nombre o categoría.")}</p> : searchResults.length === 0 ? <p>{t("No encontramos productos.")}</p> : searchResults.map((product) => <Link key={product.id} href={`/products/${product.slug}`} onClick={() => setSearchOpen(false)}><img src={product.image} alt="" /><span><strong>{translateProductField(locale, product.translations, "name", product.name)}</strong><small>{formatPrice(product.price)}</small></span></Link>)}
          </div>
        </div>
      </div>
    </>
  );
}
