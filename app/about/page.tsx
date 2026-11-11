import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export default async function AboutPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell editorial-page">
      <div className="page-hero">
        <span className="eyebrow subdued">{t("SOBRE LNC SPORTS")}</span>
        <h1>{t("Camisetas para vivir el fútbol con pasión.")}</h1>
        <p>{t("Somos una tienda de camisetas de fútbol para hinchas mexicanos, con tallas para todos y envío con seguimiento.")}</p>
      </div>
      <img className="editorial-page-image" src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80" alt="Camisetas de fútbol de la Selección Mexicana" />
      <div className="editorial-copy-block"><span className="eyebrow subdued">{t("Nuestra filosofía")}</span><h2>{t("Nuestra prioridad: calidad y confianza.")}</h2><p>{t("LNC SPORTS es una tienda de camisetas de fútbol dirigida a hinchas mexicanos. Seleccionamos diseños con identidad, telas ligeras y transpirables, y un proceso de compra claro, para que llegues al partido con la camiseta correcta.")}</p></div>
      <div className="story-grid">
        <div className="story-card">
          <h3>{t("Diseño")}</h3>
          <p>{t("Diseños inspirados en la Selección y en los equipos que apoyas.")}</p>
        </div>
        <div className="story-card">
          <h3>{t("Calidad")}</h3>
          <p>{t("Tela ligera y transpirable, pensada para el partido y para el día a día.")}</p>
        </div>
        <div className="story-card">
          <h3>{t("Hinchas")}</h3>
          <p>{t("Para ir al estadio, ver el partido con amigos o presumir tu pasión por el Tri.")}</p>
        </div>
        <div className="story-card">
          <h3>{t("Atención")}</h3>
          <p>{t("Te acompañamos por WhatsApp y resolvemos tus dudas de talla, color y envío.")}</p>
        </div>
      </div>
    </div>
  );
}
