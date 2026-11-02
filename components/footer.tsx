"use client";

import Link from "next/link";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { useI18n } from "@/components/locale-provider";
import { usePathname } from "next/navigation";
import { translateText } from "@/lib/i18n";

export function Footer() {
  const { locale: selectedLocale } = useI18n();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/admin") ? "zh" : selectedLocale;
  const t = (text: string) => translateText(locale, text);
  return (
    <footer className="footer">
      <div className="container-shell footer-grid">
        <div>
          <div className="brand footer-brand">
            <span className="brand-mark">L</span>
            <span>LNC SPORTS</span>
          </div>
          <p className="muted" style={{ maxWidth: 280 }}>
            {t("Descubre mejores productos para disfrutar más cada día.")}
          </p>
        </div>

        <div>
          <h3 className="footer-title">{t("Tienda")}</h3>
          <div className="footer-links">
            <Link href="/shop">{t("Comprar todo")}</Link>
            <Link href="/shop">{t("Novedades")}</Link>
            <Link href="/shop">{t("Más vendidos")}</Link>
            <Link href="/shop">{t("Colecciones")}</Link>
          </div>
        </div>

        <div>
          <h3 className="footer-title">{t("Atención al cliente")}</h3>
          <div className="footer-links">
            <Link href="/contact">{t("Contacto")}</Link>
            <Link href="/order-lookup">{t("Consulta tu pedido")}</Link>
            <Link href="/shipping">{t("Política de envíos")}</Link>
            <Link href="/returns-policy">{t("Devoluciones y reembolsos")}</Link>
          </div>
        </div>

        <div>
          <h3 className="footer-title">{t("Nosotros")}</h3>
          <div className="footer-links">
            <Link href="/about">{t("Nuestra historia")}</Link>
            <Link href="/about">{t("Sobre LNC SPORTS")}</Link>
          </div>
        </div>

        <div>
          <h3 className="footer-title">{t("Legal")}</h3>
          <div className="footer-links">
            <Link href="/terms">{t("Términos y condiciones")}</Link>
            <Link href="/shipping">{t("Política de envíos")}</Link>
            <Link href="/returns-policy">{t("Política de devoluciones")}</Link>
            <Link href="/payments">{t("Política de pagos")}</Link>
            <Link href="/contact">{t("Contacto")}</Link>
            <Link href="/privacy">{t("Política de privacidad")}</Link>
            <Link href="/cookies">{t("Cookies")}</Link>
          </div>
        </div>
      </div>
      <div className="container-shell footer-bottom"><span>{t("© 2026 LNC SPORTS. Todos los derechos reservados.")}</span><span>Instagram · Facebook · TikTok</span></div>
      <div className="container-shell footer-newsletter"><strong>{t("Únete a la comunidad LNC SPORTS.")}</strong><NewsletterSignup compact /></div>
    </footer>
  );
}
