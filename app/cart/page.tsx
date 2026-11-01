"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/data/products";
import { useState } from "react";

export default function CartPage() {
  const { items, subtotal, shipping, updateQuantity, removeFromCart } = useCart();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const freeShippingThreshold = 2500;
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : shipping;
  const finalTotal = subtotal + shippingCost - discount;

  return (
    <div className="container-shell cart-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero compact-hero">
        <span className="eyebrow subdued">Tu selección</span>
        <h1>TU CARRITO</h1>
        <p>Revisa tu selección antes de pagar y confirma los datos de entrega.</p>
      </div>

      <div className="cart-layout">
        <div className="form-card cart-card">
          <div className="list">
            {items.length === 0 ? (
              <div className="empty-state">
                <div className="muted">Tu carrito está vacío. Explora nuestra colección seleccionada.</div>
                <Link href="/shop" className="primary-button" style={{ marginTop: 18 }}>
                  Seguir comprando
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div style={{ flex: 1 }}>
                    <div className="cart-item-head">
                      <strong>{item.name}</strong>
                      <button className="text-button" onClick={() => removeFromCart(item.id, item.color, item.size)}>
                        Eliminar
                      </button>
                    </div>
                    <div className="muted">{formatPrice(item.price)}</div>
                    {item.color ? <div className="muted">Color: {item.color}</div> : null}
                    {item.size ? <div className="muted">Talla: {item.size}</div> : null}
                    <div className="qty-row" style={{ marginTop: 10 }}>
                      <button aria-label="Reducir cantidad" onClick={() => updateQuantity(item.id, item.color, item.size, -1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button aria-label="Aumentar cantidad" onClick={() => updateQuantity(item.id, item.color, item.size, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="summary-card order-summary">
          <div className="summary-topline">
            <span className="eyebrow subdued">Resumen</span>
          </div>
          <h3 style={{ marginTop: 0 }}>Resumen del pedido</h3>
          <div className="meta-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="free-shipping-box"><strong>{subtotal >= freeShippingThreshold ? "ENVÍO GRATIS DESBLOQUEADO" : `Agrega ${formatPrice(Math.max(0, freeShippingThreshold - subtotal))} para obtener envío gratis`}</strong><div className="shipping-progress"><span style={{ width: `${freeShippingProgress}%` }} /></div></div>
          <div className="meta-row"><span>Envío</span><span>{shippingCost ? formatPrice(shippingCost) : "GRATIS"}</span></div>
          <div className="meta-row"><span>Descuento</span><span>—</span></div>
          <div className="coupon-row"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Código promocional" /><button type="button" onClick={() => setDiscount(coupon.trim().toUpperCase() === "LNCSPORTS10" ? Math.round(subtotal * 0.1) : 0)}>Aplicar</button></div>
          {discount > 0 ? <div className="meta-row"><span>Descuento promocional</span><span>-{formatPrice(discount)}</span></div> : null}
          <div className="total-row"><span>Total</span><span>{formatPrice(finalTotal)}</span></div>
          <div style={{ marginTop: 18 }}>
            <Link href="/checkout" className="primary-button" style={{ width: "100%" }}>
              Ir a pagar
            </Link>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/shop" className="ghost-button" style={{ width: "100%" }}>
              Seguir comprando
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
