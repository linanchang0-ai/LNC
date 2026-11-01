"use client";

import { useState } from "react";
import { parseAddressText, type AddressFields } from "@/lib/address-parser";

type AddressPasteAssistProps = {
  onRecognize: (address: AddressFields) => void;
};

export function AddressPasteAssist({ onRecognize }: AddressPasteAssistProps) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  function handleRecognize() {
    const address = parseAddressText(text);
    const recognizedCount = Object.values(address).filter(Boolean).length;

    if (!recognizedCount) {
      setMessage("No pudimos reconocer datos. Incluye nombre, teléfono y dirección.");
      return;
    }

    onRecognize(address);
    setMessage(`Completamos ${recognizedCount} campos. Revisa los datos antes de continuar.`);
  }

  return (
    <div className="address-paste-assist">
      <label htmlFor="address-paste">Pegar datos de dirección</label>
      <textarea
        id="address-paste"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Nombre, teléfono, calle, número, colonia, ciudad, estado y código postal"
        rows={3}
      />
      <button type="button" className="small-button" onClick={handleRecognize}>Reconocer dirección</button>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}