"use client";

import { Check, Clock, ShieldCheck, Zap } from "lucide-react";
import type { QuoteRoute } from "@/lib/hooks/usePaymentWidget";

interface Props {
  routes: QuoteRoute[];
  selected: QuoteRoute | null;
  onSelect: (route: QuoteRoute) => void;
}

const ROUTE_LABEL: Record<QuoteRoute["type"], string> = {
  fast_pool: "Fast",
  cctp: "CCTP",
};

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  return `~${Math.round(seconds / 60)} min`;
}

function formatCustody(custody: QuoteRoute["custody"]): string {
  return custody === "custodial" ? "custodial" : "trust-minimized";
}

export default function RouteList({ routes, selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-body">Choose a route</p>
      {routes.map((route) => {
        const isSelected = selected?.type === route.type;
        const Icon = route.type === "cctp" ? ShieldCheck : Zap;
        return (
          <button
            key={route.type}
            type="button"
            disabled={!route.viable}
            aria-pressed={isSelected}
            onClick={() => onSelect(route)}
            className={`motion-lift rounded-2xl border-2 px-5 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              isSelected ? "border-accent bg-badge-bg" : "border-border bg-surface"
            } ${
              route.viable
                ? "hover:border-accent hover:shadow-md"
                : "cursor-not-allowed opacity-40 hover:transform-none"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex items-center gap-2.5">
                <Icon className={`h-5 w-5 shrink-0 ${isSelected ? "text-accent" : "text-body"}`} />
                <span className="text-lg font-bold text-ink">
                  {ROUTE_LABEL[route.type]}, {formatCustody(route.custody)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-1.5 text-base text-body">
                  <Clock className="h-4 w-4" />
                  {formatEta(route.estimatedSeconds)}
                </span>
                {isSelected && <Check className="h-5 w-5 text-accent" aria-hidden="true" />}
              </span>
            </div>
            <div className="mt-2 text-base leading-relaxed text-body">
              {route.viable ? (
                <>
                  Fee {(route.feeBps / 100).toFixed(2)}%. Recipient receives{" "}
                  <span className="font-semibold text-ink">{route.payoutAmount} USDC</span>.
                </>
              ) : (
                (route.reason ?? "Not viable for this payment")
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
