import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { siteConfig } from "@/lib/site-config";
import { CartProvider } from "@/components/cart-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { AuthRecoveryRedirect } from "@/components/auth-recovery-redirect";
import MetaPixel from "@/components/MetaPixel";
import { PageBackButton } from "@/components/page-back-button";

export const metadata: Metadata = {
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  metadataBase: new URL(siteConfig.siteUrl),
  openGraph: {
    title: siteConfig.meta.title,
    description: siteConfig.meta.description,
    url: siteConfig.siteUrl,
    siteName: "LNC SPORTS",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.meta.title,
    description: siteConfig.meta.description,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body>
        <MetaPixel />
        <CartProvider>
          <AuthRecoveryRedirect />
          <div className="shell">
            <Header />
            <main className="page-wrap">
              <PageBackButton />
              {children}
            </main>
            <Footer />
            <CookieConsent />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
