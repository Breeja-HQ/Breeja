"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Mail, PenLine, Receipt, RotateCcw, ShieldCheck, Zap } from "lucide-react";
import { usePaymentWidget } from "@/lib/hooks/usePaymentWidget";
import Nav from "@/app/components/Nav";
import AmountRecipientForm from "@/app/components/pay/AmountRecipientForm";
import RouteList from "@/app/components/pay/RouteList";
import WrongNetworkPrompt from "@/app/components/pay/WrongNetworkPrompt";
import ReadyToSign from "@/app/components/pay/ReadyToSign";
import PaymentTracker from "@/app/components/pay/PaymentTracker";

export default function PayPage() {
  const widget = usePaymentWidget();

  return (
    <>
      {/* Nav carries the wallet connect buttons. Without it there was no way
          to connect a wallet on this route at all, which made it unusable. */}
      <Nav />
      <main className="flex w-full flex-col items-center justify-center bg-white px-5 py-14 md:px-8 md:py-20">
        <div className="w-full max-w-xl">
        <header className="text-center">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-ink md:text-5xl">
            Send a payment
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-body md:text-xl">
            Gasless, cross-chain USDC. No gas token needed on either side.
          </p>
        </header>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-9">
          {widget.state === "idle" && !widget.connectedAddress && widget.privyReady && !widget.privyAuthenticated && (
            <div className="breeja-enter mb-7 flex flex-col gap-4 rounded-xl border border-border bg-badge-bg p-5 sm:flex-row sm:items-center">
              <Mail className="h-7 w-7 shrink-0 text-accent" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-lg font-bold text-ink">No wallet needed</p>
                <p className="mt-0.5 text-base leading-relaxed text-body">
                  Sign in with email to get an embedded wallet and pay directly.
                </p>
              </div>
              <button
                type="button"
                onClick={widget.loginWithPrivy}
                className="motion-lift shrink-0 rounded-full bg-ink px-6 py-3 text-lg font-semibold text-white outline-none hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Sign in
              </button>
            </div>
          )}

          {widget.state === "idle" && (
            <div className="breeja-enter">
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
            </div>
          )}

          {widget.state === "quoting" && (
            <div className="breeja-enter flex flex-col items-center gap-4 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
              <p className="text-xl font-bold text-ink">Pricing your routes</p>
              <p className="max-w-sm text-base leading-relaxed text-body">
                Asking the relayer what this payment costs on each route it can take
                {widget.sourceChain && widget.destChain
                  ? ` from ${widget.sourceChain.name} to ${widget.destChain.name}`
                  : ""}
                . You will get the fast pool route and the CCTP route side by side, with fees and estimated
                time, before anything is signed.
              </p>
            </div>
          )}

          {widget.state === "wrong_network" && widget.sourceChain && (
            <div className="breeja-enter flex flex-col gap-6">
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
            <div className="breeja-enter flex flex-col gap-7">
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
            <div className="breeja-enter flex flex-col items-center gap-5 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-ink">Waiting for your signature</p>
                <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-body">
                  Approve the request in your wallet. It is an EIP-712 typed-data signature, not a
                  transaction.
                </p>
              </div>
              <ul className="mx-auto flex max-w-sm flex-col gap-3 text-left">
                <li className="flex items-start gap-2.5 text-base leading-relaxed text-body">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  Signing is free and off-chain. It costs you no gas and moves nothing on its own.
                </li>
                <li className="flex items-start gap-2.5 text-base leading-relaxed text-body">
                  <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  It authorizes exactly the amount shown, to the vault on{" "}
                  {widget.sourceChain?.name ?? "the source chain"}, and expires in one hour.
                </li>
                <li className="flex items-start gap-2.5 text-base leading-relaxed text-body">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  Once signed, the relayer submits it and pays all gas on both chains.
                </li>
              </ul>
            </div>
          )}

          {(widget.state === "tracking" || widget.state === "released") && widget.paymentId && (
            <PaymentTracker paymentId={widget.paymentId} />
          )}

          {widget.state === "failed" && (
            <div className="breeja-enter flex flex-col gap-5">
              {widget.paymentId ? (
                <PaymentTracker paymentId={widget.paymentId} />
              ) : (
                <div className="rounded-2xl border border-border bg-badge-bg p-6">
                  <p className="text-xl font-bold text-ink">This payment failed</p>
                  <p className="mt-1.5 text-base leading-relaxed text-body">
                    {widget.error ?? "Unknown error"}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={widget.reset}
                className="motion-lift flex w-full items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-4 text-lg font-semibold text-white outline-none hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                Start a new payment
              </button>
            </div>
          )}

          {widget.error && widget.state !== "failed" && (
            <p className="breeja-enter mt-5 rounded-xl border border-border bg-badge-bg p-4 text-base leading-relaxed text-accent">
              {widget.error}
            </p>
          )}
        </div>

        <nav className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/"
            className="motion-lift inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-base font-semibold text-ink outline-none hover:border-accent hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className="motion-lift inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-base font-semibold text-ink outline-none hover:border-accent hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-auto"
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            View your payments
          </Link>
          </nav>
        </div>
      </main>
    </>
  );
}
