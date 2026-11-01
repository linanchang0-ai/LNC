"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const noticeFromUrl = new URLSearchParams(window.location.search).get("notice") ?? "";
    if (noticeFromUrl) startTransition(() => setNotice(noticeFromUrl));
  }, []);

  const resendConfirmation = async () => {
    if (!email.trim()) {
      setError("Escribe tu email para reenviar la confirmación.");
      return;
    }
    setResending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "No se pudo reenviar el enlace.");
        return;
      }
      setNotice(data.message ?? "Revisa tu correo para confirmar tu cuenta.");
    } catch {
      setError("No se pudo reenviar el enlace. Inténtalo más tarde.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; user?: { email?: string; name?: string } };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "No pudimos iniciar sesión.");
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>Iniciar sesión</h1>
      </div>

      <form className="form-card" style={{ maxWidth: 540, margin: "0 auto" }} onSubmit={handleSubmit} autoComplete="on">
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </div>
        {notice ? <div className="success-box">{notice}</div> : null}
        {error ? <div className="error-box">{error}</div> : null}
        <button className="primary-button" style={{ width: "100%" }} disabled={loading} type="submit">
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <Link href="/register" className="ghost-button" style={{ width: "100%" }}>Crear cuenta</Link>
          <Link href="/forgot-password" className="ghost-button" style={{ width: "100%" }}>Recuperar contraseña</Link>
          <button type="button" className="ghost-button" onClick={() => void resendConfirmation()} disabled={resending}>{resending ? "Reenviando confirmación..." : "Reenviar confirmación"}</button>
        </div>
      </form>
    </div>
  );
}
