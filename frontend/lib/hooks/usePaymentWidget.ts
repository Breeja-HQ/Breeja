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

function randomNonce(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

export function usePaymentWidget() {
  const { address: wagmiAddress, chainId: walletChainId } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
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
  const [destSlug, setDestSlug] = useState<ChainConfig["slug"]>("arbitrum-sepolia");
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
      const raw = (await response.json()) as QuoteResponse & { error?: string };
      if (!response.ok || !raw.viable) {
        setError(raw.error ?? "No viable route for this payment");
        setQuote(raw.routes ? formatQuote(raw) : null);
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
    try {
      await switchChainAsync({ chainId: sourceChain.chainId });
      setState("ready_to_sign");
    } catch {
      setError(`Switch to ${sourceChain.name} was rejected`);
    }
  }, [sourceChain, switchChainAsync]);

  const submitPayment = useCallback(async () => {
    if (!sourceChain || !destChain || !recipient || !payer || !selectedRoute || !amount) return;

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
        `${sourceChain.name} does not support gasless signing. Paying from ${sourceChain.name} requires an on-chain approve() transaction that this widget does not yet send — see docs/CHAINS.md "Hedera".`,
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
  }, [sourceChain, destChain, recipient, payer, selectedRoute, amount, signTypedDataAsync, usingPrivy, privy.signer]);

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
