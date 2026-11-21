import type { CSSProperties, ReactNode } from "react";
import { TradingCard } from "@/components/cards/trading-card";

type Props = {
  /** How many face-down cards lie under the top one. */
  under: number;
  /** The top card. */
  children: ReactNode;
  className?: string;
};

/**
 * A pile of cards in its halo: the top one over face-down cards fanned out under it (see
 * `.card-pile-*` in globals.css). Each card carries its depth under the top one and its place from
 * the bottom, the order the pack's burst brings the cards out in.
 */
export function CardPile({ under, children, className = "" }: Props) {
  return (
    <div className={`relative w-full max-w-60 ${className}`}>
      {/* The pile's halo and thickness only: the top card says all a screen reader needs. */}
      <div aria-hidden>
        <div className="card-pile-halo" />
        {Array.from({ length: under }, (_, index) => {
          // The deepest first, so each card covers the one under it; keyed by depth, the cards
          // left in place stay put when the pile thins.
          const depth = under - index;
          return (
            <div
              key={depth}
              className="card-pile-card absolute inset-0"
              style={{ "--pile-depth": depth, "--pile-order": index } as CSSProperties}
            >
              <TradingCard side="back" />
            </div>
          );
        })}
      </div>
      <div
        className="card-pile-card relative"
        style={{ "--pile-depth": 0, "--pile-order": under } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
