"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";

type HeroMoment = "manana" | "mediodia" | "atardecer" | "noche";

const moments: Record<HeroMoment, { desktop: string; mobile: string }> = {
  manana: { desktop: "/hero/manana-desktop.webp", mobile: "/hero/manana-mobile.webp" },
  mediodia: { desktop: "/hero/mediodia-desktop.webp", mobile: "/hero/mediodia-mobile.webp" },
  atardecer: { desktop: "/hero/atardecer-desktop.webp", mobile: "/hero/atardecer-mobile.webp" },
  noche: { desktop: "/hero/noche-desktop.webp", mobile: "/hero/noche-mobile.webp" },
};

function getMexicoCityMoment(date = new Date()): HeroMoment {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date));
  if (hour >= 6 && hour < 12) return "manana";
  if (hour >= 12 && hour < 17) return "mediodia";
  if (hour >= 17 && hour < 21) return "atardecer";
  return "noche";
}

function HeroImage({ moment, active, priority }: { moment: HeroMoment; active: boolean; priority: boolean }) {
  const sources = moments[moment];
  return (
    <picture className={`time-hero-image${active ? " is-active" : ""}`}>
      <source media="(max-width: 767px)" srcSet={sources.mobile} />
      <img src={sources.desktop} alt="" fetchPriority={priority ? "high" : "low"} />
    </picture>
  );
}

export function TimeAwareHero() {
  const { t } = useI18n();
  const [currentMoment, setCurrentMoment] = useState<HeroMoment>("noche");
  const [previousMoment, setPreviousMoment] = useState<HeroMoment | null>(null);

  useEffect(() => {
    const updateMoment = () => {
      const nextMoment = getMexicoCityMoment();
      setCurrentMoment((current) => {
        if (current === nextMoment) return current;
        setPreviousMoment(current);
        return nextMoment;
      });
    };
    updateMoment();
    const interval = window.setInterval(updateMoment, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const preload = window.setTimeout(() => {
      Object.entries(moments).forEach(([moment, sources]) => {
        if (moment === currentMoment) return;
        const image = new Image();
        image.src = window.matchMedia("(max-width: 767px)").matches ? sources.mobile : sources.desktop;
      });
    }, 1_500);
    return () => window.clearTimeout(preload);
  }, [currentMoment]);

  useEffect(() => {
    if (!previousMoment) return;
    const removePrevious = window.setTimeout(() => setPreviousMoment(null), 1_200);
    return () => window.clearTimeout(removePrevious);
  }, [previousMoment]);

  return (
    <section className="hero time-hero">
      {previousMoment ? <HeroImage moment={previousMoment} active={false} priority={false} /> : null}
      <HeroImage moment={currentMoment} active priority />
      <div className="hero-overlay" />
      <div className="container-shell hero-content">
        <div className="hero-copy">
          <span className="eyebrow subdued">{t("LNC SPORTS · CAMISETAS DE FÚTBOL")}</span>
          <h1>{t("Tu camiseta de la Selección, lista para el partido.")}</h1>
          <p>{t("Camisetas de fútbol con tallas S–4XL, envío a todo México y pago seguro.")}</p>
          <div className="hero-actions">
            <Link href="/shop" className="primary-button">{t("Explorar colección")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}