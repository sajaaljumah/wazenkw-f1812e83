import { useEffect, useRef, useState } from "react";

/**
 * Reveals an element once it scrolls into view.
 * Presentation-only: no data, routing or logic depends on it.
 * Users with `prefers-reduced-motion: reduce` are revealed immediately.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const reveal = () => {
      node.setAttribute("data-reveal-phase", "entering");
      setRevealed(true);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        reveal();
        observer.disconnect();
      },
      // One visible pixel is enough to start the transition. The lower inset
      // keeps the reveal tied to an intentional scroll into the viewport.
      { root: null, rootMargin: "0px 0px -48px 0px", threshold: 0.01 },
    );

    node.setAttribute("data-reveal-phase", "waiting");
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.removeAttribute("data-reveal-phase");
    };
  }, []);

  return { ref, revealed };
}
