import { getRequestLocale } from "@/lib/server-locale";
import { translateText } from "@/lib/i18n";

export default async function PaymentsPage() {
  const locale = await getRequestLocale();
  const t = (text: string) => translateText(locale, text);
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>{t("Política de pagos")}</h1>
        <p>{t("Información clara sobre validación, seguridad y reembolsos.")}</p>
      </div>
      <div className="form-card legal-content" style={{ maxWidth: 820 }}>
        <h2>{t("Métodos de pago")}</h2><p>{t("Los métodos disponibles se muestran al finalizar la compra y son procesados mediante plataformas de pago confiables. LNC SPORTS no almacena información completa de tarjetas.")}</p>
        <h2>{t("Verificación y seguridad")}</h2><p>{t("Para proteger a clientes y a la tienda, algunos pagos o pedidos pueden requerir validación adicional. Si el proveedor de pago rechaza la transacción o existen señales razonables de fraude, abuso de promociones, reclamaciones fraudulentas o actividad sospechosa, LNC SPORTS podrá investigar, solicitar información adicional, suspender o cancelar el pedido en la medida permitida por la legislación aplicable y sin discriminar a consumidores.")}</p>
        <h2>{t("Reembolsos")}</h2><p>{t("Los reembolsos se procesan cuando corresponden conforme a nuestra Política de devoluciones, las condiciones de la compra o la legislación aplicable. Normalmente se tramitan al método de pago original o mediante el procedimiento indicado por la plataforma. La acreditación puede depender de PayPal, la institución financiera y sus procesos; LNC SPORTS no garantiza un plazo fijo de acreditación.")}</p>
        <h2>{t("Disputas y soporte")}</h2><p>{t("Si tienes una duda sobre un cargo, contáctanos con tu número de pedido antes de iniciar una reclamación cuando sea posible. Revisaremos la información de buena fe y colaboraremos con la plataforma de pago según corresponda, sin afectar los derechos que te reconozca la ley.")}</p>
      </div>
    </div>
  );
}