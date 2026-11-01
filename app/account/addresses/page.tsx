"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddressPasteAssist } from "@/components/address-paste-assist";
import type { AddressFields } from "@/lib/address-parser";

export default function AddressesPage() {
  const [recognizedAddress, setRecognizedAddress] = useState<AddressFields | null>(null);
  const [addresses, setAddresses] = useState<{ id: string; state: string; city: string; postal_code: string; neighborhood: string | null; street: string; number: string }[]>([]);
  const [message, setMessage] = useState("");

  const loadAddresses = () => fetch("/api/account?resource=addresses").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setAddresses(data.items); }).catch((error: Error) => setMessage(error.message));
  useEffect(() => { void loadAddresses(); }, []);

  const saveAddress = async () => {
    if (!recognizedAddress) return;
    setMessage("");
    const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recognizedAddress) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setMessage(data.error ?? "No se pudo guardar la dirección."); return; }
    setRecognizedAddress(null);
    await loadAddresses();
  };

  return (
    <div className="container-shell" style={{ padding: "24px 0 40px" }}>
      <div className="page-hero">
        <Link href="/account" className="ghost-button">Volver a mi cuenta</Link>
        <h1>Mis direcciones</h1>
        <p>Gestiona tus ubicaciones de entrega para futuras compras.</p>
      </div>

      <div className="list">
        <div className="form-card">
          <AddressPasteAssist onRecognize={setRecognizedAddress} />
          {recognizedAddress ? (
            <div className="recognized-address">
              <strong>{recognizedAddress.name || "Nueva dirección"}</strong>
              <span>{[recognizedAddress.street, recognizedAddress.number].filter(Boolean).join(" ")}</span>
              <span>{[recognizedAddress.neighborhood, recognizedAddress.city, recognizedAddress.state, recognizedAddress.postalCode].filter(Boolean).join(", ")}</span>
              {recognizedAddress.phone ? <span>{recognizedAddress.phone}</span> : null}
              <button className="small-button" type="button" onClick={() => void saveAddress()}>Guardar dirección</button>
            </div>
          ) : null}
        </div>
        <div className="form-card">{addresses.length === 0 ? <p className="muted">Aún no tienes direcciones guardadas.</p> : addresses.map((address) => <div className="meta-row" key={address.id}><span>{[address.street, address.number].join(" ")}</span><span>{[address.neighborhood, address.city, address.state, address.postal_code].filter(Boolean).join(", ")}</span></div>)}</div>
        {message ? <p className="error-box">{message}</p> : null}
      </div>
    </div>
  );
}
