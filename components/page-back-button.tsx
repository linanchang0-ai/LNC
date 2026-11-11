"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";

const pagesWithExistingBackLink = new Set([
  "/order-lookup",
  "/account",
  "/account/addresses",
  "/account/favorites",
  "/account/orders",
  "/account/settings",
]);

function getFallbackPath(pathname: string) {
  if (pathname.startsWith("/category/") || pathname.startsWith("/products/") || pathname === "/cart") return "/shop";
  if (pathname === "/checkout") return "/cart";
  if (pathname.startsWith("/account/")) return "/account";
  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname === "/auth/callback") return "/login";
  return "/";
}

export function PageBackButton() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const hasExistingBackLink = pagesWithExistingBackLink.has(pathname) || pathname.startsWith("/account/orders/");
  if (pathname === "/" || pathname.startsWith("/admin") || hasExistingBackLink || pathname.startsWith("/products/")) return null;

  const handleBack = () => {
    const referrer = document.referrer;
    if (window.history.length > 1 && referrer && new URL(referrer).origin === window.location.origin) {
      router.back();
      return;
    }

    router.push(getFallbackPath(pathname));
  };

  return (
    <div className="container-shell page-back-wrap">
      <button type="button" className="back-button" onClick={handleBack}>{t("Volver")}</button>
    </div>
  );
}
