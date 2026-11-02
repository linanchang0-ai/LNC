"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/locale-provider";

export default function ReturnsPage() {
  const { t } = useI18n();
  const [orderNumber, setOrderNumber] = useState("");
  const [reason, setReason] = useState("Producto defectuoso");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submitReturn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, reason, description }) });
      const data = await response.json() as { message?: string; error?: string };
      setMessage(t(response.ok ? data.message ?? "Solicitud enviada." : data.error ?? "No se pudo enviar la solicitud."));
      if (response.ok) setDescription("");
    } catch {
      setMessage(t("No se pudo enviar la solicitud."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>{t("Solicitar devolución")}</h1>
        <p>{t("Consulta la solicitud de devolución y sigue el proceso.")}</p>
      </div>

      <form className="form-card" style={{ maxWidth: 680, margin: "0 auto" }} onSubmit={submitReturn}>
        <div className="field">
          <label>{t("Número de pedido")}</label>
          <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="TS-..." required />
        </div>
        <div className="field">
          <label>{t("Motivo")}</label>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="Producto defectuoso">{t("Producto defectuoso")}</option>
            <option value="Producto dañado">{t("Producto dañado")}</option>
            <option value="Producto incorrecto">{t("Producto incorrecto")}</option>
            <option value="Ya no lo necesito">{t("Ya no lo necesito")}</option>
            <option value="Otro">{t("Otro")}</option>
          </select>
        </div>
        <div className="field">
          <label>{t("Descripción")}</label>
          <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} required />
        </div>
        {message ? <p className={message.includes("No se pudo") ? "error-box" : "muted"} style={{ marginBottom: 12 }}>{message}</p> : null}
        <button className="primary-button" style={{ width: "100%" }} disabled={loading}>{loading ? t("Enviando...") : t("Enviar solicitud")}</button>
      </form>
    </div>
  );
}
