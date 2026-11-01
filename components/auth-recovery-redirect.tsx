"use client";

import { useEffect } from "react";

export function AuthRecoveryRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.get("type") || !hash.get("access_token")) return;
    window.location.replace(`/auth/callback${window.location.hash}`);
  }, []);

  return null;
}