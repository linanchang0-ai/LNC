import Link from "next/link";
import { NewsletterSignup } from "@/components/newsletter-signup";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container-shell footer-grid">
        <div>
          <div className="brand footer-brand">
            <span className="brand-mark">L</span>
            <span>LNC SPORTS</span>
          </div>
          <p className="muted" style={{ maxWidth: 280 }}>
            Descubre mejores productos para disfrutar más cada día.
          </p>
        </div>

        <div>
          <h3 className="footer-title">Tienda</h3>
          <div className="footer-links">
            <Link href="/shop">Comprar todo</Link>
            <Link href="/shop">Novedades</Link>
            <Link href="/shop">Más vendidos</Link>
            <Link href="/shop">Colecciones</Link>
          </div>
        </div>

        <div>
          <h3 className="footer-title">Atención al cliente</h3>
          <div className="footer-links">
            <Link href="/contact">Contacto</Link>
            <Link href="/order-lookup">Consulta tu pedido</Link>
            <Link href="/shipping">Política de envíos</Link>
            <Link href="/returns-policy">Devoluciones y reembolsos</Link>
          </div>
        </div>

        <div>
          <h3 className="footer-title">Nosotros</h3>
          <div className="footer-links">
            <Link href="/about">Nuestra historia</Link>
            <Link href="/about">Sobre LNC SPORTS</Link>
          </div>
        </div>

        <div>
          <h3 className="footer-title">Legal</h3>
          <div className="footer-links">
            <Link href="/terms">Términos y condiciones</Link>
            <Link href="/shipping">Política de envíos</Link>
            <Link href="/returns-policy">Política de devoluciones</Link>
            <Link href="/payments">Política de pagos</Link>
            <Link href="/contact">Contacto</Link>
            <Link href="/privacy">Política de privacidad</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
      <div className="container-shell footer-bottom"><span>© 2026 LNC SPORTS. Todos los derechos reservados.</span><span>Instagram · Facebook · TikTok</span></div>
      <div className="container-shell footer-newsletter"><strong>Únete a la comunidad LNC SPORTS.</strong><NewsletterSignup compact /></div>
    </footer>
  );
}
