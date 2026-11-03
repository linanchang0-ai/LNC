"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/data/products";
import { useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { translateProductColor, translateProductField } from "@/lib/i18n";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

export default function CartPage() {
  const { t, locale } = useI18n();
  const { items, subtotal, shipping, discount, couponCode, couponError, couponPending, total, updateQuantity, removeFromCart, clearCart, applyCoupon, clearCoupon } = useCart();
  const [coupon, setCoupon] = useState(couponCode ?? "");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const couponStatus = couponError || couponMessage;

  const redeemCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponMessage("");
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await response.json() as { code?: string; discount?: number; error?: string };
      if (!response.ok || !data.code || typeof data.discount !== "number") {
        setCouponMessage(t(data.error ?? "No se pudo aplicar el cupón."));
        return;
      }

      applyCoupon(data.code, data.discount);
      setCoupon(data.code);
      setCouponMessage(t("Cupón aplicado."));
    } catch {
      setCouponMessage(t("No se pudo aplicar el cupón."));
    } finally {
      setCouponLoading(false);
    }
  };

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
            {items.length > 0 ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="text-button" onClick={() => { if (window.confirm(t("¿Vaciar todo el carrito?"))) { clearCart(); setCoupon(""); setCouponMessage(""); } }}>{t("Vaciar carrito")}</button>
              </div>
            ) : null}
            {items.length === 0 ? (
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
          <div className="free-shipping-box"><strong>{subtotal >= FREE_SHIPPING_THRESHOLD ? t("ENVÍO GRATIS DESBLOQUEADO") : t("Agrega {amount} para obtener envío gratis").replace("{amount}", formatPrice(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)))}</strong><div className="shipping-progress"><span style={{ width: `${freeShippingProgress}%` }} /></div></div>
          <div className="meta-row"><span>{t("Envío")}</span><span>{shipping ? formatPrice(shipping) : t("GRATIS")}</span></div>
          {couponCode ? <div className="meta-row"><span>{t("Descuento")} ({couponCode})</span><span>-{formatPrice(discount)}</span></div> : null}
          <div className="coupon-row"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder={t("Código promocional")} /><button type="button" onClick={() => void redeemCoupon()} disabled={couponLoading}>{couponLoading ? t("Procesando...") : t("Aplicar")}</button></div>
          {couponPending ? <p className="muted" role="status">{t("Validando el cupón...")}</p> : null}
          {couponStatus ? <p className="muted" role="status">{t(couponStatus)}</p> : null}
          {couponCode ? <button type="button" className="text-button" onClick={() => { clearCoupon(); setCoupon(""); setCouponMessage(""); }}>{t("Quitar cupón")}</button> : null}
          <div className="total-row"><span>{t("Total")}</span><span>{formatPrice(total)}</span></div>
          <div style={{ marginTop: 18 }}>
            <Link href="/checkout" aria-disabled={couponPending} className="primary-button" style={{ width: "100%", ...(couponPending ? { pointerEvents: "none", opacity: 0.5 } : {}) }}>
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
