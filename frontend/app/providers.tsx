"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmiConfig";
import { privyConfig } from "@/lib/privyConfig";

// Privy's embedded-wallet login is layered outside wagmi rather than through
// the @privy-io/wagmi connector — RainbowKit already owns the wagmi config
// for browser-extension wallets, and the payment widget only needs a
// Signer-shaped object out of Privy (see lib/hooks/usePrivySigner.ts), not a
// wagmi connector for it. Without a real app id PrivyProvider still mounts;
// login attempts fail client-side rather than at build/prerender time.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const body = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );

  if (!PRIVY_APP_ID) return body;

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      {body}
    </PrivyProvider>
  );
}
