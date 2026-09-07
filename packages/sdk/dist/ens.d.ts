import { type Address } from "viem";
/**
 * ENSv2's Universal Resolver lives at this address on both mainnet and
 * Sepolia (an EIP-1967-style proxy, stable across the underlying resolver
 * logic being upgraded). viem >= 2.35 resolves through it automatically in
 * getEnsAddress/getEnsName — see mainnet.contracts.ensUniversalResolver in
 * viem/chains. Recorded here only so a version mismatch is loud rather than
 * a silent fallback to legacy v1 resolution.
 */
declare const ENSV2_UNIVERSAL_RESOLVER: `0x${string}`;
declare function isLikelyEnsName(value: string): boolean;
/**
 * Resolves an ENS name (e.g. "alice.eth") to an address by querying ENSv2's
 * Universal Resolver on Ethereum mainnet — the registry that owns the
 * `.eth` namespace. This is a real RPC call against the deployed resolver
 * contract, never inferred from model output, per docs/PARTNERS.md.
 *
 * Returns null if the name has no address record, rather than throwing —
 * an unset record is an expected outcome, not a failure.
 */
export declare function resolveEnsName(name: string, rpcUrl?: string): Promise<Address | null>;
/**
 * Reverse-resolves an address to its primary ENS name, if one is set. Used
 * for agent identity: an agent's payment address can display as
 * "mytradingbot.eth" instead of a bare hex string wherever a Payment's
 * recipient is shown. Returns null if no primary name is set — most
 * addresses have none, and that is not an error.
 */
export declare function resolveEnsAddress(address: Address, rpcUrl?: string): Promise<string | null>;
/**
 * Resolves a recipient that may be either a raw address or an ENS name.
 * Returns the address unchanged if it already is one, avoiding an RPC
 * round trip for the common case. Throws neither on ambiguous input nor
 * on a failed lookup — callers get null and decide how to surface it,
 * matching the SDK's InvalidRecipient error path in index.ts.
 */
export declare function resolveRecipient(recipient: string, rpcUrl?: string): Promise<Address | null>;
export { isLikelyEnsName, ENSV2_UNIVERSAL_RESOLVER };
