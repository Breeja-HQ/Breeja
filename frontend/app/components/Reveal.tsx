"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger in milliseconds applied once the element enters the viewport. */
  delay?: number;
};

/**
 * Soft scroll reveal. Content renders visible by default so it is never
 * hidden when JS is unavailable; the hidden state is only applied on the
 * client after mount, and only when the viewer has not asked for reduced
 * motion.
 */
export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    setArmed(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const state = !armed || shown ? "is-shown" : "is-hidden";

  return (
    <div
      ref={ref}
      className={`breeja-reveal ${state}${className ? ` ${className}` : ""}`}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
      <style>{`
        .breeja-reveal {
          transition: opacity 520ms ease-out, transform 520ms ease-out;
        }
        .breeja-reveal.is-hidden {
          opacity: 0;
          transform: translate3d(0, 16px, 0);
        }
        .breeja-reveal.is-shown {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .breeja-reveal,
          .breeja-reveal.is-hidden,
          .breeja-reveal.is-shown {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
