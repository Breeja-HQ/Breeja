"use client";

import { useEffect, useState } from "react";
import { resolveEnsAddress } from "@breeja/sdk";
import type { Address } from "viem";

/**
 * Reverse-resolves an address to its primary ENS name for display, e.g.
 * "paid to alice.eth" instead of a bare hex string. Shares the SDK's
 * resolveEnsAddress rather than duplicating ENS lookup logic in the
 * frontend. Returns null while resolving or when no primary name is set,
 * which is the common case and not an error.
 */
export function useEnsName(address: Address | `0x${string}` | null | undefined): string | null {
  const [resolution, setResolution] = useState<{ address: string; name: string | null } | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    resolveEnsAddress(address)
      .then((name) => {
        if (!cancelled) setResolution({ address, name });
      })
      .catch(() => {
        if (!cancelled) setResolution({ address, name: null });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address || resolution?.address !== address) return null;
  return resolution.name;
}
