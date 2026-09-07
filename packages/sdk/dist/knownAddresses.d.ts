export interface KnownChainAddresses {
    sourceVaultAddress: `0x${string}`;
    usdcAddress: `0x${string}`;
    rpcUrl: string;
}
export declare const KNOWN_ADDRESSES_BY_CHAIN_ID: Record<number, KnownChainAddresses>;
export declare function getKnownAddresses(chainId: number): KnownChainAddresses | null;
