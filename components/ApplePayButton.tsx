"use client";

import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/components/cart-provider";
import { confirmPayPalOrderCapture } from "@/lib/paypal-capture";
import type { CheckoutDraftInput } from "@/components/ExpressCheckout";

declare class ApplePaySession {
  static canMakePayments(): boolean;
  static STATUS_SUCCESS: number;
  static STATUS_FAILURE: number;
  constructor(version: number, request: Record<string, unknown>);
  begin(): void;
  completeMerchantValidation(merchantSession: unknown): void;
  completePayment(status: number): void;
  abort(): void;
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
  onpaymentauthorized: ((event: { payment: { token: unknown; billingContact: unknown } }) => void) | null;
  oncancel: (() => void) | null;
}

declare global {
  interface Window {
    ApplePaySession?: typeof ApplePaySession;
  }
}

type PayPalApplePay = {
  config: () => Promise<{
    isEligible?: boolean;
    countryCode?: string;
    merchantCapabilities?: string[];
    supportedNetworks?: string[];
  }>;
  validateMerchant: (request: { validationUrl: string; displayName: string }) => Promise<{ merchantSession: unknown }>;
  confirmOrder: (request: { orderId: string; token: unknown; billingContact: unknown }) => Promise<{ status: string }>;
};

type PayPalApplePaySdk = {
  Applepay?: () => PayPalApplePay;
};

function getPayPalApplePaySdk() {
  return (window as Window & { paypal?: PayPalApplePaySdk }).paypal;
}

interface ApplePayButtonProps {
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  checkoutData: CheckoutDraftInput;
  disabled: boolean;
}

export default function ApplePayButton({ onSuccess, onError, checkoutData, disabled }: ApplePayButtonProps) {
  const { items, subtotal, shipping, total, couponCode } = useCart();
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkEligibility = async () => {
      if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
        return;
      }
      const applepayFactory = getPayPalApplePaySdk()?.Applepay;
      if (!applepayFactory) {
        return;
      }
      try {
        const config = await applepayFactory().config();
        if (!cancelled && config.isEligible) {
          setIsEligible(true);
        }
      } catch {
        // Apple Pay not eligible
      }
    };

    checkEligibility();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePayment = useCallback(async () => {
    const ApplePaySessionConstructor = (window as Window & { ApplePaySession?: typeof ApplePaySession }).ApplePaySession;
    const applepayFactory = getPayPalApplePaySdk()?.Applepay;
    if (!ApplePaySessionConstructor || !applepayFactory) return;

    setLoading(true);
    try {
      const applepay = applepayFactory();
      const config = await applepay.config();

      const paymentRequest = {
        countryCode: config.countryCode || "MX",
        merchantCapabilities: config.merchantCapabilities || ["supports3DS"],
        supportedNetworks: config.supportedNetworks || ["visa", "masterCard", "amex"],
        currencyCode: "MXN",
        requiredShippingContactFields: ["name", "phone", "email", "postalAddress"],
        requiredBillingContactFields: ["postalAddress"],
        total: {
          label: "LNC SPORTS",
          type: "final" as const,
          amount: total.toFixed(2),
        },
        lineItems: [
          {
            label: "Subtotal",
            amount: subtotal.toFixed(2),
            type: "final" as const,
          },
          {
            label: "Envío",
            amount: shipping.toFixed(2),
            type: "final" as const,
          },
        ],
      };

      const session = new ApplePaySessionConstructor(4, paymentRequest);

      session.onvalidatemerchant = async (event) => {
        try {
          const validateResult = await applepay.validateMerchant({
            validationUrl: event.validationURL,
            displayName: "LNC SPORTS",
          });
          session.completeMerchantValidation(validateResult.merchantSession);
        } catch {
          session.abort();
          onError("Falló la validación de Apple Pay.");
        }
      };

      session.onpaymentauthorized = async (event) => {
        try {
          // Create order on server
          const orderId = `ts-${Date.now()}`;
          const createResponse = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: items.map((item) => ({ id: item.id, color: item.color, size: item.size, quantity: item.quantity })),
              currency: "MXN",
              orderId,
              couponCode,
              ...checkoutData,
            }),
          });

          if (!createResponse.ok) {
            throw new Error("No se pudo crear la orden");
          }

          const createData = await createResponse.json();
          const paypalOrderId = createData.id || orderId;

          // Confirm order with Apple Pay token
          const confirmResult = await applepay.confirmOrder({
            orderId: paypalOrderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact,
          });

          if (confirmResult.status !== "APPROVED") {
            throw new Error("El pago no fue aprobado");
          }

          // Capture order
          const orderNumber = await confirmPayPalOrderCapture(paypalOrderId);
          session.completePayment(ApplePaySessionConstructor.STATUS_SUCCESS);
          onSuccess(orderNumber);
        } catch (err) {
          session.completePayment(ApplePaySessionConstructor.STATUS_FAILURE);
          onError(err instanceof Error ? err.message : "Error en el pago con Apple Pay");
        }
      };

      session.oncancel = () => {
        setLoading(false);
      };

      session.begin();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo iniciar Apple Pay");
      setLoading(false);
    }
  }, [checkoutData, couponCode, items, subtotal, shipping, total, onSuccess, onError]);

  if (!isEligible) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={handlePayment}
        disabled={disabled || loading || items.length === 0}
        style={{
          width: "100%",
          height: 48,
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 500,
          cursor: loading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled || items.length === 0 ? 0.5 : 1,
        }}
        aria-label="Pagar con Apple Pay"
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">
          <path d="M13.5 10.5c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.7.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.4zM11.3 3.1c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.6 1 .1 2-.5 2.6-1.2z" />
        </svg>
        {loading ? "Procesando..." : "Pagar con Apple Pay"}
      </button>
    </div>
  );
}
