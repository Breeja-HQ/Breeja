"use client";

import { Mail } from "lucide-react";
import { usePaymentWidget } from "@/lib/hooks/usePaymentWidget";
import AmountRecipientForm from "@/app/components/pay/AmountRecipientForm";
import RouteList from "@/app/components/pay/RouteList";
import WrongNetworkPrompt from "@/app/components/pay/WrongNetworkPrompt";
import ReadyToSign from "@/app/components/pay/ReadyToSign";
import PaymentTracker from "@/app/components/pay/PaymentTracker";

export default function PayPage() {
  const widget = usePaymentWidget();

  return (
    <main className="w-full min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-16">
        <h1 className="font-sans font-bold text-3xl text-ink mb-2">Send a payment</h1>
        <p className="text-body mb-8">Gasless, cross-chain USDC — no gas token needed on either side.</p>

        <div className="rounded-2xl border border-border p-6 md:p-8">
          {widget.state === "idle" && !widget.connectedAddress && widget.privyReady && !widget.privyAuthenticated && (
            <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-badge-bg p-5">
              <Mail className="h-6 w-6 shrink-0 text-accent" />
              <div className="flex-1">
                <p className="text-lg font-semibold text-ink">No wallet needed</p>
                <p className="text-lg text-body">Sign in with email to get an embedded wallet and pay directly.</p>
              </div>
              <button
                type="button"
                onClick={widget.loginWithPrivy}
                className="shrink-0 rounded-full bg-ink text-white px-5 py-2.5 text-lg font-medium hover:opacity-90 transition-opacity"
              >
                Sign in
              </button>
            </div>
          )}

          {widget.state === "idle" && (
            <AmountRecipientForm
              chains={widget.chains}
              destinationOptions={widget.destinationOptions}
              sourceSlug={widget.sourceSlug}
              destSlug={widget.destSlug}
              onSourceChange={widget.setSourceSlug}
              onDestChange={widget.setDestSlug}
              amount={widget.amount}
              onAmountChange={widget.setAmount}
              recipientInput={widget.recipientInput}
              onRecipientChange={widget.setRecipientInput}
              isEnsName={widget.isEnsName}
              isResolvingEns={widget.isResolvingEns}
              resolvedRecipient={widget.recipient}
              connectedAddress={widget.connectedAddress}
              onUseConnected={() => widget.connectedAddress && widget.setRecipientInput(widget.connectedAddress)}
              onSubmit={widget.fetchQuote}
              canSubmit={Boolean(widget.amount && widget.recipient)}
            />
          )}

          {widget.state === "quoting" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" />
              <p className="text-body text-sm">Getting a quote…</p>
            </div>
          )}

          {widget.state === "wrong_network" && widget.sourceChain && (
            <div className="flex flex-col gap-5">
              <WrongNetworkPrompt
                chainName={widget.sourceChain.name}
                isSwitching={widget.isSwitching}
                onSwitch={widget.switchToSource}
              />
              {widget.quote && widget.selectedRoute && (
                <RouteList
                  routes={widget.quote.routes}
                  selected={widget.selectedRoute}
                  onSelect={widget.setSelectedRoute}
                />
              )}
            </div>
          )}

          {widget.state === "ready_to_sign" && widget.quote && (
            <div className="flex flex-col gap-6">
              <RouteList routes={widget.quote.routes} selected={widget.selectedRoute} onSelect={widget.setSelectedRoute} />
              {widget.selectedRoute && widget.sourceChain && widget.destChain && widget.recipient && (
                <ReadyToSign
                  sourceChain={widget.sourceChain}
                  destChain={widget.destChain}
                  amount={widget.amount}
                  recipient={widget.recipient}
                  route={widget.selectedRoute}
                  onSign={widget.submitPayment}
                />
              )}
            </div>
          )}

          {widget.state === "submitting" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" />
              <p className="text-body text-sm">Waiting for your signature…</p>
            </div>
          )}

          {(widget.state === "tracking" || widget.state === "released") && widget.paymentId && (
            <PaymentTracker paymentId={widget.paymentId} />
          )}

          {widget.state === "failed" && (
            <div className="flex flex-col gap-4">
              {widget.paymentId ? (
                <PaymentTracker paymentId={widget.paymentId} />
              ) : (
                <div className="rounded-xl border border-border bg-badge-bg p-5">
                  <p className="text-ink font-medium mb-1">This payment failed.</p>
                  <p className="text-body text-sm">{widget.error ?? "Unknown error"}</p>
                </div>
              )}
              <button
                type="button"
                onClick={widget.reset}
                className="w-full bg-ink text-white rounded-full px-6 py-3 text-base font-medium hover:opacity-90 transition-opacity"
              >
                Start a new payment
              </button>
            </div>
          )}

          {widget.error && widget.state !== "failed" && (
            <p className="mt-4 text-sm text-accent">{widget.error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
