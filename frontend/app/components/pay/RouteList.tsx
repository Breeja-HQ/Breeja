"use client";

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

export default function RouteList({ routes, selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {routes.map((route) => {
        const isSelected = selected?.type === route.type;
        return (
          <button
            key={route.type}
            type="button"
            disabled={!route.viable}
            onClick={() => onSelect(route)}
            className={`text-left rounded-xl border px-5 py-4 transition-colors ${
              isSelected ? "border-accent bg-badge-bg" : "border-border bg-white"
            } ${!route.viable ? "opacity-40 cursor-not-allowed" : "hover:border-accent"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">
                {ROUTE_LABEL[route.type]} — {route.custody === "custodial" ? "custodial" : "trust-minimized"}
              </span>
              <span className="text-sm text-body">{formatEta(route.estimatedSeconds)}</span>
            </div>
            <div className="mt-1 text-sm text-body">
              {route.viable
                ? `Fee ${(route.feeBps / 100).toFixed(2)}% — you receive ${route.payoutAmount} USDC`
                : (route.reason ?? "Not viable for this payment")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
