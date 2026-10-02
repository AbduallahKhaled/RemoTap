"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Adds .in to every .reveal element as it scrolls into view. */
export function scanReveal() {
  const els = document.querySelectorAll(".reveal:not(.in)");
  if (!("IntersectionObserver" in window)) {
    els.forEach((e) => e.classList.add("in"));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}

/** Re-scans on every page change. */
export function RevealObserver() {
  const path = usePathname();
  useEffect(() => scanReveal(), [path]);
  return null;
}
