"use client";
import { useEffect, useRef } from "react";

export function prefersStillMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Scroll choreography for the element the returned ref is attached to.
 * - `[data-reveal]` gets `data-in="true"` the first time it enters the viewport.
 * - `[data-progress]` gets `--p` (0 → 1 while it crosses the viewport).
 * - `[data-steps="n"]` also gets `--pin` (0 → 1 while its sticky child is pinned) and `data-step`.
 * Hidden start states only apply while the root carries `data-motion="on"`, so content is
 * visible without JavaScript and with reduced motion.
 */
export function useScrollMotion<T extends HTMLElement>() {
  const root = useRef<T>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reveals = [...node.querySelectorAll<HTMLElement>("[data-reveal]")];
    const tracked = [...node.querySelectorAll<HTMLElement>("[data-progress]")];
    if (prefersStillMotion()) {
      reveals.forEach(element => { element.dataset.in = "true"; });
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).dataset.in = "true";
      observer.unobserve(entry.target);
    }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(element => observer.observe(element));
    node.dataset.motion = "on";
    const pending = { frame: 0 };
    const update = () => {
      pending.frame = 0;
      const viewport = window.innerHeight;
      for (const element of tracked) {
        const box = element.getBoundingClientRect();
        if (box.bottom < -viewport || box.top > viewport * 2) continue;
        element.style.setProperty("--p", clamp((viewport - box.top) / (viewport + box.height)).toFixed(4));
        const steps = Number(element.dataset.steps);
        if (steps) {
          const pinned = clamp(-box.top / Math.max(1, box.height - viewport));
          element.style.setProperty("--pin", pinned.toFixed(4));
          element.dataset.step = String(Math.min(steps - 1, Math.floor(pinned * steps)));
        }
      }
    };
    const schedule = () => { if (!pending.frame) pending.frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(pending.frame);
      delete node.dataset.motion;
    };
  }, []);
  return root;
}
