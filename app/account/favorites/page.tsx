import { FavoriteProducts } from "@/components/favorite-products";
import Link from "next/link";
import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account" className="ghost-button">{t("Volver a mi cuenta")}</Link>
        <h1>{t("Mis favoritos")}</h1>
        <p>{t("Productos guardados para tus próximas compras.")}</p>
      </div>

      <FavoriteProducts />
    </div>
  );
}
