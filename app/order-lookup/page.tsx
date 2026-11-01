"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { formatPrice } from "@/data/products";
import { TrackingLink } from "@/components/tracking-link";

type Order = {
  order_number: string;
  total: number;
  currency: string;
  order_status: string | null;
  payment_status: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  created_at: string;
  items: Array<{ product_name: string | null; price: number | null; quantity: number | null }>;
};

export default function OrderLookupPage() {
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
        setMessage(data.error ?? "No se pudo consultar el pedido.");
        return;
      }
      setOrder(data.item);
    } catch {
      setMessage("No se pudo consultar el pedido. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="container-shell order-lookup-page">
    <div className="page-hero"><Link href="/shop" className="ghost-button">Volver a la tienda</Link><h1>Consulta tu pedido</h1><p>Ingresa el número de pedido y el correo utilizado al comprar.</p></div>
    <form className="form-card order-lookup-form" onSubmit={lookupOrder}>
      <div className="field"><label>Número de pedido</label><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="TS-..." required /></div>
      <div className="field"><label>Correo electrónico</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      {message ? <p className="error-box">{message}</p> : null}
      <button className="primary-button" style={{ width: "100%" }} disabled={loading}>{loading ? "Consultando..." : "Consultar pedido"}</button>
    </form>
    {order ? <section className="form-card order-lookup-result">
      <div className="meta-row"><strong>{order.order_number}</strong><strong>{formatPrice(Number(order.total))}</strong></div>
      <div className="meta-row"><span>Pago</span><span>{order.payment_status ?? "Pendiente"}</span></div>
      <div className="meta-row"><span>Estado</span><span>{order.order_status ?? "Pendiente"}</span></div>
      <div className="meta-row"><span>Paquetería</span><span>{order.shipping_carrier ?? "Se asignará al enviar"}</span></div>
      <div className="meta-row"><span>Guía</span><span>{order.tracking_number ? <TrackingLink carrier={order.shipping_carrier} trackingNumber={order.tracking_number} /> : "Se asignará al enviar"}</span></div>
      {order.shipped_at ? <div className="meta-row"><span>Enviado</span><span>{new Date(order.shipped_at).toLocaleDateString("es-MX")}</span></div> : null}
      <h2 style={{ marginTop: 22 }}>Productos</h2>
      {order.items.map((item, index) => <div className="meta-row" key={`${item.product_name}-${index}`}><span>{item.product_name ?? "Producto"} × {item.quantity ?? 1}</span><span>{formatPrice(Number(item.price ?? 0) * Number(item.quantity ?? 1))}</span></div>)}
    </section> : null}
  </div>;
}