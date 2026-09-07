import type { PrivyClientConfig } from "@privy-io/react-auth";

// createOnLogin issues an embedded wallet only to a user who authenticates
// without bringing their own (email/social); a wallet-first login keeps
// using their existing wallet instead of also getting an embedded one.
export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "wallet", "google"],
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  appearance: {
    theme: "light",
    accentColor: "#f4623a",
    walletList: ["detected_wallets", "metamask", "coinbase_wallet"],
  },
};
