"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar tu mensaje.");
      setStatus(data.message ?? "Recibimos tu mensaje.");
      setForm({ name: "", email: "", message: "" });
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : "No se pudo enviar tu mensaje.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <span className="eyebrow subdued">ATENCIÓN AL CLIENTE</span>
        <h1>Estamos aquí para ayudarte.</h1>
        <p>¿Tienes dudas sobre un pedido, producto o entrega? Nuestro equipo te responderá en un día hábil.</p>
      </div>

      <div className="contact-layout">
      <form className="form-card" onSubmit={submit}>
        <div className="field">
          <label>Nombre</label><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tu nombre" required minLength={2} maxLength={120} />
        </div>
        <div className="field">
          <label>Email</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@email.com" required />
        </div>
        <div className="field">
          <label>¿Cómo podemos ayudarte?</label><textarea rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Cuéntanos tu duda o consulta sobre un pedido." required minLength={10} maxLength={4000} />
        </div>
        <button className="primary-button" style={{ width: "100%" }} disabled={submitting}>{submitting ? "Enviando..." : "Enviar mensaje"}</button>
        {status ? <p className={status.includes("Recibimos") ? "success-box" : "error-box"}>{status}</p> : null}
      </form>
      <div className="contact-info"><h2>Ayuda con pedidos</h2><p>Usa el formulario para escribirnos; nuestro equipo te responderá en un día hábil.</p><p>Lunes a viernes, 9:00–18:00</p><details><summary>Dudas sobre envíos</summary><p>Consulta la información de envíos y devoluciones para conocer los plazos y el seguimiento.</p></details><details><summary>Devoluciones y cambios</summary><p>Nuestro equipo puede ayudarte a tramitar una devolución elegible.</p></details></div>
      </div>
    </div>
  );
}
