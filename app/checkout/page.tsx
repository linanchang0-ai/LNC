"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/data/products";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ExpressCheckout, { type CheckoutDraftInput } from "@/components/ExpressCheckout";
import { AddressPasteAssist } from "@/components/address-paste-assist";
import type { AddressFields } from "@/lib/address-parser";
import { metaEvents } from "@/components/MetaPixel";
import { useI18n } from "@/components/locale-provider";
import { translateProductColor, translateProductField } from "@/lib/i18n";

export default function CheckoutPage() {
  const { t, locale } = useI18n();
  const { items, subtotal, shipping, discount, couponCode, couponError, couponPending, total, clearCart } = useCart();
  const cartIsEmpty = items.length === 0;
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    postalCode: "",
    neighborhood: "",
    street: "",
    number: "",
  });
  const [loading, setLoading] = useState(false);
  const [captureMessage, setCaptureMessage] = useState("");
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState("");
  const [expressError, setExpressError] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment">("details");
  const checkoutTracked = useRef(false);
  const captureAttemptedOrderRef = useRef<string | null>(null);
  const checkoutDetailsPanelRef = useRef<HTMLDivElement>(null);
  const checkoutPaymentPanelRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const checkoutData: CheckoutDraftInput = {
    customerName: `${form.name} ${form.lastName}`.trim(),
    email: form.email,
    phone: form.phone,
    shippingAddress: { state: form.state, city: form.city, postalCode: form.postalCode, neighborhood: form.neighborhood, street: form.street, number: form.number },
  };
  const checkoutDetailsComplete = Object.values(checkoutData.shippingAddress).every(Boolean) && Boolean(checkoutData.customerName && checkoutData.email && checkoutData.phone);

  useEffect(() => {
    const panel = checkoutStep === "details" ? checkoutDetailsPanelRef.current : checkoutPaymentPanelRef.current;
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [checkoutStep]);

  const handleExpressSuccess = (orderNumber: string) => {
    clearCart();
    setCaptureMessage(t("¡Pago confirmado! Gracias por tu pedido."));
    setConfirmedOrderNumber(orderNumber);
    // Meta Pixel: Purchase
    metaEvents.purchase(total, "MXN", { order_id: orderNumber });
    router.replace(`/checkout?status=confirmed&order=${encodeURIComponent(orderNumber)}`);
  };

  const handleAddressRecognize = (address: AddressFields) => {
    const [name, ...lastNameParts] = address.name.split(/\s+/).filter(Boolean);
    setForm((current) => ({
      ...current,
      ...address,
      name: name || current.name,
      lastName: lastNameParts.join(" ") || current.lastName,
    }));
  };

  const handleCheckoutSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cartIsEmpty) {
      setCaptureMessage(t("Tu carrito está vacío. Agrega un producto antes de pagar."));
      return;
    }
    if (couponPending) {
      setCaptureMessage(t("Validando el cupón..."));
      return;
    }
    setCaptureMessage("");
    setCheckoutStep("payment");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalOrderId = params.get("token");
    const status = params.get("status");
    const confirmedOrder = params.get("order");
    if (status === "confirmed" && confirmedOrder) {
      setConfirmedOrderNumber(confirmedOrder);
      setCaptureMessage(t("Pago confirmado. Gracias por tu pedido."));
      return;
    }
    if (!paypalOrderId || status !== "success") return;
    if (captureAttemptedOrderRef.current === paypalOrderId) return;
    captureAttemptedOrderRef.current = paypalOrderId;

    const captureOrder = async () => {
      setLoading(true);
      setCaptureMessage(t("Confirmando tu pago con PayPal..."));
      try {
        const response = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: paypalOrderId }),
        });
        if (!response.ok) throw new Error("Payment confirmation failed");
        const captureData = await response.json() as { orderNumber?: string };
        if (!captureData.orderNumber) throw new Error("The confirmed payment did not include an order number.");
        clearCart();
        setCaptureMessage(t("Pago confirmado. Gracias por tu pedido."));
        setConfirmedOrderNumber(captureData.orderNumber);
        // Meta Pixel: Purchase
        metaEvents.purchase(total, "MXN", { order_id: captureData.orderNumber });
        router.replace(`/checkout?status=confirmed&order=${encodeURIComponent(captureData.orderNumber)}`);
      } catch {
        setCaptureMessage(t("No pudimos confirmar el pago todavía. Contacta con soporte antes de intentarlo de nuevo."));
      } finally {
        setLoading(false);
      }
    };

    void captureOrder();
  }, [clearCart, router, t, total]);

  // Meta Pixel: InitiateCheckout
  useEffect(() => {
    if (!cartIsEmpty && !checkoutTracked.current) {
      checkoutTracked.current = true;
      metaEvents.initiateCheckout({
        value: total,
        currency: "MXN",
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      });
    }
  }, [cartIsEmpty, items, total]);

  const handlePayPalCheckout = async (event: FormEvent) => {
    event.preventDefault();

    if (couponPending) {
      setCaptureMessage(t("Validando el cupón..."));
      return;
    }

    if (items.length === 0) {
      alert(t("Tu carrito está vacío."));
      return;
    }

    setLoading(true);

    try {
      const orderId = `ts-${Date.now()}`;
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, color: item.color, size: item.size, quantity: item.quantity })),
          currency: "MXN",
          orderId,
          couponCode,
          ...checkoutData,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        alert(t(data.error || "No pudimos completar tu compra. Inténtalo de nuevo."));
        return;
      }

      const data = (await response.json()) as { approvalUrl?: string };
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch {
      alert(t("No pudimos completar tu compra. Inténtalo de nuevo o contacta con nosotros."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell checkout-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero compact-hero">
        <span className="eyebrow subdued">{t("Pago seguro")}</span>
        <h1>{t("Completa tu pedido")}</h1>
        <p>{t(checkoutStep === "details" ? "Primero, dinos dónde entregar tu pedido." : "Revisa tus datos y elige cómo pagar.")}</p>
        {captureMessage ? <p className="checkout-status" role="status">{captureMessage}{confirmedOrderNumber ? <> {t("Número de pedido")}: <strong>{confirmedOrderNumber}</strong></> : null}</p> : null}
      </div>

      <div className="checkout-steps" aria-label={t("Progreso del pago")}>
        <span className="is-active">1. {t("Información de contacto y entrega")}</span>
        <span className={checkoutStep === "payment" ? "is-active" : undefined}>2. {t("Pago y revisión")}</span>
      </div>

      {checkoutStep === "details" ? (
        <form className="form-shell checkout-form checkout-form--details" onSubmit={handleCheckoutSubmit}>
          <div className="form-card checkout-card" ref={checkoutDetailsPanelRef}>
            <p className="guest-checkout-note">{t("Puedes comprar como invitado. No necesitas crear una cuenta.")}</p>
            <AddressPasteAssist onRecognize={handleAddressRecognize} />
            <div className="checkout-section">
              <h3>{t("Información de contacto")}</h3>
              <div className="field-row two-col">
                <div className="field">
                  <label>{t("Nombre")}</label>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="given-name" required />
                </div>
                <div className="field">
                  <label>{t("Apellidos")}</label>
                  <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} autoComplete="family-name" required />
                </div>
              </div>
              <div className="field-row two-col">
                <div className="field">
                  <label>{t("Correo electrónico")}</label>
                  <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                </div>
                <div className="field">
                  <label>{t("Teléfono")}</label>
                  <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
                </div>
              </div>
            </div>

            <div className="checkout-section">
              <h3>{t("Información de envío")}</h3>
              <div className="field-row two-col">
                <div className="field">
                  <label>{t("Estado")}</label>
                  <input autoComplete="address-level1" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required />
                </div>
                <div className="field">
                  <label>{t("Ciudad")}</label>
                  <input autoComplete="address-level2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
                </div>
              </div>
              <div className="field-row two-col">
                <div className="field">
                  <label>{t("Código postal")}</label>
                  <input autoComplete="postal-code" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} required />
                </div>
                <div className="field">
                  <label>{t("Colonia")}</label>
                  <input autoComplete="address-line2" value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} required />
                </div>
              </div>
              <div className="field-row two-col">
                <div className="field">
                  <label>{t("Calle")}</label>
                  <input autoComplete="address-line1" value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} required />
                </div>
                <div className="field">
                  <label>{t("Número")}</label>
                  <input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} required />
                </div>
              </div>
            </div>

            {couponPending ? <p className="checkout-status" role="status">{t("Validando el cupón...")}</p> : null}
            {couponError ? <p className="checkout-status" role="status">{t(couponError)}</p> : null}
            {captureMessage ? <p className="checkout-status" role="alert">{captureMessage}</p> : null}
            <button className="primary-button checkout-continue-button" type="submit" disabled={cartIsEmpty || couponPending}>
              {t("Continuar al pago")}
            </button>
          </div>

          <aside className="summary-card order-summary checkout-order-summary">
            <span className="eyebrow subdued">{t("Resumen")}</span>
            <h3 style={{ marginTop: 0 }}>{t("Resumen del pedido")}</h3>
            <div className="checkout-item-list">
              {items.map((item) => <div className="meta-row" key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`}>
                <span>{translateProductField(locale, item.translations, "name", item.name)}{item.color ? ` · ${translateProductColor(locale, item.translations, item.color)}` : ""}{item.size ? ` · ${t("Talla")} ${t(item.size)}` : ""} × {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>)}
            </div>
            <div className="meta-row"><span>{t("Subtotal")}</span><span>{formatPrice(subtotal)}</span></div>
            {discount > 0 ? <div className="meta-row"><span>{t("Descuento")} {couponCode ? `(${couponCode})` : ""}</span><span>-{formatPrice(discount)}</span></div> : null}
            <div className="meta-row"><span>{t("Envío")}</span><span>{formatPrice(shipping)}</span></div>
            <div className="total-row"><span>{t("Total")}</span><span>{formatPrice(total)}</span></div>
          </aside>
        </form>
      ) : (
        <form className="form-shell checkout-form checkout-form--payment" onSubmit={handlePayPalCheckout}>
          <section className="summary-card order-summary checkout-payment-panel" ref={checkoutPaymentPanelRef} aria-labelledby="checkout-payment-heading">
            <div className="checkout-customer-review">
              <div>
                <span className="eyebrow subdued">{t("Información de entrega")}</span>
                <h3>{checkoutData.customerName}</h3>
                <p>{checkoutData.email} · {checkoutData.phone}</p>
                <p>{checkoutData.shippingAddress.street} {checkoutData.shippingAddress.number}, {checkoutData.shippingAddress.neighborhood}, {checkoutData.shippingAddress.city}, {checkoutData.shippingAddress.state}, {checkoutData.shippingAddress.postalCode}</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setCheckoutStep("details")}>{t("Editar datos")}</button>
            </div>

            <div className="checkout-payment-options">
              <span className="eyebrow subdued">{t("Paso 2 de 2")}</span>
              <h3 id="checkout-payment-heading">{t("Elige cómo pagar")}</h3>
              <div className="secure-note">
                <strong>{t("Pago seguro")}</strong>
                <div>{t("Aceptamos PayPal, Apple Pay y Google Pay. Tus datos están protegidos con cifrado SSL.")}</div>
              </div>

              <p className="checkout-delivery-note">{t("Envíos a México: la entrega es estimada y puede variar por procesamiento, paquetería, aduanas y destino.")}</p>

              <ExpressCheckout onSuccess={handleExpressSuccess} onError={setExpressError} checkoutData={checkoutData} disabled={!checkoutDetailsComplete || cartIsEmpty || couponPending} />
              {expressError ? <p style={{ color: "#dc2626", fontSize: 14, margin: "8px 0" }} role="alert">{expressError}</p> : null}

              <div className="checkout-item-list">
                {items.map((item) => <div className="meta-row" key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`}>
                  <span>{translateProductField(locale, item.translations, "name", item.name)}{item.color ? ` · ${translateProductColor(locale, item.translations, item.color)}` : ""}{item.size ? ` · ${t("Talla")} ${t(item.size)}` : ""} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>)}
              </div>
              <div className="meta-row"><span>{t("Subtotal")}</span><span>{formatPrice(subtotal)}</span></div>
              {discount > 0 ? <div className="meta-row"><span>{t("Descuento")} {couponCode ? `(${couponCode})` : ""}</span><span>-{formatPrice(discount)}</span></div> : null}
              <div className="meta-row"><span>{t("Envío")}</span><span>{formatPrice(shipping)}</span></div>
              <div className="total-row"><span>{t("Total")}</span><span>{formatPrice(total)}</span></div>
              <div style={{ marginTop: 18 }}>
                <button className="primary-button" style={{ width: "100%" }} type="submit" disabled={loading || cartIsEmpty || !checkoutDetailsComplete || couponPending}>
                  {loading ? t("Procesando...") : t("Pagar con PayPal")}
                </button>
              </div>
              <p className="checkout-terms">{t("Al realizar tu pedido, confirmas que has revisado y aceptado nuestros")} <Link href="/terms">{t("Términos y condiciones")}</Link>, <Link href="/shipping">{t("Política de envíos")}</Link> y <Link href="/returns-policy">{t("Política de devoluciones")}</Link>.</p>
              <div style={{ marginTop: 12 }}>
                <Link href="/returns-policy" className="ghost-button" style={{ width: "100%" }}>
                  {t("Política de devoluciones")}
                </Link>
              </div>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
