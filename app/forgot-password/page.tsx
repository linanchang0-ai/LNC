"use client";

import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          next: new URLSearchParams(window.location.search).get("next") === "/admin/set-password" ? "/admin/set-password" : undefined,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "No pudimos enviar el enlace.");
        return;
      }

      setMessage(data.message ?? "Revisa tu correo para recuperar tu acceso.");
    } catch {
      setError("No pudimos enviar el enlace. Inténtalo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>Recuperar contraseña</h1>
        <p>Te enviaremos un enlace para restablecer tu acceso.</p>
      </div>

      <form className="form-card" style={{ maxWidth: 540, margin: "0 auto" }} onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {error ? <div className="error-box">{error}</div> : null}
        {message ? <div className="success-box">{message}</div> : null}
        <button className="primary-button" style={{ width: "100%" }} disabled={loading} type="submit">
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
    </div>
  );
}
