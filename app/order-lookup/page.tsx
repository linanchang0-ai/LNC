"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { formatPrice } from "@/data/products";
import { TrackingLink } from "@/components/tracking-link";
import { useI18n } from "@/components/locale-provider";

type Order = {
  order_number: string;
  total: number;
  currency: string;
  order_status: string | null;
  payment_status: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  shipping_label_url?: string | null;
  created_at: string;
  items: Array<{ product_name: string | null; price: number | null; quantity: number | null }>;
};

export default function OrderLookupPage() {
  const { locale, t } = useI18n();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const lookupOrder = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setOrder(null);
    try {
      const response = await fetch("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, email }) });
      const data = await response.json() as { item?: Order; error?: string };
      if (!response.ok || !data.item) {
        setMessage(t(data.error ?? "No se pudo consultar el pedido."));
        return;
      }
      setOrder(data.item);
    } catch {
      setMessage(t("No se pudo consultar el pedido. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  return <div className="container-shell order-lookup-page">
    <div className="page-hero"><Link href="/shop" className="ghost-button">{t("Volver a la tienda")}</Link><h1>{t("Consulta tu pedido")}</h1><p>{t("Ingresa el número de pedido y el correo utilizado al comprar.")}</p></div>
    <form className="form-card order-lookup-form" onSubmit={lookupOrder}>
      <div className="field"><label>{t("Número de pedido")}</label><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="TS-..." required /></div>
      <div className="field"><label>{t("Correo electrónico")}</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      {message ? <p className="error-box">{message}</p> : null}
      <button className="primary-button" style={{ width: "100%" }} disabled={loading}>{loading ? t("Consultando...") : t("Consultar pedido")}</button>
    </form>
    {order ? <section className="form-card order-lookup-result">
      <div className="meta-row"><strong>{order.order_number}</strong><strong>{formatPrice(Number(order.total))}</strong></div>
      <div className="meta-row"><span>{t("Pago")}</span><span>{t(order.payment_status ?? "Pendiente")}</span></div>
      <div className="meta-row"><span>{t("Estado")}</span><span>{t(order.order_status ?? "Pendiente")}</span></div>
      <div className="meta-row"><span>{t("Paquetería")}</span><span>{t(order.shipping_carrier ?? "Se asignará al enviar")}</span></div>
      <div className="meta-row"><span>{t("Guía")}</span><span>{order.tracking_number ? <TrackingLink carrier={order.shipping_carrier} trackingNumber={order.tracking_number} /> : t("Se asignará al enviar")}</span></div>
      {order.shipped_at ? <div className="meta-row"><span>{t("Enviado")}</span><span>{new Date(order.shipped_at).toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "es-MX")}</span></div> : null}
      {order.shipping_label_url ? <div style={{ marginTop: 14 }}><span className="muted">{t("Guía de envío")}</span><a href={order.shipping_label_url} target="_blank" rel="noopener noreferrer"><img src={order.shipping_label_url} alt={t("Guía de envío")} style={{ display: "block", width: "100%", maxWidth: 420, marginTop: 8, borderRadius: 8, border: "1px solid var(--line)" }} /></a></div> : null}
      <h2 style={{ marginTop: 22 }}>{t("Productos")}</h2>
      {order.items.map((item, index) => <div className="meta-row" key={`${item.product_name}-${index}`}><span>{item.product_name ? t(item.product_name) : t("Producto")} × {item.quantity ?? 1}</span><span>{formatPrice(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</span></div>)}
    </section> : null}
  </div>;
}