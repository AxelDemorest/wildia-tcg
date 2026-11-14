"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Maximum tilt on each axis, in degrees. */
  maxTilt?: number;
  className?: string;
};

/**
 * 3D tilt + moving glare on the front face of a card.
 *
 * - Pointer tracking is attached to the static outer wrapper, never to the
 *   rotated element, so the hitbox does not move while the card tilts.
 * - Only mouse/pen pointers drive the effect; touch gets no 3D (no stuck state).
 * - Disabled with `prefers-reduced-motion: reduce`.
 * - Values are written to CSS variables from `requestAnimationFrame`, so the
 *   component never re-renders while the pointer moves.
 */
export function TiltCard({ children, maxTilt = 14, className = "" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  const reset = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    card.dataset.active = "false";
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--gx", "50%");
    card.style.setProperty("--gy", "50%");
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotionRef.current = query.matches;
      if (query.matches) reset();
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reset]);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || reducedMotionRef.current) return;
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card) return;

    const { clientX, clientY } = event;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

      card.dataset.active = "true";
      card.style.setProperty("--rx", `${((0.5 - py) * 2 * maxTilt).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((px - 0.5) * 2 * maxTilt).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    });
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={`[perspective:900px] ${className}`}
    >
      <div
        ref={cardRef}
        data-active="false"
        className="contest-tilt relative [transform-style:preserve-3d]"
      >
        {children}
        <div aria-hidden className="contest-tilt-glare" />
      </div>
    </div>
  );
}
