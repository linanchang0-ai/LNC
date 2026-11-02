"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent, type TransitionEvent } from "react";
import type { HomepageSlide } from "@/lib/homepage-slides";
import { TimeAwareHero } from "@/components/time-aware-hero";
import { useI18n } from "@/components/locale-provider";

type CarouselPointer = { id: number; startX: number; startY: number };

export function HomepageCarousel({ slides, intervalSeconds }: { slides: HomepageSlide[]; intervalSeconds: number }) {
  const key = slides.map((slide) => slide.id).join(":");
  return <HomepageCarouselTrack key={key} slides={slides} intervalSeconds={intervalSeconds} />;
}

function HomepageCarouselTrack({ slides, intervalSeconds }: { slides: HomepageSlide[]; intervalSeconds: number }) {
  const { t } = useI18n();
  const hasMultipleSlides = slides.length > 1;
  const [trackIndex, setTrackIndex] = useState(hasMultipleSlides ? 1 : 0);
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<CarouselPointer | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!hasMultipleSlides) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return;
    const interval = window.setTimeout(() => setTrackIndex((current) => current + 1), intervalSeconds * 1000);
    return () => window.clearTimeout(interval);
  }, [hasMultipleSlides, intervalSeconds, slides.length, trackIndex]);

  if (!slides.length) return <TimeAwareHero />;

  const displaySlides = hasMultipleSlides
    ? [slides[slides.length - 1], ...slides, slides[0]]
    : slides;

  const finishTransition = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    if (!hasMultipleSlides || (trackIndex > 0 && trackIndex < slides.length + 1)) return;

    const resetIndex = trackIndex === 0 ? slides.length : 1;
    const track = trackRef.current;
    if (track) {
      track.style.transition = "none";
      track.style.transform = `translateX(-${resetIndex * 100}%)`;
      void track.offsetWidth;
      track.style.transition = "";
    }
    setTrackIndex(resetIndex);
  };

  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY };
    if (event.target instanceof HTMLElement) event.target.setPointerCapture(event.pointerId);
  };

  const endSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointerRef.current = null;

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;
    if (!hasMultipleSlides || Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    const direction = deltaX < 0 ? 1 : -1;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTrackIndex((current) => {
        const next = current + direction;
        if (next === 0) return slides.length;
        if (next === slides.length + 1) return 1;
        return next;
      });
    } else {
      setTrackIndex((current) => current + direction);
    }
  };

  const cancelSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current?.id === event.pointerId) pointerRef.current = null;
  };

  return (
    <section className="homepage-carousel" aria-label={t("Carrusel de inicio")}>
      <div
        className="homepage-carousel-viewport"
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={cancelSwipe}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }}
      >
        <div
          className="homepage-carousel-track"
          ref={trackRef}
          onTransitionEnd={finishTransition}
          style={{ transform: `translateX(-${trackIndex * 100}%)` }}
        >
          {displaySlides.map((slide, index) => {
            const isClone = hasMultipleSlides && (index === 0 || index === displaySlides.length - 1);
            const image = (
              <img
                src={slide.image_url}
                alt={slide.alt_text}
                fetchPriority={index === trackIndex ? "high" : "auto"}
                loading={index === trackIndex ? "eager" : "lazy"}
                draggable={false}
              />
            );

            return slide.href
              ? <Link href={slide.href} key={`${slide.id}-${index}`} className="homepage-carousel-image" aria-hidden={isClone || undefined} tabIndex={isClone ? -1 : undefined}>{image}</Link>
              : <div key={`${slide.id}-${index}`} className="homepage-carousel-image" aria-hidden={isClone || undefined}>{image}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
