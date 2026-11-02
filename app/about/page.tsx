import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export default async function AboutPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell editorial-page">
      <div className="page-hero">
        <span className="eyebrow subdued">{t("SOBRE LNC SPORTS")}</span>
        <h1>{t("Objetos con un punto de vista propio.")}</h1>
        <p>{t("Seleccionamos piezas pensadas para quienes creen que lo cotidiano merece un mejor diseño.")}</p>
      </div>
      <img className="editorial-page-image" src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80" alt="Interior de diseño cálido" />
      <div className="editorial-copy-block"><span className="eyebrow subdued">{t("Nuestra filosofía")}</span><h2>{t("Lo premium es una sensación de claridad.")}</h2><p>{t("LNC SPORTS es una colección de estilo de vida contemporáneo creada alrededor de la sobriedad, la calidad de los materiales y la belleza útil. Creemos que los objetos que nos rodean pueden hacer los rituales diarios más serenos, ricos y personales.")}</p></div>
      <div className="story-grid">
        <div className="story-card">
          <h3>{t("Diseño")}</h3>
          <p>{t("Objetos con identidad, proporción y detalles que recompensan la atención.")}</p>
        </div>
        <div className="story-card">
          <h3>{t("Calidad")}</h3>
          <p>{t("Materiales durables, acabados refinados y confianza que perdura.")}</p>
        </div>
        <div className="story-card">
          <h3>{t("Estilo de vida")}</h3>
          <p>{t("Piezas que hacen que los rituales cotidianos se sientan más intencionales.")}</p>
        </div>
        <div className="story-card">
          <h3>{t("Exclusividad")}</h3>
          <p>{t("Un punto de vista distintivo sin ruido innecesario.")}</p>
        </div>
      </div>
    </div>
  );
}
