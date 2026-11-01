"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.name} ${form.lastName}`.trim(),
          email: form.email,
          password: form.password,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; requiresEmailConfirmation?: boolean };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "No pudimos crear la cuenta.");
        return;
      }

      if (data.requiresEmailConfirmation) {
        router.push(`/login?notice=${encodeURIComponent("Revisa tu correo para confirmar tu cuenta.")}`);
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("No pudimos crear la cuenta. Inténtalo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <h1>Crear cuenta</h1>
      </div>

      <form className="form-card" style={{ maxWidth: 540, margin: "0 auto" }} onSubmit={handleSubmit}>
        <div className="field">
          <label>Nombre</label>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div className="field">
          <label>Apellido</label>
          <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </div>
        {error ? <div className="error-box">{error}</div> : null}
        <button className="primary-button" style={{ width: "100%" }} disabled={loading} type="submit">
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <div style={{ marginTop: 12 }}>
          <Link href="/login" className="ghost-button" style={{ width: "100%" }}>Ya tengo cuenta</Link>
        </div>
      </form>
    </div>
  );
}
