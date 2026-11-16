import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { EASE_OUT, Flip, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import VehicleCard from "./VehicleCard";
import "./VehicleGrid.css";

const SKELETON_COUNT = 8;

function GridSkeleton({ className }) {
  return (
    <ul className={`vehicle-grid ${className}`} aria-hidden="true">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <li key={i} className="vehicle-skeleton">
          <div className="skeleton-photo" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Fleet grid. Parents call ref.captureLayout() right before changing `vehicles`
 * (e.g. switching Cars/Bikes) so the cards glide to their new places.
 */
const VehicleGrid = forwardRef(function VehicleGrid({ vehicles, status, search = "", empty, className = "" }, ref) {
  const listRef = useRef(null);
  const flipState = useRef(null);
  const hasEntered = useRef(false);

  useImperativeHandle(ref, () => ({
    captureLayout() {
      if (!listRef.current || prefersReducedMotion()) return;
      flipState.current = Flip.getState(listRef.current.querySelectorAll(".vehicle-card"));
    },
  }));

  // First appearance: a short cascade, once per mount.
  useGSAP(
    () => {
      if (status !== "ready" || hasEntered.current || !listRef.current) return;
      hasEntered.current = true;
      if (prefersReducedMotion()) return;
      gsap.from(listRef.current.querySelectorAll(".vehicle-card"), {
        y: 18,
        opacity: 0,
        duration: 0.7,
        ease: EASE_OUT,
        stagger: 0.045,
        clearProps: "transform,opacity",
      });
    },
    { dependencies: [status] },
  );

  // Sort or filter changes: cards that stay glide to their new slot, new ones fade up.
  // Transform-only (no `absolute`) so the grid keeps its height and cards never leave it.
  const key = vehicles.map((v) => v._id).join(",");
  useLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !listRef.current) return undefined;
    const flip = Flip.from(state, {
      targets: listRef.current.querySelectorAll(".vehicle-card"),
      duration: 0.5,
      ease: "power3.inOut",
      onEnter: (elements) =>
        gsap.fromTo(elements, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: EASE_OUT, stagger: 0.03 }),
    });
    return () => flip.progress(1).kill();
  }, [key]);

  if (status === "loading") return <GridSkeleton className={className} />;
  if (vehicles.length === 0) return empty;

  return (
    <ul className={`vehicle-grid ${className}`} ref={listRef}>
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle._id} vehicle={vehicle} search={search} />
      ))}
    </ul>
  );
});

export default VehicleGrid;
