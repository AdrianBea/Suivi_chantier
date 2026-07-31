"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle scroll parallax for a page header/hero: translateY only, capped,
 * disabled when the user prefers reduced motion. No scroll-jacking — purely
 * a passive transform applied to the ref'd element.
 */
export function useParallax<T extends HTMLElement>(factor = 0.15, max = 24) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * factor, max);
        if (el) el.style.transform = `translateY(${offset}px)`;
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [factor, max]);

  return ref;
}
