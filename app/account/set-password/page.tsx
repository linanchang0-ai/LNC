"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SetCustomerPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la contraseña.");
        return;
      }
      router.replace("/account");
      router.refresh();
    } catch {
      setError("No se pudo guardar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="container-shell" style={{ padding: "56px 0 80px" }}><div className="form-shell" style={{ maxWidth: 480, margin: "0 auto" }}><form className="form-card" onSubmit={submit}><h1>Restablece tu contraseña</h1><p className="muted">Elige una nueva contraseña para acceder a tu cuenta.</p><div className="field"><label>Nueva contraseña</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /></div><div className="field"><label>Confirmar contraseña</label><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={10} required /></div>{error ? <p className="error-box">{error}</p> : null}<button className="primary-button" type="submit" style={{ width: "100%" }} disabled={loading}>{loading ? "Guardando..." : "Guardar contraseña"}</button></form></div></div>;
}