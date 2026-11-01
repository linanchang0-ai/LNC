"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart-provider";
import type { CheckoutDraftInput } from "@/components/ExpressCheckout";

type PayPalOfficialButtonsProps = {
  fundingSource?: string;
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  checkoutData: CheckoutDraftInput;
  disabled: boolean;
};

declare global {
  interface Window {
    // PayPal is provided by the official browser SDK.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any;
  }
}

export default function PayPalOfficialButtons({ fundingSource, onSuccess, onError, checkoutData, disabled }: PayPalOfficialButtonsProps) {
  const { items, couponCode } = useCart();
  const containerRef = useRef<HTMLDivElement>(null);
  const latestValuesRef = useRef({ items, couponCode, checkoutData, onSuccess, onError });

  useEffect(() => {
    latestValuesRef.current = { items, couponCode, checkoutData, onSuccess, onError };
  }, [items, couponCode, checkoutData, onSuccess, onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.paypal?.Buttons || latestValuesRef.current.items.length === 0) return;

    const config: Record<string, unknown> = {
      style: { layout: "vertical", height: 48, shape: "pill", label: fundingSource === "card" ? "pay" : "paypal" },
      createOrder: async () => {
        const { items: currentItems, couponCode: currentCouponCode, checkoutData: currentCheckoutData } = latestValuesRef.current;
        const response = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: currentItems.map((item) => ({ id: item.id, color: item.color, size: item.size, quantity: item.quantity })), currency: "MXN", orderId: `ts-${Date.now()}`, couponCode: currentCouponCode, ...currentCheckoutData }),
        });
        if (!response.ok) throw new Error("No se pudo iniciar el pago.");
        const data = await response.json() as { id?: string };
        if (!data.id) throw new Error("PayPal no devolvió un ID de orden.");
        return data.id;
      },
      onApprove: async (data: { orderID: string }) => {
        const currentItems = latestValuesRef.current.items;
        const response = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID, items: currentItems.map((item) => ({ productId: String(item.id), productName: item.name, size: item.size, price: item.price, quantity: item.quantity })) }),
        });
        if (!response.ok) throw new Error("No se pudo confirmar el pago.");
        latestValuesRef.current.onSuccess(data.orderID);
      },
      onCancel: () => undefined,
      onError: (error: Error) => latestValuesRef.current.onError(error.message || "El pago no pudo completarse."),
    };

    if (fundingSource) config.fundingSource = fundingSource;
    const buttons = window.paypal.Buttons(config);
    void buttons.render(container).catch((error: Error) => latestValuesRef.current.onError(error.message || "Este método de pago no está disponible."));

    return () => {
      void buttons.close?.();
    };
  }, [fundingSource, items.length]);

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <div
        className="paypal-official-buttons notranslate"
        lang="es-MX"
        translate="no"
        ref={containerRef}
        aria-label={fundingSource === "card" ? "Debit or credit card payment" : "PayPal payment"}
        style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
      />
      {disabled ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.7)",
            fontSize: 12,
            color: "#6b7280",
            borderRadius: 8,
            zIndex: 10,
          }}
        >
          Completa los datos de envío para activar
        </div>
      ) : null}
    </div>
  );
}
