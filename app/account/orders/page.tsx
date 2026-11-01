"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/data/products";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const [orders, setOrders] = useState<{ id: string; order_number: string; total: number; currency: string; order_status: string | null; payment_status: string | null; return_status: string | null; refund_status: string | null; created_at: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/account?resource=orders").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setOrders(data.items); }).catch((requestError: Error) => setError(requestError.message)); }, []);

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account" className="ghost-button">Volver a mi cuenta</Link>
        <h1>Mis pedidos</h1>
        <p>Consulta el estado de cada compra.</p>
      </div>

      <div className="list">{orders.map((order) => <div className="form-card" key={order.id}><div className="meta-row"><strong>{order.order_number}</strong><strong>{formatPrice(Number(order.total))}</strong></div><div className="meta-row"><span>{order.payment_status ?? "Pendiente"}</span><span>{order.order_status ?? "Pendiente"}</span></div>{order.return_status || order.refund_status ? <div className="meta-row"><span>{order.return_status ? `Devolución: ${order.return_status}` : ""}</span><span>{order.refund_status ? `Reembolso: ${order.refund_status}` : ""}</span></div> : null}<div className="meta-row"><span className="muted">{new Date(order.created_at).toLocaleDateString("es-MX")}</span><Link className="small-button" href={`/account/orders/${encodeURIComponent(order.order_number)}`}>Ver</Link></div></div>)}{!error && orders.length === 0 ? <div className="empty-state"><p className="muted">Aún no tienes pedidos.</p></div> : null}{error ? <p className="error-box">{error}</p> : null}</div>
    </div>
  );
}
