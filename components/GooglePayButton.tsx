"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCart } from "@/components/cart-provider";
import type { CheckoutDraftInput } from "@/components/ExpressCheckout";

type GooglePayPaymentData = {
  paymentMethodData: unknown;
  email?: string;
  shippingAddress?: unknown;
};

type GooglePayClient = {
  isReadyToPay: (request: Record<string, unknown>) => Promise<{ result: boolean }>;
  loadPaymentData: (request: Record<string, unknown>) => Promise<unknown>;
};

type GooglePaySdk = {
  payments?: {
    api?: {
      PaymentsClient: new (options: {
        environment: "PRODUCTION" | "TEST";
        paymentDataCallbacks: {
          onPaymentAuthorized: (paymentData: GooglePayPaymentData) => Promise<{ transactionState: "SUCCESS" | "ERROR"; error?: { intent: string; message: string } }>;
        };
      }) => GooglePayClient;
    };
  };
};

type PayPalGooglePay = {
  config: () => Promise<{ allowedPaymentMethods: unknown; merchantInfo?: unknown }>;
  confirmOrder: (request: { orderId: string; paymentMethodData: unknown; email?: string; shippingAddress?: unknown }) => Promise<{ status: string }>;
  initiatePayerAction: (request: { orderId: string }) => Promise<unknown>;
};

type PayPalGooglePaySdk = {
  Googlepay?: () => PayPalGooglePay;
};

function getGooglePaySdk() {
  return (window as Window & { google?: GooglePaySdk }).google;
}

function getPayPalGooglePaySdk() {
  return (window as Window & { paypal?: PayPalGooglePaySdk }).paypal;
}

interface GooglePayButtonProps {
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  checkoutData: CheckoutDraftInput;
  disabled: boolean;
}

const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
};

export default function GooglePayButton({ onSuccess, onError, checkoutData, disabled }: GooglePayButtonProps) {
  const { items, total, couponCode } = useCart();
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState<GooglePayClient | null>(null);

  const processPayment = useCallback(
    async (paymentData: GooglePayPaymentData) => {
      try {
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

        const googlePay = getPayPalGooglePaySdk()?.Googlepay?.();
        if (!googlePay) throw new Error("Google Pay no está disponible.");
        const confirmResult = await googlePay.confirmOrder({
          orderId: paypalOrderId,
          paymentMethodData: paymentData.paymentMethodData,
          email: paymentData.email,
          shippingAddress: paymentData.shippingAddress,
        });

        if (confirmResult.status === "PAYER_ACTION_REQUIRED") {
          await googlePay.initiatePayerAction({ orderId: paypalOrderId });
        }

        if (confirmResult.status !== "APPROVED" && confirmResult.status !== "PAYER_ACTION_REQUIRED") {
          throw new Error("El pago no fue aprobado");
        }

        const captureResponse = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: paypalOrderId }),
        });

        if (!captureResponse.ok) {
          throw new Error("No se pudo capturar el pago");
        }

        onSuccess(paypalOrderId);
        return { transactionState: "SUCCESS" };
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error en el pago con Google Pay");
        return {
          transactionState: "ERROR",
          error: {
            intent: "PAYMENT_AUTHORIZATION",
            message: err instanceof Error ? err.message : "Transaction failed",
          },
        };
      }
    },
    [checkoutData, couponCode, items, onSuccess, onError],
  );
  const processPaymentRef = useRef(processPayment);

  useEffect(() => {
    processPaymentRef.current = processPayment;
  }, [processPayment]);

  useEffect(() => {
    let cancelled = false;

    const checkEligibility = async () => {
      const google = getGooglePaySdk();
      const paypalGooglePay = getPayPalGooglePaySdk()?.Googlepay;
      const PaymentsClient = google?.payments?.api?.PaymentsClient;
      if (!PaymentsClient || !paypalGooglePay) return;

      try {
        const googlePayConfig = await paypalGooglePay().config();
        const client = new PaymentsClient({
          environment: process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production" ? "PRODUCTION" : "TEST",
          paymentDataCallbacks: {
            onPaymentAuthorized: (paymentData: GooglePayPaymentData) => processPaymentRef.current(paymentData),
          },
        });
        const response = await client.isReadyToPay({
          ...baseRequest,
          allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
        });
        if (!cancelled && response.result) {
          setPaymentsClient(client);
          setIsEligible(true);
        }
      } catch {
        if (!cancelled) setIsEligible(false);
      }
    };

    void checkEligibility();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = useCallback(async () => {
    const paypalGooglePay = getPayPalGooglePaySdk()?.Googlepay;
    if (!paymentsClient || !paypalGooglePay) return;

    setLoading(true);
    try {
      const googlePayConfig = await paypalGooglePay().config();

      const paymentDataRequest = {
        ...baseRequest,
        allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
        merchantInfo: googlePayConfig.merchantInfo,
        transactionInfo: {
          currencyCode: "MXN",
          totalPriceStatus: "FINAL",
          totalPrice: total.toFixed(2),
        },
        callbackIntents: ["PAYMENT_AUTHORIZATION"],
        emailRequired: true,
        shippingAddressRequired: true,
      };

      await paymentsClient.loadPaymentData(paymentDataRequest);
    } catch (err) {
      const statusCode = typeof err === "object" && err !== null && "statusCode" in err ? err.statusCode : undefined;
      if (statusCode !== "CANCELED") {
        onError(err instanceof Error ? err.message : "No se pudo iniciar Google Pay");
      }
    } finally {
      setLoading(false);
    }
  }, [paymentsClient, total, onError]);

  if (!isEligible) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={handleClick}
        disabled={disabled || loading || items.length === 0}
        style={{
          width: "100%",
          height: 48,
          backgroundColor: "#fff",
          color: "#1f1f1f",
          border: "1px solid #dadce0",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 500,
          cursor: loading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: disabled || items.length === 0 ? 0.5 : 1,
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}
        aria-label="Pagar con Google Pay"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
        </svg>
        {loading ? "Procesando..." : "Pagar con Google Pay"}
      </button>
    </div>
  );
}
