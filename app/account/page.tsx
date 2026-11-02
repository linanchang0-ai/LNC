import Link from "next/link";
import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/shop" className="ghost-button">{t("Volver a la tienda")}</Link>
        <h1>{t("Mi cuenta")}</h1>
        <p>{t("Consulta tus pedidos, favoritos y detalles personales.")}</p>
      </div>

      <div className="product-grid">
        <Link href="/account/orders" className="info-card"><h3>{t("Mis pedidos")}</h3><p>{t("Seguimiento de pedidos y historial.")}</p></Link>
        <Link href="/account/favorites" className="info-card"><h3>{t("Mis favoritos")}</h3><p>{t("Productos guardados para comprar después.")}</p></Link>
        <Link href="/account/addresses" className="info-card"><h3>{t("Mis direcciones")}</h3><p>{t("Gestiona tus ubicaciones de entrega.")}</p></Link>
        <Link href="/account/settings" className="info-card"><h3>{t("Datos personales")}</h3><p>{t("Actualiza tu información base.")}</p></Link>
      </div>
    </div>
  );
}
