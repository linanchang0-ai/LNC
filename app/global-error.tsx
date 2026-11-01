"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body>
        <main className="container-shell" style={{ padding: "64px 0" }}>
          <div className="form-card" style={{ maxWidth: 620 }}>
            <h1>Ocurrió un problema</h1>
            <p className="muted">No pudimos cargar esta página. Intenta actualizarla o vuelve más tarde.</p>
          </div>
        </main>
      </body>
    </html>
  );
}