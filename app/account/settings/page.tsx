"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

export default function AccountSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/account?resource=profile").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setFullName(data.fullName); setPhone(data.phone); setEmail(data.email); }).catch((error: Error) => setMessage(error.message)); }, []);
  const save = async (event: FormEvent) => { event.preventDefault(); setMessage(""); const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, phone }) }); const data = await response.json() as { error?: string }; setMessage(response.ok ? "Cambios guardados." : data.error ?? "No se pudieron guardar los cambios."); };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account" className="ghost-button">Volver a mi cuenta</Link>
        <h1>Datos personales</h1>
        <p>Actualiza tus datos básicos y preferencias de contacto.</p>
      </div>

      <form className="form-card" style={{ maxWidth: 640 }} onSubmit={save}>
        <div className="field">
          <label>Nombre completo</label>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} disabled />
        </div>
        <div className="field"><label>Teléfono</label><input value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        {message ? <p className={message === "Cambios guardados." ? "success-box" : "error-box"}>{message}</p> : null}
        <button className="primary-button" style={{ width: "100%" }}>Guardar cambios</button>
      </form>
    </div>
  );
}
