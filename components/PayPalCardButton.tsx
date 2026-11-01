"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";

interface PayPalCardButtonProps {
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  fundingSource?: "CARD" | "PAYPAL";
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any;
  }
}

export default function PayPalCardButton({ onSuccess, onError, fundingSource: requestedFundingSource = "CARD" }: PayPalCardButtonProps) {
  const { items } = useCart();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !window.paypal?.Buttons || items.length === 0) return;
    const container = containerRef.current;
    container.replaceChildren();
    const fundingSource = window.paypal?.FUNDING?.[requestedFundingSource];
    if (!fundingSource) return;

    const button = window.paypal.Buttons({
      fundingSource,
      style: { layout: "vertical", height: 48, shape: "pill", label: "pay" },
      createOrder: async () => {
        setLoading(true);
        const response = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: items.map((item) => ({ id: item.id, color: item.color, size: item.size, quantity: item.quantity })), currency: "MXN", orderId: `ts-${Date.now()}` }),
        });
        if (!response.ok) throw new Error("No se pudo iniciar el pago con tarjeta.");
        const data = await response.json();
        return data.id;
      },
      onApprove: async (data: { orderID: string }) => {
        const response = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID, items: items.map((item) => ({ productId: String(item.id), productName: item.name, size: item.size, price: item.price, quantity: item.quantity })) }),
        });
        if (!response.ok) throw new Error("No se pudo confirmar el pago con tarjeta.");
        setLoading(false);
        onSuccess(data.orderID);
      },
      onCancel: () => setLoading(false),
      onError: (error: Error) => {
        setLoading(false);
        onError(error.message || "El pago con tarjeta no pudo completarse.");
      },
    });

    void button.render(container).catch((error: Error) => onError(error.message || "No se pudo mostrar el pago con tarjeta."));
    return () => container.replaceChildren();
  }, [items, onError, onSuccess, requestedFundingSource]);

  return <div className={`paypal-card-button paypal-${requestedFundingSource.toLowerCase()}-button`}><div ref={containerRef} aria-label={requestedFundingSource === "CARD" ? "Debit or credit card payment" : "PayPal payment"} />{loading ? <span className="paypal-card-loading">Processing payment...</span> : null}</div>;
}
