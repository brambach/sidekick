"use client";

import { useEffect } from "react";

export function AnimateOnScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize IntersectionObserver if not already done
    if (!window.__inViewIO) {
      window.__inViewIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("animate");
              // Only trigger once
              window.__inViewIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
      );
    }

    // Observe all elements with animate-on-scroll class
    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => {
      window.__inViewIO.observe(el);
    });

    return () => {
      // Cleanup observer on unmount
      if (window.__inViewIO) {
        elements.forEach((el) => {
          window.__inViewIO.unobserve(el);
        });
      }
    };
  }, []);

  return null;
}

// Type declaration for global window object
declare global {
  interface Window {
    __inViewIO: IntersectionObserver;
  }
}
