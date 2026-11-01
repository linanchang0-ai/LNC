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

export default function CheckoutPage() {
  const { items, subtotal, shipping, discount, couponCode, total, clearCart } = useCart();
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
  const [expressError, setExpressError] = useState("");
  const checkoutTracked = useRef(false);
  const router = useRouter();
  const checkoutData: CheckoutDraftInput = {
    customerName: `${form.name} ${form.lastName}`.trim(),
    email: form.email,
    phone: form.phone,
    shippingAddress: { state: form.state, city: form.city, postalCode: form.postalCode, neighborhood: form.neighborhood, street: form.street, number: form.number },
  };
  const checkoutDetailsComplete = Object.values(checkoutData.shippingAddress).every(Boolean) && Boolean(checkoutData.customerName && checkoutData.email && checkoutData.phone);

  const handleExpressSuccess = (orderId: string) => {
    clearCart();
    setCaptureMessage("¡Pago confirmado! Gracias por tu pedido.");
    // Meta Pixel: Purchase
    metaEvents.purchase(total, "MXN", { order_id: orderId });
    router.replace(`/checkout?status=confirmed&order=${orderId}`);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalOrderId = params.get("token");
    const status = params.get("status");
    if (!paypalOrderId || status !== "success") return;

    const captureOrder = async () => {
      setLoading(true);
      setCaptureMessage("Confirmando tu pago con PayPal...");
      try {
        const response = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: paypalOrderId }),
        });
        if (!response.ok) throw new Error("Payment confirmation failed");
        clearCart();
        setCaptureMessage("Pago confirmado. Gracias por tu pedido.");
        // Meta Pixel: Purchase
        metaEvents.purchase(total, "MXN", { order_id: paypalOrderId });
        router.replace("/checkout?status=confirmed");
      } catch {
        setCaptureMessage("No pudimos confirmar el pago todavía. Contacta con soporte antes de intentarlo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    void captureOrder();
  }, [clearCart, router, total]);

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

    if (items.length === 0) {
      alert("Tu carrito está vacío.");
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
        alert(data.error || "No pudimos completar tu compra. Inténtalo de nuevo.");
        return;
      }

      const data = (await response.json()) as { approvalUrl?: string };
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch {
      alert("No pudimos completar tu compra. Inténtalo de nuevo o contacta con nosotros.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell checkout-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero compact-hero">
        <span className="eyebrow subdued">Pago seguro</span>
        <h1>Completa tu pedido</h1>
        <p>Compra de forma rápida y segura sin crear una cuenta.</p>
        {captureMessage ? <p className="checkout-status" role="status">{captureMessage}</p> : null}
      </div>

      <div className="checkout-steps" aria-label="Checkout progress">
        <span className="is-active">1. Contacto</span>
        <span className="is-active">2. Envío</span>
        <span>3. Pago</span>
        <span>4. Revisión</span>
      </div>

      <form className="form-shell checkout-form" onSubmit={handlePayPalCheckout}>
        <div className="form-card checkout-card">
          <AddressPasteAssist onRecognize={handleAddressRecognize} />
          <div className="checkout-section">
            <p className="guest-checkout-note">Puedes comprar como invitado. No necesitas crear una cuenta.</p>
            <h3>Contacto</h3>
            <div className="field-row two-col">
              <div className="field">
                <label>Nombre</label>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="field">
                <label>Apellidos</label>
                <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
              </div>
            </div>
            <div className="field-row two-col">
              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h3>Envío</h3>
            <div className="field-row two-col">
              <div className="field">
                <label>Estado</label>
                <input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required />
              </div>
              <div className="field">
                <label>Ciudad</label>
                <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
              </div>
            </div>
            <div className="field-row two-col">
              <div className="field">
                <label>Código postal</label>
                <input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} required />
              </div>
              <div className="field">
                <label>Colonia</label>
                <input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} required />
              </div>
            </div>
            <div className="field-row two-col">
              <div className="field">
                <label>Calle</label>
                <input value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} required />
              </div>
              <div className="field">
                <label>Número</label>
                <input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} required />
              </div>
            </div>
          </div>
        </div>

        <aside className="summary-card order-summary">
          <div className="summary-topline">
            <span className="eyebrow subdued">Pago</span>
          </div>
          <h3 style={{ marginTop: 0 }}>Pedido seguro</h3>
          <div className="secure-note">
            <strong>Pago seguro</strong>
            <div>Aceptamos PayPal, Apple Pay y Google Pay. Tus datos están protegidos con cifrado SSL.</div>
          </div>

          <p className="checkout-delivery-note">Envíos a México: la entrega es estimada y puede variar por procesamiento, paquetería, aduanas y destino.</p>

          <ExpressCheckout onSuccess={handleExpressSuccess} onError={setExpressError} checkoutData={checkoutData} disabled={!checkoutDetailsComplete || cartIsEmpty} />
          {expressError ? <p style={{ color: "#dc2626", fontSize: 14, margin: "8px 0" }} role="alert">{expressError}</p> : null}

          <div className="checkout-item-list">
            {items.map((item) => <div className="meta-row" key={`${item.id}-${item.color ?? "default"}-${item.size ?? "default"}`}>
              <span>{item.name}{item.color ? ` · ${item.color}` : ""}{item.size ? ` · Talla ${item.size}` : ""} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>)}
          </div>
          <div className="meta-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          {discount > 0 ? <div className="meta-row"><span>Descuento {couponCode ? `(${couponCode})` : ""}</span><span>-{formatPrice(discount)}</span></div> : null}
          <div className="meta-row"><span>Envío</span><span>{formatPrice(shipping)}</span></div>
          <div className="total-row"><span>Total</span><span>{formatPrice(total)}</span></div>
          <div style={{ marginTop: 18 }}>
            <button
              className="primary-button"
              style={{ width: "100%" }}
              type="submit"
              disabled={loading || cartIsEmpty || !checkoutDetailsComplete}
              onClick={() => {
                if (cartIsEmpty) {
                  alert("Tu carrito está vacío. Agrega un producto antes de pagar.");
                }
              }}
            >
              {loading ? "Procesando..." : "Pagar con PayPal"}
            </button>
          </div>
          <p className="checkout-terms">Al realizar tu pedido, confirmas que has revisado y aceptado nuestros <Link href="/terms">Términos y condiciones</Link>, <Link href="/shipping">Política de envíos</Link> y <Link href="/returns-policy">Política de devoluciones</Link>.</p>
          <div style={{ marginTop: 12 }}>
            <Link href="/returns-policy" className="ghost-button" style={{ width: "100%" }}>
              Política de devoluciones
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
