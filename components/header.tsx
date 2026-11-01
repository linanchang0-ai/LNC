"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice, type Product } from "@/data/products";
import { useEffect, useState } from "react";

const desktopNav = [
  { href: "/shop", label: "Comprar" },
  { href: "/#featured-collection", label: "Colecciones" },
  { href: "/#productos-destacados", label: "Destacados" },
  { href: "/about", label: "Nosotros" },
];

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
      { href: "/contact", label: "Contacto" },
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
  const { items, itemCount, subtotal, shipping, discount, couponCode, total, applyCoupon, clearCoupon, updateQuantity, removeFromCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addedProduct, setAddedProduct] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const searchResults = products.filter((product) => `${product.name} ${product.category} ${product.shortDescription}`.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 6);

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
      setCouponMessage(data.error ?? "No se pudo aplicar el cupón.");
      return;
    }
    applyCoupon(data.code, data.discount);
    setCouponMessage("Cupón aplicado.");
  };

  useEffect(() => {
    document.body.style.overflow = mobileOpen || cartOpen || searchOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, cartOpen, searchOpen]);

  useEffect(() => {
    const handleAdded = (event: Event) => {
      const product = (event as CustomEvent<{ name: string }>).detail;
      setAddedProduct(product.name);
      setCartOpen(true);
      window.setTimeout(() => setAddedProduct(null), 2800);
    };
    window.addEventListener("lnc-sports:add-to-cart", handleAdded);
    return () => window.removeEventListener("lnc-sports:add-to-cart", handleAdded);
  }, []);

  return (
    <>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="announcement-bar" aria-label="Store announcement">
        <div className="announcement-track">
          <span>ENVÍO A TODO MÉXICO</span>
          <span>·</span>
          <span>PAGO SEGURO</span>
          <span>·</span>
          <span>POLÍTICAS TRANSPARENTES</span>
          <span>·</span>
          <span>ENVÍO A TODO MÉXICO</span>
          <span>·</span>
          <span>PAGO SEGURO</span>
          <span>·</span>
          <span>POLÍTICAS TRANSPARENTES</span>
        </div>
      </div>

      <div className="container-shell">
        <div className="site-header-inner">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            ☰
          </button>

          <Link href="/" className="brand" aria-label="LNC SPORTS home">
            <span className="brand-mark">L</span>
            <span>LNC SPORTS</span>
          </Link>

          <nav className="desktop-nav" aria-label="Main navigation">
            {desktopNav.map((item) => (
              <Link key={item.label} href={item.href} className="desktop-nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button type="button" className="header-link search-link" aria-label="Search" onClick={() => setSearchOpen(true)}>
              Buscar
            </button>
            <Link href="/login" className="header-link" aria-label="Account">
              Cuenta
            </Link>
            <Link href="/account/favorites" className="header-link" aria-label="Wishlist">
              Favoritos
            </Link>
            <button type="button" className="header-link cart-link" aria-label="Bag" onClick={() => setCartOpen(true)}>
              Carrito
              {itemCount > 0 ? <span className="cart-badge">{itemCount}</span> : null}
            </button>
          </div>

          <div className="mobile-header-actions">
            <button type="button" className="mobile-search-button" onClick={() => setSearchOpen(true)} aria-label="Buscar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
            <button type="button" className="mobile-bag-button" onClick={() => setCartOpen(true)} aria-label={`Carrito${itemCount > 0 ? `, ${itemCount} artículos` : ""}`}>
              <span>Carrito</span>{itemCount > 0 ? <span className="cart-badge">{itemCount}</span> : null}
            </button>
          </div>
        </div>
      </div>
    </header>

      <div
        className={`mobile-menu-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`mobile-drawer ${mobileOpen ? "is-open" : ""}`} aria-label="Mobile menu">
        <div className="mobile-drawer-header">
          <span>Menú</span>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>

        {mobileSections.map((group) => (
          <div key={group.title} className="mobile-group">
            <h3>{group.title}</h3>
            <div className="mobile-links">
              {group.links.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className={`cart-drawer-backdrop ${cartOpen ? "is-open" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`} aria-label="Shopping bag">
        {addedProduct ? <div className="added-confirmation">Añadido a tu carrito <span>✓</span><small>{addedProduct}</small></div> : null}
        <div className="cart-drawer-header">
          <div><span className="eyebrow subdued">Tu selección</span><h2>Carrito ({itemCount})</h2></div>
          <button type="button" onClick={() => setCartOpen(false)} aria-label="Close bag">×</button>
        </div>
        {items.length === 0 ? (
          <div className="cart-drawer-empty"><p>Tu carrito está vacío.</p><Link href="/shop" className="primary-button" onClick={() => setCartOpen(false)}>Explorar colección</Link></div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map((item) => (
                <div key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`} className="cart-drawer-item">
                  <img src={item.image} alt={item.name} />
                  <div><strong>{item.name}</strong><span>{formatPrice(item.price)}</span>{item.color ? <span>Color: {item.color}</span> : null}{item.size ? <span>Talla: {item.size}</span> : null}<div className="drawer-quantity"><button type="button" onClick={() => updateQuantity(item.id, item.color, item.size, -1)} aria-label="Reducir cantidad">−</button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.color, item.size, 1)} aria-label="Aumentar cantidad">+</button><button type="button" onClick={() => removeFromCart(item.id, item.color, item.size)} aria-label={`Eliminar ${item.name}`}>Eliminar</button></div></div>
                </div>
              ))}
            </div>
            <div className="cart-drawer-summary"><div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="drawer-coupon"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Código promocional" /><button type="button" onClick={() => void redeemCoupon()}>Aplicar</button></div>{couponMessage ? <small className="muted">{couponMessage}</small> : null}{discount > 0 ? <div><span>Descuento {couponCode ? `(${couponCode})` : ""}</span><strong>-{formatPrice(discount)}</strong><button type="button" onClick={clearCoupon} aria-label="Quitar cupón">×</button></div> : null}<div><span>Envío</span><strong>{shipping ? formatPrice(shipping) : "GRATIS"}</strong></div><div><span>Total</span><strong>{formatPrice(total)}</strong></div><Link href="/checkout" className="primary-button" onClick={() => setCartOpen(false)}>Pagar</Link><Link href="/shop" className="ghost-button" onClick={() => setCartOpen(false)}>Seguir comprando</Link></div>
          </>
        )}
      </aside>

      <div className={`search-overlay ${searchOpen ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Search products">
        <div className="search-overlay-inner">
          <div className="search-overlay-top"><span>Buscar</span><button type="button" onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda">×</button></div>
          <input autoFocus={searchOpen} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar productos..." />
          <div className="search-results">
            {!searchTerm ? <p>Busca por nombre o categoría.</p> : searchResults.length === 0 ? <p>No encontramos productos.</p> : searchResults.map((product) => <Link key={product.id} href={`/products/${product.slug}`} onClick={() => setSearchOpen(false)}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{formatPrice(product.price)}</small></span></Link>)}
          </div>
        </div>
      </div>
    </>
  );
}
