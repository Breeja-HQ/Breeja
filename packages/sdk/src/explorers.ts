const EXPLORER_TX_URL_BY_CHAIN_ID: Record<number, (hash: string) => string> = {
  11155111: (hash) => `https://sepolia.etherscan.io/tx/${hash}`,
  84532: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  421614: (hash) => `https://sepolia.arbiscan.io/tx/${hash}`,
  11155420: (hash) => `https://sepolia-optimism.etherscan.io/tx/${hash}`,
};

export function explorerTxUrl(chainId: number, txHash: string | null): string | null {
  if (!txHash) return null;
  return EXPLORER_TX_URL_BY_CHAIN_ID[chainId]?.(txHash) ?? null;
}
