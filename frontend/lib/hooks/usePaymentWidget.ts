"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAddress, type Address } from "viem";
import { useAccount, useSignTypedData, useSwitchChain } from "wagmi";
import { readUsdcDomainName, resolveEnsName, toSmallestUnits, toDecimalString, type TypedData } from "@breeja/sdk";
import { CHAINS, getChainBySlug, type ChainConfig } from "@/lib/chains";
import { usePrivySigner } from "@/lib/hooks/usePrivySigner";

export type WidgetState =
  | "idle"
  | "quoting"
  | "wrong_network"
  | "ready_to_sign"
  | "submitting"
  | "tracking"
  | "released"
  | "failed";

export interface QuoteRoute {
  type: "fast_pool" | "cctp";
  viable: boolean;
  reason?: string;
  custody: "custodial" | "trust-minimized";
  feeBps: number;
  feeAmount: string;
  payoutAmount: string;
  estimatedSeconds: number;
}

interface QuoteResponse {
  viable: boolean;
  routes: QuoteRoute[];
  recommended: QuoteRoute | null;
}

function formatQuote(raw: QuoteResponse): QuoteResponse {
  const formatRoute = (route: QuoteRoute): QuoteRoute => ({
    ...route,
    feeAmount: toDecimalString(route.feeAmount),
    payoutAmount: toDecimalString(route.payoutAmount),
  });
  return {
    viable: raw.viable,
    routes: raw.routes.map(formatRoute),
    recommended: raw.recommended ? formatRoute(raw.recommended) : null,
  };
}

// The relayer returns machine-readable reason codes. Surfacing those raw
// ("InsufficientPayerBalance") tells the user nothing actionable, so map the
// ones a person can actually do something about to plain language.
function explainQuoteRejection(reason: string | undefined, sourceChainName: string): string {
  switch (reason) {
    case "InsufficientPayerBalance":
      return `Not enough USDC on ${sourceChainName}. Top up that wallet on ${sourceChainName}, or pick a source chain where you already hold USDC.`;
    case "InsufficientLiquidity":
      return "The destination pool does not currently hold enough USDC to cover this payment. Try a smaller amount or a different destination chain.";
    case "PoolPaused":
      return "The destination pool is paused right now, so payments to that chain cannot settle. Try a different destination chain.";
    case "NoViableRoute":
      return "No route can settle this payment right now. Try a different chain pair or amount.";
    default:
      return reason ?? "No viable route for this payment";
  }
}

function randomNonce(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

export function usePaymentWidget() {
  const { address: wagmiAddress, chainId: walletChainId } = useAccount();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  // Own tracked flag rather than trusting wagmi's isPending alone: some
  // connectors never settle switchChainAsync for a chain the wallet has
  // never seen before, which would otherwise leave the switch button
  // permanently disabled with no way to retry. isSwitchPending is still
  // ORed in below for the normal, fast case so the button reacts instantly
  // when the connector does behave.
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);
  const isSwitching = isSwitchPending || isSwitchingSource;
  const { signTypedDataAsync } = useSignTypedData();
  const privy = usePrivySigner();

  // A wagmi-connected browser-extension wallet takes priority when both are
  // present; otherwise fall back to a Privy embedded wallet. Privy signs
  // EIP-712 typed data directly against whatever chainId is in the domain —
  // there is no separate "active chain" to be wrong about the way a browser
  // extension has one, so the wrong_network flow only applies to wagmi.
  const usingPrivy = !wagmiAddress && Boolean(privy.signer);
  const connectedAddress = wagmiAddress ?? privy.address ?? undefined;

  const [state, setState] = useState<WidgetState>("idle");
  const [sourceSlug, setSourceSlug] = useState<ChainConfig["slug"]>("base-sepolia");
  // Base Sepolia to Arc Testnet is the default pair: both are full-mesh
  // (isDestination: true in lib/chains.ts) and both have EIP-3009 USDC, so the
  // default landing state is a route that can actually be signed gaslessly.
  const [destSlug, setDestSlug] = useState<ChainConfig["slug"]>("arc-testnet");
  const [amount, setAmount] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<QuoteRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [switchTargetName, setSwitchTargetName] = useState<string | null>(null);

  const lastQuoteKey = useRef<string>("");

  const sourceChain = getChainBySlug(sourceSlug);
  const destChain = getChainBySlug(destSlug);

  const isEnsName = recipientInput.includes(".") && !isAddress(recipientInput);
  const [ensResolution, setEnsResolution] = useState<{ name: string; address: Address | null } | null>(null);

  // Resolution runs through @breeja/sdk's resolveEnsName, the same code
  // path the SDK uses internally when a caller passes an ENS name to
  // pay()/quote() — a real RPC call against ENS's Universal Resolver, never
  // a client-side guess. Keeps the widget and the SDK on one implementation
  // instead of duplicating ENS lookup logic.
  useEffect(() => {
    if (!isEnsName) return;
    let cancelled = false;
    resolveEnsName(recipientInput)
      .then((address) => {
        if (!cancelled) setEnsResolution({ name: recipientInput, address });
      })
      .catch(() => {
        if (!cancelled) setEnsResolution({ name: recipientInput, address: null });
      });
    return () => {
      cancelled = true;
    };
  }, [isEnsName, recipientInput]);

  const ensResolved = ensResolution?.name === recipientInput ? ensResolution.address : null;
  const isResolvingEns = isEnsName && ensResolution?.name !== recipientInput;

  const recipient: Address | null = isEnsName
    ? ensResolved
    : isAddress(recipientInput)
      ? (recipientInput as Address)
      : null;

  const payer = connectedAddress ?? null;

  const wrongNetwork =
    !usingPrivy && Boolean(sourceChain && walletChainId !== undefined && walletChainId !== sourceChain.chainId);

  // wrongNetwork is recomputed on every render, but the state machine only
  // reads it once, when fetchQuote first resolves. If the wallet's active
  // chain changes afterward (the user switches network in their extension,
  // or picks a different source chain after already quoting) ready_to_sign
  // does not re-check it before signing. viem then throws building the
  // typed-data domain against a chainId the wallet is not actually on
  // ("Provided chainId ... must match the active chainId ..."), which
  // surfaces to the user as a raw viem error instead of a network prompt.
  // Watch it here so a mismatch appearing after the quote still routes back
  // to the switch-network screen instead of reaching signTypedDataAsync.
  useEffect(() => {
    if (wrongNetwork && (state === "ready_to_sign" || state === "submitting")) {
      setState("wrong_network");
    }
  }, [wrongNetwork, state]);

  const fetchQuote = useCallback(async () => {
    if (!sourceChain || !destChain || !amount || !recipient) return;
    const key = `${sourceChain.chainId}-${destChain.chainId}-${amount}-${recipient}`;
    if (key === lastQuoteKey.current) return;
    lastQuoteKey.current = key;

    setState("quoting");
    setError(null);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChainId: sourceChain.chainId,
          toChainId: destChain.chainId,
          payer: payer ?? recipient,
          recipient,
          amount: toSmallestUnits(amount),
        }),
      });
      const raw = (await response.json()) as QuoteResponse & {
        error?: string;
        quote?: QuoteResponse;
      };
      if (!response.ok || !raw.viable) {
        // A 422 nests the real quote (and its per-route reasons) under
        // `quote`, with a generic "NoViableRoute" at the top level. The
        // per-route reason is the one worth showing, so prefer it.
        const nested = raw.quote ?? raw;
        const reason = nested.routes?.find((r) => !r.viable && r.reason)?.reason ?? raw.error;
        setError(explainQuoteRejection(reason, sourceChain.name));
        setQuote(nested.routes ? formatQuote(nested) : null);
        setState("idle");
        return;
      }
      const data = formatQuote(raw);
      setQuote(data);
      setSelectedRoute(data.recommended ?? data.routes.find((r) => r.viable) ?? null);
      setState(wrongNetwork ? "wrong_network" : "ready_to_sign");
    } catch {
      setError("Could not reach the relayer for a quote");
      setState("idle");
    }
  }, [sourceChain, destChain, amount, recipient, payer, wrongNetwork]);

  const switchToSource = useCallback(async () => {
    if (!sourceChain) return;
    setSwitchTargetName(sourceChain.name);
    setError(null);
    setIsSwitchingSource(true);

    // Arc and Hedera are not in most wallets' default chain lists, so a
    // switch there also means the wallet has to add an unfamiliar network
    // first (wallet_addEthereumChain). Some connectors never settle that
    // promise if the user dismisses the add-network popup without an
    // explicit reject, which otherwise leaves this button stuck on
    // "Switching" forever with wagmi's own isPending never flipping back.
    // isSwitchingSource is ours to clear no matter what the connector does,
    // and the timeout guarantees that happens even if switchChainAsync
    // itself never settles.
    const SWITCH_TIMEOUT_MS = 20_000;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timed out")), SWITCH_TIMEOUT_MS);
    });

    try {
      await Promise.race([switchChainAsync({ chainId: sourceChain.chainId }), timeout]);
      setState("ready_to_sign");
    } catch (err) {
      const detail = err instanceof Error && err.message !== "timed out" ? `: ${err.message}` : "";
      setError(
        `Could not switch to ${sourceChain.name}${detail}. If your wallet does not already have this network, add it manually and try again.`,
      );
    } finally {
      setIsSwitchingSource(false);
    }
  }, [sourceChain, switchChainAsync]);

  const submitPayment = useCallback(async () => {
    if (!payer) {
      // Reachable if this is ever invoked from somewhere other than
      // ReadyToSign's connect-gated button (e.g. a future keyboard shortcut).
      // The UI's normal path swaps to a "Connect wallet" button instead of
      // calling this, so surface a real error here rather than a silent
      // no-op if that guard is ever bypassed.
      setError("Connect a wallet before signing this payment.");
      return;
    }
    if (!sourceChain || !destChain || !recipient || !selectedRoute || !amount) return;

    // Belt and braces alongside the useEffect above: a click can land in the
    // same render pass as a wallet-side network change, before that effect
    // has a chance to move the state machine to wrong_network. Signing
    // against a stale sourceChain here is exactly what produces viem's
    // "Provided chainId ... must match the active chainId ..." error, so
    // check the live wallet chain synchronously rather than trusting state.
    if (wrongNetwork) {
      setState("wrong_network");
      return;
    }

    // Hedera's USDC does not implement EIP-3009 (confirmed on-chain — see
    // docs/CHAINS.md "Hedera"), so there is no off-chain permit to sign here.
    // The relayer's /pay accepts a Hedera-sourced payment without an
    // authorization (see relayer/src/api/validation.ts's supportsEip3009
    // check), but only once the payer has already called approve() on
    // Hedera's SourceVault themselves, on-chain, paying their own gas — a
    // real wagmi useWriteContract call against USDC.approve(), not a
    // useSignTypedData call like every other chain here. That transaction-
    // sending path is not wired into this widget yet; failing honestly here
    // rather than building an EIP-3009 payload that cannot work is the
    // documented gap for this pass. See relayer/scripts/test-hedera-round-trip.ts
    // for the real approve() + deposit() flow run standalone against the
    // relayer, and docs/DEPLOYMENTS.md "Hedera" for its live run record.
    if (!sourceChain.supportsEip3009) {
      setError(
        `${sourceChain.name} cannot be paid from gaslessly. Its USDC does not implement EIP-3009, so there is no off-chain permit to sign here. Paying from ${sourceChain.name} needs an on-chain approve() that you submit and pay gas for yourself, and this widget does not send that transaction yet. Pick a different source chain to continue.`,
      );
      setState("ready_to_sign");
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const domainName = await readUsdcDomainName(sourceChain.viemChain.rpcUrls.default.http[0], sourceChain.usdcAddress);
      const validAfter = BigInt(0);
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = randomNonce();
      const value = BigInt(toSmallestUnits(amount));

      const typedData: TypedData = {
        domain: {
          name: domainName,
          version: "2",
          chainId: sourceChain.chainId,
          verifyingContract: sourceChain.usdcAddress,
        },
        types: {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        message: {
          from: payer,
          to: sourceChain.sourceVaultAddress,
          value,
          validAfter,
          validBefore,
          nonce,
        },
      };

      const signature =
        usingPrivy && privy.signer?.type === "custom"
          ? await privy.signer.signTypedData(typedData)
          : await signTypedDataAsync(typedData as Parameters<typeof signTypedDataAsync>[0]);
      const r = signature.slice(0, 66) as `0x${string}`;
      const s = (`0x${signature.slice(66, 130)}`) as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChainId: sourceChain.chainId,
          toChainId: destChain.chainId,
          payer,
          recipient,
          amount: value.toString(),
          preference: selectedRoute.type === "cctp" ? "trustless" : "fast",
          authorization: {
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
            v,
            r,
            s,
          },
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "The relayer rejected this payment");
        setState("failed");
        return;
      }

      setPaymentId(data.id);
      setState("tracking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing was rejected");
      setState("ready_to_sign");
    }
  }, [
    sourceChain,
    destChain,
    recipient,
    payer,
    selectedRoute,
    amount,
    signTypedDataAsync,
    usingPrivy,
    privy.signer,
    wrongNetwork,
  ]);

  const reset = useCallback(() => {
    setState("idle");
    setQuote(null);
    setSelectedRoute(null);
    setError(null);
    setPaymentId(null);
    lastQuoteKey.current = "";
  }, []);

  const chains = useMemo(() => CHAINS, []);
  const destinationOptions = useMemo(() => CHAINS.filter((c) => c.isDestination && c.slug !== sourceSlug), [sourceSlug]);

  return {
    state,
    chains,
    destinationOptions,
    sourceSlug,
    setSourceSlug,
    destSlug,
    setDestSlug,
    sourceChain,
    destChain,
    amount,
    setAmount,
    recipientInput,
    setRecipientInput,
    isEnsName,
    isResolvingEns,
    recipient,
    quote,
    selectedRoute,
    setSelectedRoute,
    error,
    setError,
    paymentId,
    wrongNetwork,
    switchTargetName,
    isSwitching,
    fetchQuote,
    switchToSource,
    submitPayment,
    reset,
    walletChainId,
    connectedAddress,
    usingPrivy,
    privyReady: privy.ready,
    privyAuthenticated: privy.authenticated,
    loginWithPrivy: privy.login,
    logoutFromPrivy: privy.logout,
  };
}
