"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/components/locale-provider";

export default function ContactPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(t(data.error ?? "No se pudo enviar tu mensaje."));
      setStatus(t(data.message ?? "Recibimos tu mensaje."));
      setStatusSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : t("No se pudo enviar tu mensaje."));
      setStatusSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <span className="eyebrow subdued">{t("ATENCIÓN AL CLIENTE")}</span>
        <h1>{t("Estamos aquí para ayudarte.")}</h1>
        <p>{t("¿Tienes dudas sobre un pedido, producto o entrega? Nuestro equipo te responderá en un día hábil.")}</p>
      </div>

      <div className="contact-layout">
      <form className="form-card" onSubmit={submit}>
        <div className="field">
          <label>{t("Nombre")}</label><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("Tu nombre")} required minLength={2} maxLength={120} />
        </div>
        <div className="field">
          <label>{t("Email")}</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@email.com" required />
        </div>
        <div className="field">
          <label>{t("¿Cómo podemos ayudarte?")}</label><textarea rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={t("Cuéntanos tu duda o consulta sobre un pedido.")} required minLength={10} maxLength={4000} />
        </div>
        <button className="primary-button" style={{ width: "100%" }} disabled={submitting}>{submitting ? t("Enviando...") : t("Enviar mensaje")}</button>
        {status ? <p className={statusSuccess ? "success-box" : "error-box"}>{status}</p> : null}
      </form>
      <div className="contact-info"><h2>{t("Ayuda con pedidos")}</h2><p>{t("Usa el formulario para escribirnos; nuestro equipo te responderá en un día hábil.")}</p><p>{t("Lunes a viernes, 9:00–18:00")}</p><details><summary>{t("Dudas sobre envíos")}</summary><p>{t("Consulta la información de envíos y devoluciones para conocer los plazos y el seguimiento.")}</p></details><details><summary>{t("Devoluciones y cambios")}</summary><p>{t("Nuestro equipo puede ayudarte a tramitar una devolución elegible.")}</p></details></div>
      </div>
    </div>
  );
}
