"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { translateText } from "@/lib/i18n";

export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const { locale: selectedLocale } = useI18n();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/admin") ? "zh" : selectedLocale;
  const t = (text: string) => translateText(locale, text);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(t(data.error ?? "No se pudo completar la suscripción."));
      setMessage(t(data.message ?? "Suscripción completada."));
      setEmail("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("No se pudo completar la suscripción."));
    } finally {
      setSubmitting(false);
    }
  };

  return <form className={compact ? "footer-newsletter-form" : "newsletter-form"} onSubmit={submit}>
    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("Tu correo electrónico")} aria-label={t("Correo electrónico")} required />
    <button type="submit" className={compact ? undefined : "primary-button"} disabled={submitting}>{submitting ? t("Enviando...") : t("Suscribirme")}</button>
    {message ? <span className="newsletter-message" role="status">{message}</span> : null}
  </form>;
}