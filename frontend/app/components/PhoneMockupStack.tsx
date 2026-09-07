import { Check, Loader2 } from "lucide-react";

export default function PhoneMockupStack() {
  return (
    <div className="relative mx-auto mt-8 md:mt-10 h-[480px] sm:h-[560px] md:h-[640px] w-full max-w-lg sm:max-w-2xl md:max-w-4xl">
      <div className="absolute left-1/2 top-1/2 z-10 -translate-y-1/2 -rotate-6 sm:-rotate-12 -translate-x-[calc(50%+120px)] sm:-translate-x-[calc(50%+180px)]">
        <div className="w-52 sm:w-72 aspect-[9/19] rounded-[2rem] sm:rounded-[2.5rem] border-4 sm:border-8 border-ink bg-ink shadow-lg overflow-hidden">
          <div className="flex h-full flex-col bg-surface">
            <div className="flex items-center justify-between px-3 pt-4 pb-2">
              <span className="text-xs font-semibold text-ink">Breeja</span>
              <span className="h-2 w-2 rounded-full bg-accent" />
            </div>
            <div className="flex-1 px-3 pb-4">
              <p className="text-[10px] text-body">Base Sepolia to Arbitrum Sepolia</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                Sign once, no gas required
              </p>
              <div className="mt-3 rounded-xl border border-border bg-white p-2.5">
                <p className="text-[9px] text-body">Amount (USDC)</p>
                <p className="text-base font-bold text-ink">10.00 USDC</p>
              </div>
              <div className="mt-2 rounded-xl border border-border bg-white p-2.5">
                <p className="text-[9px] text-body">Recipient</p>
                <p className="truncate text-[10px] font-mono text-ink">0xf611...F8B9</p>
              </div>
              <div className="mt-3 rounded-lg bg-accent py-2 text-center text-[10px] font-semibold text-white">
                Sign and pay
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 -translate-y-1/2 rotate-6 sm:rotate-12 translate-x-[calc(-50%+120px)] sm:translate-x-[calc(-50%+180px)]">
        <div className="w-52 sm:w-72 aspect-[9/19] rounded-[2rem] sm:rounded-[2.5rem] border-4 sm:border-8 border-ink bg-ink shadow-lg overflow-hidden">
          <div className="flex h-full flex-col bg-ink text-white">
            <div className="flex items-center justify-between px-3 pt-4 pb-2">
              <span className="text-xs font-semibold">Breeja</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </span>
            </div>
            <div className="flex-1 px-3 pb-4">
              <p className="text-[10px] text-white/60">Received</p>
              <p className="mt-0.5 text-lg font-bold text-accent">
                9.95 USDC
              </p>
              <div className="mt-3 flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-[9px] text-white/60">Fee (0.5%)</span>
                <span className="text-[10px] font-medium">0.05 USDC</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-[9px] text-white/60">Gas paid by</span>
                <span className="text-[10px] font-medium text-accent">
                  Breeja
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between rounded-lg border border-white/15 px-2 py-1.5">
                  <span className="text-[9px] text-white/70">
                    Base Explorer
                  </span>
                  <span className="text-[10px] text-accent">View</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/15 px-2 py-1.5">
                  <span className="text-[9px] text-white/70">
                    Arbitrum Explorer
                  </span>
                  <span className="text-[10px] text-accent">View</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <div className="w-60 sm:w-80 aspect-[9/19] rounded-[2.5rem] sm:rounded-[3rem] border-4 sm:border-8 border-ink bg-ink shadow-2xl overflow-hidden">
          <div className="flex h-full flex-col bg-surface">
            <div className="flex items-center justify-between px-4 pt-5 pb-2">
              <span className="text-sm font-semibold text-ink">Breeja</span>
              <span className="rounded-full bg-badge-bg px-2.5 py-1 text-[10px] font-medium text-accent">
                Tracking
              </span>
            </div>
            <div className="flex-1 px-4 pb-5">
              <div className="mt-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-accent animate-spin" />
                <p className="text-xs font-medium text-ink">
                  Deposit confirmed, releasing
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-white p-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-body">Route</span>
                  <span className="font-medium text-ink">Fast, custodial</span>
                </div>
                <div className="mt-2 flex justify-between text-[10px]">
                  <span className="text-body">You send</span>
                  <span className="font-medium text-ink">10.00 USDC</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-[10px]">
                  <span className="text-body">Recipient receives</span>
                  <span className="font-semibold text-ink">9.95 USDC</span>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-body">
                Live status streams in with no polling. This screen updates
                itself the moment the destination chain confirms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
