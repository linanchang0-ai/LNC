"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("lnc-sports:cookie-choice", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("lnc-sports:cookie-choice", onStoreChange);
  };
};

const getSnapshot = () => window.localStorage.getItem("lnc_sports_cookie_consent") === "true";
const getServerSnapshot = () => true;

export function CookieConsent() {
  const pathname = usePathname();
  const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const choose = (value: string) => {
    window.localStorage.setItem("lnc_sports_cookie_consent", "true");
    window.dispatchEvent(new CustomEvent("lnc-sports:cookie-choice", { detail: value }));
  };
  if (pathname?.startsWith("/admin") || hasConsent) return null;
  return <aside className="cookie-consent" aria-label="Consentimiento de cookies"><div><strong>Tu privacidad, con claridad.</strong><p>Usamos cookies esenciales para que LNC SPORTS funcione y cookies opcionales para entender mejor a nuestros clientes.</p></div><div className="cookie-actions"><button type="button" onClick={() => choose("accept")} className="primary-button">Aceptar</button><button type="button" onClick={() => choose("reject")} className="ghost-button">Rechazar</button></div></aside>;
}
