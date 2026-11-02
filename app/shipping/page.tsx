import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export default async function ShippingPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>{t("Política de envíos")}</h1>
        <p>{t("Información transparente sobre procesamiento, entrega y seguimiento.")}</p>
      </div>
      <div className="form-card legal-content" style={{ maxWidth: 820 }}>
        <h2>{t("Envíos a México")}</h2><p>{t("LNC SPORTS ofrece envíos a México. Los tiempos de entrega son estimados y pueden variar debido al procesamiento del pedido, transportistas, aduanas, ubicación del destinatario y otras circunstancias fuera del control razonable de LNC SPORTS.")}</p>
        <h2>{t("Costo de envío")}</h2><p>{t("Los pedidos con un subtotal de productos inferior a MXN 1,500 tienen un costo de envío de MXN 150. Los pedidos con un subtotal igual o superior a MXN 1,500 tienen envío gratis. El costo se calcula sobre el subtotal de productos antes de aplicar descuentos.")}</p>
        <h2>{t("Preparación y seguimiento")}</h2><p>{t("El pedido se prepara después de la confirmación de pago y de cualquier revisión de seguridad necesaria. Cuando el envío cuente con seguimiento, la información podrá tardar en reflejarse conforme a los escaneos y procesos del transportista.")}</p>
        <h2>{t("Dirección y entrega fallida")}</h2><p>{t("El cliente es responsable de proporcionar una dirección completa, correcta y reconocible. Si una dirección incorrecta, incompleta o no localizable provoca una entrega fallida, retorno, reenvío, almacenaje o transporte adicional, LNC SPORTS podrá gestionar los costos razonables efectivamente generados según el caso y la legislación aplicable.")}</p>
        <h2>{t("Rechazo de paquetes")}</h2><p>{t("Si un pedido se rechaza sin una causa razonable y se generan costos de retorno, almacenaje o reenvío, estos podrán tratarse conforme a los costos razonables incurridos y la legislación aplicable. Esto no elimina los derechos que correspondan al consumidor.")}</p>
        <h2>{t("Paquetes dañados")}</h2><p>{t("Recomendamos revisar el empaque al recibirlo. Si observas daño evidente, toma fotografías o video y contáctanos tan pronto como sea posible con tu número de pedido y la información que permita evaluar el caso.")}</p>
        <h2>{t("Aduanas y demoras")}</h2><p>{t("Los pedidos internacionales pueden estar sujetos a procesos aduaneros, impuestos, aranceles u otros cargos aplicables conforme a la legislación correspondiente. El clima, días festivos, inspecciones, medidas gubernamentales y problemas de transporte pueden causar demoras fuera de nuestro control razonable.")}</p>
      </div>
    </div>
  );
}
