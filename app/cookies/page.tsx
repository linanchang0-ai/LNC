import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export default async function CookiesPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>{t("Política de cookies")}</h1>
      </div>
      <div className="form-card" style={{ maxWidth: 760 }}>
        <p className="muted">{t("Utilizamos cookies para recordar preferencias de navegación, mejorar la experiencia y mantener el funcionamiento del sitio.")}</p>
      </div>
    </div>
  );
}
