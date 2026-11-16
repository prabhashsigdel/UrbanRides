import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/motion";
import "./TypeTabs.css";

const OPTIONS = [
  { value: "", label: "All" },
  { value: "car", label: "Cars" },
  { value: "bike", label: "Bikes" },
];

/** All / Cars / Bikes filter with a sliding underline. */
export default function TypeTabs({ value, onChange }) {
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const hasPlaced = useRef(false);

  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('[aria-selected="true"]');
    const indicator = indicatorRef.current;
    if (!active || !indicator) return;
    const target = { x: active.offsetLeft, width: active.offsetWidth };
    if (!hasPlaced.current || prefersReducedMotion()) {
      gsap.set(indicator, target);
      hasPlaced.current = true;
      return;
    }
    gsap.to(indicator, { ...target, duration: 0.45, ease: "expo.out", overwrite: true });
  }, [value]);

  return (
    <div className="type-tabs" role="tablist" aria-label="Vehicle type" ref={listRef}>
      {OPTIONS.map((option) => (
        <button
          key={option.value || "all"}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className="type-tab"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
      <span className="type-tabs-indicator" ref={indicatorRef} aria-hidden="true" />
    </div>
  );
}
