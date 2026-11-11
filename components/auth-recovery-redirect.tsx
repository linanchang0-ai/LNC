"use client";

import { useEffect } from "react";

export function AuthRecoveryRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/auth/callback") return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.get("type") || !hash.get("access_token")) return;
    window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}