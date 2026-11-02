"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/data/products";
import { useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { translateProductColor, translateProductField } from "@/lib/i18n";

export default function CartPage() {
  const { t, locale } = useI18n();
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
        <span className="eyebrow subdued">{t("Tu selección")}</span>
        <h1>{t("TU CARRITO")}</h1>
        <p>{t("Revisa tu selección antes de pagar y confirma los datos de entrega.")}</p>
      </div>

      <div className="cart-layout">
        <div className="form-card cart-card">
          <div className="list">
            {items.length === 0 ? (
              <div className="empty-state">
                <div className="muted">{t("Tu carrito está vacío. Explora nuestra colección seleccionada.")}</div>
                <Link href="/shop" className="primary-button" style={{ marginTop: 18 }}>
                  {t("Seguir comprando")}
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`} className="cart-item">
                  <img src={item.image} alt={translateProductField(locale, item.translations, "name", item.name)} />
                  <div style={{ flex: 1 }}>
                    <div className="cart-item-head">
                      <strong>{translateProductField(locale, item.translations, "name", item.name)}</strong>
                      <button className="text-button" onClick={() => removeFromCart(item.id, item.color, item.size)}>
                        {t("Eliminar")}
                      </button>
                    </div>
                    <div className="muted">{formatPrice(item.price)}</div>
                    {item.color ? <div className="muted">{t("Color:")} {translateProductColor(locale, item.translations, item.color)}</div> : null}
                    {item.size ? <div className="muted">{t("Talla:")} {item.size}</div> : null}
                    <div className="qty-row" style={{ marginTop: 10 }}>
                      <button aria-label={t("Reducir cantidad")} onClick={() => updateQuantity(item.id, item.color, item.size, -1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button aria-label={t("Aumentar cantidad")} onClick={() => updateQuantity(item.id, item.color, item.size, 1)}>
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
            <span className="eyebrow subdued">{t("Resumen")}</span>
          </div>
          <h3 style={{ marginTop: 0 }}>{t("Resumen del pedido")}</h3>
          <div className="meta-row"><span>{t("Subtotal")}</span><span>{formatPrice(subtotal)}</span></div>
          <div className="free-shipping-box"><strong>{subtotal >= freeShippingThreshold ? t("ENVÍO GRATIS DESBLOQUEADO") : t("Agrega {amount} para obtener envío gratis").replace("{amount}", formatPrice(Math.max(0, freeShippingThreshold - subtotal)))}</strong><div className="shipping-progress"><span style={{ width: `${freeShippingProgress}%` }} /></div></div>
          <div className="meta-row"><span>{t("Envío")}</span><span>{shippingCost ? formatPrice(shippingCost) : t("GRATIS")}</span></div>
          <div className="meta-row"><span>{t("Descuento")}</span><span>—</span></div>
          <div className="coupon-row"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder={t("Código promocional")} /><button type="button" onClick={() => setDiscount(coupon.trim().toUpperCase() === "LNCSPORTS10" ? Math.round(subtotal * 0.1) : 0)}>{t("Aplicar")}</button></div>
          {discount > 0 ? <div className="meta-row"><span>{t("Descuento promocional")}</span><span>-{formatPrice(discount)}</span></div> : null}
          <div className="total-row"><span>{t("Total")}</span><span>{formatPrice(finalTotal)}</span></div>
          <div style={{ marginTop: 18 }}>
            <Link href="/checkout" className="primary-button" style={{ width: "100%" }}>
              {t("Ir a pagar")}
            </Link>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/shop" className="ghost-button" style={{ width: "100%" }}>
              {t("Seguir comprando")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
