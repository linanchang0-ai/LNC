"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Verificando tu enlace seguro...");

  useEffect(() => {
    const completeAuth = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const requestedNext = url.searchParams.get("next");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        setMessage("No se pudo configurar la autenticación.");
        return;
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") ?? hash.get("type");
      const otpType = type === "recovery" || type === "signup" ? type : null;
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : tokenHash && otpType
            ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
          : await supabase.auth.getSession();

      if (error) {
        setMessage("El enlace expiró o no es válido. Solicita uno nuevo.");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setMessage("No se pudo verificar tu sesión. Solicita un nuevo enlace.");
        return;
      }
      const adminSession = await fetch("/api/admin/session").then((response) => response.ok ? response.json() as Promise<{ authenticated?: boolean }> : null).catch(() => null);
      const next = requestedNext ?? (type === "recovery"
        ? adminSession?.authenticated ? "/admin/set-password" : "/account/set-password"
        : adminSession?.authenticated ? "/admin" : "/account");
      window.location.replace(next);
    };

    void completeAuth();
  }, []);

  return <div className="container-shell" style={{ padding: "56px 0 80px" }}><p className="muted">{message}</p></div>;
}