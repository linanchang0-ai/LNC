"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/data/products";
import Link from "next/link";
import { useI18n } from "@/components/locale-provider";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const { locale, t } = useI18n();
  const [orders, setOrders] = useState<{ id: string; order_number: string; total: number; currency: string; order_status: string | null; payment_status: string | null; return_status: string | null; refund_status: string | null; created_at: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/account?resource=orders").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setOrders(data.items); }).catch((requestError: Error) => setError(requestError.message)); }, []);

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account" className="ghost-button">{t("Volver a mi cuenta")}</Link>
        <h1>{t("Mis pedidos")}</h1>
        <p>{t("Consulta el estado de cada compra.")}</p>
      </div>

      <div className="list">{orders.map((order) => <div className="form-card" key={order.id}><div className="meta-row"><strong>{order.order_number}</strong><strong>{formatPrice(Number(order.total))}</strong></div><div className="meta-row"><span>{t(order.payment_status ?? "Pendiente")}</span><span>{t(order.order_status ?? "Pendiente")}</span></div>{order.return_status || order.refund_status ? <div className="meta-row"><span>{order.return_status ? `${t("Devolución")}: ${t(order.return_status)}` : ""}</span><span>{order.refund_status ? `${t("Reembolso")}: ${t(order.refund_status)}` : ""}</span></div> : null}<div className="meta-row"><span className="muted">{new Date(order.created_at).toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "es-MX")}</span><Link className="small-button" href={`/account/orders/${encodeURIComponent(order.order_number)}`}>{t("Ver")}</Link></div></div>)}{!error && orders.length === 0 ? <div className="empty-state"><p className="muted">{t("Aún no tienes pedidos.")}</p></div> : null}{error ? <p className="error-box">{t(error)}</p> : null}</div>
    </div>
  );
}
