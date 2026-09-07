"use client";

import { useCallback, useMemo } from "react";
import { usePrivy, useSignTypedData, useWallets } from "@privy-io/react-auth";
import type { SignTypedDataParams } from "@privy-io/react-auth";
import type { Signer, TypedData } from "@breeja/sdk";

export interface PrivySignerState {
  ready: boolean;
  authenticated: boolean;
  address: `0x${string}` | null;
  signer: Signer | null;
  login: () => void;
  logout: () => void;
}

const NO_PRIVY_STATE: PrivySignerState = {
  ready: false,
  authenticated: false,
  address: null,
  signer: null,
  login: () => {},
  logout: () => {},
};

/**
 * Wraps a Privy embedded wallet as the SDK's `custom` Signer variant — the
 * plug-in point PARTNERS.md describes. The SDK never imports Privy; this
 * hook is the only place that does, translating Privy's signTypedData into
 * the `(data: TypedData) => Promise<0x${string}>` shape signing.ts expects.
 *
 * NEXT_PUBLIC_PRIVY_APP_ID is inlined at build time and never changes across
 * a render tree's lifetime, so branching on it before calling any other
 * Privy hook does not violate the rules of hooks — it is equivalent to two
 * builds of this module, one with the Privy hooks and one without, matching
 * Providers.tsx only mounting PrivyProvider when the env var is set.
 */
export function usePrivySigner(): PrivySignerState {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return NO_PRIVY_STATE;
  return usePrivySignerWithProvider();
}

function usePrivySignerWithProvider(): PrivySignerState {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signTypedData } = useSignTypedData();

  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy") ?? wallets[0] ?? null;
  const address = (embeddedWallet?.address as `0x${string}` | undefined) ?? null;

  const sign = useCallback(
    async (data: TypedData): Promise<`0x${string}`> => {
      if (!address) throw new Error("No Privy wallet available to sign with");
      const chainId = data.domain?.chainId;
      if (typeof chainId === "bigint") {
        throw new Error("EIP-712 domain chainId must be a number for Privy's signTypedData");
      }
      const types: SignTypedDataParams["types"] = {};
      for (const [typeName, fields] of Object.entries(data.types ?? {})) {
        if (fields) types[typeName] = [...fields];
      }
      const params: SignTypedDataParams = {
        domain: {
          name: data.domain?.name,
          version: data.domain?.version,
          chainId,
          verifyingContract: data.domain?.verifyingContract,
        },
        types,
        primaryType: data.primaryType,
        message: data.message as Record<string, unknown>,
      };
      const { signature } = await signTypedData(params, { address });
      return signature as `0x${string}`;
    },
    [address, signTypedData],
  );

  const signer = useMemo<Signer | null>(() => {
    if (!address) return null;
    return { type: "custom", address, signTypedData: sign };
  }, [address, sign]);

  return { ready, authenticated, address, signer, login, logout };
}
