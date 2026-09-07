"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Mail, LogOut } from "lucide-react";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Providers.tsx only mounts PrivyProvider when NEXT_PUBLIC_PRIVY_APP_ID is
// set, so this component must not call any Privy hook unless that provider
// exists — Privy's hooks throw/warn when rendered outside it. The outer
// export enforces that by never mounting the hook-calling component absent
// the env var, rather than calling hooks first and bailing out after.
export function PrivyConnectButton() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return null;
  return <PrivyConnectButtonInner />;
}

function PrivyConnectButtonInner() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return (
      <div className="h-11 w-36 rounded-full border border-border bg-white animate-pulse" aria-hidden="true" />
    );
  }

  if (authenticated) {
    const address = wallets[0]?.address;
    return (
      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-lg font-medium text-ink hover:border-accent transition-colors"
      >
        <span className="font-mono text-base">{address ? shortAddress(address) : "Signed in"}</span>
        <LogOut className="h-4 w-4 text-body" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => login()}
      className="flex items-center gap-2 rounded-full bg-ink text-white px-5 py-2.5 text-lg font-medium hover:opacity-90 transition-opacity"
    >
      <Mail className="h-4 w-4" />
      Sign in with email
    </button>
  );
}
