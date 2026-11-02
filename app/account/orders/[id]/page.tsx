"use client";

import { use, useEffect, useState } from "react";
import { formatPrice } from "@/data/products";
import Link from "next/link";
import { TrackingLink } from "@/components/tracking-link";
import { useI18n } from "@/components/locale-provider";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { locale, t } = useI18n();
  const { id } = use(params);
  const [order, setOrder] = useState<{ order_number: string; total: number; currency: string; order_status: string | null; payment_status: string | null; return_status: string | null; refund_status: string | null; shipping_address: Record<string, string> | null; items: Array<{ product_name: string | null; price: number | null; quantity: number | null }>; tracking_number: string | null; shipping_carrier: string | null; shipped_at: string | null; created_at: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/account?resource=order&orderNumber=${encodeURIComponent(id)}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setOrder(data.item); }).catch((requestError: Error) => setError(requestError.message)); }, [id]);

  if (error) return <div className="container-shell" style={{ padding: "24px 0 40px" }}><p className="error-box">{t(error)}</p></div>;
  if (!order) return <div className="container-shell" style={{ padding: "24px 0 40px" }}><p className="muted">{t("Cargando pedido...")}</p></div>;
  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account/orders" className="ghost-button">{t("Volver a mis pedidos")}</Link>
        <h1>{order.order_number}</h1>
        <p>{t(order.order_status ?? "Pendiente")}</p>
      </div>

      <div className="form-card" style={{ maxWidth: 700 }}>
        <div className="meta-row"><span>{t("Pago")}</span><span>{t(order.payment_status ?? "Pendiente")}</span></div>
        {order.return_status ? <div className="meta-row"><span>{t("Devolución")}</span><span>{t(order.return_status)}</span></div> : null}
        {order.refund_status ? <div className="meta-row"><span>{t("Reembolso")}</span><span>{t(order.refund_status)}</span></div> : null}
        <div className="meta-row"><span>{t("Total")}</span><span>{formatPrice(Number(order.total))}</span></div>
        <div className="meta-row"><span>{t("Fecha")}</span><span>{new Date(order.created_at).toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "es-MX")}</span></div>
        <div className="meta-row"><span>{t("Paquetería")}</span><span>{t(order.shipping_carrier ?? "Se asignará al enviar el pedido")}</span></div>
        <div className="meta-row"><span>{t("Guía")}</span><span>{order.tracking_number ? <TrackingLink carrier={order.shipping_carrier} trackingNumber={order.tracking_number} /> : t("Se asignará al enviar el pedido")}</span></div>
        {order.shipped_at ? <div className="meta-row"><span>{t("Enviado")}</span><span>{new Date(order.shipped_at).toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "es-MX")}</span></div> : null}
      </div>

      <section className="form-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <h2>{t("Productos")}</h2>
        {order.items.map((item, index) => <div className="meta-row" key={`${item.product_name}-${index}`}><span>{item.product_name ? t(item.product_name) : t("Producto")} × {item.quantity ?? 1}</span><span>{formatPrice(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</span></div>)}
      </section>

      {order.shipping_address ? <section className="form-card" style={{ maxWidth: 700, marginTop: 16 }}>
        <h2>{t("Dirección de entrega")}</h2>
        <p className="muted">{[order.shipping_address.street, order.shipping_address.number, order.shipping_address.neighborhood, order.shipping_address.city, order.shipping_address.state, order.shipping_address.postalCode].filter(Boolean).join(", ")}</p>
      </section> : null}
    </div>
  );
}
