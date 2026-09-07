import { createPublicClient, http, isAddress, type Address, type PublicClient } from "viem";
import { mainnet } from "viem/chains";

/**
 * ENSv2's Universal Resolver lives at this address on both mainnet and
 * Sepolia (an EIP-1967-style proxy, stable across the underlying resolver
 * logic being upgraded). viem >= 2.35 resolves through it automatically in
 * getEnsAddress/getEnsName — see mainnet.contracts.ensUniversalResolver in
 * viem/chains. Recorded here only so a version mismatch is loud rather than
 * a silent fallback to legacy v1 resolution.
 */
const ENSV2_UNIVERSAL_RESOLVER: `0x${string}` = "0xeeeeeeee14d718c2b47d9923deab1335e144eeee";

const DEFAULT_MAINNET_RPC_URL = "https://ethereum-rpc.publicnode.com";

let cachedClient: PublicClient | null = null;

function getEnsClient(rpcUrl?: string): PublicClient {
  if (rpcUrl) {
    return createPublicClient({ chain: mainnet, transport: http(rpcUrl) }) as PublicClient;
  }
  if (!cachedClient) {
    cachedClient = createPublicClient({
      chain: mainnet,
      transport: http(DEFAULT_MAINNET_RPC_URL),
    }) as PublicClient;
  }
  return cachedClient;
}

function isLikelyEnsName(value: string): boolean {
  return value.includes(".") && !isAddress(value);
}

/**
 * Resolves an ENS name (e.g. "alice.eth") to an address by querying ENSv2's
 * Universal Resolver on Ethereum mainnet — the registry that owns the
 * `.eth` namespace. This is a real RPC call against the deployed resolver
 * contract, never inferred from model output, per docs/PARTNERS.md.
 *
 * Returns null if the name has no address record, rather than throwing —
 * an unset record is an expected outcome, not a failure.
 */
export async function resolveEnsName(name: string, rpcUrl?: string): Promise<Address | null> {
  const client = getEnsClient(rpcUrl);
  return client.getEnsAddress({ name });
}

/**
 * Reverse-resolves an address to its primary ENS name, if one is set. Used
 * for agent identity: an agent's payment address can display as
 * "mytradingbot.eth" instead of a bare hex string wherever a Payment's
 * recipient is shown. Returns null if no primary name is set — most
 * addresses have none, and that is not an error.
 */
export async function resolveEnsAddress(address: Address, rpcUrl?: string): Promise<string | null> {
  const client = getEnsClient(rpcUrl);
  return client.getEnsName({ address });
}

/**
 * Resolves a recipient that may be either a raw address or an ENS name.
 * Returns the address unchanged if it already is one, avoiding an RPC
 * round trip for the common case. Throws neither on ambiguous input nor
 * on a failed lookup — callers get null and decide how to surface it,
 * matching the SDK's InvalidRecipient error path in index.ts.
 */
export async function resolveRecipient(recipient: string, rpcUrl?: string): Promise<Address | null> {
  if (isAddress(recipient)) return recipient;
  if (!isLikelyEnsName(recipient)) return null;
  return resolveEnsName(recipient, rpcUrl);
}

export { isLikelyEnsName, ENSV2_UNIVERSAL_RESOLVER };
