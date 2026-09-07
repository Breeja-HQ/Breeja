export const KNOWN_ADDRESSES_BY_CHAIN_ID = {
    11155111: {
        sourceVaultAddress: "0xcD0dC65c8d64A5D135180bFCA530398f4F2b2424",
        usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    },
    84532: {
        sourceVaultAddress: "0x552431953dd3F087557196A383c436ddAab665ab",
        usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        rpcUrl: "https://sepolia.base.org",
    },
    421614: {
        sourceVaultAddress: "0x5471bab4fC78A946cDC3142d852e54cBD83C181e",
        usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    },
    11155420: {
        sourceVaultAddress: "0x2d18B34880cc67DA1358f8963906492e0d01a567",
        usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        rpcUrl: "https://sepolia.optimism.io",
    },
};
export function getKnownAddresses(chainId) {
    return KNOWN_ADDRESSES_BY_CHAIN_ID[chainId] ?? null;
}
//# sourceMappingURL=knownAddresses.js.map